import { firestore } from '../lib/firebase';
import { env } from '../lib/env';

type MessageTemplate = {
  key: string;
  title: string;
  body: string;
};

const templates: MessageTemplate[] = [
  {
    key: 'day0_evening',
    title: 'Protect your streak',
    body: 'Start your PlateLens trial tonight and snap your first meal.',
  },
  {
    key: 'day1_morning',
    title: 'Breakfast check-in',
    body: 'Keep momentum! Log your first meal to lock the streak.',
  },
];

export async function runNotificationCadenceJob() {
  const cadence = env.POSTHOG_KEY ? 'experiment' : 'aggressive';
  const now = new Date();

  const deviceSnap = await firestore.collection('devices').get();
  const notifications: Array<{ to: string; title: string; body: string }> = [];

  deviceSnap.forEach((doc) => {
    const token = doc.get('expoPushToken');
    if (!token) return;
    const template = templates[now.getHours() < 12 ? 0 : 1];
    notifications.push({ to: token, title: template.title, body: template.body });
  });

  if (!notifications.length) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(notifications),
  });
}
