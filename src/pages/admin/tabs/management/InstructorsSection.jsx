import { useState, useEffect } from 'react';
import { adminAPI, getMediaUrl } from '../../../../api/client';
import { normalizePhone } from '../../../../utils/phone';
import { formatPhone } from '../../../../utils/phone';
import { formatDate, todayISO } from '../../../../utils/date';
import { filterRuText, filterCarPlate, isValidPlate } from '../../../../utils/validators';
import { Modal } from '../../../../components/common/Modal';
import { FieldRow } from '../../components/FieldRow';
import { PhoneRow } from '../../components/PhoneRow';
import { IconSearch, AvatarPlaceholder } from '../../../../components/icons';
import styles from '../../AdminPage.module.css';

const TODAY_ISO = todayISO();

export function InstructorsSection() {
  const [instructors, setInstructors]   = useState([]);
  const [selected, setSelected]         = useState(null);
  const [detail, setDetail]             = useState(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
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
  }, [selected]); 

  function handleSave() {
    if (form.birth_date && form.birth_date > TODAY_ISO) return;
    if (normalizePhone(form.phone_number || '').length !== 11) return;
    if (form.car_plate && !isValidPlate(form.car_plate)) {
      setSaveError('Гос. номер не соответствует формату: А123АА77 (кат. В) или 1234АА77 (кат. А)');
      return;
    }
    setSaveError('');
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
      .then(r => {
        setDetail(r.data); setForm(r.data); setEditing(false);
        setInstructors(list => list.map(i => i.id === selected ? { ...i, ...r.data } : i));
      })
      .catch(e => setSaveError(e.response?.data?.detail || 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  }

  function handleDeleteInstructor() {
    setDeleting(true);
    adminAPI.deleteInstructor(selected)
      .then(() => {
        setDeleteModal(false);
        setInstructors(list => list.filter(i => i.id !== selected));
        setSelected(null); setDetail(null);
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
                      : <AvatarPlaceholder />
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
                  <button className={styles.editBtn} onClick={() => { setSaveError(''); setEditing(true); }}>Редактировать</button>
                ) : (
                  <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
              </div>
              {saveError && <p className={styles.errorText} style={{ margin: '8px 0', padding: '0 2px' }}>{saveError}</p>}
              <div className={styles.detailForm}>
                <div className={styles.profileArea}>
                  <div className={styles.photoPlaceholder}>
                    {getMediaUrl(detail.avatar_url) && <img src={getMediaUrl(detail.avatar_url)} alt="" className={styles.avatarDetail} />}
                  </div>
                  <div className={styles.profileNameBlock}>
                    <div className={styles.twoCol}>
                      <FieldRow label="Фамилия" value={form.last_name || ''} disabled={!editing}
                        onChange={v => setForm(f => ({ ...f, last_name: filterRuText(v) }))} />
                      <FieldRow label="Имя" value={form.first_name || ''} disabled={!editing}
                        onChange={v => setForm(f => ({ ...f, first_name: filterRuText(v) }))} />
                    </div>
                    <FieldRow label="Отчество" value={form.patronymic || ''} disabled={!editing}
                      onChange={v => setForm(f => ({ ...f, patronymic: filterRuText(v) }))} />
                  </div>
                </div>
                <div className={styles.twoCol}>
                  <PhoneRow label="Номер телефона"
                    rawValue={form.phone_number || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, phone_number: v }))}
                    error={editing && normalizePhone(form.phone_number || '').length !== 11 ? 'Введите полный номер телефона' : undefined} />
                  <FieldRow label="Лимит (нед.)" value={String(form.weekly_limit ?? 3)} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, weekly_limit: v }))} />
                </div>
                <div className={styles.twoCol}>
                  <FieldRow label="Дата рождения" type={editing ? 'date' : 'text'}
                    value={editing ? (form.birth_date || '') : (form.birth_date ? formatDate(form.birth_date) : '—')}
                    disabled={!editing} max={TODAY_ISO}
                    onChange={v => setForm(f => ({ ...f, birth_date: v }))}
                    error={editing && form.birth_date && form.birth_date > TODAY_ISO ? 'Дата рождения не может быть в будущем' : undefined} />
                  <div />
                </div>
                <div className={styles.twoCol}>
                  <FieldRow label="Марка автомобиля" value={form.car_brand || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, car_brand: v }))} />
                  <FieldRow label="Цвет" value={form.car_color || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, car_color: filterRuText(v) }))} />
                </div>
                <div className={styles.twoCol}>
                  <FieldRow label="Гос. номер" value={form.car_plate || ''} disabled={!editing}
                    onChange={v => setForm(f => ({ ...f, car_plate: filterCarPlate(v) }))}
                    error={editing && form.car_plate && !isValidPlate(form.car_plate) ? 'Формат: А123АА77 (кат. В) или 1234АА77 (кат. А)' : undefined} />
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>КПП</label>
                    <div className={styles.kppToggle}>
                      {['МКПП', 'АКПП'].map(kpp => (
                        <label key={kpp} className={styles.kppOption}>
                          <input type="radio" value={kpp} checked={form.car_type_kpp === kpp} disabled={!editing}
                            onChange={() => setForm(f => ({ ...f, car_type_kpp: kpp }))} />
                          <span>{kpp}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.studentsBlock} style={{ marginTop: 16 }}>
                  <div className={styles.studentsHeader}>
                    <h4 className={styles.blockTitle}>Студенты</h4>
                    <span className={styles.countChip}>{(detail.students || []).length}</span>
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
            <button className={styles.editBtn}
              style={{ flex: 1, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
              onClick={handleDeleteInstructor} disabled={deleting}>
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
            <button className={styles.editBtn}
              style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setDeleteModal(false)} disabled={deleting}>
              Отмена
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
