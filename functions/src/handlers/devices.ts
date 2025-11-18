import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';

export async function registerDevice(req: Request, res: Response) {
  try {
    const { uid, expoPushToken, platform } = req.body ?? {};
    if (!uid || !expoPushToken) {
      return res.status(400).json({ error: 'uid and expoPushToken are required' });
    }

    const docRef = firestore.collection('devices').doc(expoPushToken);
    await docRef.set(
      {
        id: expoPushToken,
        uid,
        expoPushToken,
        platform: platform ?? 'unknown',
        lastActive: new Date().toISOString(),
      },
      { merge: true },
    );

    return res.json({ id: docRef.id });
  } catch (error) {
    console.error('register-device', error);
    return res.status(500).json({ error: 'Failed to register device' });
  }
}
