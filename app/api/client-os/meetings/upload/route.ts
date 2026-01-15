import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { analyzeAndStoreMeeting } from '@/app/actions/client-portal';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

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

    const contentType = req.headers.get('content-type') || '';

    let orgIdInput = '';
    let clientId = '';
    let title = 'פגישה';
    let location = 'ZOOM' as 'ZOOM' | 'FRONTAL' | 'PHONE';
    let mimeType = '';
    let fileName = 'upload';
    let inputBuf: Buffer | null = null;

    if (contentType.includes('application/json')) {
      const body = (await req.json()) as {
        orgId?: string;
        clientId?: string;
        title?: string;
        location?: 'ZOOM' | 'FRONTAL' | 'PHONE';
        fileName?: string;
        mimeType?: string;
        dataBase64?: string;
      };

      orgIdInput = String(body.orgId || '');
      clientId = String(body.clientId || '');
      title = String(body.title || title);
      location = (body.location || location) as any;
      fileName = String(body.fileName || fileName);
      mimeType = String(body.mimeType || '');

      if (!body.dataBase64) return NextResponse.json({ error: 'dataBase64 is required' }, { status: 400 });
      inputBuf = decodeBase64ToBuffer(body.dataBase64);
    } else {
      // Fallback to multipart/form-data
      try {
        const formData = await req.formData();
        orgIdInput = String(formData.get('orgId') || '');
        clientId = String(formData.get('clientId') || '');
        title = String(formData.get('title') || title);
        location = String(formData.get('location') || location) as any;

        const file = formData.get('file');
        if (!file || !(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
        fileName = file.name || fileName;
        mimeType = file.type || '';
        inputBuf = await fileToBuffer(file);
      } catch (e: any) {
        return NextResponse.json(
          {
            error: 'Failed to parse multipart form data. Try JSON upload.',
            details: e?.message ?? String(e),
            contentType,
          },
          { status: 400 }
        );
      }
    }

    if (!orgIdInput) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    if (!inputBuf) return NextResponse.json({ error: 'Missing file data' }, { status: 400 });

    let orgId: string;
    try {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(orgIdInput);
      orgId = String(workspace.id);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
    }

    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');
    if (!isAudio && !isVideo) {
      return NextResponse.json({ error: 'Only audio/video files are supported' }, { status: 400 });
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

    const ai = AIService.getInstance();
    const out = await ai.transcribe({
      featureKey: 'client_os.meetings.transcription',
      organizationId: orgId,
      audioBuffer: bufferToArrayBuffer(audioBuf),
      mimeType: audioMime,
      meta: { source: 'client-os-meetings-upload', isVideo },
    });
    const transcript = out.text;

    const saved = await analyzeAndStoreMeeting({
      orgId,
      clientId,
      title,
      location,
      transcript,
    });

    return NextResponse.json({ meetingId: saved.meetingId, analysis: saved.analysis, transcript });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Upload failed' }, { status: 500 });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export const POST = shabbatGuard(POSTHandler);
