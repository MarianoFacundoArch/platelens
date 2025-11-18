import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';
import { defaultRemoteConfig } from '../shared/constants/remoteConfig';

export async function getRemoteConfig(_req: Request, res: Response) {
  try {
    const doc = await firestore.collection('remote_config').doc('app').get();
    const data = doc.exists ? doc.data() : {};
    return res.json({ ...defaultRemoteConfig, ...data });
  } catch (error) {
    console.error('remote-config', error);
    return res.status(500).json({ error: 'Failed to load config' });
  }
}
