import { useState, useEffect } from 'react';
import { adminAPI } from '../../../api/client';
import { formatPhone } from '../../../utils/phone';
import { formatDate, getDaysInMonth, getFirstDayOfMonth, toDateStr } from '../../../utils/date';
import { IconPhone, IconUsers, IconEdit } from '../../../components/icons';
import styles from '../AdminPage.module.css';

const DAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTHS = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

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

      {lead.comment && !commentOpen && (
        <div className={styles.commentReadonly}>{lead.comment}</div>
      )}

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
          <textarea className={styles.commentInput} placeholder="Введите текст" rows={3}
            value={comment} onChange={e => onCommentChange(e.target.value)} />
          <button className={styles.commentDoneBtn} onClick={onCommentSave}>Готово</button>
        </div>
      )}
    </div>
  );
}

export function DashboardTab() {
  const today = new Date();
  const [currentMonth, setCurrentMonth]   = useState(today.getMonth());
  const [currentYear, setCurrentYear]     = useState(today.getFullYear());
  const [selectedDay, setSelectedDay]     = useState(today.getDate());
  const [appTab, setAppTab]               = useState('new');
  const [comments, setComments]           = useState({});
  const [commentOpen, setCommentOpen]     = useState(null);
  const [leads, setLeads]                 = useState([]);
  const [lessons, setLessons]             = useState([]);
  const [loadingLeads, setLoadingLeads]   = useState(false);
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

  function handleAcceptNew(lead) {
    adminAPI.updateLead(lead.id, { status: 'in_progress', comment: comments[lead.id] ?? (lead.comment || '') })
      .then(() => setLeads(ls => ls.filter(l => l.id !== lead.id)))
      .catch(() => {});
  }
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
      key: lead.id, lead, tab: appTab,
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
                <button key={day}
                  className={`${styles.calDay} ${isToday ? styles.calDayToday : ''} ${isSel && !isToday ? styles.calDaySelected : ''}`}
                  onClick={() => setSelectedDay(day)}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Теоретические занятия</h3>
          <div className={styles.dateChip}>
            {String(selectedDay).padStart(2, '0')}.{String(currentMonth + 1).padStart(2, '0')}.{currentYear}
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
                    <span className={styles.lessonTeacher}>Преподаватель: {lesson.instructor_name || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.rightCol}>
        <div className={styles.card} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className={styles.appTabs}>
            {[['new', 'Новые заявки'], ['in_progress', 'В обработке'], ['contacted', 'Принятые'], ['rejected', 'Отклонённые']].map(([val, label]) => (
              <button key={val}
                className={`${styles.appTab} ${appTab === val ? styles.appTabActive : ''}`}
                onClick={() => setAppTab(val)}>
                {label}
              </button>
            ))}
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
