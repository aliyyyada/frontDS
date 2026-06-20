import { useState, useEffect, useCallback, useRef } from 'react';
import { instructorAPI } from '../../../api/client';
import { toISO, fmtRU, getWeekDates } from '../../../utils/date';
import { parseApiError } from '../../../utils/validators';
import s from '../instructor.module.css';

const DAYS   = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
const MONTHS = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ',
                'ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

const WORK_START_MIN = 8 * 60;
const WORK_END_MIN   = 20 * 60;

const TYPE_LABEL = {
  booking_new:    'Новая запись',
  booking_cancel: 'Отмена записи',
  reminder_24h:   'Напоминание',
  reminder_2h:    'Напоминание',
  slot_added:     'Новые слоты',
  instructor_set: 'Прикреплён инструктор',
  invoice_status: 'Статус счёта',
};

function Sp() { return <div className={s.spinner} />; }

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getRoundedUpTime() {
  const now = new Date();
  const h = now.getMinutes() === 0 ? now.getHours() : (now.getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

function isPast(isoDate) { return isoDate < toISO(new Date()); }

function isSlotTimePast(isoDate, startTime) {
  const today = toISO(new Date());
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  const now = new Date();
  const [h, m] = startTime.split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function fmtNotifTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function NotificationsSheet({ onClose, onAllRead }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const pendingReadIds = useRef(new Set());

  useEffect(() => {
    instructorAPI.getNotifications()
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setItems(data);
        pendingReadIds.current = new Set(data.filter(n => !n.is_read).map(n => n.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); 

  const handleClose = () => {
    const ids = [...pendingReadIds.current];
    if (ids.length > 0) {
      Promise.all(ids.map(id => instructorAPI.markRead(id).catch(() => {})));
      onAllRead?.();
    }
    onClose();
  };

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Уведомления</span>
          <button className={s.sheetClose} onClick={handleClose}>✕</button>
        </div>
        {loading ? <div className={s.loading}><Sp /></div>
        : items.length === 0 ? <div className={s.empty}>Нет уведомлений</div>
        : <div className={s.notifList}>
            {items.map(n => (
              <div key={n.id} className={s.notifCard}>
                <div className={s.notifBody}>
                  <div className={s.notifType}>{TYPE_LABEL[n.type] || n.type}</div>
                  <div className={s.notifText}>{n.text}</div>
                  {n.created_at && <div className={s.notifTime}>{fmtNotifTime(n.created_at)}</div>}
                </div>
                {pendingReadIds.current.has(n.id) && <div className={s.notifDot} />}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function CreateSlotSheet({ selectedDate, onClose, onSaved }) {
  const [startTime, setStartTime] = useState(getRoundedUpTime);
  const [duration, setDuration]   = useState(90);
  const endTime = addMinutes(startTime, duration);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  function validate() {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);
    if (startMin < WORK_START_MIN) return 'Начало занятия не может быть раньше 08:00.';
    if (endMin > WORK_END_MIN) return `Занятие должно заканчиваться не позже 20:00. При выбранном времени конец — ${endTime}.`;
    return null;
  }

  const save = async () => {
    const valErr = validate();
    if (valErr) { setErr(valErr); return; }
    setLoading(true); setErr('');
    try {
      await instructorAPI.createSlot({ date: selectedDate, start_time: startTime, duration_minutes: duration });
      onSaved();
    } catch(e) { setErr(parseApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Новый слот</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Дата</label>
          <div className={s.fieldInputReadonly}>{selectedDate.split('-').reverse().join('.')}</div>
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Длительность</label>
          <div className={s.durationToggle}>
            <button className={`${s.durationBtn} ${duration === 90  ? s.durationBtnActive : ''}`} onClick={() => setDuration(90)}>1,5 ч</button>
            <button className={`${s.durationBtn} ${duration === 180 ? s.durationBtnActive : ''}`} onClick={() => setDuration(180)}>3 ч</button>
          </div>
        </div>
        <div className={s.fieldGroup}>
          <div className={s.timeHeader}>Время</div>
          <div className={s.timeRow}>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Начало</span>
              <input className={s.fieldInput} type="time" value={startTime} min="08:00" max="20:00"
                onChange={e => { setStartTime(e.target.value); setErr(''); }} />
            </div>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Конец</span>
              <div className={s.fieldInputReadonly}>{endTime}</div>
            </div>
          </div>
          <p className={s.autoNote}>Рабочий день инструктора: 08:00 – 20:00</p>
        </div>
        {err && <p className={s.err}>{err}</p>}
        <button className={s.btnBlue} onClick={save} disabled={loading}>
          {loading ? <Sp /> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function EditSlotSheet({ slot, onClose, onSaved, onDeleted }) {
  const [startTime, setStartTime] = useState(slot.start_time);
  const [duration, setDuration]   = useState(slot.duration_minutes === 180 ? 180 : 90);
  const endTime = addMinutes(startTime, duration);
  const canToggleBooked = slot.status !== 'booked' || slot.student_name == null;
  const [booked, setBooked]     = useState(slot.status === 'booked');
  const [loading, setLoading]   = useState(false);
  const [delLoad, setDelLoad]   = useState(false);
  const [err, setErr]           = useState('');

  function validate() {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);
    if (startMin < WORK_START_MIN) return 'Начало занятия не может быть раньше 08:00.';
    if (endMin > WORK_END_MIN) return `Занятие должно заканчиваться не позже 20:00. Конец — ${endTime}.`;
    return null;
  }

  const save = async () => {
    const valErr = validate();
    if (valErr) { setErr(valErr); return; }
    setLoading(true); setErr('');
    try {
      await instructorAPI.updateSlot(slot.id, {
        start_time: startTime,
        duration_minutes: duration,
        ...(canToggleBooked ? { status: booked ? 'booked' : 'free' } : {}),
      });
      onSaved();
    } catch(e) { setErr(parseApiError(e)); }
    finally { setLoading(false); }
  };

  const del = async () => {
    const msg = slot.student_name
      ? `На этот слот записан студент: ${slot.student_name}.\nСтудент получит уведомление об отмене.\nУдалить занятие?`
      : 'Удалить слот?';
    if (!window.confirm(msg)) return;
    setDelLoad(true);
    try { await instructorAPI.deleteSlot(slot.id); onDeleted(); }
    catch(e) { setErr(parseApiError(e)); }
    finally { setDelLoad(false); }
  };

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Редактирование слота</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Дата</label>
          <div className={s.fieldInputReadonly}>{slot.date.split('-').reverse().join('.')}</div>
        </div>
        {canToggleBooked && (
          <div className={s.fieldGroup}>
            <label className={s.fieldLabel}>Длительность</label>
            <div className={s.durationToggle}>
              <button className={`${s.durationBtn} ${duration === 90  ? s.durationBtnActive : ''}`}
                onClick={() => { setDuration(90);  setErr(''); }}>1,5 ч</button>
              <button className={`${s.durationBtn} ${duration === 180 ? s.durationBtnActive : ''}`}
                onClick={() => { setDuration(180); setErr(''); }}>3 ч</button>
            </div>
          </div>
        )}
        <div className={s.fieldGroup}>
          <div className={s.timeHeader}>Время</div>
          <div className={s.timeRow}>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Начало</span>
              <input className={s.fieldInput} type="time" value={startTime} min="08:00" max="20:00"
                disabled={!canToggleBooked}
                onChange={e => { setStartTime(e.target.value); setErr(''); }} />
            </div>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Конец</span>
              <div className={s.fieldInputReadonly}>{endTime}</div>
            </div>
          </div>
          <p className={s.autoNote}>Рабочий день инструктора: 08:00 – 20:00</p>
        </div>
        {canToggleBooked && (
          <div className={s.bookedRow} onClick={() => setBooked(p => !p)}>
            <span className={s.bookedLabel}>Забронировано</span>
            <div className={booked ? s.toggleOn : s.toggleOff}>
              <div className={s.toggleThumb} />
            </div>
          </div>
        )}
        {slot.student_name && (
          <div className={s.bookedRow} style={{ cursor: 'default' }}>
            <span className={s.bookedLabel}>Записан: {slot.student_name}</span>
          </div>
        )}
        {err && <p className={s.err}>{err}</p>}
        {canToggleBooked && (
          <button className={s.btnBlue} onClick={save} disabled={loading}>
            {loading ? <Sp /> : 'Сохранить'}
          </button>
        )}
        <button className={`${s.btnOrange} ${s.btnGap}`} onClick={del} disabled={delLoad}>
          {delLoad ? <Sp /> : 'Удалить'}
        </button>
      </div>
    </div>
  );
}

function CopyFromPrevWeekModal({ onConfirm, onCancel, loading }) {
  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Перенести расписание</span>
          <button className={s.sheetClose} onClick={onCancel}>✕</button>
        </div>
        <p className={s.sheetNote}>
          Слоты с <strong>предыдущей недели</strong> будут скопированы на{' '}
          <strong>текущую просматриваемую неделю</strong> как черновики.
          Переносятся только дата и время — студенты не переносятся.
        </p>
        <p className={s.sheetNote}>
          Если на этой неделе уже есть слот, который совпадает по времени с переносимым, такой слот будет пропущен.
        </p>
        <button className={s.btnBlue} onClick={onConfirm} disabled={loading}>
          {loading ? <Sp /> : 'Перенести'}
        </button>
        <button className={`${s.btnOrange} ${s.btnGap}`} onClick={onCancel} disabled={loading}>Отмена</button>
      </div>
    </div>
  );
}

export function ScheduleTab({ onEditModeChange }) {
  const [weekOffset, setWeekOffset]     = useState(0);
  const [selectedDay, setSelectedDay]   = useState(new Date());
  const [slots, setSlots]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [notifying, setNotifying]       = useState(false);
  const [showNotifs, setShowNotifs]     = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyLoading, setCopyLoading]   = useState(false);
  const today    = new Date();
  const weekDates = getWeekDates(weekOffset);
  const canPrev  = weekOffset > 0;
  const canNext  = weekOffset < 1;

  const enterEditMode = () => { setEditMode(true); onEditModeChange?.(true); };
  const cancelEditMode = () => { setEditMode(false); onEditModeChange?.(false); load(); };

  const exitEditMode = async () => {
    setEditMode(false); onEditModeChange?.(false);
    const shouldNotify = window.confirm('Уведомить студентов об обновлении расписания?');
    setNotifying(true);
    try { await instructorAPI.notifyStudents(shouldNotify); }
    catch {  }
    finally { setNotifying(false); load(); }
  };

  const handleCopyConfirm = async () => {
    setCopyLoading(true);
    try {
      await instructorAPI.copyFromPrevWeek(toISO(weekDates[0]));
      setShowCopyModal(false); load();
    } catch(e) {
      setShowCopyModal(false); alert(parseApiError(e));
    } finally { setCopyLoading(false); }
  };

  const load = useCallback(() => {
    setLoading(true);
    instructorAPI.getSlots({ week: toISO(weekDates[0]) })
      .then(r => setSlots(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [weekOffset]); 

  const loadSilent = useCallback(() => {
    instructorAPI.getSlots({ week: toISO(weekDates[0]) })
      .then(r => setSlots(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [weekOffset]); 

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (editMode) return;
    const id = setInterval(loadSilent, 15000);
    return () => clearInterval(id);
  }, [editMode, loadSilent]);

  const loadNotifCount = useCallback(() => {
    instructorAPI.getNotifications()
      .then(r => {
        const items = Array.isArray(r.data) ? r.data : [];
        setUnreadCount(items.filter(n => !n.is_read).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadNotifCount(); }, [loadNotifCount]);
  useEffect(() => {
    const id = setInterval(loadNotifCount, 60000);
    return () => clearInterval(id);
  }, [loadNotifCount]);

  const datesWithSlots = new Set(slots.map(sl => sl.date));
  const f = weekDates[0], l = weekDates[6];
  const monthLabel = f.getMonth() === l.getMonth()
    ? MONTHS[f.getMonth()]
    : `${MONTHS[f.getMonth()]} / ${MONTHS[l.getMonth()]}`;
  const selStr    = toISO(selectedDay);
  const isSelPast = isPast(selStr);
  const daySlots  = slots
    .filter(sl => sl.date === selStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleSlotClick = slot => {
    if (!editMode) return;
    if (isSlotTimePast(slot.date, slot.start_time)) return;
    setModal(slot);
  };

  return (
    <>
      <div className={s.schedulePage}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 className={s.pageTitle} style={{ margin: 0 }}>Расписание</h1>
          <button className={s.notifBtn} onClick={() => setShowNotifs(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unreadCount > 0 && (
              <span className={s.notifBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </div>

        <div className={s.calendarCard}>
          <div className={s.calendarHeader}>
            <button className={`${s.navBtn} ${!canPrev ? s.navBtnDisabled : ''}`}
              onClick={() => canPrev && setWeekOffset(p => p - 1)}>←</button>
            <span className={s.monthLabel}>{monthLabel}</span>
            <button className={`${s.navBtn} ${!canNext ? s.navBtnDisabled : ''}`}
              onClick={() => canNext && setWeekOffset(p => p + 1)}>→</button>
          </div>
          <div className={s.weekRow}>
            {DAYS.map(d => <span key={d} className={s.dayName}>{d}</span>)}
          </div>
          <div className={s.daysRow}>
            {weekDates.map((d, i) => {
              const iso   = toISO(d);
              const isTd  = d.toDateString() === today.toDateString();
              const isSel = d.toDateString() === selectedDay.toDateString();
              const hasSl = datesWithSlots.has(iso);
              const past  = isPast(iso);
              return (
                <button key={i} className={s.dayCell} onClick={() => setSelectedDay(new Date(d))}>
                  <span className={[
                    s.dayBtn,
                    isTd  ? s.dayToday    : '',
                    isSel ? s.daySelected : '',
                    past && !isTd && !isSel ? s.dayPast : '',
                  ].filter(Boolean).join(' ')}>
                    {d.getDate()}
                  </span>
                  {hasSl && !isSel && <span className={s.dayDot} />}
                </button>
              );
            })}
          </div>
        </div>

        {editMode && (
          <div className={s.editBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Режим редактирования
          </div>
        )}

        <div className={s.dayHeader}>
          <span className={s.dayDate}>{fmtRU(selectedDay)}</span>
          <div className={s.dayHeaderBtns}>
            {editMode && !isSelPast && (
              <button className={s.addBtn} onClick={() => setModal('create')}>+</button>
            )}
            {!editMode && (
              <button className={`${s.actionBtn} ${s.actionBtnBlue}`} onClick={enterEditMode}>
                Редактировать
              </button>
            )}
          </div>
        </div>

        {editMode && (
          <button className={s.copyLinkBtn} onClick={() => setShowCopyModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Перенести расписание с предыдущей недели
          </button>
        )}

        {editMode && (
          <div className={s.editActionBar}>
            <button className={`${s.editActionBarBtn} ${s.editActionBarBtnGray}`} onClick={cancelEditMode}>
              Сохранить черновик
            </button>
            <button className={`${s.editActionBarBtn} ${s.editActionBarBtnOrange}`}
              onClick={exitEditMode} disabled={notifying}>
              {notifying ? <Sp /> : 'Опубликовать'}
            </button>
          </div>
        )}

        {loading ? (
          <div className={s.loading}><Sp /></div>
        ) : daySlots.length === 0 ? (
          <div className={s.empty}>
            {isSelPast ? 'Занятий в этот день не было' : 'Нет слотов на выбранный день'}
          </div>
        ) : (
          <div className={s.slotList}>
            {daySlots.map(slot => {
              const slotPast = isSlotTimePast(slot.date, slot.start_time);
              return (
                <div key={slot.id}
                  className={[
                    s.slot,
                    slot.status === 'booked' ? s.slotBlue :
                    slot.status === 'theory' ? s.slotBlue :
                    slot.status === 'draft'  ? s.slotDraft : s.slotWhite,
                    slotPast ? s.slotPast : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => slot.status !== 'theory' && handleSlotClick(slot)}
                  style={(!editMode || slotPast || slot.status === 'theory') ? { cursor: 'default' } : { cursor: 'pointer' }}>
                  <div className={s.slotTime}>{slot.start_time} - {slot.end_time}</div>
                  <div className={s.slotTitle}>
                    {slot.status === 'theory'
                      ? (slot.group_name
                          ? (slot.group_name.toLowerCase().includes('групп')
                              ? slot.group_name
                              : `${slot.group_name} группа`)
                          : 'Теоретическое занятие')
                      : slot.status === 'booked'
                        ? (slot.student_name || 'Студент (забронировано)')
                        : slot.status === 'draft'
                          ? 'Черновик'
                          : 'Свободно'}
                  </div>
                  {slot.status === 'theory' && (
                    <div className={s.slotLoc}>📍 {process.env.REACT_APP_SCHOOL_ADDRESS}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === 'create' && (
        <CreateSlotSheet selectedDate={selStr} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }} />
      )}
      {modal && modal !== 'create' && (
        <EditSlotSheet slot={modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          onDeleted={() => { setModal(null); load(); }} />
      )}
      {showNotifs && (
        <NotificationsSheet onClose={() => setShowNotifs(false)} onAllRead={() => setUnreadCount(0)} />
      )}
      {showCopyModal && (
        <CopyFromPrevWeekModal loading={copyLoading} onConfirm={handleCopyConfirm}
          onCancel={() => setShowCopyModal(false)} />
      )}
    </>
  );
}
