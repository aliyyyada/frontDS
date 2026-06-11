import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../../api/client';
import { IconBell } from '../../../components/icons';
import { fmtDateTime } from '../../../utils/date';
import styles from '../AdminPage.module.css';

export function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef(null);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  function load() {
    setLoading(true);
    adminAPI.getAdminNotifications()
      .then(r => setNotifs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function loadSilent() {
    adminAPI.getAdminNotifications()
      .then(r => setNotifs(r.data))
      .catch(() => {});
  }

  function handleOpen() {
    if (!open) { load(); setOpen(true); }
    else setOpen(false);
  }

  useEffect(() => {
    const id = setInterval(loadSilent, 30000);
    return () => clearInterval(id);
  }, []); 

  useEffect(() => {
    if (open && notifs.some(n => !n.is_read)) {
      adminAPI.markAllAdminNotificationsRead()
        .then(() => setNotifs(ns => ns.map(n => ({ ...n, is_read: true }))))
        .catch(() => {});
    }
  }, [open]); 

  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.bellWrapper} ref={panelRef}>
      <button className={styles.bellBtn} onClick={handleOpen} title="Уведомления">
        <IconBell />
        {unreadCount > 0 && (
          <span className={styles.bellBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className={styles.notifPanel}>
          <div className={styles.notifHeader}>
            <span className={styles.notifTitle}>Уведомления</span>
            <button className={styles.notifRefreshBtn} onClick={load} title="Обновить">↻</button>
          </div>
          {loading ? (
            <div className={styles.spinner} style={{ margin: '16px auto' }} />
          ) : notifs.length === 0 ? (
            <p className={styles.emptyText} style={{ padding: 16 }}>Нет уведомлений</p>
          ) : (
            <div className={styles.notifList}>
              {notifs.map(n => (
                <div key={n.id} className={`${styles.notifItem} ${n.is_read ? styles.notifRead : styles.notifUnread}`}>
                  <div className={styles.notifText}>{n.text}</div>
                  <div className={styles.notifDate}>{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
