import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminAPI, getMediaUrl } from '../../api/client';
import { formatPhone as fmtPhoneUtil, normalizePhone } from '../../utils/phone';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import styles from './AdminPage.module.css';
import logoSrc from '../../assets/logo.svg';

function formatPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits[0] === '8' ? '7' + digits.slice(1) : digits;
  if (d.length !== 11) return raw;
  return `+${d[0]}(${d.slice(1,4)})-${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`;
}

function filterRuText(val) {
  const cleaned = val.replace(/[^а-яёА-ЯЁ\s\-']/g, '');
  return cleaned.replace(/(^|[\s\-'])([а-яёА-ЯЁ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function abbreviateName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [last, ...rest] = parts;
  return `${last} ${rest.map(p => p.charAt(0) + '.').join('')}`;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const BLUE  = '#2d3cc0';
const AMBER = '#f59e0b';

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.62 1.14 2 2 0 0 1 3.59 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  );
}

function DocsButton({ onOpen }) {
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </button>
      {open && (
        <div className={styles.notifPanel} style={{ minWidth: 260 }}>
          <div className={styles.notifHeader}>
            <span className={styles.notifTitle}>Правовые документы</span>
          </div>
          <div className={styles.notifList}>
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

function NotificationBell() {
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

  // Polling уведомлений каждые 30 секунд
  useEffect(() => {
    const id = setInterval(loadSilent, 30000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (open && notifs.some(n => !n.is_read)) {
      adminAPI.markAllAdminNotificationsRead()
        .then(() => setNotifs(ns => ns.map(n => ({ ...n, is_read: true }))))
        .catch(() => {});
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return (
    <div className={styles.bellWrapper} ref={panelRef}>
      <button className={styles.bellBtn} onClick={handleOpen} title="Уведомления">
        <IconBell />
        {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
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
                  <div className={styles.notifDate}>{fmtDate(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTHS = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// ── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Главная');
  const [legalDoc, setLegalDoc] = useState(null); // 'privacy' | 'terms' | null
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
        const fn = d.first_name  || '';
        const pt = d.patronymic  || '';
        if (fn) {
          const name = pt ? `${fn} ${pt}` : fn;
          setAdminName(name);
          localStorage.setItem('user_first_name', fn);
          localStorage.setItem('user_patronymic', pt);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className={styles.app}>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src={logoSrc} alt="Логотип" className={styles.logoImg} />
          </div>
          <nav className={styles.headerNav}>
            {['Главная', 'Управление', 'Реферальная система', 'Счета'].map(item => (
              <button
                key={item}
                className={`${styles.navBtn} ${activeNav === item ? styles.navBtnActive : ''}`}
                onClick={() => setActiveNav(item)}
              >
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
          {activeNav === 'Главная'            && <DashboardTab />}
          {activeNav === 'Управление'         && <ManagementTab />}
          {activeNav === 'Реферальная система' && <ReferralTab />}
          {activeNav === 'Счета'              && <InvoicesTab />}
        </div>
      </div>
      {legalDoc && <LegalDocModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [selectedDay, setSelectedDay]   = useState(today.getDate());
  const [appTab, setAppTab]             = useState('new');
  const [comments, setComments]         = useState({});
  const [commentOpen, setCommentOpen]   = useState(null);
  const [leads, setLeads]               = useState([]);
  const [lessons, setLessons]           = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);

  const selectedDateStr = toDateStr(currentYear, currentMonth, selectedDay);

  useEffect(() => {
    setLoadingLessons(true);
    adminAPI.getTheoryLessons(selectedDateStr)
      .then(res => setLessons(res.data.lessons || []))
      .catch(() => setLessons([]))
      .finally(() => setLoadingLessons(false));
  }, [selectedDateStr]);

  // Автообновление занятий каждые 30 секунд
  useEffect(() => {
    const id = setInterval(() => {
      adminAPI.getTheoryLessons(selectedDateStr)
        .then(res => setLessons(res.data.lessons || []))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [selectedDateStr]);

  useEffect(() => {
    setLoadingLeads(true);
    adminAPI.getLeads(appTab)
      .then(res => setLeads(res.data))
      .catch(() => setLeads([]))
      .finally(() => setLoadingLeads(false));
  }, [appTab]);

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  // Из вкладки "новые" — принять → in_progress
  function handleAcceptNew(lead) {
    adminAPI.updateLead(lead.id, { status: 'in_progress', comment: comments[lead.id] ?? (lead.comment || '') })
      .then(() => setLeads(ls => ls.filter(l => l.id !== lead.id)))
      .catch(() => {});
  }
  // Из вкладки "в обработке" — принять → contacted
  function handleAcceptInProgress(lead) {
    adminAPI.updateLead(lead.id, { status: 'contacted', comment: comments[lead.id] ?? (lead.comment || '') })
      .then(() => setLeads(ls => ls.filter(l => l.id !== lead.id)))
      .catch(() => {});
  }
  function handleDecline(lead) {
    adminAPI.updateLead(lead.id, { status: 'rejected' })
      .then(() => setLeads(ls => ls.filter(l => l.id !== lead.id)))
      .catch(() => {});
  }
  function handleDelete(lead) {
    if (!window.confirm(`Удалить заявку от ${[lead.last_name, lead.first_name].filter(Boolean).join(' ')}?`)) return;
    adminAPI.deleteLead(lead.id)
      .then(() => setLeads(ls => ls.filter(l => l.id !== lead.id)))
      .catch(() => {});
  }
  function saveComment(lead) {
    adminAPI.updateLead(lead.id, { comment: comments[lead.id] ?? '' })
      .then(() => {
        setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, comment: comments[lead.id] ?? '' } : l));
        setCommentOpen(null);
      })
      .catch(() => setCommentOpen(null));
  }

  const grouped = leads.reduce((acc, lead) => {
    const key = lead.created_at ? formatDate(lead.created_at.slice(0, 10)) : '—';
    (acc[key] = acc[key] || []).push(lead);
    return acc;
  }, {});
  const hasGroups = Object.keys(grouped).some(k => k !== '—');

  function renderLeads() {
    const cardProps = (lead) => ({
      key: lead.id,
      lead,
      tab: appTab,
      comment: comments[lead.id] ?? (lead.comment || ''),
      commentOpen: commentOpen === lead.id,
      onCommentToggle: () => setCommentOpen(commentOpen === lead.id ? null : lead.id),
      onCommentChange: val => setComments(c => ({ ...c, [lead.id]: val })),
      onCommentSave: () => saveComment(lead),
      onAcceptNew: () => handleAcceptNew(lead),
      onAcceptInProgress: () => handleAcceptInProgress(lead),
      onDecline: () => handleDecline(lead),
      onDelete: () => handleDelete(lead),
    });

    if (hasGroups) {
      return Object.entries(grouped).map(([date, group]) => (
        <div key={date}>
          <div className={styles.dateGroup}>{date}</div>
          {group.map(lead => <LeadCard {...cardProps(lead)} />)}
        </div>
      ));
    }
    return leads.map(lead => <LeadCard {...cardProps(lead)} />);
  }

  return (
    <div className={styles.dashBody}>
      {/* Left: Calendar + Lessons */}
      <div className={styles.leftCol}>
        <div className={`${styles.card} ${styles.cardCompact}`}>
          <div className={styles.calHeader}>
            <button className={styles.calNavBtn} onClick={prevMonth}>←</button>
            <span className={styles.calMonthLabel}>{MONTHS[currentMonth]}</span>
            <button className={styles.calNavBtn} onClick={nextMonth}>→</button>
          </div>
          <div className={styles.calGrid}>
            {DAYS_SHORT.map(d => <span key={d} className={styles.calDayName}>{d}</span>)}
            {Array.from({ length: firstDay }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSel   = day === selectedDay;
              return (
                <button
                  key={day}
                  className={`${styles.calDay} ${isToday ? styles.calDayToday : ''} ${isSel && !isToday ? styles.calDaySelected : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Теоретические занятия</h3>
          <div className={styles.dateChip}>
            {String(selectedDay).padStart(2,'0')}.{String(currentMonth+1).padStart(2,'0')}.{currentYear}
          </div>
          {loadingLessons ? (
            <div className={styles.spinner} />
          ) : lessons.length === 0 ? (
            <p className={styles.emptyText}>Нет занятий</p>
          ) : (
            <div className={styles.lessonList}>
              {lessons.map((lesson, i) => (
                <div key={i} className={styles.lessonRow}>
                  <span className={styles.lessonNum}>{lesson.group_name}</span>
                  <div className={styles.lessonInfo}>
                    <span className={styles.lessonTime}>{lesson.start_time} - {lesson.end_time}</span>
                    <span className={styles.lessonTeacher}>
                      Преподаватель: {lesson.instructor_name || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Applications */}
      <div className={styles.rightCol}>
        <div className={styles.card} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className={styles.appTabs}>
            <button className={`${styles.appTab} ${appTab === 'new' ? styles.appTabActive : ''}`} onClick={() => setAppTab('new')}>
              Новые заявки
            </button>
            <button className={`${styles.appTab} ${appTab === 'in_progress' ? styles.appTabActive : ''}`} onClick={() => setAppTab('in_progress')}>
              В обработке
            </button>
            <button className={`${styles.appTab} ${appTab === 'contacted' ? styles.appTabActive : ''}`} onClick={() => setAppTab('contacted')}>
              Принятые
            </button>
            <button className={`${styles.appTab} ${appTab === 'rejected' ? styles.appTabActive : ''}`} onClick={() => setAppTab('rejected')}>
              Отклонённые
            </button>
          </div>
          <div className={styles.appList}>
            {loadingLeads ? (
              <div className={styles.spinner} />
            ) : leads.length === 0 ? (
              <p className={styles.emptyText}>Нет заявок</p>
            ) : renderLeads()}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, tab, comment, commentOpen, onCommentToggle, onCommentChange, onCommentSave, onAcceptNew, onAcceptInProgress, onDecline, onDelete }) {
  const fullName = [lead.last_name, lead.first_name, lead.patronymic].filter(Boolean).join(' ');
  return (
    <div className={styles.appCard}>
      <div className={styles.appName}>{fullName || '—'}</div>
      <div className={styles.appMeta}>
        <span className={styles.metaRow}><IconPhone /> {formatPhone(lead.phone_number)}</span>
        {lead.owner_name && (
          <span className={styles.metaRow}><IconUsers /> Пригласил: {lead.owner_name} {formatPhone(lead.owner_phone)}</span>
        )}
      </div>

      {/* Комментарий отображается на карточке всегда */}
      {lead.comment && !commentOpen && (
        <div className={styles.commentReadonly}>{lead.comment}</div>
      )}

      {/* Действия */}
      <div className={styles.appActions}>
        <button className={styles.commentIconBtn} onClick={onCommentToggle} title="Комментарий"><IconEdit /></button>
        {tab === 'new' && (
          <>
            <button className={styles.declineBtn} onClick={onDecline}>Отклонить</button>
            <button className={styles.acceptBtn} onClick={onAcceptNew}>Принять в обработку</button>
          </>
        )}
        {tab === 'in_progress' && (
          <>
            <button className={styles.declineBtn} onClick={onDecline}>Отклонить</button>
            <button className={styles.acceptBtn} onClick={onAcceptInProgress}>Принять</button>
          </>
        )}
        {tab === 'contacted' && (
          <button className={styles.declineBtn} onClick={onDelete}>Удалить</button>
        )}
        {tab === 'rejected' && (
          <button className={styles.declineBtn} onClick={onDelete}>Удалить</button>
        )}
      </div>

      {commentOpen && (
        <div className={styles.commentBox}>
          <label className={styles.commentLabel}>Комментарий</label>
          <textarea
            className={styles.commentInput}
            placeholder="Введите текст"
            rows={3}
            value={comment}
            onChange={e => onCommentChange(e.target.value)}
          />
          <button className={styles.commentDoneBtn} onClick={onCommentSave}>Готово</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MANAGEMENT TAB
// ══════════════════════════════════════════════════════════════════════════════
const MGMT_TABS = ['Студенты', 'Инструкторы', 'Администраторы', 'Учебные группы', 'Тарифы', 'Архив студентов'];

function ManagementTab() {
  const [activeTab, setActiveTab] = useState('Студенты');

  return (
    <div className={styles.mgmtWrapper}>
      <div className={styles.mgmtTabs}>
        {MGMT_TABS.map(t => (
          <button
            key={t}
            className={`${styles.mgmtTab} ${activeTab === t ? styles.mgmtTabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={styles.mgmtBody}>
        {activeTab === 'Студенты'          && <StudentsSection />}
        {activeTab === 'Инструкторы'       && <InstructorsSection />}
        {activeTab === 'Администраторы'    && <AdminsSection />}
        {activeTab === 'Учебные группы'    && <GroupsSection />}
        {activeTab === 'Тарифы'            && <TariffsSection />}
        {activeTab === 'Архив студентов'   && <InactiveSection />}
      </div>
    </div>
  );
}

// ── Students ──────────────────────────────────────────────────────────────────
function StudentsSection() {
  const [students, setStudents]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [detail, setDetail]           = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [editing, setEditing]         = useState(false);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [tariffModal, setTariffModal] = useState(false);
  const [graduateModal, setGraduateModal] = useState(false);
  const [graduating, setGraduating]   = useState(false);
  const [freezeModal, setFreezeModal] = useState(false);
  const [freezing, setFreezing]       = useState(false);
  const [tariffs, setTariffs]         = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [groups, setGroups]           = useState([]);
  const [newTariffId, setNewTariffId] = useState('');

  useEffect(() => {
    adminAPI.getTariffs().then(r => setTariffs(r.data)).catch(() => {});
    adminAPI.getInstructors().then(r => setInstructors(r.data)).catch(() => {});
    adminAPI.getGroups().then(r => setGroups(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminAPI.getStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    adminAPI.getStudent(selected)
      .then(r => { setDetail(r.data); setForm(r.data); setEditing(false); })
      .catch(() => {});
  }, [selected]);

  function handleSave() {
    setSaving(true);
    const payload = {
      first_name:          form.first_name,
      last_name:           form.last_name,
      patronymic:          form.patronymic,
      phone_number:        form.phone_number        || '',
      birth_date:          form.birth_date          || null,
      instructor_id:       form.instructor_id       || null,
      group_id:            form.group_id            || null,
      tariff_id:           form.tariff_id           || null,
      type_kpp:            form.type_kpp            || '',
    };
    adminAPI.updateStudent(selected, payload)
      .then(r => { setDetail(r.data); setForm(r.data); setEditing(false); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleGraduate() {
    setGraduating(true);
    adminAPI.graduateStudent(selected)
      .then(() => {
        setGraduateModal(false);
        setSelected(null);
        setDetail(null);
        adminAPI.getStudents(search)
          .then(r => setStudents(r.data))
          .catch(() => {});
      })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка при выпуске студента'))
      .finally(() => setGraduating(false));
  }

  function handleFreeze() {
    setFreezing(true);
    adminAPI.freezeStudent(selected)
      .then(() => {
        setFreezeModal(false);
        setSelected(null);
        setDetail(null);
        adminAPI.getStudents(search)
          .then(r => setStudents(r.data))
          .catch(() => {});
      })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка при заморозке студента'))
      .finally(() => setFreezing(false));
  }

  function applyTariff() {
    if (!newTariffId) return;
    setSaving(true);
    adminAPI.updateStudent(selected, { tariff_id: Number(newTariffId) })
      .then(r => { setDetail(r.data); setForm(r.data); setTariffModal(false); setNewTariffId(''); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  const currentTariff = tariffs.find(t => t.id === (detail?.tariff_id || form?.tariff_id));
  const selectedNewTariff = tariffs.find(t => t.id === Number(newTariffId));

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск студента" value={search} onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {students.map(s => (
              <div
                key={s.id}
                className={`${styles.listItem} ${selected === s.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <div className={styles.listAvatar}>
                  {getMediaUrl(s.photo_url)
                    ? <img src={getMediaUrl(s.photo_url)} alt="" />
                    : <svg className={styles.listAvatarPlaceholder} viewBox="0 0 24 24" fill="#8A8A8A"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listItemMain}>{s.full_name}</div>
                  {s.instructor_name && <div className={styles.listItemSub}>Инструктор: {abbreviateName(s.instructor_name)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.detailPanel}>
        {!detail ? (
          <p className={styles.emptyText}>Выберите студента</p>
        ) : (
          <>
            <div className={styles.detailHeader}>
              <div className={styles.tariffRow}>
                <span className={styles.tariffLabel}>Тариф: {detail.tariff_name || '—'}</span>
                {editing && (
                  <button className={styles.iconBtn} onClick={() => setTariffModal(true)} title="Сменить тариф"><IconPencil /></button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!editing ? (
                  <button className={styles.editBtn} onClick={() => setEditing(true)}>Редактировать</button>
                ) : (
                  <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.detailForm}>
              {/* Profile: photo + name fields */}
              <div className={styles.profileArea}>
                <div className={styles.photoPlaceholder}>
                  {getMediaUrl(detail.photo_url) && <img src={getMediaUrl(detail.photo_url)} alt="" className={styles.avatarDetail} />}
                </div>
                <div className={styles.profileNameBlock}>
                  <div className={styles.twoCol}>
                    <FieldRow label="Фамилия" value={form.last_name || ''} disabled={!editing}
                      onChange={v => setForm(f => ({ ...f, last_name: v }))} />
                    <FieldRow label="Имя" value={form.first_name || ''} disabled={!editing}
                      onChange={v => setForm(f => ({ ...f, first_name: v }))} />
                  </div>
                  <FieldRow label="Отчество" value={form.patronymic || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, patronymic: v }))} />
                </div>
              </div>

              {/* Contact + stats */}
              <div className={styles.twoCol}>
                <FieldRow label="Номер телефона"
                  value={editing ? (form.phone_number || '') : formatPhone(detail.phone_number || '')}
                  disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, phone_number: v }))} />
                <FieldRow label="Часы (практика)"
                  value={`${detail.count_lessons || 0}${detail.tariff_practice_hours ? ' / ' + detail.tariff_practice_hours : ''} ч`}
                  disabled dimmed />
              </div>

              {/* Birth date */}
              <FieldRow label="Дата рождения" type={editing ? 'date' : 'text'}
                value={editing ? (form.birth_date || '') : (form.birth_date ? formatDate(form.birth_date) : '—')}
                disabled={!editing}
                onChange={v => setForm(f => ({ ...f, birth_date: v }))} />

              {/* Assignment */}
              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Инструктор</label>
                  {editing ? (
                    <select className={styles.fieldSelect}
                      value={form.instructor_id || ''}
                      onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">— не назначен —</option>
                      {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                    </select>
                  ) : (
                    <input className={styles.fieldInput} value={detail.instructor_name || '—'} disabled />
                  )}
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Группа</label>
                  {editing ? (
                    <select className={styles.fieldSelect}
                      value={form.group_id || ''}
                      onChange={e => setForm(f => ({ ...f, group_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">— не назначена —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  ) : (
                    <input className={styles.fieldInput} value={detail.group_name || '—'} disabled />
                  )}
                </div>
              </div>

              {/* KPP */}
              <div className={styles.fieldGroup}>
                <label className={`${styles.fieldLabel} ${editing ? '' : styles.fieldLabelDisabled}`}>КПП</label>
                <div className={styles.kppToggle}>
                  <label className={styles.kppOption}>
                    <input type="radio" name={`kpp-${detail.id}`} value="МКПП"
                      checked={form.type_kpp === 'МКПП'} disabled={!editing}
                      onChange={() => setForm(f => ({ ...f, type_kpp: 'МКПП' }))} />
                    <span>МКПП</span>
                  </label>
                  <label className={styles.kppOption}>
                    <input type="radio" name={`kpp-${detail.id}`} value="АКПП"
                      checked={form.type_kpp === 'АКПП'} disabled={!editing}
                      onChange={() => setForm(f => ({ ...f, type_kpp: 'АКПП' }))} />
                    <span>АКПП</span>
                  </label>
                </div>
              </div>

              {/* Status actions */}
              {!editing && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    className={styles.editBtn}
                    style={{ background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
                    onClick={() => setFreezeModal(true)}
                  >
                    Заморозить
                  </button>
                  <button
                    className={styles.editBtn}
                    style={{ background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
                    onClick={() => setGraduateModal(true)}
                  >
                    Выпустить
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Freeze confirmation modal */}
      {freezeModal && (
        <Modal onClose={() => setFreezeModal(false)}>
          <h3 className={styles.modalTitle}>Заморозить студента?</h3>
          <p className={styles.modalSubtitle}>
            Студент <strong>{detail?.full_name}</strong> будет приостановлен: доступ в личный кабинет заблокируется.
            Вы сможете восстановить его в разделе «Неактивные».
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn} style={{ flex: 1 }}
              onClick={handleFreeze} disabled={freezing}>
              {freezing ? 'Заморозка...' : 'Подтвердить'}
            </button>
            <button className={styles.editBtn} style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setFreezeModal(false)} disabled={freezing}>
              Отмена
            </button>
          </div>
        </Modal>
      )}

      {/* Graduate confirmation modal */}
      {graduateModal && (
        <Modal onClose={() => setGraduateModal(false)}>
          <h3 className={styles.modalTitle}>Выпустить студента?</h3>
          <p className={styles.modalSubtitle}>
            Вы собираетесь перевести студента <strong>{detail?.full_name}</strong> в статус выпускника.
            Все данные о бронированиях и счетах будут удалены. Это действие необратимо.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn} style={{ flex: 1 }}
              onClick={handleGraduate} disabled={graduating}>
              {graduating ? 'Выпуск...' : 'Подтвердить выпуск'}
            </button>
            <button className={styles.editBtn} style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setGraduateModal(false)} disabled={graduating}>
              Отмена
            </button>
          </div>
        </Modal>
      )}

      {/* Change tariff modal */}
      {tariffModal && (
        <Modal onClose={() => { setTariffModal(false); setNewTariffId(''); }}>
          <h3 className={styles.modalTitle}>Сменить тариф?</h3>
          <p className={styles.modalSubtitle}>
            Текущий тариф студента {detail?.full_name} — <strong>{detail?.tariff_name || '—'}</strong>.
          </p>
          <div className={styles.fieldGroup} style={{ marginTop: 16 }}>
            <label className={styles.fieldLabel}>Выбор нового тарифа</label>
            <select className={styles.fieldSelect} value={newTariffId}
              onChange={e => setNewTariffId(e.target.value)}>
              <option value="">Выберите тариф</option>
              {tariffs.filter(t => t.id !== detail?.tariff_id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.tariffPriceRow}>
            <div className={styles.priceBox}>
              <span className={styles.priceLbl}>Текущая стоимость</span>
              <span className={styles.priceVal}>{currentTariff ? Number(currentTariff.total_price).toLocaleString('ru') + ' руб' : '—'}</span>
            </div>
            <div className={styles.priceBox}>
              <span className={styles.priceLbl}>Новая стоимость</span>
              <span className={styles.priceVal}>{selectedNewTariff ? Number(selectedNewTariff.total_price).toLocaleString('ru') + ' руб' : '—'}</span>
            </div>
          </div>
          <button className={styles.primaryBtn} onClick={applyTariff} disabled={!newTariffId || saving}>
            Сменить тариф
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Inactive Students (Graduated + Frozen) ────────────────────────────────────
const INACTIVE_TABS = ['Выпущенные', 'Приостановленные'];

function InactiveSection() {
  const [activeTab, setActiveTab] = useState('Выпущенные');
  return (
    <div>
      <div className={styles.mgmtTabs} style={{ marginBottom: 12 }}>
        {INACTIVE_TABS.map(t => (
          <button
            key={t}
            className={`${styles.mgmtTab} ${activeTab === t ? styles.mgmtTabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >{t}</button>
        ))}
      </div>
      {activeTab === 'Выпущенные'      && <GraduatedList />}
      {activeTab === 'Приостановленные' && <FrozenList />}
    </div>
  );
}

function GraduatedList() {
  const [students, setStudents]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [deleting, setDeleting]   = useState(null);

  function load() {
    setLoading(true);
    adminAPI.getGraduatedStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search]); // eslint-disable-line

  function handleDelete(s) {
    if (!window.confirm(`Вы уверены, что хотите удалить данные о студенте ${s.full_name}? Это действие необратимо.`)) return;
    setDeleting(s.id);
    adminAPI.deleteStudent(s.id)
      .then(() => setStudents(list => list.filter(x => x.id !== s.id)))
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeleting(null));
  }

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel} style={{ maxWidth: '100%', flex: 1 }}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск выпускника" value={search}
            onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {students.length === 0 ? (
              <p className={styles.emptyText}>Нет выпускников</p>
            ) : students.map(s => (
              <div key={s.id} className={styles.listItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listItemMain}>{s.full_name}</div>
                  <div className={styles.listItemSub} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {s.phone_number    && <span>{formatPhone(s.phone_number)}</span>}
                    {s.birth_date      && <span>д.р. {s.birth_date.split('-').reverse().join('.')}</span>}
                    {s.instructor_name && <span>Инструктор: {abbreviateName(s.instructor_name)}</span>}
                    {s.tariff_name     && <span>Тариф: {s.tariff_name}</span>}
                    {s.count_lessons > 0 && <span>Практика: {s.count_lessons} ч</span>}
                    {s.graduated_at    && <span>Выпущен: {formatDate(s.graduated_at.slice(0, 10))}</span>}
                  </div>
                </div>
                <button
                  className={styles.deleteCircleBtn}
                  style={{ marginLeft: 12, flexShrink: 0 }}
                  onClick={() => handleDelete(s)}
                  disabled={deleting === s.id}
                  title="Удалить студента"
                >
                  {deleting === s.id ? '...' : '−'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FrozenList() {
  const [students, setStudents]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [unfreezing, setUnfreezing] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  function load() {
    setLoading(true);
    adminAPI.getFrozenStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search]); // eslint-disable-line

  function handleUnfreeze(id) {
    setUnfreezing(id);
    adminAPI.unfreezeStudent(id)
      .then(() => load())
      .catch(e => alert(e.response?.data?.detail || 'Ошибка при восстановлении студента'))
      .finally(() => setUnfreezing(null));
  }

  function handleDelete(s) {
    if (!window.confirm(`Вы уверены, что хотите удалить данные о студенте ${s.full_name}? Это действие необратимо.`)) return;
    setDeleting(s.id);
    adminAPI.deleteStudent(s.id)
      .then(() => setStudents(list => list.filter(x => x.id !== s.id)))
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeleting(null));
  }

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel} style={{ maxWidth: '100%', flex: 1 }}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск приостановленного" value={search}
            onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {students.length === 0 ? (
              <p className={styles.emptyText}>Нет приостановленных студентов</p>
            ) : students.map(s => (
              <div key={s.id} className={styles.listItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listItemMain}>{s.full_name}</div>
                  <div className={styles.listItemSub} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {s.phone_number    && <span>{formatPhone(s.phone_number)}</span>}
                    {s.instructor_name && <span>Инструктор: {abbreviateName(s.instructor_name)}</span>}
                    {s.tariff_name     && <span>Тариф: {s.tariff_name}</span>}
                    {s.count_lessons > 0 && <span>Практика: {s.count_lessons} ч</span>}
                  </div>
                </div>
                <button
                  className={styles.editBtn}
                  style={{ whiteSpace: 'nowrap', background: '#2d3cc0', color: '#fff', borderColor: '#2d3cc0', flexShrink: 0 }}
                  onClick={() => handleUnfreeze(s.id)}
                  disabled={unfreezing === s.id}
                >
                  {unfreezing === s.id ? '...' : 'Восстановить'}
                </button>
                <button
                  className={styles.deleteCircleBtn}
                  style={{ flexShrink: 0 }}
                  onClick={() => handleDelete(s)}
                  disabled={deleting === s.id}
                  title="Удалить студента"
                >
                  {deleting === s.id ? '...' : '−'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Instructors ───────────────────────────────────────────────────────────────
function InstructorsSection() {
  const [instructors, setInstructors]   = useState([]);
  const [selected, setSelected]         = useState(null);
  const [detail, setDetail]             = useState(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [studentSearch, setStudentSearch]     = useState('');
  const [studentResults, setStudentResults]   = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    setLoading(true);
    adminAPI.getInstructors(search)
      .then(r => setInstructors(r.data))
      .catch(() => setInstructors([]))
      .finally(() => setLoading(false));
  }, [search]);

  function reloadDetail(id) {
    adminAPI.getInstructor(id || selected)
      .then(r => { setDetail(r.data); setForm(r.data); })
      .catch(() => {});
  }

  useEffect(() => {
    if (!selected) { setDetail(null); setEditing(false); return; }
    reloadDetail(selected);
  }, [selected]); // eslint-disable-line

  function handleSave() {
    setSaving(true);
    const payload = {
      first_name:   form.first_name,
      last_name:    form.last_name,
      patronymic:   form.patronymic   || '',
      phone_number: form.phone_number || '',
      birth_date:   form.birth_date   || null,
      car_brand:    form.car_brand    || '',
      car_color:    form.car_color    || '',
      car_plate:    form.car_plate    || '',
      car_type_kpp: form.car_type_kpp || '',
      weekly_limit: Number(form.weekly_limit) || 0,
    };
    adminAPI.updateInstructor(selected, payload)
      .then(r => { setDetail(r.data); setForm(r.data); setEditing(false); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleDeleteInstructor() {
    setDeleting(true);
    adminAPI.deleteInstructor(selected)
      .then(() => {
        setDeleteModal(false);
        setInstructors(list => list.filter(i => i.id !== selected));
        setSelected(null);
        setDetail(null);
      })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeleting(false));
  }

  function handleStudentSearch(val) {
    setStudentSearch(val);
    if (!val.trim()) { setStudentResults([]); return; }
    setSearchingStudents(true);
    adminAPI.getStudents(val)
      .then(r => setStudentResults(r.data))
      .catch(() => setStudentResults([]))
      .finally(() => setSearchingStudents(false));
  }

  function handleAddStudent(studentId) {
    adminAPI.addStudentToInstructor(selected, studentId)
      .then(() => { reloadDetail(); setStudentSearch(''); setStudentResults([]); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка'));
  }

  function handleRemoveStudent(studentId) {
    adminAPI.removeStudentFromInstructor(selected, studentId)
      .then(() => reloadDetail())
      .catch(() => {});
  }

  return (
    <>
    <div className={styles.splitPanel}>
      <div className={styles.listPanel}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск инструктора" value={search} onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {instructors.map(i => (
              <div key={i.id}
                className={`${styles.listItem} ${selected === i.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(i.id)}
              >
                <div className={styles.listAvatar}>
                  {getMediaUrl(i.avatar_url)
                    ? <img src={getMediaUrl(i.avatar_url)} alt="" />
                    : <svg className={styles.listAvatarPlaceholder} viewBox="0 0 24 24" fill="#8A8A8A"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listItemMain}>{i.full_name}</div>
                  <div className={styles.listItemSub}>{formatPhone(i.phone_number)}</div>
                </div>
                <button className={styles.deleteCircleBtn}
                  onClick={e => { e.stopPropagation(); setSelected(i.id); setDeleteModal(true); }}
                  title="Удалить">−</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.detailPanel}>
        {!detail ? (
          <p className={styles.emptyText}>Выберите инструктора</p>
        ) : (
          <>
            <div className={styles.detailHeader} style={{ justifyContent: 'flex-end' }}>
              {!editing ? (
                <button className={styles.editBtn} onClick={() => setEditing(true)}>Редактировать</button>
              ) : (
                <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
            </div>
            <div className={styles.detailForm}>
              {/* Profile: avatar + name fields */}
              <div className={styles.profileArea}>
                <div className={styles.photoPlaceholder}>
                  {getMediaUrl(detail.avatar_url) && <img src={getMediaUrl(detail.avatar_url)} alt="" className={styles.avatarDetail} />}
                </div>
                <div className={styles.profileNameBlock}>
                  <div className={styles.twoCol}>
                    <FieldRow label="Фамилия" value={form.last_name || ''} disabled={!editing}
                      onChange={v => setForm(f => ({ ...f, last_name: v }))} />
                    <FieldRow label="Имя" value={form.first_name || ''} disabled={!editing}
                      onChange={v => setForm(f => ({ ...f, first_name: v }))} />
                  </div>
                  <FieldRow label="Отчество" value={form.patronymic || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, patronymic: v }))} />
                </div>
              </div>
              <div className={styles.twoCol}>
                <FieldRow label="Номер телефона"
                  value={editing ? (form.phone_number || '') : formatPhone(detail.phone_number || '')}
                  disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, phone_number: v }))} />
                <FieldRow label="Лимит (нед.)" value={String(form.weekly_limit ?? 3)} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, weekly_limit: v }))} />
              </div>
              <div className={styles.twoCol}>
                <FieldRow label="Дата рождения" type={editing ? 'date' : 'text'}
                  value={editing ? (form.birth_date || '') : (form.birth_date ? formatDate(form.birth_date) : '—')}
                  disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, birth_date: v }))} />
                <div />
              </div>
              <div className={styles.twoCol}>
                <FieldRow label="Марка автомобиля" value={form.car_brand || ''} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, car_brand: v }))} />
                <FieldRow label="Цвет" value={form.car_color || ''} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, car_color: v }))} />
              </div>
              <div className={styles.twoCol}>
                <FieldRow label="Гос. номер" value={form.car_plate || ''} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, car_plate: v }))} />
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>КПП</label>
                  <div className={styles.kppToggle}>
                    <label className={styles.kppOption}>
                      <input type="radio" value="МКПП" checked={form.car_type_kpp === 'МКПП'} disabled={!editing}
                        onChange={() => setForm(f => ({ ...f, car_type_kpp: 'МКПП' }))} />
                      <span>МКПП</span>
                    </label>
                    <label className={styles.kppOption}>
                      <input type="radio" value="АКПП" checked={form.car_type_kpp === 'АКПП'} disabled={!editing}
                        onChange={() => setForm(f => ({ ...f, car_type_kpp: 'АКПП' }))} />
                      <span>АКПП</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Список студентов */}
              <div className={styles.studentsBlock} style={{ marginTop: 16 }}>
                <div className={styles.studentsHeader}>
                  <h4 className={styles.blockTitle}>Студенты</h4>
                  <span className={styles.countChip}>{(detail.students || []).length}</span>
                </div>
                {editing && (
                  <div className={styles.studentSearchBox}>
                    <input
                      className={styles.searchInput}
                      placeholder="Найти студента..."
                      value={studentSearch}
                      onChange={e => handleStudentSearch(e.target.value)}
                    />
                    {searchingStudents && <div className={styles.spinner} style={{ width: 16, height: 16 }} />}
                    {studentResults.length > 0 && (
                      <div className={styles.studentDropdown}>
                        {studentResults.map(s => (
                          <div key={s.id} className={styles.studentDropdownItem}
                            onClick={() => handleAddStudent(s.id)}>
                            {s.full_name}
                            <span className={styles.phoneHint}>{formatPhone(s.phone_number)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {(detail.students || []).map(s => (
                  <div key={s.id} className={styles.studentSmallRow}>
                    <div className={styles.studentSmallInfo}>
                      <span className={styles.studentSmallName}>{s.full_name}</span>
                      <span className={styles.phoneHint}>{formatPhone(s.phone_number)}</span>
                    </div>
                    {editing && (
                      <button className={styles.deleteSmallBtn} onClick={() => handleRemoveStudent(s.id)} title="Открепить">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {deleteModal && (
      <Modal onClose={() => setDeleteModal(false)}>
        <h3 className={styles.modalTitle}>Удалить личный кабинет инструктора?</h3>
        <p className={styles.modalSubtitle}>
          Вы собираетесь удалить аккаунт инструктора{' '}
          <strong>{detail?.full_name || detail?.first_name}</strong>.
        </p>
        <p className={styles.modalSubtitle} style={{ marginTop: 8 }}>
          Это действие необратимо и повлечёт за собой:
        </p>
        <ul style={{ paddingLeft: 18, margin: '8px 0 0', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
          <li>Удаление всех слотов практики, выставленных этим инструктором (в том числе будущих).</li>
          <li>Отмену всех бронирований студентов на эти слоты.</li>
          <li>Открепление студентов, привязанных к этому инструктору.</li>
          <li>Невозможность восстановления данных.</li>
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            className={styles.editBtn}
            style={{ flex: 1, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
            onClick={handleDeleteInstructor}
            disabled={deleting}
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
          <button
            className={styles.editBtn}
            style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
            onClick={() => setDeleteModal(false)}
            disabled={deleting}
          >
            Отмена
          </button>
        </div>
      </Modal>
    )}
    </>
  );
}

// ── Administrators ────────────────────────────────────────────────────────────
function AdminsSection() {
  const [admins, setAdmins]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ first_name: '', last_name: '', patronymic: '', phone_number: '', phone_display: '', password: '', confirm: '' });
  const phoneInputRef = useRef(null);
  const [addError, setAddError] = useState('');
  const [saving, setSaving]     = useState(false);

  const loadAdmins = useCallback(() => {
    setLoading(true);
    adminAPI.getAdmins()
      .then(r => setAdmins(r.data))
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  function handleDelete(admin) {
    if (!window.confirm(`Удалить администратора ${admin.full_name}?`)) return;
    adminAPI.deleteAdmin(admin.id)
      .then(() => { setAdmins(a => a.filter(x => x.id !== admin.id)); if (selected === admin.id) setSelected(null); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'));
  }

  function handleAddAdmin() {
    if (!addForm.first_name.trim()) { setAddError('Введите имя'); return; }
    if (!addForm.last_name.trim())  { setAddError('Введите фамилию'); return; }
    if (normalizePhone(addForm.phone_display).length < 11) { setAddError('Введите корректный номер телефона'); return; }
    if (addForm.password !== addForm.confirm) { setAddError('Пароли не совпадают'); return; }
    if (!addForm.password) { setAddError('Введите пароль'); return; }
    setSaving(true);
    setAddError('');
    adminAPI.createAdmin({
      first_name:   addForm.first_name.trim(),
      last_name:    addForm.last_name.trim(),
      patronymic:   addForm.patronymic.trim(),
      phone_number: addForm.phone_number,
      password:     addForm.password,
      consent: true,
    })
      .then(() => { setShowAdd(false); setAddForm({ first_name: '', last_name: '', patronymic: '', phone_number: '', phone_display: '', password: '', confirm: '' }); loadAdmins(); })
      .catch(e => setAddError(e.response?.data?.detail || 'Ошибка'))
      .finally(() => setSaving(false));
  }

  const selectedAdmin = admins.find(a => a.id === selected);

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel}>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>Добавить администратора</button>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {admins.map(a => (
              <div key={a.id}
                className={`${styles.listItem} ${selected === a.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(a.id)}
              >
                <div className={styles.listItemMain}>{a.full_name}</div>
                {!a.is_staff && (
                  <button className={styles.deleteCircleBtn} onClick={e => { e.stopPropagation(); handleDelete(a); }} title="Удалить">−</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.detailPanel}>
        {!selectedAdmin ? (
          <p className={styles.emptyText}>Выберите администратора</p>
        ) : (
          <div className={styles.detailForm}>
            <div className={styles.twoCol}>
              <FieldRow label="Фамилия" value={selectedAdmin.last_name || ''} disabled />
              <FieldRow label="Имя" value={selectedAdmin.first_name || ''} disabled />
            </div>
            <div className={styles.twoCol}>
              <FieldRow label="Отчество" value={selectedAdmin.patronymic || ''} disabled />
              <FieldRow label="Номер телефона" value={formatPhone(selectedAdmin.phone_number || '')} disabled />
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal onClose={() => { setShowAdd(false); setAddError(''); }}>
          <h3 className={styles.modalTitle}>Новый администратор</h3>
          <div className={styles.modalGrid}>
            <div>
              <FieldRow label="Фамилия" value={addForm.last_name}
                onChange={v => setAddForm(f => ({ ...f, last_name: filterRuText(v) }))} />
              <FieldRow label="Имя" value={addForm.first_name}
                onChange={v => setAddForm(f => ({ ...f, first_name: filterRuText(v) }))} />
              <FieldRow label="Отчество" value={addForm.patronymic}
                onChange={v => setAddForm(f => ({ ...f, patronymic: filterRuText(v) }))} />
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Номер телефона</label>
                <input
                  ref={phoneInputRef}
                  className={styles.fieldInput}
                  type="tel"
                  value={addForm.phone_display}
                  onKeyDown={e => {
                    if (e.key === 'Backspace') {
                      e.preventDefault();
                      const digits = normalizePhone(addForm.phone_display);
                      const trimmed = digits.slice(0, -1);
                      const display = fmtPhoneUtil(trimmed);
                      const raw = normalizePhone(display);
                      setAddForm(f => ({ ...f, phone_display: display, phone_number: raw }));
                    }
                  }}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const display = fmtPhoneUtil(digits);
                    const raw = normalizePhone(display);
                    setAddForm(f => ({ ...f, phone_display: display, phone_number: raw }));
                  }}
                />
              </div>
            </div>
            <div>
              <FieldRow label="Пароль" value={addForm.password} type="password"
                onChange={v => setAddForm(f => ({ ...f, password: v.replace(/[^\x20-\x7E]/g, '') }))} />
              <FieldRow label="Повторите пароль" value={addForm.confirm} type="password"
                onChange={v => setAddForm(f => ({ ...f, confirm: v.replace(/[^\x20-\x7E]/g, '') }))} />
            </div>
          </div>
          {addError && <p className={styles.errorText}>{addError}</p>}
          <button className={styles.primaryBtn} onClick={handleAddAdmin} disabled={saving}>
            {saving ? 'Добавление...' : 'Добавить'}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Groups ────────────────────────────────────────────────────────────────────
function GroupsSection() {
  const [groups, setGroups]           = useState([]);
  const [selected, setSelected]       = useState(null);
  const [detail, setDetail]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [editing, setEditing]         = useState(false);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({ weekday: 1, start_time: '09:00', end_time: '10:30' });
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    adminAPI.getInstructors().then(r => setInstructors(r.data)).catch(() => {});
  }, []);

  const loadGroups = useCallback(() => {
    setLoading(true);
    adminAPI.getGroups()
      .then(r => setGroups(r.data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    adminAPI.getGroup(selected)
      .then(r => { setDetail(r.data); setForm({ ...r.data, instructor_id: r.data.instructor_id || '' }); setEditing(false); })
      .catch(() => {});
  }, [selected]);

  function handleSave() {
    setSaving(true);
    const payload = {
      name: form.name,
      hours: Number(form.hours),
      start_date: form.start_date,
      end_date: form.end_date || null,
      instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
    };
    adminAPI.updateGroup(selected, payload)
      .then(() => { loadGroups(); adminAPI.getGroup(selected).then(x => { setDetail(x.data); setForm({ ...x.data, instructor_id: x.data.instructor_id || '' }); setEditing(false); }); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleAddGroup() {
    loadGroups();
    setShowAdd(false);
  }

  function handleDeleteGroup() {
    setDeletingGroup(true);
    adminAPI.deleteGroup(deleteGroupId)
      .then(() => { loadGroups(); if (selected === deleteGroupId) setSelected(null); setDeleteGroupId(null); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeletingGroup(false));
  }

  function handleAddSchedule() {
    setAddingSchedule(true);
    adminAPI.addSchedule(selected, scheduleForm)
      .then(() => adminAPI.getGroup(selected).then(r => { setDetail(r.data); setForm({ ...r.data, instructor_id: r.data.instructor_id || '' }); }))
      .catch(() => {})
      .finally(() => setAddingSchedule(false));
  }

  function handleDeleteSchedule(sid) {
    adminAPI.deleteSchedule(selected, sid)
      .then(() => adminAPI.getGroup(selected).then(r => { setDetail(r.data); setForm({ ...r.data, instructor_id: r.data.instructor_id || '' }); }))
      .catch(() => {});
  }

  function reloadDetail() {
    adminAPI.getGroup(selected).then(r => { setDetail(r.data); setForm({ ...r.data, instructor_id: r.data.instructor_id || '' }); });
  }

  function handleStudentSearch(val) {
    setStudentSearch(val);
    if (!val.trim()) { setStudentResults([]); return; }
    setSearchingStudents(true);
    adminAPI.getStudents(val)
      .then(r => setStudentResults(r.data.filter(s => s.id !== null)))
      .catch(() => setStudentResults([]))
      .finally(() => setSearchingStudents(false));
  }

  function handleAddStudentToGroup(studentId) {
    adminAPI.addStudentToGroup(selected, studentId)
      .then(() => { reloadDetail(); setStudentSearch(''); setStudentResults([]); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка'));
  }

  function handleRemoveStudentFromGroup(studentId) {
    adminAPI.removeStudentFromGroup(selected, studentId)
      .then(() => reloadDetail())
      .catch(() => {});
  }

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel}>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>Добавить учебную группу</button>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {groups.map(g => (
              <div key={g.id}
                className={`${styles.listItem} ${selected === g.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(g.id)}
              >
                <span className={styles.groupNum}>{g.name}</span>
                <div style={{ flex: 1 }}>
                  <div className={styles.listItemSub}>Преподаватель: {g.instructor_name || '—'}</div>
                </div>
                <button className={styles.deleteCircleBtn} onClick={e => { e.stopPropagation(); setDeleteGroupId(g.id); }} title="Удалить">−</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${styles.detailPanel} ${styles.detailPanelWide}`}>
        {!detail ? (
          <p className={styles.emptyText}>Выберите группу</p>
        ) : (
          <>
            <div className={styles.detailHeader} style={{ justifyContent: 'flex-end' }}>
              {!editing ? (
                <button className={styles.editBtn} onClick={() => setEditing(true)}>Редактировать</button>
              ) : (
                <button className={styles.editBtn} onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
              )}
            </div>
            <div className={styles.detailForm}>
              <div className={styles.formGrid}>
                <div className={styles.formCol}>
                  <FieldRow label="Название группы" value={form.name || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, name: v }))} />
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Преподаватель</label>
                    {editing ? (
                      <select className={styles.fieldSelect} value={form.instructor_id || ''}
                        onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value }))}>
                        <option value="">— не назначен —</option>
                        {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                      </select>
                    ) : (
                      <input className={styles.fieldInput} value={detail.instructor_name || '—'} disabled />
                    )}
                  </div>
                  <FieldRow label="Дата начала обучения" value={form.start_date || ''} disabled={!editing}
                    type={editing ? 'date' : 'text'}
                    onChange={v => setForm(f => ({ ...f, start_date: v }))} />
                  <FieldRow label="Дата окончания" value={form.end_date || ''} disabled={!editing}
                    type={editing ? 'date' : 'text'}
                    onChange={v => setForm(f => ({ ...f, end_date: v }))} />
                </div>

                <div className={styles.formCol}>
                  <div className={styles.scheduleBlock}>
                    <h4 className={styles.blockTitle}>Расписание</h4>
                    {editing && (
                      <div className={styles.scheduleAddRow}>
                        <input type="time" className={styles.timeInput}
                          value={scheduleForm.start_time}
                          onChange={e => setScheduleForm(f => ({ ...f, start_time: e.target.value }))} />
                        <span>—</span>
                        <input type="time" className={styles.timeInput}
                          value={scheduleForm.end_time}
                          onChange={e => setScheduleForm(f => ({ ...f, end_time: e.target.value }))} />
                        <select className={styles.daySelect}
                          value={scheduleForm.weekday}
                          onChange={e => setScheduleForm(f => ({ ...f, weekday: Number(e.target.value) }))}>
                          {WEEKDAYS.map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
                        </select>
                        <button className={styles.addCircleBtn} onClick={handleAddSchedule} disabled={addingSchedule}>+</button>
                      </div>
                    )}
                    {(detail.schedule || []).map(s => (
                      <div key={s.id} className={styles.scheduleRow}>
                        <span>{s.start_time?.slice(0,5)} — {s.end_time?.slice(0,5)}</span>
                        <span className={styles.wdayChip}>{WEEKDAYS[(s.weekday || 1) - 1]}</span>
                        {editing && (
                          <button className={styles.deleteSmallBtn} onClick={() => handleDeleteSchedule(s.id)}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={styles.studentsBlock}>
                    <div className={styles.studentsHeader}>
                      <h4 className={styles.blockTitle}>Список студентов</h4>
                      <span className={styles.countChip}>{detail.students_count}/{detail.max_students || 30}</span>
                    </div>
                    {editing && (
                      <div className={styles.studentSearchBox}>
                        <input
                          className={styles.searchInput}
                          placeholder="Найти студента..."
                          value={studentSearch}
                          onChange={e => handleStudentSearch(e.target.value)}
                        />
                        {searchingStudents && <div className={styles.spinner} style={{ width: 16, height: 16 }} />}
                        {studentResults.length > 0 && (
                          <div className={styles.studentDropdown}>
                            {studentResults.map(s => (
                              <div key={s.id} className={styles.studentDropdownItem}
                                onClick={() => handleAddStudentToGroup(s.id)}>
                                {s.full_name}
                                {s.group_name && <span className={styles.groupHint}> [{s.group_name}]</span>}
                                <span className={styles.phoneHint}>{formatPhone(s.phone_number)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(detail.students || []).map(s => (
                      <div key={s.id} className={styles.studentSmallRow}>
                        <span>{s.full_name}</span>
                        {editing && (
                          <button className={styles.deleteSmallBtn} onClick={() => handleRemoveStudentFromGroup(s.id)} title="Убрать из группы">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddGroupModal onClose={() => setShowAdd(false)} onSave={handleAddGroup} instructors={instructors} />
      )}

      {deleteGroupId && (
        <Modal onClose={() => setDeleteGroupId(null)}>
          <h3 className={styles.modalTitle}>Удалить учебную группу?</h3>
          <p className={styles.modalSubtitle}>
            Группа <strong>{groups.find(g => g.id === deleteGroupId)?.name}</strong> будет удалена.
            Это действие нельзя отменить.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn}
              style={{ flex: 1, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
              onClick={handleDeleteGroup} disabled={deletingGroup}>
              {deletingGroup ? 'Удаление...' : 'Удалить'}
            </button>
            <button className={styles.editBtn}
              style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setDeleteGroupId(null)} disabled={deletingGroup}>
              Отмена
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddGroupModal({ onClose, onSave, instructors }) {
  const [form, setForm] = useState({ name: '', instructor_id: '', hours: '', start_date: '', end_date: '' });
  const [schedule, setSchedule] = useState([]);
  const [schForm, setSchForm]   = useState({ weekday: 1, start_time: '09:00', end_time: '10:30' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  function addSch() {
    setSchedule(s => [...s, { ...schForm, id: Date.now() }]);
  }
  function removeSch(id) { setSchedule(s => s.filter(x => x.id !== id)); }

  async function handleSave() {
    if (!form.name || !form.start_date) {
      setError('Заполните обязательные поля: название, дата начала');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        hours: Number(form.hours) || 1,
        start_date: form.start_date,
        end_date: form.end_date || null,
        instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
      };
      const res = await adminAPI.createGroup(payload);
      const gid = res.data.id;
      for (const s of schedule) {
        await adminAPI.addSchedule(gid, { weekday: s.weekday, start_time: s.start_time, end_time: s.end_time });
      }
      onSave();
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка создания группы');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className={styles.modalTitle}>Новая группа</h3>
      <div className={styles.formGrid}>
        <div className={styles.formCol}>
          <FieldRow label="Название группы" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Преподаватель</label>
            <select className={styles.fieldSelect} value={form.instructor_id}
              onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value }))}>
              <option value="">— не назначен —</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
          </div>
          <FieldRow label="Дата начала" value={form.start_date} type="date"
            onChange={v => setForm(f => ({ ...f, start_date: v }))} />
          <FieldRow label="Дата окончания" value={form.end_date} type="date"
            onChange={v => setForm(f => ({ ...f, end_date: v }))} />
        </div>
        <div className={styles.formCol}>
          <div className={styles.scheduleBlock}>
            <h4 className={styles.blockTitle}>Расписание</h4>
            <div className={styles.scheduleAddRow}>
              <input type="time" className={styles.timeInput} value={schForm.start_time}
                onChange={e => setSchForm(f => ({ ...f, start_time: e.target.value }))} />
              <span>—</span>
              <input type="time" className={styles.timeInput} value={schForm.end_time}
                onChange={e => setSchForm(f => ({ ...f, end_time: e.target.value }))} />
              <select className={styles.daySelect} value={schForm.weekday}
                onChange={e => setSchForm(f => ({ ...f, weekday: Number(e.target.value) }))}>
                {WEEKDAYS.map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
              </select>
              <button className={styles.addCircleBtn} onClick={addSch}>+</button>
            </div>
            {schedule.map(s => (
              <div key={s.id} className={styles.scheduleRow}>
                <span>{s.start_time} — {s.end_time}</span>
                <span className={styles.wdayChip}>{WEEKDAYS[s.weekday - 1]}</span>
                <button className={styles.deleteSmallBtn} onClick={() => removeSch(s.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </Modal>
  );
}

// ── Tariffs ───────────────────────────────────────────────────────────────────
function TariffsSection() {
  const [tariffs, setTariffs]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ name: '', practice_hours: '', theory_hours: '', total_price: '', theory_price: '' });
  const [deleteTariffId, setDeleteTariffId] = useState(null);
  const [deletingTariff, setDeletingTariff] = useState(false);

  const loadTariffs = useCallback(() => {
    setLoading(true);
    adminAPI.getTariffs()
      .then(r => setTariffs(r.data))
      .catch(() => setTariffs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTariffs(); }, [loadTariffs]);

  const tariff = tariffs.find(t => t.id === selected);

  useEffect(() => {
    if (tariff) setForm({ ...tariff });
  }, [selected]);

  function handleSave() {
    setSaving(true);
    adminAPI.updateTariff(selected, { name: form.name, practice_hours: Number(form.practice_hours), theory_hours: Number(form.theory_hours), total_price: form.total_price, theory_price: form.theory_price })
      .then(() => { loadTariffs(); setEditing(false); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleDeleteTariff() {
    setDeletingTariff(true);
    adminAPI.deleteTariff(deleteTariffId)
      .then(() => { loadTariffs(); if (selected === deleteTariffId) setSelected(null); setDeleteTariffId(null); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeletingTariff(false));
  }

  function handleAddTariff() {
    setSaving(true);
    adminAPI.createTariff({ name: addForm.name, practice_hours: Number(addForm.practice_hours), theory_hours: Number(addForm.theory_hours), total_price: addForm.total_price, theory_price: addForm.theory_price })
      .then(() => { loadTariffs(); setShowAdd(false); setAddForm({ name: '', practice_hours: '', theory_hours: '', total_price: '', theory_price: '' }); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  return (
    <div className={styles.splitPanel}>
      <div className={styles.listPanel}>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>Добавить тариф</button>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {tariffs.map(t => (
              <div key={t.id}
                className={`${styles.listItem} ${selected === t.id ? styles.listItemActive : ''}`}
                onClick={() => { setSelected(t.id); setEditing(false); }}
              >
                <div className={styles.listItemMain} style={{ fontWeight: 700 }}>{t.name}</div>
                <button className={styles.deleteCircleBtn} onClick={e => { e.stopPropagation(); setDeleteTariffId(t.id); }} title="Удалить">−</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.detailPanel}>
        {!tariff ? (
          <p className={styles.emptyText}>Выберите тариф</p>
        ) : (
          <>
            <div className={styles.detailHeader} style={{ justifyContent: 'flex-end' }}>
              {!editing ? (
                <button className={styles.editBtn} onClick={() => setEditing(true)}>Редактировать</button>
              ) : (
                <button className={styles.editBtn} onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
              )}
            </div>
            <div className={styles.detailForm}>
              <FieldRow label="Название тарифа" value={form.name || ''} disabled={!editing}
                onChange={v => setForm(f => ({ ...f, name: v }))} />
              <div className={styles.twoCol}>
                <FieldRow label="Часов теории" value={String(form.theory_hours ?? '')} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, theory_hours: v }))} />
                <FieldRow label="Часов практики" value={String(form.practice_hours ?? '')} disabled={!editing}
                  onChange={v => setForm(f => ({ ...f, practice_hours: v }))} />
              </div>
              <div className={styles.twoCol}>
                <div className={styles.priceBox}>
                  <span className={styles.priceLbl}>Общая стоимость</span>
                  {editing ? (
                    <input className={styles.fieldInput} value={form.total_price || ''}
                      onChange={e => setForm(f => ({ ...f, total_price: e.target.value }))} />
                  ) : (
                    <span className={styles.priceVal}>{Number(tariff.total_price).toLocaleString('ru')} руб</span>
                  )}
                </div>
                <div className={styles.priceBox}>
                  <span className={styles.priceLbl}>Теория</span>
                  {editing ? (
                    <input className={styles.fieldInput} value={form.theory_price || ''}
                      onChange={e => setForm(f => ({ ...f, theory_price: e.target.value }))} />
                  ) : (
                    <span className={styles.priceVal}>{Number(tariff.theory_price).toLocaleString('ru')} руб</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <h3 className={styles.modalTitle}>Новый тариф</h3>
          <FieldRow label="Название тарифа" value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} />
          <div className={styles.twoCol}>
            <FieldRow label="Часов теории" value={addForm.theory_hours} onChange={v => setAddForm(f => ({ ...f, theory_hours: v }))} />
            <FieldRow label="Часов практики" value={addForm.practice_hours} onChange={v => setAddForm(f => ({ ...f, practice_hours: v }))} />
          </div>
          <div className={styles.twoCol}>
            <FieldRow label="Общая стоимость" value={addForm.total_price} onChange={v => setAddForm(f => ({ ...f, total_price: v }))} />
            <FieldRow label="Стоимость теории" value={addForm.theory_price} onChange={v => setAddForm(f => ({ ...f, theory_price: v }))} />
          </div>
          <button className={styles.primaryBtn} onClick={handleAddTariff} disabled={saving}>
            {saving ? 'Добавление...' : 'Добавить'}
          </button>
        </Modal>
      )}

      {deleteTariffId && (
        <Modal onClose={() => setDeleteTariffId(null)}>
          <h3 className={styles.modalTitle}>Удалить тариф?</h3>
          <p className={styles.modalSubtitle}>
            Тариф <strong>{tariffs.find(t => t.id === deleteTariffId)?.name}</strong> будет удалён.
            Это действие нельзя отменить.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn}
              style={{ flex: 1, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
              onClick={handleDeleteTariff} disabled={deletingTariff}>
              {deletingTariff ? 'Удаление...' : 'Удалить'}
            </button>
            <button className={styles.editBtn}
              style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setDeleteTariffId(null)} disabled={deletingTariff}>
              Отмена
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REFERRAL TAB
// ══════════════════════════════════════════════════════════════════════════════
function ReferralTab() {
  const [students, setStudents]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [selDetail, setSelDetail] = useState(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [paying, setPaying]       = useState(null);

  useEffect(() => {
    setLoading(true);
    adminAPI.getReferralStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selected) { setReferrals([]); setSelDetail(null); return; }
    const s = students.find(x => x.id === selected);
    setSelDetail(s || null);
    adminAPI.getReferrals(selected)
      .then(r => setReferrals(r.data.referrals || []))
      .catch(() => setReferrals([]));
  }, [selected, students]);

  function handlePayBonus(referredId) {
    setPaying(referredId);
    adminAPI.payBonus(referredId)
      .then(() => setReferrals(rs => rs.map(r => r.id === referredId ? { ...r, bonus_paid_at: new Date().toISOString() } : r)))
      .catch(() => {})
      .finally(() => setPaying(null));
  }

  return (
    <div className={styles.referralWrapper}>
      <div className={styles.listPanel}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск студента" value={search} onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {students.map(s => (
              <div key={s.id}
                className={`${styles.listItem} ${selected === s.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <div className={styles.listItemMain}>{s.full_name}</div>
                <div className={styles.listItemSub}>{formatPhone(s.phone_number)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.referralDetail}>
        {!selDetail ? (
          <p className={styles.emptyText}>Выберите студента</p>
        ) : (
          <>
            <div className={styles.referralHeader}>
              <div className={styles.photoPlaceholder}>
                {getMediaUrl(selDetail.photo_url) && <img src={getMediaUrl(selDetail.photo_url)} alt="" className={styles.avatarDetail} />}
              </div>
              <div>
                <div className={styles.detailName}>{selDetail.full_name}</div>
                <div className={styles.detailPhone}>{formatPhone(selDetail.phone_number)}</div>
              </div>
            </div>
            <div className={styles.referralList}>
              {referrals.length === 0 ? (
                <p className={styles.emptyText}>Нет рефералов</p>
              ) : (
                referrals.map(ref => (
                  <div key={ref.id} className={styles.referralRow}>
                    <span className={styles.refName}>{ref.full_name}</span>
                    {ref.bonus_paid_at ? (
                      <div>
                        <button className={styles.bonusPaidBtn} disabled>бонус выплачен</button>
                        <div className={styles.bonusDate}>бонус выплачен {formatDate(ref.bonus_paid_at.slice(0, 10))}</div>
                      </div>
                    ) : (
                      <button className={styles.payBonusBtn} onClick={() => handlePayBonus(ref.id)} disabled={paying === ref.id}>
                        {paying === ref.id ? '...' : 'выплатить бонус'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES TAB
// ══════════════════════════════════════════════════════════════════════════════
const EMPTY_INV = () => ({ service: 'Теоретические занятия', amount: '', deadline: '' });

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function InvoicesTab() {
  const [students, setStudents]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [selDetail, setSelDetail] = useState(null);
  const [invoices, setInvoices]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState([EMPTY_INV()]);
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    setLoading(true);
    adminAPI.getInvoiceStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [search]);

  const loadInvoices = useCallback(() => {
    if (!selected) return;
    adminAPI.getStudentInvoices(selected)
      .then(r => {
        const d = r.data;
        setSelDetail(d.student || null);
        setInvoices(d.invoices || []);
      })
      .catch(() => {});
  }, [selected]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  async function handleCreateInvoices() {
    const valid = pendingInvoices.filter(inv => inv.amount && inv.deadline);
    if (!valid.length) return;
    setCreating(true);
    try {
      for (const inv of valid) {
        await adminAPI.createInvoice(selected, { service: inv.service, amount: inv.amount, deadline: inv.deadline });
      }
      loadInvoices();
      setPendingInvoices([EMPTY_INV()]);
    } catch (e) {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  function updatePendingInvoice(idx, field, value) {
    setPendingInvoices(list => list.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv));
  }

  function addPendingInvoice() {
    setPendingInvoices(list => [...list, EMPTY_INV()]);
  }

  function removePendingInvoice(idx) {
    setPendingInvoices(list => list.length > 1 ? list.filter((_, i) => i !== idx) : list);
  }

  function handleConfirmPayment(id) {
    adminAPI.updateInvoice(id, 'paid')
      .then(() => loadInvoices())
      .catch(() => {});
  }

  function handleDeleteInvoice(id) {
    adminAPI.deleteInvoice(id)
      .then(() => loadInvoices())
      .catch(() => {});
  }

  const statusLabel = (s) => {
    if (s === 'pending') return 'ожидает оплаты студентом';
    if (s === 'awaiting_confirmation') return 'ожидает подтверждения';
    if (s === 'paid') return `счёт закрыт`;
    return s;
  };

  return (
    <div className={styles.invoicesWrapper}>
      <div className={styles.listPanel}>
        <div className={styles.searchRow}>
          <input className={styles.searchInput} placeholder="поиск студента" value={search} onChange={e => setSearch(e.target.value)} />
          <span className={styles.searchIcon}><IconSearch /></span>
        </div>
        {loading ? <div className={styles.spinner} /> : (
          <div className={styles.listScroll}>
            {students.map(s => (
              <div key={s.id}
                className={`${styles.listItem} ${selected === s.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <div className={styles.listItemMain}>{s.full_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.invoiceDetail}>
        {!selDetail ? (
          <p className={styles.emptyText}>Выберите студента</p>
        ) : (
          <>
            <div className={styles.invoiceStudentHeader}>
              <span className={styles.detailName}>{selDetail.full_name}</span>
              <div style={{ textAlign: 'right' }}>
                <div className={styles.detailPhone}>{formatPhone(selDetail.phone_number)}</div>
                <div className={styles.tariffLabel}>Тариф: {selDetail.tariff_name || '—'}</div>
              </div>
            </div>

            {/* New invoices form */}
            <div className={styles.newInvoiceCard}>
              <div className={styles.invoiceFormHeader}>
                <h4 className={styles.cardTitle}>Новые счета</h4>
                <button className={styles.addCircleBtn} onClick={addPendingInvoice} title="Добавить счёт">+</button>
              </div>
              {pendingInvoices.map((inv, idx) => (
                <div key={idx} className={styles.pendingInvRow}>
                  <div className={styles.fieldGroup} style={{ flex: 2 }}>
                    <label className={styles.fieldLabel}>Услуга</label>
                    <input className={styles.fieldInput} value={inv.service}
                      onChange={e => updatePendingInvoice(idx, 'service', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Сумма</label>
                    <div className={styles.amountRow}>
                      <input className={styles.fieldInput} type="number" min="1" step="1" value={inv.amount}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '' || Number(v) >= 1) updatePendingInvoice(idx, 'amount', v);
                        }} placeholder="0" />
                      <span className={styles.rubleSign}>руб</span>
                    </div>
                  </div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Выплатить до</label>
                    <input className={styles.fieldInput} type="date" value={inv.deadline}
                      min={todayISO()}
                      onChange={e => updatePendingInvoice(idx, 'deadline', e.target.value)} />
                  </div>
                  {pendingInvoices.length > 1 && (
                    <button className={styles.deleteInvBtn} onClick={() => removePendingInvoice(idx)} title="Удалить строку">−</button>
                  )}
                </div>
              ))}
              <button className={styles.issueBtn} onClick={handleCreateInvoices}
                disabled={creating || !pendingInvoices.some(inv => inv.amount && inv.deadline)}>
                {creating ? 'Выставление...' : `Выставить счет${pendingInvoices.length > 1 ? 'а' : ''}`}
              </button>
            </div>

            {/* Invoice list */}
            <div className={styles.invoiceList}>
              {invoices.map(inv => (
                <div key={inv.id} className={styles.invoiceRow}>
                  <div className={styles.invoiceInfo}>
                    <span className={styles.invoiceService}>{inv.service}</span>
                    <span className={styles.invoiceAmount}>{Number(inv.amount).toLocaleString('ru')} руб</span>
                    {inv.deadline && inv.status !== 'paid' && (
                      <span className={styles.invoiceDeadline}>до {formatDate(inv.deadline)}</span>
                    )}
                    <span className={styles.invoiceStatus}>статус: {statusLabel(inv.status)}{inv.paid_at ? ' ' + formatDate(inv.paid_at.slice(0,10)) : ''}</span>
                  </div>
                  {inv.status === 'awaiting_confirmation' ? (
                    <button className={styles.confirmPayBtn} onClick={() => handleConfirmPayment(inv.id)}>Подтвердить оплату</button>
                  ) : inv.status === 'paid' ? (
                    <button className={styles.paidBtn} disabled>Оплата подтверждена</button>
                  ) : (
                    <button className={styles.confirmPayBtn} onClick={() => handleConfirmPayment(inv.id)}>Подтвердить оплату</button>
                  )}
                  <button className={styles.deleteInvBtn} onClick={() => handleDeleteInvoice(inv.id)} title="Удалить">−</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function FieldRow({ label, value, onChange, disabled = false, type = 'text', dimmed = false }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={`${styles.fieldLabel} ${dimmed ? styles.fieldLabelDisabled : ''}`}>{label}</label>
      <input
        className={`${styles.fieldInput} ${dimmed ? styles.fieldInputDimmed : ''}`}
        type={type}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        disabled={disabled}
        readOnly={!onChange}
      />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
