import crypto from 'crypto';
import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';

type RCEvent = {
  event: {
    type: string;
    product_id: string;
    app_user_id: string;
    transaction_id: string;
    price: number;
    currency: string;
  };
  subscriber: {
    original_app_user_id: string;
    subscriptions?: Record<string, unknown>;
  };
};

const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

export async function revenueCatWebhook(req: Request, res: Response) {
  try {
    if (!secret) {
      throw new Error('RevenueCat secret missing');
    }

    const signature = req.header('Authorization');
    if (signature !== secret) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body as RCEvent;
    const uid = payload.event.app_user_id ?? payload.subscriber.original_app_user_id;
    if (!uid) {
      return res.status(200).json({ ignored: true });
    }

    const type = payload.event.type;
    const status = mapStatus(type);

    await firestore.collection('users').doc(uid).set(
      {
        uid,
        subscriptionStatus: status,
        rcAppUserId: payload.event.app_user_id,
        currency: payload.event.currency,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    await firestore.collection('events').doc().set({
      id: `${uid}-${payload.event.transaction_id}`,
      uid,
      type: 'subscription_status_changed',
      props: { event: type, productId: payload.event.product_id },
      ts: Date.now(),
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('revenuecat-webhook', error);
    return res.status(500).json({ error: 'Webhook failed' });
  }
}

function mapStatus(eventType: string) {
  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      return 'active';
    case 'TRIAL_STARTED':
      return 'trialing';
    case 'CANCELLATION':
    case 'UNCANCELLATION':
      return 'expired';
    default:
      return 'none';
  }
}
