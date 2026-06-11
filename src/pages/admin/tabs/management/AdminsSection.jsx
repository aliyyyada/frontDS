import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../../../api/client';
import { formatPhone, normalizePhone } from '../../../../utils/phone';
import { filterRuText } from '../../../../utils/validators';
import { Modal } from '../../../../components/common/Modal';
import { FieldRow } from '../../components/FieldRow';
import { PhoneRow } from '../../components/PhoneRow';
import styles from '../../AdminPage.module.css';

export function AdminsSection() {
  const [admins, setAdmins]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ first_name: '', last_name: '', patronymic: '', phone_number: '', password: '', confirm: '' });
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
    if (normalizePhone(addForm.phone_number).length < 11) { setAddError('Введите корректный номер телефона'); return; }
    if (addForm.password !== addForm.confirm) { setAddError('Пароли не совпадают'); return; }
    if (!addForm.password) { setAddError('Введите пароль'); return; }
    setSaving(true); setAddError('');
    adminAPI.createAdmin({
      first_name:   addForm.first_name.trim(),
      last_name:    addForm.last_name.trim(),
      patronymic:   addForm.patronymic.trim(),
      phone_number: addForm.phone_number,
      password:     addForm.password,
      consent: true,
    })
      .then(() => {
        setShowAdd(false);
        setAddForm({ first_name: '', last_name: '', patronymic: '', phone_number: '', password: '', confirm: '' });
        loadAdmins();
      })
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
                  <button className={styles.deleteCircleBtn}
                    onClick={e => { e.stopPropagation(); handleDelete(a); }} title="Удалить">−</button>
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
              <PhoneRow label="Номер телефона"
                rawValue={addForm.phone_number}
                onChange={v => setAddForm(f => ({ ...f, phone_number: v }))} />
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
