const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function subscribeToPush(apiClient) {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) {
    console.error('subscribeToPush: REACT_APP_VAPID_PUBLIC_KEY не задан в .env');
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission; 

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { endpoint, keys } = subscription.toJSON();
    const res = await apiClient.post('/push/subscribe/', { endpoint, keys });
    console.log('Push subscribe response:', res.status, res.data);

    return 'granted';
  } catch (err) {
    console.error('subscribeToPush: ошибка при подписке:', err?.response?.status, err?.response?.data || err);
    return 'denied';
  }
}

export async function unsubscribeFromPush(apiClient) {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription.toJSON();

    await apiClient.delete('/push/subscribe/', { data: { endpoint } });
    await subscription.unsubscribe();
  } catch (err) {
    console.error('unsubscribeFromPush: ошибка:', err);
  }
}
