/**
 * src/utils/pushNotifications.js
 *
 * Утилиты для работы с браузерными push-уведомлениями (Web Push / VAPID).
 *
 * Использование:
 *   import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '../utils/pushNotifications';
 *
 *   // После логина — предложить подписку:
 *   if (isPushSupported()) {
 *     await subscribeToPush(client);
 *   }
 */

// VAPID public key берётся из .env (REACT_APP_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

/**
 * Конвертирует base64url-строку в Uint8Array.
 * Это требует applicationServerKey у pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Проверяет, поддерживает ли браузер Web Push.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Возвращает текущий статус разрешения: 'default' | 'granted' | 'denied'
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Подписывает пользователя на push-уведомления и регистрирует подписку на бэкенде.
 *
 * @param {import('axios').AxiosInstance} apiClient — axios-инстанс с уже установленным Authorization
 * @returns {Promise<'granted' | 'denied' | 'unsupported'>}
 */
export async function subscribeToPush(apiClient) {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) {
    console.error('subscribeToPush: REACT_APP_VAPID_PUBLIC_KEY не задан в .env');
    return 'unsupported';
  }

  // Запрашиваем разрешение у пользователя
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission; // 'denied' или 'default'

  try {
    const registration = await navigator.serviceWorker.ready;

    // Если подписка уже есть — не создаём повторно, просто синхронизируем с бэком
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Отправляем подписку на бэкенд
    const { endpoint, keys } = subscription.toJSON();
    const res = await apiClient.post('/push/subscribe/', { endpoint, keys });
    console.log('Push subscribe response:', res.status, res.data);

    return 'granted';
  } catch (err) {
    console.error('subscribeToPush: ошибка при подписке:', err?.response?.status, err?.response?.data || err);
    return 'denied';
  }
}

/**
 * Отписывает пользователя: удаляет подписку в браузере и на бэкенде.
 *
 * @param {import('axios').AxiosInstance} apiClient
 */
export async function unsubscribeFromPush(apiClient) {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription.toJSON();

    // Сначала удаляем на бэкенде, потом в браузере
    await apiClient.delete('/push/subscribe/', { data: { endpoint } });
    await subscription.unsubscribe();
  } catch (err) {
    console.error('unsubscribeFromPush: ошибка:', err);
  }
}
