import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminAPI } from '../../api/client';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import { NotificationBell } from './components/NotificationBell';
import { DocsButton } from './components/DocsButton';
import { DashboardTab }  from './tabs/DashboardTab';
import { ManagementTab } from './tabs/ManagementTab';
import { ReferralTab }   from './tabs/ReferralTab';
import { InvoicesTab }   from './tabs/InvoicesTab';
import styles from './AdminPage.module.css';
import logoSrc from '../../assets/logo.svg';

const NAV_ITEMS = ['Главная', 'Управление', 'Реферальная система', 'Счета'];

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Главная');
  const [legalDoc, setLegalDoc]   = useState(null);
  const [adminName, setAdminName] = useState(() => {
    const fn = localStorage.getItem('user_first_name');
    const pt = localStorage.getItem('user_patronymic');
    if (fn && pt) return `${fn} ${pt}`;
    return fn || '';
  });

  useEffect(() => {
    adminAPI.getMyProfile()
      .then(r => {
        const d = r.data;
        const fn = d.first_name || '';
        const pt = d.patronymic || '';
        if (fn) {
          const name = pt ? `${fn} ${pt}` : fn;
          setAdminName(name);
          localStorage.setItem('user_first_name', fn);
          localStorage.setItem('user_patronymic', pt);
        }
      })
      .catch(() => {});
  }, []); 

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className={styles.app}>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src={logoSrc} alt="Логотип" className={styles.logoImg} />
          </div>
          <nav className={styles.headerNav}>
            {NAV_ITEMS.map(item => (
              <button key={item}
                className={`${styles.navBtn} ${activeNav === item ? styles.navBtnActive : ''}`}
                onClick={() => setActiveNav(item)}>
                {item}
              </button>
            ))}
          </nav>
          <div className={styles.headerRight}>
            <NotificationBell />
            <DocsButton onOpen={setLegalDoc} />
            <span className={styles.userName}>{adminName || 'Администратор'}</span>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Выйти">→</button>
          </div>
        </header>

        <div className={styles.content}>
          {activeNav === 'Главная'             && <DashboardTab />}
          {activeNav === 'Управление'          && <ManagementTab />}
          {activeNav === 'Реферальная система' && <ReferralTab />}
          {activeNav === 'Счета'               && <InvoicesTab />}
        </div>
      </div>
      {legalDoc && <LegalDocModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
}
