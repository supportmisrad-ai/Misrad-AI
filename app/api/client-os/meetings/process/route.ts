import { apiError, apiSuccessCompat } from '@/lib/server/api-response';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createServiceRoleStorageClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { analyzeAndStoreMeeting } from '@/lib/services/client-os/meetings/analyze-and-store-meeting';
import { createClinicSessionForOrganizationId } from '@/lib/services/client-clinic/create-clinic-session';
import { getAuthenticatedUser } from '@/lib/auth';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { AIService } from '@/lib/services/ai/AIService';
import { formatTranscriptText } from '@/lib/services/ai/format-transcript';
import { proofreadHebrewTranscript } from '@/lib/services/ai/proofread-transcript';
import { enforceAiAbuseGuard, withAiLoadIsolation } from '@/lib/server/aiAbuseGuard';
import { asObject, getErrorMessage, getErrorStatus } from '@/lib/server/workspace-access/utils';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';
export const maxDuration = 120;

const IS_PROD = process.env.NODE_ENV === 'production';

const MEETING_RECORDINGS_BUCKET = 'meeting-recordings';
const MAX_MEETING_RECORDING_SIZE = 1024 * 1024 * 1024; // 1GB

function hasPathTraversal(v: string): boolean {
  const s = String(v || '');
  if (!s) return false;
  if (s.includes('..')) return true;
  if (s.includes('\\')) return true;
  if (s.includes('//')) return true;
  return false;
}

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

    const bodyOrgKey = String(bodyObj.orgId || '').trim();
    let headerOrgKey = '';
    try {
      headerOrgKey = getOrgKeyOrThrow(req);
    } catch {
      headerOrgKey = '';
    }
    const orgKey = headerOrgKey || bodyOrgKey;
    const clientId = String(bodyObj.clientId || '');
    const title = String(bodyObj.title || 'פגישה');
    const location = normalizeLocation(bodyObj.location);
    const bucket = String(bodyObj.bucket || MEETING_RECORDINGS_BUCKET);
    const storagePath = String(bodyObj.path || '');
    const mimeType = String(bodyObj.mimeType || '');
    const fileName = String(bodyObj.fileName || 'recording');
    const mode = String(bodyObj.mode || 'analyze') === 'transcribe' ? 'transcribe' : 'analyze';

    if (!orgKey) return apiError('orgId is required', { status: 400 });
    if (!clientId) return apiError('clientId is required', { status: 400 });
    if (!storagePath) return apiError('path is required', { status: 400 });

    // Validate UUID format for clientId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
    if (!isUuid) return apiError('clientId must be a valid UUID', { status: 400 });

    let orgId: string;
    try {
      const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgKey);
      orgId = String(workspace.id);
    } catch (e: unknown) {
      const status = getErrorStatus(e) ?? 403;
      const safeMsg = 'Forbidden';
      return apiError(e, { status, message: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg });
    }

    if (headerOrgKey && bodyOrgKey && headerOrgKey !== bodyOrgKey) {
      try {
        const otherKey = headerOrgKey === orgKey ? bodyOrgKey : headerOrgKey;
        const { workspace: otherWorkspace } = await getWorkspaceByOrgKeyOrThrow(otherKey);
        if (String(otherWorkspace.id) !== String(orgId)) {
          return apiError('Conflicting workspace context', { status: 400 });
        }
      } catch {
        return apiError('Conflicting workspace context', { status: 400 });
      }
    }

    // Resolve clientId to a MisradClient.id (FK: misrad_meetings_client_id_fkey)
    // The UI may send a ClientClient ID — we need to find or create the matching MisradClient.
    let resolvedMisradClientId = clientId;

    const directMatch = await prisma.misradClient.findFirst({
      where: { id: clientId, organizationId: orgId },
      select: { id: true },
    });

    if (!directMatch) {
      // clientId might be a ClientClient ID — check the cross-module link
      const linkedMisrad = await prisma.misradClient.findFirst({
        where: { clientClientId: clientId, organizationId: orgId },
        select: { id: true },
      });

      if (linkedMisrad) {
        resolvedMisradClientId = linkedMisrad.id;
      } else {
        // No MisradClient exists — auto-create from ClientClient data
        const cc = await prisma.clientClient.findFirst({
          where: { id: clientId, organizationId: orgId },
          select: { id: true, fullName: true },
        });
        if (!cc) {
          return apiError('הלקוח לא נמצא במערכת. יש ליצור את הלקוח קודם.', { status: 404 });
        }
        const initials = cc.fullName.replace(/\s+/g, ' ').trim().split(' ').map(w => w[0] || '').join('').substring(0, 2) || '??';
        const newMisrad = await prisma.misradClient.create({
          data: {
            organizationId: orgId,
            clientClientId: cc.id,
            name: cc.fullName,
            industry: 'לא צוין',
            employeeCount: 0,
            logoInitials: initials,
            healthScore: 50,
            healthStatus: 'STABLE',
            status: 'ACTIVE',
            type: 'RETAINER',
            tags: [],
            monthlyRetainer: 0,
            profitMargin: 0,
            lifetimeValue: 0,
            hoursLogged: 0,
            internalHourlyRate: 0,
            directExpenses: 0,
            profitabilityVerdict: 'לא חושב',
            lastContact: new Date().toLocaleDateString('he-IL'),
            nextRenewal: '',
            mainContact: cc.fullName,
            mainContactRole: '',
            strengths: [],
            weaknesses: [],
            sentimentTrend: [],
            referralStatus: '',
            healthBreakdown: {},
            engagementMetrics: {},
          },
          select: { id: true },
        });
        resolvedMisradClientId = newMisrad.id;
        console.log('[client-os/meetings/process] Auto-created MisradClient from ClientClient', {
          clientClientId: cc.id,
          misradClientId: newMisrad.id,
          name: cc.fullName,
        });
      }
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
    if (
      bucket !== MEETING_RECORDINGS_BUCKET ||
      hasPathTraversal(storagePath) ||
      !storagePath.startsWith(expectedPrefix) ||
      !storagePath.includes(`/${clientId}/`)
    ) {
      return apiError('Forbidden', { status: 403 });
    }

    const supabase = createServiceRoleStorageClient({ reason: 'meeting-recording-download', allowUnscoped: true });

    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucket).download(storagePath);
    if (downloadError || !downloadData) {
      const safeMsg = 'Failed to download from storage';
      return apiError(IS_PROD ? safeMsg : downloadError?.message || safeMsg, { status: 500 });
    }

    const blobSize = typeof (downloadData as { size?: unknown }).size === 'number' ? (downloadData as { size: number }).size : null;
    if (blobSize !== null && blobSize > MAX_MEETING_RECORDING_SIZE) {
      return apiError('File too large', { status: 400 });
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
    
    console.log('[client-os/meetings/process] BEFORE AI transcription', {
      fileName,
      originalMimeType: mimeType,
      audioMimeType: audioMime,
      inputBufferSize: inputBuf.byteLength,
      audioBufferSize: audioBuf.byteLength,
      isVideo,
      isAudio,
      audioPathExists: await fs.access(audioPath).then(() => true).catch(() => false),
    });

    if (audioBuf.byteLength === 0) {
      console.error('[client-os/meetings/process] Audio buffer is EMPTY!', { fileName, audioPath });
      return apiError('הקובץ ריק לאחר עיבוד. אנא בדוק שהקובץ תקין.', { status: 422 });
    }

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
    let transcript = formatTranscriptText(String(out.text || '').trim());

    if (!transcript) {
      console.warn('[client-os/meetings/process] AI returned empty transcript', {
        provider: out.provider,
        model: out.model,
        fileName,
        mimeType,
        isVideo,
        audioBufSize: audioBuf.byteLength,
      });
      return apiError('\u05d4\u05e7\u05dc\u05d8\u05d4 \u05e8\u05d9\u05e7\u05d4 \u05d0\u05d5 \u05dc\u05d0 \u05de\u05db\u05d9\u05dc\u05d4 \u05e9\u05de\u05e2 \u05d1\u05e8\u05d5\u05e8. \u05d1\u05d3\u05d5\u05e7 \u05e9\u05d4\u05e7\u05d5\u05d1\u05e5 \u05ea\u05e7\u05d9\u05df \u05d5\u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1.', { status: 422 });
    }

    // Best-effort Hebrew spelling correction
    transcript = await proofreadHebrewTranscript(transcript);

    const recordingUrl = `sb://${bucket}/${storagePath}`;

    if (mode === 'transcribe') {
      const now = new Date();
      const meetingDateLabel = now.toLocaleDateString('he-IL');

      const meeting = await prisma.misradMeeting.create({
        data: {
          organization_id: orgId,
          client_id: resolvedMisradClientId,
          date: meetingDateLabel,
          title,
          location,
          attendees: [],
          transcript,
          summary: null,
          recordingUrl,
          manualNotes: null,
        } as unknown as Prisma.MisradMeetingUncheckedCreateInput,
        select: { id: true },
      });

      try {
        await createClinicSessionForOrganizationId({
          organizationId: orgId,
          clientId: clientId,
          startAt: now.toISOString(),
          status: 'completed',
          sessionType: title,
          location,
          summary: null,
          metadata: {
            meetingId: meeting.id,
            recordingUrl,
            transcript,
            mode: 'transcribe',
          },
        });
      } catch {
        // ignore
      }

      return apiSuccessCompat({ meetingId: meeting.id, transcript, mode: 'transcribe' as const }, { headers: abuse.headers });
    }

    let saved: { meetingId: string; analysis: unknown } | null = null;
    try {
      saved = await analyzeAndStoreMeeting({
        orgId,
        clientId: resolvedMisradClientId,
        title,
        location,
        transcript,
        recordingUrl,
      });
    } catch (analysisErr) {
      console.error('[client-os/meetings/process] Analysis failed, returning transcript only', {
        error: analysisErr instanceof Error ? analysisErr.message : String(analysisErr),
      });
      // Analysis failed - still return the transcript so the user sees their transcription
      return apiSuccessCompat({ transcript, mode: 'transcribe' as const, analysisError: 'ניתוח השיחה נכשל, אבל התמלול נשמר בהצלחה.' }, { headers: abuse.headers });
    }

    // Best-effort: also write to client_sessions so Client OS lists can show the recording and analysis.
    try {
      const analysisObj = asObject(saved.analysis) ?? {};
      const summary = typeof analysisObj.summary === 'string' ? analysisObj.summary : null;

      await createClinicSessionForOrganizationId({
        organizationId: orgId,
        clientId: clientId,
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

    return apiSuccessCompat({ meetingId: saved.meetingId, analysis: saved.analysis, transcript, mode: 'analyze' as const }, { headers: abuse.headers });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.constructor.name || e.name : 'unknown';
    console.error('[client-os/meetings/process] Error:', { name: errName, message: errMsg, stack: e instanceof Error ? e.stack : undefined });
    return apiError(e, { status: 500, message: `Processing failed: [${errName}] ${errMsg}` });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export const POST = shabbatGuard(POSTHandler);
