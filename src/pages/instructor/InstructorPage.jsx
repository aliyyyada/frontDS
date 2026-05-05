import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { instructorAPI, getMediaUrl } from '../../api/client';
import { formatPhone } from '../../utils/phone';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import s from './instructor.module.css';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const DAYS   = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
const MONTHS = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ',
                'ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

function getWeekDates(offset = 0) {
  const today  = new Date();
  const dow    = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + offset * 7);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(monday); d.setDate(monday.getDate()+i); return d;
  });
}

const toISO = d => {
  // Используем локальную дату, не UTC
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};

const fmtRU = d => [
  String(d.getDate()).padStart(2,'0'),
  String(d.getMonth()+1).padStart(2,'0'),
  d.getFullYear(),
].join('.');

/* ─── Разбор ошибок API ───────────────────────────────────────────────────── */
function parseApiError(e) {
  const data = e?.response?.data;
  if (!data) return 'Что-то пошло не так. Попробуйте позже.';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data === 'object') {
    const msgs = Object.values(data).flat().filter(v => typeof v === 'string');
    if (msgs.length) return msgs[0];
  }
  return 'Что-то пошло не так. Попробуйте позже.';
}

/* ─── Валидация: российский номерной знак ─────────────────────────────────── */
const PLATE_LETTERS = 'АВЕКМНОРСТУХ';

function filterPlateChars(val) {
  const upper = val.toUpperCase();
  let result = '';
  for (const ch of upper) {
    if (PLATE_LETTERS.includes(ch) || /\d/.test(ch)) result += ch;
  }
  return result.slice(0, 9);
}

function isValidPlate(plate) {
  // Категория B: 1 буква + 3 цифры + 2 буквы + 2-3 цифры (регион)
  const catB = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/;
  // Категория A (мотоциклы): 4 цифры + 2 буквы + 2-3 цифры
  const catA = /^\d{4}[АВЕКМНОРСТУХ]{2}\d{2,3}$/;
  return catB.test(plate) || catA.test(plate);
}

/* ─── Валидация: русский текст (ФИО, цвет и т.д.) ────────────────────────── */
function filterRuText(val) {
  // Оставляем только кириллицу, пробелы, дефисы, апострофы
  const cleaned = val.replace(/[^а-яёА-ЯЁ\s\-']/g, '');
  // Авто-капитализация первой буквы каждого слова
  return cleaned.replace(/(^|[\s\-'])([а-яёА-ЯЁ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Прибавить N минут к строке "HH:MM" */
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const WORK_START_MIN = 8 * 60;   // 08:00
const WORK_END_MIN   = 20 * 60;  // 20:00

/** Является ли дата (ISO строка) прошедшей (строго до сегодня) */
function isPast(isoDate) {
  const today = toISO(new Date());
  return isoDate < today;
}

/** Является ли слот прошедшим: дата до сегодня, или сегодня и время уже наступило */
function isSlotTimePast(isoDate, startTime) {
  const today = toISO(new Date());
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  // сегодня — сравниваем время
  const now = new Date();
  const [h, m] = startTime.split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

/** Текущее время, округлённое вверх до ближайшего часа */
function getRoundedUpTime() {
  const now = new Date();
  const h = now.getMinutes() === 0 ? now.getHours() : (now.getHours() + 1) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

function Sp() { return <div className={s.spinner}/>; }

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS SHEET
════════════════════════════════════════════════════════════════════════════ */
const TYPE_LABEL = {
  booking_new:    'Новая запись',
  booking_cancel: 'Отмена записи',
  reminder_24h:   'Напоминание',
  reminder_2h:    'Напоминание',
  slot_added:     'Новые слоты',
  instructor_set: 'Прикреплён инструктор',
  invoice_status: 'Статус счёта',
};

function fmtNotifTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function NotificationsSheet({ onClose, onAllRead }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  // Ids, которые были непрочитаны при открытии — точки видны, пока шторка открыта
  const pendingReadIds = useRef(new Set());

  useEffect(()=>{
    instructorAPI.getNotifications()
      .then(r=>{
        const data = Array.isArray(r.data) ? r.data : [];
        setItems(data);
        pendingReadIds.current = new Set(data.filter(n=>!n.is_read).map(n=>n.id));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  // eslint-disable-next-line
  },[]);

  // При закрытии — отправляем mark-read и сбрасываем счётчик
  const handleClose = () => {
    const ids = [...pendingReadIds.current];
    if (ids.length > 0) {
      Promise.all(ids.map(id => instructorAPI.markRead(id).catch(()=>{})));
      onAllRead?.();
    }
    onClose();
  };

  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&handleClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Уведомления</span>
          <button className={s.sheetClose} onClick={handleClose}>✕</button>
        </div>
        {loading ? <div className={s.loading}><Sp/></div>
        : items.length===0 ? <div className={s.empty}>Нет уведомлений</div>
        : <div className={s.notifList}>
            {items.map(n=>(
              <div key={n.id} className={s.notifCard}>
                <div className={s.notifBody}>
                  <div className={s.notifType}>{TYPE_LABEL[n.type]||n.type}</div>
                  <div className={s.notifText}>{n.text}</div>
                  {n.created_at && (
                    <div className={s.notifTime}>{fmtNotifTime(n.created_at)}</div>
                  )}
                </div>
                {pendingReadIds.current.has(n.id) && <div className={s.notifDot}/>}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE SLOT SHEET
   end_time = start_time + 90 мин (авто)
════════════════════════════════════════════════════════════════════════════ */
function CreateSlotSheet({ selectedDate, onClose, onSaved }) {
  const [startTime, setStartTime] = useState(getRoundedUpTime);
  const [duration, setDuration]   = useState(90); // 90 или 180 минут
  const endTime = addMinutes(startTime, duration);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function validate() {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);
    if (startMin < WORK_START_MIN) return 'Начало занятия не может быть раньше 08:00.';
    if (endMin > WORK_END_MIN)     return `Занятие должно заканчиваться не позже 20:00. При выбранном времени конец — ${endTime}.`;
    return null;
  }

  const save = async () => {
    const valErr = validate();
    if (valErr) { setErr(valErr); return; }
    setLoading(true); setErr('');
    try {
      await instructorAPI.createSlot({ date: selectedDate, start_time: startTime, duration_minutes: duration });
      onSaved();
    } catch(e) {
      setErr(parseApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
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
            <button
              className={`${s.durationBtn} ${duration === 90  ? s.durationBtnActive : ''}`}
              onClick={() => setDuration(90)}>
              1,5 ч
            </button>
            <button
              className={`${s.durationBtn} ${duration === 180 ? s.durationBtnActive : ''}`}
              onClick={() => setDuration(180)}>
              3 ч
            </button>
          </div>
        </div>

        <div className={s.fieldGroup}>
          <div className={s.timeHeader}>Время</div>
          <div className={s.timeRow}>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Начало</span>
              <input className={s.fieldInput} type="time" value={startTime} min="08:00" max="20:00"
                onChange={e=>{ setStartTime(e.target.value); setErr(''); }}/>
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
          {loading ? <Sp/> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT SLOT SHEET
   • end_time авто
   • переключатель «Забронировано» — меняет статус в обе стороны
   • удаление доступно всегда (со стороны инструктора)
════════════════════════════════════════════════════════════════════════════ */
function EditSlotSheet({ slot, onClose, onSaved, onDeleted }) {
  const [startTime, setStartTime] = useState(slot.start_time);
  // Определяем начальную длительность из данных слота (90 или 180), по умолчанию 90
  const initialDuration = slot.duration_minutes === 180 ? 180 : 90;
  const [duration, setDuration] = useState(initialDuration);
  const endTime = addMinutes(startTime, duration);
  // Тоггл доступен только если студента нет (инструктор сам забронировал)
  const canToggleBooked = slot.status !== 'booked' || slot.student_name == null;
  const [booked, setBooked] = useState(slot.status === 'booked');
  const [loading, setLoading] = useState(false);
  const [delLoad, setDelLoad] = useState(false);
  const [err, setErr] = useState('');

  function validate() {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);
    if (startMin < WORK_START_MIN) return 'Начало занятия не может быть раньше 08:00.';
    if (endMin > WORK_END_MIN)     return `Занятие должно заканчиваться не позже 20:00. Конец — ${endTime}.`;
    return null;
  }

  const save = async () => {
    const valErr = validate();
    if (valErr) { setErr(valErr); return; }
    setLoading(true); setErr('');
    try {
      await instructorAPI.updateSlot(slot.id, {
        start_time:       startTime,
        duration_minutes: duration,
        // Если студент записан — не меняем статус через patch
        ...(canToggleBooked ? { status: booked ? 'booked' : 'free' } : {}),
      });
      onSaved();
    } catch(e) { setErr(parseApiError(e)); }
    finally { setLoading(false); }
  };

  const del = async () => {
    const studentName = slot.student_name;
    const msg = studentName
      ? `На этот слот записан студент: ${studentName}.\nСтудент получит уведомление об отмене.\nУдалить занятие?`
      : 'Удалить слот?';
    if (!window.confirm(msg)) return;
    setDelLoad(true);
    try { await instructorAPI.deleteSlot(slot.id); onDeleted(); }
    catch(e) { setErr(parseApiError(e)); }
    finally { setDelLoad(false); }
  };

  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
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
              <button
                className={`${s.durationBtn} ${duration === 90  ? s.durationBtnActive : ''}`}
                onClick={() => { setDuration(90);  setErr(''); }}>
                1,5 ч
              </button>
              <button
                className={`${s.durationBtn} ${duration === 180 ? s.durationBtnActive : ''}`}
                onClick={() => { setDuration(180); setErr(''); }}>
                3 ч
              </button>
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
                onChange={e=>{ setStartTime(e.target.value); setErr(''); }}/>
            </div>
            <div className={s.timeCol}>
              <span className={s.timeColLabel}>Конец</span>
              <div className={s.fieldInputReadonly}>{endTime}</div>
            </div>
          </div>
          <p className={s.autoNote}>Рабочий день инструктора: 08:00 – 20:00</p>
        </div>

        {/* Тоггл только если инструктор сам забронировал */}
        {canToggleBooked && (
          <div className={s.bookedRow} onClick={()=>setBooked(p=>!p)}>
            <span className={s.bookedLabel}>Забронировано</span>
            <div className={booked ? s.toggleOn : s.toggleOff}>
              <div className={s.toggleThumb}/>
            </div>
          </div>
        )}

        {/* Если студент записан — показываем инфо */}
        {slot.student_name && (
          <div className={s.bookedRow} style={{cursor:'default'}}>
            <span className={s.bookedLabel}>Записан: {slot.student_name}</span>
          </div>
        )}

        {err && <p className={s.err}>{err}</p>}
        {canToggleBooked && (
          <button className={s.btnBlue} onClick={save} disabled={loading}>
            {loading ? <Sp/> : 'Сохранить'}
          </button>
        )}
        <button className={`${s.btnOrange} ${s.btnGap}`} onClick={del} disabled={delLoad}>
          {delLoad ? <Sp/> : 'Удалить'}
        </button>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════════════════
   SCHEDULE TAB
   • Прошедшие дни — слоты показываются (read-only), кнопка + скрыта,
     клик по слоту не открывает редактирование
   • Дни со слотами подсвечиваются точкой
   • Навигация: текущая и следующая неделя
════════════════════════════════════════════════════════════════════════════ */
function ScheduleTab({ onEditModeChange }) {
  const [weekOffset, setWeekOffset]   = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [slots, setSlots]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [editMode, setEditMode]       = useState(false);
  const [notifying, setNotifying]     = useState(false);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const today = new Date();
  const weekDates = getWeekDates(weekOffset);

  const canPrev = weekOffset > 0;
  const canNext = weekOffset < 1;

  const enterEditMode = () => {
    setEditMode(true);
    onEditModeChange?.(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    onEditModeChange?.(false);
    load();
  };

  const exitEditMode = async () => {
    setEditMode(false);
    onEditModeChange?.(false);
    const shouldNotify = window.confirm('Уведомить студентов об обновлении расписания?');
    setNotifying(true);
    try { await instructorAPI.notifyStudents(shouldNotify); }
    catch { /* некритично */ }
    finally { setNotifying(false); load(); }
  };

  const load = useCallback(()=>{
    setLoading(true);
    instructorAPI.getSlots({ week: toISO(weekDates[0]) })
      .then(r=>setSlots(Array.isArray(r.data)?r.data:[]))
      .catch(()=>setSlots([]))
      .finally(()=>setLoading(false));
  // eslint-disable-next-line
  },[weekOffset]);

  const loadSilent = useCallback(()=>{
    instructorAPI.getSlots({ week: toISO(weekDates[0]) })
      .then(r=>setSlots(Array.isArray(r.data)?r.data:[]))
      .catch(()=>{});
  // eslint-disable-next-line
  },[weekOffset]);

  useEffect(()=>{ load(); },[load]);

  // Автообновление слотов каждые 15 секунд (только вне режима редактирования)
  useEffect(()=>{
    if (editMode) return;
    const id = setInterval(loadSilent, 15000);
    return ()=>clearInterval(id);
  },[editMode, loadSilent]);

  // Счётчик непрочитанных уведомлений
  const loadNotifCount = useCallback(()=>{
    instructorAPI.getNotifications()
      .then(r=>{
        const items = Array.isArray(r.data) ? r.data : [];
        setUnreadCount(items.filter(n=>!n.is_read).length);
      })
      .catch(()=>{});
  },[]);

  useEffect(()=>{ loadNotifCount(); },[loadNotifCount]);

  // Обновление счётчика уведомлений каждые 60 секунд
  useEffect(()=>{
    const id = setInterval(loadNotifCount, 60000);
    return ()=>clearInterval(id);
  },[loadNotifCount]);

  const datesWithSlots = new Set(slots.map(sl=>sl.date));

  const f = weekDates[0], l = weekDates[6];
  const monthLabel = f.getMonth()===l.getMonth()
    ? MONTHS[f.getMonth()]
    : `${MONTHS[f.getMonth()]} / ${MONTHS[l.getMonth()]}`;

  const selStr   = toISO(selectedDay);
  const isSelPast = isPast(selStr);   // выбранный день — прошедший?

  const daySlots = slots
    .filter(sl=>sl.date===selStr)
    .sort((a,b)=>a.start_time.localeCompare(b.start_time));

  const handleSlotClick = slot => {
    if (!editMode) return;
    if (isSlotTimePast(slot.date, slot.start_time)) return;
    setModal(slot);
  };

  return (
    <>
      <div className={s.schedulePage}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
          <h1 className={s.pageTitle} style={{margin:0}}>Расписание</h1>
          <button className={s.notifBtn} onClick={()=>setShowNotifs(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unreadCount > 0 && (
              <span className={s.notifBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        </div>

        {/* Calendar */}
        <div className={s.calendarCard}>
          <div className={s.calendarHeader}>
            <button
              className={`${s.navBtn} ${!canPrev?s.navBtnDisabled:''}`}
              onClick={()=>canPrev&&setWeekOffset(p=>p-1)}>←</button>
            <span className={s.monthLabel}>{monthLabel}</span>
            <button
              className={`${s.navBtn} ${!canNext?s.navBtnDisabled:''}`}
              onClick={()=>canNext&&setWeekOffset(p=>p+1)}>→</button>
          </div>
          <div className={s.weekRow}>
            {DAYS.map(d=><span key={d} className={s.dayName}>{d}</span>)}
          </div>
          <div className={s.daysRow}>
            {weekDates.map((d,i)=>{
              const iso   = toISO(d);
              const isTd  = d.toDateString()===today.toDateString();
              const isSel = d.toDateString()===selectedDay.toDateString();
              const hasSl = datesWithSlots.has(iso);
              const past  = isPast(iso);
              return (
                <button key={i} className={s.dayCell}
                  onClick={()=>setSelectedDay(new Date(d))}>
                  <span className={[
                    s.dayBtn,
                    isTd  ? s.dayToday    : '',
                    isSel ? s.daySelected : '',
                    past && !isTd && !isSel ? s.dayPast : '',
                  ].filter(Boolean).join(' ')}>
                    {d.getDate()}
                  </span>
                  {hasSl && !isSel && <span className={s.dayDot}/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Баннер режима редактирования */}
        {editMode && (
          <div className={s.editBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Режим редактирования
          </div>
        )}

        {/* Day header */}
        <div className={s.dayHeader}>
          <span className={s.dayDate}>{fmtRU(selectedDay)}</span>
          <div className={s.dayHeaderBtns}>
            {editMode && !isSelPast && (
              <button className={s.addBtn} onClick={()=>setModal('create')}>+</button>
            )}
            {!editMode && (
              <button
                className={`${s.actionBtn} ${s.actionBtnBlue}`}
                onClick={enterEditMode}
              >
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Кнопки действий режима редактирования — вынесены в отдельную строку */}
        {editMode && (
          <div className={s.editActionBar}>
            <button
              className={`${s.editActionBarBtn} ${s.editActionBarBtnGray}`}
              onClick={cancelEditMode}
            >
              Сохранить черновик
            </button>
            <button
              className={`${s.editActionBarBtn} ${s.editActionBarBtnOrange}`}
              onClick={exitEditMode}
              disabled={notifying}
            >
              {notifying ? <Sp/> : 'Опубликовать'}
            </button>
          </div>
        )}

        {/* Slots */}
        {loading ? (
          <div className={s.loading}><Sp/></div>
        ) : daySlots.length===0 ? (
          <div className={s.empty}>
            {isSelPast ? 'Занятий в этот день не было' : 'Нет слотов на выбранный день'}
          </div>
        ) : (
          <div className={s.slotList}>
            {daySlots.map(slot=>{
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
                  onClick={()=> slot.status !== 'theory' && handleSlotClick(slot)}
                  style={(!editMode || slotPast || slot.status === 'theory') ? {cursor:'default'} : {cursor:'pointer'}}>
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
                    <div className={s.slotLoc}>📍 Энтузиастов 12, офис 302</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal==='create' && (
        <CreateSlotSheet selectedDate={selStr} onClose={()=>setModal(null)}
          onSaved={()=>{setModal(null);load();}}/>
      )}
      {modal && modal!=='create' && (
        <EditSlotSheet slot={modal} onClose={()=>setModal(null)}
          onSaved={()=>{setModal(null);load();}}
          onDeleted={()=>{setModal(null);load();}}/>
      )}
      {showNotifs && (
        <NotificationsSheet
          onClose={()=>setShowNotifs(false)}
          onAllRead={()=>setUnreadCount(0)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE — sheets
════════════════════════════════════════════════════════════════════════════ */
function CarSheet({ profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    car_brand:    profile?.car_brand    || '',
    car_color:    profile?.car_color    || '',
    car_plate:    profile?.car_plate    || '',
    car_type_kpp: profile?.car_type_kpp || 'МКПП',
  });
  const [fieldErr, setFieldErr] = useState({});
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  const validate = () => {
    const e = {};
    if (form.car_plate && !isValidPlate(form.car_plate)) {
      e.car_plate = 'Неверный формат. Пример: А001ВВ77 (кат. B) или 1234ВВ77 (кат. A)';
    }
    setFieldErr(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true); setErr('');
    try { await instructorAPI.updateCar(form); onSaved(); }
    catch(e) { setErr(parseApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Автомобиль</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>

        {/* Марка — любые символы (названия могут быть латинскими) */}
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Марка автомобиля</label>
          <input className={s.fieldInput} placeholder="Lada Granta" value={form.car_brand}
            onChange={e=>setForm(p=>({...p, car_brand: e.target.value}))}/>
        </div>

        {/* Цвет — только кириллица, авто-капитализация */}
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Цвет</label>
          <input className={s.fieldInput} placeholder="Белый" value={form.car_color}
            onChange={e=>setForm(p=>({...p, car_color: filterRuText(e.target.value)}))}/>
        </div>

        {/* Номерной знак — строгий формат */}
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Регистрационный номер</label>
          <input
            className={`${s.fieldInput} ${fieldErr.car_plate ? s.fieldInputError : ''}`}
            placeholder="А001АА77"
            value={form.car_plate}
            onChange={e => {
              const val = filterPlateChars(e.target.value);
              setForm(p=>({...p, car_plate: val}));
              if (fieldErr.car_plate) setFieldErr(p=>({...p, car_plate:''}));
            }}
          />
          {fieldErr.car_plate && <p className={s.fieldErrText}>{fieldErr.car_plate}</p>}
          <p className={s.autoNote}>Буквы: А В Е К М Н О Р С Т У Х · Категории А и B</p>
        </div>

        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Тип КПП</label>
          <select className={s.fieldInput} value={form.car_type_kpp}
            onChange={e=>setForm(p=>({...p,car_type_kpp:e.target.value}))}>
            <option value="МКПП">МКПП (механика)</option>
            <option value="АКПП">АКПП (автомат)</option>
          </select>
        </div>

        {err && <p className={s.err}>{err}</p>}
        <button className={s.btnBlue} onClick={save} disabled={loading}>
          {loading ? <Sp/> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function LimitSheet({ profile, onClose, onSaved }) {
  const [lim, setLim]         = useState(profile?.weekly_limit ?? 3);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const save = async () => {
    setLoading(true); setErr('');
    try { await instructorAPI.updateLimit({ weekly_limit: lim }); onSaved(); }
    catch(e) { setErr(parseApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className={s.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Лимит занятий</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>
        <p className={s.sheetNote}>
          Максимальное количество занятий в неделю, на которое может записаться студент.
        </p>
        <div className={s.limitRow}>
          <button className={s.limitBtn} onClick={()=>setLim(p=>Math.max(1,p-1))}>−</button>
          <span className={s.limitVal}>{lim}</span>
          <button className={s.limitBtn} onClick={()=>setLim(p=>Math.min(10,p+1))}>+</button>
        </div>
        {err && <p className={s.err}>{err}</p>}
        <button className={`${s.btnBlue} ${s.btnGap}`} onClick={save} disabled={loading}>
          {loading ? <Sp/> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE TAB
════════════════════════════════════════════════════════════════════════════ */
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function ProfileTab() {
  const { logout }   = useAuth();
  const navigate     = useNavigate();
  const fileRef      = useRef(null);

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [sheet,     setSheet]     = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [legalDoc,  setLegalDoc]  = useState(null); // 'privacy' | 'terms' | null

  const load = () => {
    instructorAPI.getProfile()
      .then(r=>{ setProfile(r.data); setAvatarUrl(getMediaUrl(r.data.avatar_url)||null); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleAvatarChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');

    // Мгновенный превью
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await instructorAPI.uploadAvatar(fd);
      setAvatarUrl(getMediaUrl(res.data.avatar_url) || preview);
    } catch(err) {
      const msg = err.response?.data?.detail || 'Ошибка загрузки фото';
      setUploadErr(msg);
      setAvatarUrl(profile?.avatar_url || null); // откат
    } finally {
      setUploading(false);
      // Сбросить input чтобы можно было выбрать тот же файл снова
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fullName = profile
    ? [profile.last_name, profile.first_name, profile.patronymic].filter(Boolean).join(' ')
    : '—';
  const carLabel = profile?.car_brand
    ? `${profile.car_color?profile.car_color+' ':''}${profile.car_brand} ${profile.car_plate||''}`.trim()
    : 'Не указан';

  return (
    <>
      <div className={s.profilePage}>
        <div className={s.profileHeader}>
          <h1 className={s.pageTitle} style={{margin:0}}>Профиль</h1>
        </div>

        {loading ? <div className={s.loading}><Sp/></div> : (
          <>
            {/* Avatar — кликабельный */}
            <div className={s.avatarWrap} onClick={()=>fileRef.current?.click()}
              title="Изменить фото">
              <div className={s.avatar}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar"
                      style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                  : <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="20" r="11" fill="#B0B8C9"/>
                      <ellipse cx="26" cy="46" rx="20" ry="11" fill="#B0B8C9"/>
                    </svg>
                }
              </div>
              <div className={s.cameraBadge}>
                {uploading ? <div className={s.spinnerSm}/> : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                  </svg>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{display:'none'}} onChange={handleAvatarChange}/>
            </div>

            {uploadErr && <p className={s.err} style={{textAlign:'center'}}>{uploadErr}</p>}

            <div className={s.profileName}>{fullName}</div>

            {/* Car card */}
            <div className={s.infoCard} onClick={()=>setSheet('car')}>
              <div className={s.infoCardRow}>
                <span className={s.infoCardTitle}>Автомобиль</span>
                <PencilIcon/>
              </div>
              <div className={s.infoCardValue}>{carLabel}</div>
            </div>

            {/* Limit card */}
            <div className={s.infoCard} onClick={()=>setSheet('limit')}>
              <div className={s.infoCardRow}>
                <span className={s.infoCardTitle}>Лимит</span>
                <PencilIcon/>
              </div>
              <div className={s.infoCardValueMuted}>
                Макс. занятий в неделю, на которое может записаться студент —{' '}
                <strong style={{color:'#1A1A1A'}}>{profile?.weekly_limit??3}</strong>.
              </div>
            </div>

            <div className={s.profileBottom}>
              <div className={s.legalDocs}>
                <button className={s.legalDocLink} onClick={() => setLegalDoc('privacy')}>
                  Политика обработки персональных данных
                </button>
                <span className={s.legalDocDot}>·</span>
                <button className={s.legalDocLink} onClick={() => setLegalDoc('terms')}>
                  Пользовательское соглашение
                </button>
              </div>

              <button className={s.logoutBtn} onClick={()=>{logout();navigate('/login');}}>
                Выйти
              </button>
            </div>
          </>
        )}
      </div>

      {sheet==='car'   && <CarSheet   profile={profile} onClose={()=>setSheet(null)} onSaved={()=>{setSheet(null);load();}}/>}
      {sheet==='limit' && <LimitSheet profile={profile} onClose={()=>setSheet(null)} onSaved={()=>{setSheet(null);load();}}/>}
      {legalDoc && <LegalDocModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REQUESTS TAB
════════════════════════════════════════════════════════════════════════════ */
const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill="#B0B8C9"/>
    <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" fill="#B0B8C9"/>
  </svg>
);

function RequestsTab() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(()=>{
    instructorAPI.getStudents()
      .then(r=>setStudents(Array.isArray(r.data)?r.data:[]))
      .catch(()=>setStudents([]))
      .finally(()=>setLoading(false));
  },[]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(st => {
        const nameMatch = st.full_name?.toLowerCase().includes(q);
        const qDigits = q.replace(/\D/g,'');
        const phoneMatch = qDigits && st.phone_number?.replace(/\D/g,'').includes(qDigits);
        return nameMatch || phoneMatch;
      })
    : students;

  return (
    <div className={s.requestsPage}>
      <h1 className={s.pageTitle}>Студенты</h1>

      {/* Поиск */}
      <div className={s.searchWrap}>
        <svg className={s.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#8A8A8A" strokeWidth="2"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          className={s.searchInput}
          placeholder="Поиск по имени или номеру"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        {search && (
          <button className={s.searchClear} onClick={()=>setSearch('')}>✕</button>
        )}
      </div>

      {loading ? <div className={s.loading}><Sp/></div>
      : filtered.length===0 ? (
        <div className={s.empty}>
          {students.length===0 ? 'Студенты не назначены' : 'Ничего не найдено'}
        </div>
      )
      : filtered.map(st=>(
        <div key={st.id} className={s.studentCard}>
          {/* Аватар — фото или иконка */}
          <div className={s.studentAvatar}>
            {getMediaUrl(st.photo_url || st.avatar_url)
              ? <img src={getMediaUrl(st.photo_url || st.avatar_url)} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
              : <PersonIcon/>
            }
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div className={s.studentName}>{st.full_name}</div>
            <div className={s.studentMeta}>
              <PhoneIcon/>
              <a href={`tel:${st.phone_number}`} className={s.phoneLink}>
                {formatPhone(st.phone_number)}
              </a>
              <span className={s.metaDot}>·</span>
              {st.count_lessons} ч.
              <span className={s.metaDot}>·</span>
              {st.type_kpp||'—'}
              {st.birth_date && (
                <>
                  <span className={s.metaDot}>·</span>
                  {st.birth_date.split('-').reverse().join('.')}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function InstructorPage() {
  const [tab, setTab]           = useState('schedule');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={s.app}>
      <div className={s.content}>
        {tab==='requests' && <RequestsTab/>}
        {tab==='schedule' && <ScheduleTab onEditModeChange={setIsEditing}/>}
        {tab==='profile'  && <ProfileTab/>}
      </div>
      <nav className={`${s.bottomNav} ${isEditing ? s.navLocked : ''}`}>
        <button
          className={`${s.navItem} ${tab==='requests'?s.navActive:''}`}
          onClick={()=>!isEditing&&setTab('requests')}
          title={isEditing ? 'Завершите редактирование' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className={`${s.navItem} ${tab==='schedule'?s.navActive:''}`}
          onClick={()=>setTab('schedule')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8"  y1="2" x2="8"  y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3"  y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            <polyline points="9 16 11 18 15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className={`${s.navItem} ${tab==='profile'?s.navActive:''}`}
          onClick={()=>!isEditing&&setTab('profile')}
          title={isEditing ? 'Завершите редактирование' : ''}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </nav>
    </div>
  );
}