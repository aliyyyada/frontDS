import { useState, useEffect } from 'react';
import { adminAPI } from '../../../../api/client';
import { formatPhone } from '../../../../utils/phone';
import { formatDate } from '../../../../utils/date';
import { IconSearch } from '../../../../components/icons';
import styles from '../../AdminPage.module.css';

const INACTIVE_TABS = ['Выпущенные', 'Приостановленные'];

function abbreviateName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [last, ...rest] = parts;
  return `${last} ${rest.map(p => p.charAt(0) + '.').join('')}`;
}

function GraduatedList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  function load() {
    setLoading(true);
    adminAPI.getGraduatedStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search]); 

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
                <button className={styles.deleteCircleBtn}
                  style={{ marginLeft: 12, flexShrink: 0 }}
                  onClick={() => handleDelete(s)} disabled={deleting === s.id}
                  title="Удалить студента">
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
  const [students, setStudents]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [unfreezing, setUnfreezing] = useState(null);
  const [deleting, setDeleting]     = useState(null);

  function load() {
    setLoading(true);
    adminAPI.getFrozenStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search]); 

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
              <div key={s.id} className={styles.listItem}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listItemMain}>{s.full_name}</div>
                  <div className={styles.listItemSub} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {s.phone_number    && <span>{formatPhone(s.phone_number)}</span>}
                    {s.instructor_name && <span>Инструктор: {abbreviateName(s.instructor_name)}</span>}
                    {s.tariff_name     && <span>Тариф: {s.tariff_name}</span>}
                    {s.count_lessons > 0 && <span>Практика: {s.count_lessons} ч</span>}
                  </div>
                </div>
                <button className={styles.editBtn}
                  style={{ whiteSpace: 'nowrap', background: '#2d3cc0', color: '#fff', borderColor: '#2d3cc0', flexShrink: 0 }}
                  onClick={() => handleUnfreeze(s.id)} disabled={unfreezing === s.id}>
                  {unfreezing === s.id ? '...' : 'Восстановить'}
                </button>
                <button className={styles.deleteCircleBtn} style={{ flexShrink: 0 }}
                  onClick={() => handleDelete(s)} disabled={deleting === s.id}
                  title="Удалить студента">
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

export function InactiveSection() {
  const [activeTab, setActiveTab] = useState('Выпущенные');
  return (
    <div>
      <div className={styles.mgmtTabs} style={{ marginBottom: 12 }}>
        {INACTIVE_TABS.map(t => (
          <button key={t}
            className={`${styles.mgmtTab} ${activeTab === t ? styles.mgmtTabActive : ''}`}
            onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>
      {activeTab === 'Выпущенные'       && <GraduatedList />}
      {activeTab === 'Приостановленные' && <FrozenList />}
    </div>
  );
}
