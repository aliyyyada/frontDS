import { useState, useEffect } from 'react';
import { instructorAPI, getMediaUrl } from '../../../api/client';
import { formatPhone } from '../../../utils/phone';
import s from '../instructor.module.css';

function Sp() { return <div className={s.spinner} />; }

const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill="#B0B8C9" />
    <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" fill="#B0B8C9" />
  </svg>
);

export function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    instructorAPI.getStudents()
      .then(r => setStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(st => {
        const nameMatch = st.full_name?.toLowerCase().includes(q);
        const qDigits = q.replace(/\D/g, '');
        const phoneMatch = qDigits && st.phone_number?.replace(/\D/g, '').includes(qDigits);
        return nameMatch || phoneMatch;
      })
    : students;

  return (
    <div className={s.requestsPage}>
      <h1 className={s.pageTitle}>Студенты</h1>

      <div className={s.searchWrap}>
        <svg className={s.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#8A8A8A" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input className={s.searchInput} placeholder="Поиск по имени или номеру"
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <button className={s.searchClear} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {loading ? <div className={s.loading}><Sp /></div>
      : filtered.length === 0 ? (
        <div className={s.empty}>
          {students.length === 0 ? 'Студенты не назначены' : 'Ничего не найдено'}
        </div>
      )
      : filtered.map(st => (
        <div key={st.id} className={s.studentCard}>
          <div className={s.studentAvatar}>
            {getMediaUrl(st.photo_url || st.avatar_url)
              ? <img src={getMediaUrl(st.photo_url || st.avatar_url)} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <PersonIcon />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={s.studentName}>{st.full_name}</div>
            <div className={s.studentMeta}>
              <PhoneIcon />
              <a href={`tel:${st.phone_number}`} className={s.phoneLink}>
                {formatPhone(st.phone_number)}
              </a>
              <span className={s.metaDot}>·</span>
              {st.count_lessons} ч.
              <span className={s.metaDot}>·</span>
              {st.type_kpp || '—'}
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
