import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';

export async function createLog(req: Request, res: Response) {
  try {
    const { uid, dateISO, items, totals, macros, source, confidence } = req.body ?? {};
    if (!uid || !dateISO || !Array.isArray(items)) {
      return res.status(400).json({ error: 'uid, dateISO, and items are required' });
    }

    const logRef = firestore.collection('logs').doc();
    await logRef.set({
      id: logRef.id,
      uid,
      dateISO,
      items,
      totalCalories: totals?.calories ?? 0,
      macros: macros ?? totals ?? { p: 0, c: 0, f: 0 },
      source: source ?? { method: 'camera' },
      confidence: confidence ?? 0,
      createdAt: new Date().toISOString(),
    });

    await firestore.collection('events').doc().set({
      id: `${logRef.id}-log`,
      uid,
      type: 'log_saved',
      props: { dateISO, calories: totals?.calories ?? 0 },
      ts: Date.now(),
    });

    return res.status(201).json({ id: logRef.id });
  } catch (error) {
    console.error('create-log', error);
    return res.status(500).json({ error: 'Failed to save log' });
  }
}

export async function getLogs(req: Request, res: Response) {
  try {
    const { uid, date } = req.query as { uid?: string; date?: string };
    if (!uid || !date) {
      return res.status(400).json({ error: 'uid and date are required' });
    }

    const snap = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '==', date)
      .get();

    const logs = snap.docs.map((doc) => doc.data());
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.totalCalories ?? 0),
        p: acc.p + (log.macros?.p ?? 0),
        c: acc.c + (log.macros?.c ?? 0),
        f: acc.f + (log.macros?.f ?? 0),
      }),
      { calories: 0, p: 0, c: 0, f: 0 },
    );

    return res.json({ logs, totals });
  } catch (error) {
    console.error('get-logs', error);
    return res.status(500).json({ error: 'Failed to load logs' });
  }
}
