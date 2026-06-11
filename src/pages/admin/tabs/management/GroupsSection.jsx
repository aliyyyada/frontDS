import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../../api/client';
import { formatPhone } from '../../../../utils/phone';
import { Modal } from '../../../../components/common/Modal';
import { FieldRow } from '../../components/FieldRow';
import styles from '../../AdminPage.module.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function AddGroupModal({ onClose, onSave, instructors }) {
  const [form, setForm]       = useState({ name: '', instructor_id: '', hours: '', start_date: '', end_date: '' });
  const [schedule, setSchedule] = useState([]);
  const [schForm, setSchForm] = useState({ weekday: 1, start_time: '09:00', end_time: '10:30' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function addSch() {
    if (schForm.start_time >= schForm.end_time) {
      setError('Время начала должно быть меньше времени окончания'); return;
    }
    const hasOverlap = schedule.some(s =>
      s.weekday === schForm.weekday && schForm.start_time < s.end_time && schForm.end_time > s.start_time
    );
    if (hasOverlap) { setError('Этот слот пересекается с уже добавленным расписанием'); return; }
    setError('');
    setSchedule(s => [...s, { ...schForm, id: Date.now() }]);
  }

  function removeSch(id) { setSchedule(s => s.filter(x => x.id !== id)); }

  async function handleSave() {
    if (!form.name || !form.start_date) {
      setError('Заполните обязательные поля: название, дата начала'); return;
    }
    if (form.end_date && form.start_date >= form.end_date) {
      setError('Дата окончания должна быть позже даты начала'); return;
    }
    setSaving(true); setError('');
    let gid = null;
    try {
      const payload = {
        name: form.name,
        hours: Number(form.hours) || 1,
        start_date: form.start_date,
        end_date: form.end_date || null,
        instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
      };
      const res = await adminAPI.createGroup(payload);
      gid = res.data.id;
      for (const s of schedule) {
        await adminAPI.addSchedule(gid, { weekday: s.weekday, start_time: s.start_time, end_time: s.end_time });
      }
      onSave();
    } catch (e) {
      if (gid) { onSave(); }
      else { setError(e.response?.data?.detail || 'Ошибка создания группы'); }
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
                {WEEKDAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
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

export function GroupsSection() {
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
  const [saveError, setSaveError]           = useState('');
  const [scheduleError, setScheduleError]   = useState('');
  const [studentSearch, setStudentSearch]   = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [deleteGroupId, setDeleteGroupId]   = useState(null);
  const [deletingGroup, setDeletingGroup]   = useState(false);

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

  function reloadDetail() {
    adminAPI.getGroup(selected)
      .then(r => { setDetail(r.data); setForm({ ...r.data, instructor_id: r.data.instructor_id || '' }); });
  }

  function handleSave() {
    if (!form.name || !form.start_date) {
      setSaveError('Заполните обязательные поля: название, дата начала'); return;
    }
    if (form.end_date && form.start_date >= form.end_date) {
      setSaveError('Дата окончания должна быть позже даты начала'); return;
    }
    setSaveError(''); setSaving(true);
    const payload = {
      name: form.name,
      hours: Number(form.hours),
      start_date: form.start_date,
      end_date: form.end_date || null,
      instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
    };
    adminAPI.updateGroup(selected, payload)
      .then(() => {
        loadGroups();
        adminAPI.getGroup(selected).then(x => {
          setDetail(x.data);
          setForm({ ...x.data, instructor_id: x.data.instructor_id || '' });
          setEditing(false);
        });
      })
      .catch(e => setSaveError(e.response?.data?.detail || 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  }

  function handleDeleteGroup() {
    setDeletingGroup(true);
    adminAPI.deleteGroup(deleteGroupId)
      .then(() => { loadGroups(); if (selected === deleteGroupId) setSelected(null); setDeleteGroupId(null); })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка удаления'))
      .finally(() => setDeletingGroup(false));
  }

  function handleAddSchedule() {
    if (scheduleForm.start_time >= scheduleForm.end_time) {
      setScheduleError('Время начала должно быть меньше времени окончания'); return;
    }
    const existing = detail?.schedule || [];
    const hasOverlap = existing.some(s =>
      s.weekday === scheduleForm.weekday &&
      scheduleForm.start_time < s.end_time.slice(0, 5) &&
      scheduleForm.end_time > s.start_time.slice(0, 5)
    );
    if (hasOverlap) { setScheduleError('Этот слот пересекается с уже добавленным расписанием'); return; }
    setScheduleError(''); setAddingSchedule(true);
    adminAPI.addSchedule(selected, scheduleForm)
      .then(() => reloadDetail())
      .catch(e => setScheduleError(e.response?.data?.detail || 'Ошибка добавления слота'))
      .finally(() => setAddingSchedule(false));
  }

  function handleDeleteSchedule(sid) {
    adminAPI.deleteSchedule(selected, sid)
      .then(() => reloadDetail())
      .catch(() => {});
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
                <button className={styles.deleteCircleBtn}
                  onClick={e => { e.stopPropagation(); setDeleteGroupId(g.id); }} title="Удалить">−</button>
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
            <div className={styles.detailHeader} style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
              {saveError && <p className={styles.errorText} style={{ flex: '1 1 100%', margin: 0 }}>{saveError}</p>}
              {!editing ? (
                <button className={styles.editBtn} onClick={() => { setSaveError(''); setEditing(true); }}>Редактировать</button>
              ) : (
                <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
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
                        <input type="time" className={styles.timeInput} value={scheduleForm.start_time}
                          onChange={e => { setScheduleForm(f => ({ ...f, start_time: e.target.value })); setScheduleError(''); }} />
                        <span>—</span>
                        <input type="time" className={styles.timeInput} value={scheduleForm.end_time}
                          onChange={e => { setScheduleForm(f => ({ ...f, end_time: e.target.value })); setScheduleError(''); }} />
                        <select className={styles.daySelect} value={scheduleForm.weekday}
                          onChange={e => { setScheduleForm(f => ({ ...f, weekday: Number(e.target.value) })); setScheduleError(''); }}>
                          {WEEKDAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                        </select>
                        <button className={styles.addCircleBtn} onClick={handleAddSchedule} disabled={addingSchedule}>+</button>
                      </div>
                    )}
                    {scheduleError && <p className={styles.errorText} style={{ marginTop: 4 }}>{scheduleError}</p>}
                    {(detail.schedule || []).map(s => (
                      <div key={s.id} className={styles.scheduleRow}>
                        <span>{s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}</span>
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
                        <input className={styles.searchInput} placeholder="Найти студента..."
                          value={studentSearch} onChange={e => handleStudentSearch(e.target.value)} />
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
                          <button className={styles.deleteSmallBtn}
                            onClick={() => handleRemoveStudentFromGroup(s.id)} title="Убрать из группы">✕</button>
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
        <AddGroupModal onClose={() => setShowAdd(false)} onSave={() => { loadGroups(); setShowAdd(false); }} instructors={instructors} />
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
