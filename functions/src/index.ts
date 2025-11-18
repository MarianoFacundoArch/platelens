import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';

import { createLog, getLogs } from './handlers/logs';
import { registerDevice } from './handlers/devices';
import { getRemoteConfig } from './handlers/config';
import { handleScan } from './handlers/scan';
import { revenueCatWebhook } from './handlers/revenuecat';
import { sendTestNotification } from './handlers/notify';
import { runNotificationCadenceJob } from './jobs/notificationCadence';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

app.post('/v1/scan', handleScan);
app.post('/v1/logs', createLog);
app.get('/v1/logs', getLogs);
app.post('/v1/devices/register', registerDevice);
app.get('/v1/config', getRemoteConfig);
app.post('/v1/notify/test', sendTestNotification);
app.post('/v1/rc/webhook', revenueCatWebhook);

export const api = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .https.onRequest(app);

export const scheduleNotifications = functions.pubsub
  .schedule('every 3 hours')
  .onRun(async () => runNotificationCadenceJob());
