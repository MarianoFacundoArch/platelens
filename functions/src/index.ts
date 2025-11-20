import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { createLog, getLogs } from './handlers/logs';
import { registerDevice } from './handlers/devices';
import { getRemoteConfig } from './handlers/config';
import { handleScan, handleTextScan } from './handlers/scan';
import { revenueCatWebhook } from './handlers/revenuecat';
import { sendTestNotification } from './handlers/notify';
import { saveMeal, getTodaysMeals, deleteMeal, updateMeal, getMealHistory } from './handlers/meals';
import { getTrends, getStreaks, getMonthlySummary } from './handlers/analytics';
import { runNotificationCadenceJob } from './jobs/notificationCadence';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

app.post('/v1/scan', handleScan);
app.post('/v1/scan-text', handleTextScan);
app.post('/v1/meals', saveMeal);
app.get('/v1/meals', getTodaysMeals);
app.get('/v1/meals/today', getTodaysMeals);
app.get('/v1/meals/history', getMealHistory);
app.patch('/v1/meals', updateMeal);
app.delete('/v1/meals', deleteMeal);
app.get('/v1/analytics/trends', getTrends);
app.get('/v1/analytics/streaks', getStreaks);
app.get('/v1/analytics/monthly', getMonthlySummary);
app.post('/v1/logs', createLog);
app.get('/v1/logs', getLogs);
app.post('/v1/devices/register', registerDevice);
app.get('/v1/config', getRemoteConfig);
app.post('/v1/notify/test', sendTestNotification);
app.post('/v1/rc/webhook', revenueCatWebhook);

export const api = onRequest(
  {
    timeoutSeconds: 120,
    memory: '1GiB',
    cors: true,
  },
  app
);

export const scheduleNotifications = onSchedule('every 3 hours', async () => {
  await runNotificationCadenceJob();
});
