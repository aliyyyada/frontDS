import { useState, useEffect } from 'react';
import { adminAPI, getMediaUrl } from '../../../../api/client';
import { normalizePhone } from '../../../../utils/phone';
import { formatDate, todayISO } from '../../../../utils/date';
import { filterRuText } from '../../../../utils/validators';
import { Modal } from '../../../../components/common/Modal';
import { FieldRow } from '../../components/FieldRow';
import { PhoneRow } from '../../components/PhoneRow';
import { IconSearch, IconPencil, AvatarPlaceholder } from '../../../../components/icons';
import styles from '../../AdminPage.module.css';

const TODAY_ISO = todayISO();

function abbreviateName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [last, ...rest] = parts;
  return `${last} ${rest.map(p => p.charAt(0) + '.').join('')}`;
}

export function StudentsSection() {
  const [students, setStudents]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [detail, setDetail]           = useState(null);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [editing, setEditing]         = useState(false);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState('');
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
    if (form.birth_date && form.birth_date > TODAY_ISO) return;
    if (normalizePhone(form.phone_number || '').length !== 11) return;
    setSaveError('');
    setSaving(true);
    const payload = {
      first_name:    form.first_name,
      last_name:     form.last_name,
      patronymic:    form.patronymic,
      phone_number:  form.phone_number  || '',
      birth_date:    form.birth_date    || null,
      instructor_id: form.instructor_id || null,
      group_id:      form.group_id      || null,
      tariff_id:     form.tariff_id     || null,
      type_kpp:      form.type_kpp      || '',
    };
    adminAPI.updateStudent(selected, payload)
      .then(r => {
        setDetail(r.data); setForm(r.data); setEditing(false);
        setStudents(list => list.map(s => s.id === selected ? { ...s, ...r.data } : s));
      })
      .catch(e => setSaveError(e.response?.data?.detail || 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  }

  function handleGraduate() {
    setGraduating(true);
    adminAPI.graduateStudent(selected)
      .then(() => {
        setGraduateModal(false); setSelected(null); setDetail(null);
        adminAPI.getStudents(search).then(r => setStudents(r.data)).catch(() => {});
      })
      .catch(e => alert(e.response?.data?.detail || 'Ошибка при выпуске студента'))
      .finally(() => setGraduating(false));
  }

  function handleFreeze() {
    setFreezing(true);
    adminAPI.freezeStudent(selected)
      .then(() => {
        setFreezeModal(false); setSelected(null); setDetail(null);
        adminAPI.getStudents(search).then(r => setStudents(r.data)).catch(() => {});
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
              <div key={s.id}
                className={`${styles.listItem} ${selected === s.id ? styles.listItemActive : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <div className={styles.listAvatar}>
                  {getMediaUrl(s.photo_url)
                    ? <img src={getMediaUrl(s.photo_url)} alt="" />
                    : <AvatarPlaceholder />
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
                  <button className={styles.iconBtn} onClick={() => setTariffModal(true)} title="Сменить тариф">
                    <IconPencil />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!editing ? (
                  <button className={styles.editBtn} onClick={() => { setSaveError(''); setEditing(true); }}>Редактировать</button>
                ) : (
                  <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
              </div>
            </div>
            {saveError && <p className={styles.errorText} style={{ margin: '8px 0', padding: '0 2px' }}>{saveError}</p>}

            <div className={styles.detailForm}>
              <div className={styles.profileArea}>
                <div className={styles.photoPlaceholder}>
                  {getMediaUrl(detail.photo_url) && <img src={getMediaUrl(detail.photo_url)} alt="" className={styles.avatarDetail} />}
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
                <FieldRow label="Часы (практика)"
                  value={`${detail.count_lessons || 0}${detail.tariff_practice_hours ? ' / ' + detail.tariff_practice_hours : ''} ч`}
                  disabled dimmed />
              </div>

              <FieldRow label="Дата рождения" type={editing ? 'date' : 'text'}
                value={editing ? (form.birth_date || '') : (form.birth_date ? formatDate(form.birth_date) : '—')}
                disabled={!editing} max={TODAY_ISO}
                onChange={v => setForm(f => ({ ...f, birth_date: v }))}
                error={editing && form.birth_date && form.birth_date > TODAY_ISO ? 'Дата рождения не может быть в будущем' : undefined} />

              <div className={styles.twoCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Инструктор</label>
                  {editing ? (
                    <select className={styles.fieldSelect} value={form.instructor_id || ''}
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
                    <select className={styles.fieldSelect} value={form.group_id || ''}
                      onChange={e => setForm(f => ({ ...f, group_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">— не назначена —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  ) : (
                    <input className={styles.fieldInput} value={detail.group_name || '—'} disabled />
                  )}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={`${styles.fieldLabel} ${editing ? '' : styles.fieldLabelDisabled}`}>КПП</label>
                <div className={styles.kppToggle}>
                  {['МКПП', 'АКПП'].map(kpp => (
                    <label key={kpp} className={styles.kppOption}>
                      <input type="radio" name={`kpp-${detail.id}`} value={kpp}
                        checked={form.type_kpp === kpp} disabled={!editing}
                        onChange={() => setForm(f => ({ ...f, type_kpp: kpp }))} />
                      <span>{kpp}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!editing && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className={styles.editBtn}
                    style={{ background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
                    onClick={() => setFreezeModal(true)}>Заморозить</button>
                  <button className={styles.editBtn}
                    style={{ background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
                    onClick={() => setGraduateModal(true)}>Выпустить</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {freezeModal && (
        <Modal onClose={() => setFreezeModal(false)}>
          <h3 className={styles.modalTitle}>Заморозить студента?</h3>
          <p className={styles.modalSubtitle}>
            Студент <strong>{detail?.full_name}</strong> будет приостановлен.
            Вы сможете восстановить его в разделе «Неактивные».
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn} style={{ flex: 1 }} onClick={handleFreeze} disabled={freezing}>
              {freezing ? 'Заморозка...' : 'Подтвердить'}
            </button>
            <button className={styles.editBtn} style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setFreezeModal(false)} disabled={freezing}>Отмена</button>
          </div>
        </Modal>
      )}

      {graduateModal && (
        <Modal onClose={() => setGraduateModal(false)}>
          <h3 className={styles.modalTitle}>Выпустить студента?</h3>
          <p className={styles.modalSubtitle}>
            Студент <strong>{detail?.full_name}</strong> будет переведён в статус выпускника.
            Все данные о бронированиях и счетах будут удалены. Это действие необратимо.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className={styles.editBtn} style={{ flex: 1 }} onClick={handleGraduate} disabled={graduating}>
              {graduating ? 'Выпуск...' : 'Подтвердить выпуск'}
            </button>
            <button className={styles.editBtn} style={{ flex: 1, background: 'transparent', color: '#6b7280', borderColor: '#d1d5db' }}
              onClick={() => setGraduateModal(false)} disabled={graduating}>Отмена</button>
          </div>
        </Modal>
      )}

      {tariffModal && (
        <Modal onClose={() => { setTariffModal(false); setNewTariffId(''); }}>
          <h3 className={styles.modalTitle}>Сменить тариф?</h3>
          <p className={styles.modalSubtitle}>
            Текущий тариф студента {detail?.full_name} — <strong>{detail?.tariff_name || '—'}</strong>.
          </p>
          <div className={styles.fieldGroup} style={{ marginTop: 16 }}>
            <label className={styles.fieldLabel}>Выбор нового тарифа</label>
            <select className={styles.fieldSelect} value={newTariffId} onChange={e => setNewTariffId(e.target.value)}>
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
          <button className={styles.primaryBtn} onClick={applyTariff} disabled={!newTariffId || saving}>Сменить тариф</button>
        </Modal>
      )}
    </div>
  );
}
