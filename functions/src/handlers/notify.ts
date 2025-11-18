import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';
import { env } from '../lib/env';

export async function sendTestNotification(req: Request, res: Response) {
  try {
    const { uid, title = 'PlateLens', body = 'Test notification' } = req.body ?? {};
    if (!uid) {
      return res.status(400).json({ error: 'uid required' });
    }

    const snap = await firestore.collection('devices').where('uid', '==', uid).get();
    if (snap.empty) {
      return res.status(404).json({ error: 'No devices registered' });
    }

    const messages = snap.docs.map((doc) => ({
      to: doc.get('expoPushToken'),
      title,
      body,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });

    return res.json({ delivered: messages.length });
  } catch (error) {
    console.error('notify-test', error);
    return res.status(500).json({ error: 'Failed to send' });
  }
}
