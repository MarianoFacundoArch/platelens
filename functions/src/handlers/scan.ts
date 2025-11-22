import crypto from 'crypto';
import { Request, Response } from 'express';

import { firestore, storage } from '../lib/firebase';
import { detectFoodFromImage, detectFoodFromText } from '../lib/openai';
import { mergeTotals } from '../lib/nutrition';
import { ensureIngredientAndJob } from '../lib/ingredients';
import type { LogDoc, ScanJobDoc } from '../shared/types/firestore';
import { env } from '../lib/env';

const UPLOAD_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes
const JOBS_COLLECTION = 'scan_jobs';
const LOGS_COLLECTION = 'logs';

function formatDateISO(date: Date) {
  return date.toISOString().split('T')[0];
}

function normalizeDate(input?: string) {
  if (input) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateISO(parsed);
    }
  }
  return formatDateISO(new Date());
}

async function signUploadUrl(storagePath: string) {
  const emulatorHost =
    process.env.STORAGE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const bucket = storage.bucket();

  console.log('[signUploadUrl] emulatorHost:', emulatorHost || '(none)', 'bucket:', bucket.name, 'path:', storagePath);

  if (emulatorHost) {
    const host = emulatorHost.startsWith('http') ? emulatorHost : `http://${emulatorHost}`;
    const uploadUrl = `${host}/upload/storage/v1/b/${bucket.name}/o?uploadType=media&name=${encodeURIComponent(
      storagePath
    )}`;
    return { uploadUrl, uploadMethod: 'POST' as const };
  }

  console.log('[signUploadUrl] About to call getSignedUrl with:', {
    storagePath,
    bucketName: bucket.name,
    version: 'v4',
    action: 'write',
    expires: new Date(Date.now() + UPLOAD_URL_TTL_MS).toISOString(),
    contentType: 'image/webp',
  });

  const file = bucket.file(storagePath);
  console.log('[signUploadUrl] File object created:', {
    fileName: file.name,
    bucketName: file.bucket.name,
  });

  // Check storage-related environment variables
  console.log('[signUploadUrl] Storage env vars:', {
    STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST,
    FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    STORAGE_API_ENDPOINT: process.env.STORAGE_API_ENDPOINT,
    GCS_API_ENDPOINT: process.env.GCS_API_ENDPOINT,
    CLOUD_STORAGE_EMULATOR_ENDPOINT: process.env.CLOUD_STORAGE_EMULATOR_ENDPOINT,
  });

  // Try to check if bucket exists first
  try {
    const [exists] = await bucket.exists();
    console.log('[signUploadUrl] Bucket exists check:', exists);
  } catch (err) {
    console.warn('[signUploadUrl] Failed to check bucket existence:', err);
  }

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + UPLOAD_URL_TTL_MS,
    contentType: 'image/webp',
  });

  console.log('[signUploadUrl] SUCCESS! Generated signed URL:', uploadUrl.substring(0, 100) + '...');

  return { uploadUrl, uploadMethod: 'PUT' as const };
}

async function signReadUrl(storagePath: string) {
  const emulatorHost =
    process.env.STORAGE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const bucket = storage.bucket();

  console.log('[signReadUrl] emulatorHost:', emulatorHost || '(none)', 'bucket:', bucket.name, 'path:', storagePath);

  if (emulatorHost) {
    const host = emulatorHost.startsWith('http') ? emulatorHost : `http://${emulatorHost}`;
    return `${host}/storage/v1/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  const [readUrl] = await bucket.file(storagePath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + UPLOAD_URL_TTL_MS,
  });

  return readUrl;
}

export async function initiateScan(req: Request, res: Response) {
  try {
    const { uid } = req.body ?? {};
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    console.log('[initiateScan] project/bucket', env.firebaseProjectId, storage.bucket().name);
    console.log('[initiateScan] GAC:', process.env.GOOGLE_APPLICATION_CREDENTIALS || '(unset)');

    const scanId = crypto.randomUUID();
    const storagePath = `scan-uploads/${uid}/${scanId}.webp`;
    const { uploadUrl, uploadMethod } = await signUploadUrl(storagePath);
    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_MS).toISOString();
    const now = new Date().toISOString();

    const doc: ScanJobDoc = {
      scanId,
      uid,
      storagePath,
      source: 'camera',
      status: 'init',
      createdAt: now,
      updatedAt: now,
    };

    await firestore.collection(JOBS_COLLECTION).doc(scanId).set(doc);

    return res.json({
      scanId,
      storagePath,
      uploadUrl,
      uploadMethod,
      uploadHeaders: { 'Content-Type': 'image/webp' },
      expiresAt,
    });
  } catch (error) {
    console.error('initiate-scan-handler', error);
    return res.status(500).json({ error: 'Failed to init scan' });
  }
}

export async function handleScan(req: Request, res: Response) {
  try {
    const { scanId, uid, dateISO, textDescription, source } = req.body ?? {};

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const isText = source === 'text';
    const resolvedScanId = scanId || crypto.randomUUID();
    const now = new Date();
    const nowISO = now.toISOString();
    const dayISO = normalizeDate(dateISO);

    const jobRef = firestore.collection(JOBS_COLLECTION).doc(resolvedScanId);
    const existingJobSnap = await jobRef.get();
    const existingJob = existingJobSnap.exists ? (existingJobSnap.data() as ScanJobDoc) : undefined;

    if (!isText && !existingJob) {
      return res.status(400).json({ error: 'scanId not initialized; call /scan/init first' });
    }

    let storagePath: string | undefined = existingJob?.storagePath;
    if (!isText && !storagePath) {
      return res.status(400).json({ error: 'storagePath missing for photo scan' });
    }

    const resolvedMealId =
      existingJob?.mealId ?? firestore.collection(LOGS_COLLECTION).doc().id;
    const logRef = firestore.collection(LOGS_COLLECTION).doc(resolvedMealId);

    // Create or update the pending meal placeholder
    const pendingLog: Partial<LogDoc> = {
      id: logRef.id,
      uid,
      dateISO: dayISO,
      createdAt: nowISO,
      status: 'pending_scan',
      scanId: resolvedScanId,
      ingredientsList: [],
      totalCalories: 0,
      macros: { p: 0, c: 0, f: 0 },
      source: { method: isText ? 'text' : 'camera' },
      confidence: 0,
      ...(storagePath ? { imageStoragePath: storagePath } : {}),
    };

    await logRef.set(pendingLog, { merge: true });

    const jobPayload: Partial<ScanJobDoc> = {
      scanId: resolvedScanId,
      uid,
      ...(storagePath ? { storagePath } : {}),
      ...(isText && textDescription ? { textDescription } : {}),
      source: isText ? 'text' : 'camera',
      status: 'queued',
      updatedAt: nowISO,
      ...(existingJobSnap.exists ? {} : { createdAt: nowISO }),
      mealId: resolvedMealId,
      dateISO: dayISO,
    };

    if (isText && !textDescription) {
      return res.status(400).json({ error: 'textDescription is required for text scans' });
    }

    console.log('[handleScan] jobPayload', JSON.stringify(jobPayload, null, 2));
    await jobRef.set(jobPayload, { merge: true });

    return res.json({
      scanId: resolvedScanId,
      mealId: logRef.id,
      status: 'pending_scan',
      dateISO: dayISO,
    });
  } catch (error) {
    console.error('queue-scan-handler', error);
    return res.status(500).json({ error: 'Failed to queue scan' });
  }
}

export async function getScanStatus(req: Request, res: Response) {
  try {
    const { scanId: scanIdParam } = req.params;
    const scanId = scanIdParam || (req.query.scanId as string | undefined);

    if (!scanId) {
      return res.status(400).json({ error: 'scanId is required' });
    }

    const jobSnap = await firestore.collection(JOBS_COLLECTION).doc(scanId).get();
    if (!jobSnap.exists) {
      return res.status(404).json({ error: 'scan not found' });
    }

    const job = jobSnap.data() as ScanJobDoc;
    let meal: any = null;

    if (job.mealId) {
      const mealSnap = await firestore.collection(LOGS_COLLECTION).doc(job.mealId).get();
      if (mealSnap.exists) {
        const mealDoc = mealSnap.data() as LogDoc;
        const payload: any = { ...mealDoc };

        if (mealDoc.imageStoragePath) {
          payload.imageUrl = await signReadUrl(mealDoc.imageStoragePath);
        }

        meal = payload;
      }
    }

    return res.json({
      scanId,
      status: job.status,
      error: job.error ?? '',
      mealId: job.mealId ?? null,
      meal,
    });
  } catch (error) {
    console.error('get-scan-status-handler', error);
    return res.status(500).json({ error: 'Failed to get scan status' });
  }
}
