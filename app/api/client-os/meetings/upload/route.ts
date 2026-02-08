import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { analyzeAndStoreMeeting } from '@/lib/services/client-os/meetings/analyze-and-store-meeting';
import { getAuthenticatedUser } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { asObject, getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

function normalizeLocation(value: unknown): 'ZOOM' | 'FRONTAL' | 'PHONE' {
  const v = String(value ?? '').toUpperCase();
  if (v === 'FRONTAL' || v === 'PHONE') return v;
  return 'ZOOM';
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function decodeBase64ToBuffer(dataBase64: string): Buffer {
  return Buffer.from(dataBase64, 'base64');
}

async function runFfmpegExtractAudio(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'pcm_s16le',
      outputPath,
    ];

    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
  });
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

async function POSTHandler(req: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'client-os-meeting-'));

  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    let orgIdInput = '';
    let clientId = '';
    let title = 'פגישה';
    let location = 'ZOOM' as 'ZOOM' | 'FRONTAL' | 'PHONE';
    let mimeType = '';
    let fileName = 'upload';
    let inputBuf: Buffer | null = null;

    if (contentType.includes('application/json')) {
      const bodyJson: unknown = await req.json().catch(() => ({}));
      const bodyObj = asObject(bodyJson) ?? {};

      orgIdInput = String(bodyObj.orgId || '');
      clientId = String(bodyObj.clientId || '');
      title = String(bodyObj.title || title);
      location = normalizeLocation(bodyObj.location);
      fileName = String(bodyObj.fileName || fileName);
      mimeType = String(bodyObj.mimeType || '');

      const dataBase64 = typeof bodyObj.dataBase64 === 'string' ? bodyObj.dataBase64 : '';
      if (!dataBase64) return apiError('dataBase64 is required', { status: 400 });
      inputBuf = decodeBase64ToBuffer(dataBase64);
    } else {
      // Fallback to multipart/form-data
      try {
        const formData = await req.formData();
        orgIdInput = String(formData.get('orgId') || '');
        clientId = String(formData.get('clientId') || '');
        title = String(formData.get('title') || title);
        location = normalizeLocation(formData.get('location'));

        const file = formData.get('file');
        if (!file || !(file instanceof File)) return apiError('file is required', { status: 400 });
        fileName = file.name || fileName;
        mimeType = file.type || '';
        inputBuf = await fileToBuffer(file);
      } catch (e: unknown) {
        const safeMsg = 'Failed to parse multipart form data. Try JSON upload.';
        const message = IS_PROD ? safeMsg : `${safeMsg} (${getErrorMessage(e) ?? String(e)})`;
        return apiError(message, { status: 400 });
      }
    }

    if (!orgIdInput) return apiError('orgId is required', { status: 400 });
    if (!clientId) return apiError('clientId is required', { status: 400 });
    if (!inputBuf) return apiError('Missing file data', { status: 400 });

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgIdInput);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      const safeMsg = 'Forbidden';
      return apiError(e, { status, message: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg });
    }

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.client_os.meetings.upload',
      organizationId: orgId,
      userId: clerkUserId,
      limits: {
        ipMin: { limit: 10, windowMs: 60_000, label: 'ip-min' },
        userMin: { limit: 6, windowMs: 60_000, label: 'user-min' },
      },
    });
    if (!abuse.ok) {
      return apiError('Rate limit exceeded', { status: 429, headers: abuse.headers });
    }

    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');
    if (!isAudio && !isVideo) {
      return apiError('Only audio/video files are supported', { status: 400 });
    }

    const inputExt = path.extname(fileName || '') || (isVideo ? '.mp4' : '.wav');
    const inputPath = path.join(tmpDir, `input${inputExt}`);
    await fs.writeFile(inputPath, inputBuf);

    let audioPath = inputPath;
    let audioMime = mimeType;

    if (isVideo) {
      audioPath = path.join(tmpDir, 'audio.wav');
      await runFfmpegExtractAudio(inputPath, audioPath);
      audioMime = 'audio/wav';
    }

    const audioBuf = await fs.readFile(audioPath);

    const out = await withAiLoadIsolation({
      namespace: 'ai.transcribe',
      organizationId: orgId,
      task: async () => {
        const ai = AIService.getInstance();
        return await ai.transcribe({
          featureKey: 'client_os.meetings.transcription',
          organizationId: orgId,
          userId: clerkUserId,
          audioBuffer: bufferToArrayBuffer(audioBuf),
          mimeType: audioMime,
          meta: { source: 'client-os-meetings-upload', isVideo },
        });
      },
    });
    const transcript = out.text;

    const saved = await analyzeAndStoreMeeting({
      orgId,
      clientId,
      title,
      location,
      transcript,
    });

    return apiSuccessCompat({ meetingId: saved.meetingId, analysis: saved.analysis, transcript }, { headers: abuse.headers });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Upload failed' });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export const POST = shabbatGuard(POSTHandler);
