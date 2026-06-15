import { useState, useEffect, useRef } from 'react';
import { IconDocs } from '../../../components/icons';
import styles from '../AdminPage.module.css';

export function DocsButton({ onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function pick(type) { setOpen(false); onOpen(type); }

  return (
    <div className={styles.bellWrapper} ref={ref}>
      <button className={styles.docsBtn} onClick={() => setOpen(o => !o)} title="Правовые документы">
        <IconDocs />
      </button>
      {open && (
        <div className={styles.notifPanel} style={{ minWidth: 260 }}>
          <div className={styles.notifHeader}>
            <span className={styles.notifTitle}>Правовые документы</span>
          </div>
          <div className={styles.notifList}>
            <button className={styles.docMenuItem} onClick={() => pick('school')}>
              Сведения об автошколе
            </button>
            <button className={styles.docMenuItem} onClick={() => pick('privacy')}>
              Политика обработки персональных данных
            </button>
            <button className={styles.docMenuItem} onClick={() => pick('terms')}>
              Пользовательское соглашение
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
