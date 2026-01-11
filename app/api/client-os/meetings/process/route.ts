import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase';
import { analyzeAndStoreMeeting } from '@/app/actions/client-portal';
import { getAuthenticatedUser } from '@/lib/auth';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

export const runtime = 'nodejs';

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

async function transcribeAudioWithGemini(params: { audioBuffer: Buffer; mimeType: string }): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('Missing API_KEY env var');

  const ai = new GoogleGenAI({ apiKey });
  const base64 = params.audioBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Transcribe this audio in Hebrew. Use speaker labels when possible (נציג / לקוח). Return ONLY the transcript text.',
          },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error('No transcription returned');
  return text;
}

export async function POST(req: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'client-os-meeting-process-'));

  try {
    await getAuthenticatedUser();

    const body = (await req.json().catch(() => ({}))) as {
      orgId?: string;
      clientId?: string;
      title?: string;
      location?: 'ZOOM' | 'FRONTAL' | 'PHONE';
      bucket?: string;
      path?: string;
      mimeType?: string;
      fileName?: string;
    };

    const orgId = String(body.orgId || '');
    const clientId = String(body.clientId || '');
    const title = String(body.title || 'פגישה');
    const location = (body.location || 'ZOOM') as 'ZOOM' | 'FRONTAL' | 'PHONE';
    const bucket = String(body.bucket || 'meeting-recordings');
    const storagePath = String(body.path || '');
    const mimeType = String(body.mimeType || '');
    const fileName = String(body.fileName || 'recording');

    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    if (!storagePath) return NextResponse.json({ error: 'path is required' }, { status: 400 });

    const expectedPrefix = `${orgId}/`;
    if (!storagePath.startsWith(expectedPrefix) || !storagePath.includes(`/${clientId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await requireWorkspaceAccessByOrgSlugApi(orgId);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
    }

    const supabase = createClient();

    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
    if (downloadError || !downloadData) {
      return NextResponse.json({ error: downloadError?.message || 'Failed to download from storage' }, { status: 500 });
    }

    const arrayBuffer = await downloadData.arrayBuffer();
    const inputBuf = Buffer.from(arrayBuffer);

    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');
    if (!isAudio && !isVideo) {
      return NextResponse.json({ error: 'Only audio/video files are supported' }, { status: 400 });
    }

    if (isVideo) {
      const ffmpegOk = await isFfmpegAvailable();
      if (!ffmpegOk) {
        return NextResponse.json({
          error: 'Video processing unavailable on server',
        }, { status: 503 });
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
    const transcript = await transcribeAudioWithGemini({ audioBuffer: audioBuf, mimeType: audioMime });

    // Signed URL for playback/download (bucket is private)
    let recordingUrl: string | null = null;
    try {
      const { data: signed, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      if (!signedErr && signed?.signedUrl) recordingUrl = signed.signedUrl;
    } catch {
      // ignore
    }

    const saved = await analyzeAndStoreMeeting({
      orgId,
      clientId,
      title,
      location,
      transcript,
      recordingUrl,
    });

    return NextResponse.json({ meetingId: saved.meetingId, analysis: saved.analysis, transcript });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Processing failed' }, { status: 500 });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
