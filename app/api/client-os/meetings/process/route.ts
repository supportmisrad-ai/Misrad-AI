import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createStorageClient } from '@/lib/supabase';
import { analyzeAndStoreMeeting } from '@/lib/services/client-os/meetings/analyze-and-store-meeting';
import { createClinicSessionForOrganizationId } from '@/lib/services/client-clinic/create-clinic-session';
import { getAuthenticatedUser } from '@/lib/auth';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { AIService } from '@/lib/services/ai/AIService';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { asObject, getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function normalizeLocation(value: unknown): 'ZOOM' | 'FRONTAL' | 'PHONE' {
  const v = String(value ?? '').toUpperCase();
  if (v === 'FRONTAL' || v === 'PHONE') return v;
  return 'ZOOM';
}

async function isFfmpegAvailable(): Promise<boolean> {
  try {
    return await new Promise<boolean>((resolve) => {
      const child = spawn('ffmpeg', ['-version'], { stdio: ['ignore', 'ignore', 'ignore'] });
      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          // ignore
        }
        resolve(false);
      }, 1500);

      child.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });
  } catch {
    return false;
  }
}

async function runFfmpegExtractAudio(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath];
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'client-os-meeting-process-'));

  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const bodyJson: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(bodyJson) ?? {};

    const orgIdInput = String(bodyObj.orgId || '');
    const clientId = String(bodyObj.clientId || '');
    const title = String(bodyObj.title || 'פגישה');
    const location = normalizeLocation(bodyObj.location);
    const bucket = String(bodyObj.bucket || 'meeting-recordings');
    const storagePath = String(bodyObj.path || '');
    const mimeType = String(bodyObj.mimeType || '');
    const fileName = String(bodyObj.fileName || 'recording');

    if (!orgIdInput) return apiError('orgId is required', { status: 400 });
    if (!clientId) return apiError('clientId is required', { status: 400 });
    if (!storagePath) return apiError('path is required', { status: 400 });

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgIdInput);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      return apiError(e, { status, message: getErrorMessage(e) || 'Forbidden' });
    }

    const abuse = await enforceAiAbuseGuard({
      req,
      namespace: 'ai.client_os.meetings.process',
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

    const expectedPrefix = `${orgId}/`;
    if (!storagePath.startsWith(expectedPrefix) || !storagePath.includes(`/${clientId}/`)) {
      return apiError('Forbidden', { status: 403 });
    }

    const supabase = createStorageClient();

    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
    if (downloadError || !downloadData) {
      return apiError(downloadError?.message || 'Failed to download from storage', { status: 500 });
    }

    const arrayBuffer = await downloadData.arrayBuffer();
    const inputBuf = Buffer.from(arrayBuffer);

    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');
    if (!isAudio && !isVideo) {
      return apiError('Only audio/video files are supported', { status: 400 });
    }

    if (isVideo) {
      const ffmpegOk = await isFfmpegAvailable();
      if (!ffmpegOk) {
        return apiError('Video processing unavailable on server', { status: 503 });
      }
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
          meta: { source: 'client-os-meetings-process', isVideo },
        });
      },
    });
    const transcript = out.text;

    const recordingUrl = `sb://${bucket}/${storagePath}`;

    const saved = await analyzeAndStoreMeeting({
      orgId,
      clientId,
      title,
      location,
      transcript,
      recordingUrl,
    });

    // Best-effort: also write to client_sessions so Client OS lists can show the recording and analysis.
    try {
      const analysisObj = asObject(saved.analysis) ?? {};
      const summary = typeof analysisObj.summary === 'string' ? analysisObj.summary : null;

      await createClinicSessionForOrganizationId({
        organizationId: orgId,
        clientId,
        startAt: new Date().toISOString(),
        status: 'completed',
        sessionType: title,
        location,
        summary,
        metadata: {
          meetingId: saved.meetingId,
          recordingUrl,
          transcript,
          aiAnalysis: saved.analysis ?? null,
        },
      });
    } catch {
      // ignore
    }

    return apiSuccessCompat({ meetingId: saved.meetingId, analysis: saved.analysis, transcript }, { headers: abuse.headers });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Processing failed' });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export const POST = shabbatGuard(POSTHandler);
