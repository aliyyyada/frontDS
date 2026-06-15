import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../../api/client';
import { Modal } from '../../../../components/common/Modal';
import { FieldRow } from '../../components/FieldRow';
import styles from '../../AdminPage.module.css';

function validateTariff(f) {
  const e = {};
  if (!f.name?.trim()) e.name = 'Введите название';
  const ph = Number(f.practice_hours);
  if (!f.practice_hours || isNaN(ph) || ph <= 0 || !Number.isInteger(ph)) e.practice_hours = 'Целое число > 0';
  const th = Number(f.theory_hours);
  if (!f.theory_hours || isNaN(th) || th <= 0 || !Number.isInteger(th)) e.theory_hours = 'Целое число > 0';
  const tp = Number(String(f.total_price).replace(/\s/g, '').replace(',', '.'));
  if (!f.total_price || isNaN(tp) || tp <= 0) e.total_price = 'Введите сумму';
  const thp = Number(String(f.theory_price).replace(/\s/g, '').replace(',', '.'));
  if (!f.theory_price || isNaN(thp) || thp <= 0) e.theory_price = 'Введите сумму';
  if (!e.total_price && !e.theory_price && tp < thp) e.total_price = 'Общая стоимость не может быть меньше стоимости теории';
  return e;
}

export function TariffsSection() {
  const [tariffs, setTariffs]           = useState([]);
  const [selected, setSelected]         = useState(null);
  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showAdd, setShowAdd]           = useState(false);
  const [addForm, setAddForm]           = useState({ name: '', practice_hours: '', theory_hours: '', total_price: '', theory_price: '' });
  const [addErrors, setAddErrors]       = useState({});
  const [editErrors, setEditErrors]     = useState({});
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
    const e = validateTariff(form);
    if (Object.keys(e).length) { setEditErrors(e); return; }
    setEditErrors({}); setSaving(true);
    adminAPI.updateTariff(selected, {
      name: form.name,
      practice_hours: Number(form.practice_hours),
      theory_hours: Number(form.theory_hours),
      total_price: form.total_price,
      theory_price: form.theory_price,
    })
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
    const e = validateTariff(addForm);
    if (Object.keys(e).length) { setAddErrors(e); return; }
    setAddErrors({}); setSaving(true);
    adminAPI.createTariff({
      name: addForm.name,
      practice_hours: Number(addForm.practice_hours),
      theory_hours: Number(addForm.theory_hours),
      total_price: addForm.total_price,
      theory_price: addForm.theory_price,
    })
      .then(() => {
        loadTariffs(); setShowAdd(false);
        setAddForm({ name: '', practice_hours: '', theory_hours: '', total_price: '', theory_price: '' });
      })
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
                <button className={styles.deleteCircleBtn}
                  onClick={e => { e.stopPropagation(); setDeleteTariffId(t.id); }} title="Удалить">−</button>
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
                <button className={styles.editBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              )}
            </div>
            <div className={styles.detailForm}>
              <FieldRow label="Название тарифа" value={form.name || ''} disabled={!editing}
                onChange={v => { setForm(f => ({ ...f, name: v })); setEditErrors(e => ({ ...e, name: '' })); }}
                error={editing ? editErrors.name : undefined} />
              <div className={styles.twoCol}>
                <FieldRow label="Часов теории" value={String(form.theory_hours ?? '')} disabled={!editing}
                  type={editing ? 'number' : 'text'} inputMode="numeric" min="1" step="1"
                  onChange={v => { setForm(f => ({ ...f, theory_hours: v })); setEditErrors(e => ({ ...e, theory_hours: '' })); }}
                  error={editing ? editErrors.theory_hours : undefined} />
                <FieldRow label="Часов практики" value={String(form.practice_hours ?? '')} disabled={!editing}
                  type={editing ? 'number' : 'text'} inputMode="numeric" min="1" step="1"
                  onChange={v => { setForm(f => ({ ...f, practice_hours: v })); setEditErrors(e => ({ ...e, practice_hours: '' })); }}
                  error={editing ? editErrors.practice_hours : undefined} />
              </div>
              <div className={styles.twoCol}>
                <div className={styles.priceBox}>
                  <span className={styles.priceLbl}>Общая стоимость</span>
                  {editing ? (
                    <>
                      <input className={`${styles.fieldInput} ${editErrors.total_price ? styles.fieldInputError : ''}`}
                        value={form.total_price || ''} inputMode="decimal" placeholder="0"
                        onChange={e => { setForm(f => ({ ...f, total_price: e.target.value })); setEditErrors(er => ({ ...er, total_price: '' })); }} />
                      {editErrors.total_price && <span className={styles.fieldErrText}>{editErrors.total_price}</span>}
                    </>
                  ) : (
                    <span className={styles.priceVal}>{Number(tariff.total_price).toLocaleString('ru')} руб</span>
                  )}
                </div>
                <div className={styles.priceBox}>
                  <span className={styles.priceLbl}>Теория</span>
                  {editing ? (
                    <>
                      <input className={`${styles.fieldInput} ${editErrors.theory_price ? styles.fieldInputError : ''}`}
                        value={form.theory_price || ''} inputMode="decimal" placeholder="0"
                        onChange={e => { setForm(f => ({ ...f, theory_price: e.target.value })); setEditErrors(er => ({ ...er, theory_price: '' })); }} />
                      {editErrors.theory_price && <span className={styles.fieldErrText}>{editErrors.theory_price}</span>}
                    </>
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
        <Modal onClose={() => { setShowAdd(false); setAddErrors({}); }}>
          <h3 className={styles.modalTitle}>Новый тариф</h3>
          <FieldRow label="Название тарифа" value={addForm.name}
            onChange={v => { setAddForm(f => ({ ...f, name: v })); setAddErrors(e => ({ ...e, name: '' })); }}
            error={addErrors.name} />
          <div className={styles.twoCol}>
            <FieldRow label="Часов теории" value={addForm.theory_hours}
              type="number" inputMode="numeric" min="1" step="1" placeholder="0"
              onChange={v => { setAddForm(f => ({ ...f, theory_hours: v })); setAddErrors(e => ({ ...e, theory_hours: '' })); }}
              error={addErrors.theory_hours} />
            <FieldRow label="Часов практики" value={addForm.practice_hours}
              type="number" inputMode="numeric" min="1" step="1" placeholder="0"
              onChange={v => { setAddForm(f => ({ ...f, practice_hours: v })); setAddErrors(e => ({ ...e, practice_hours: '' })); }}
              error={addErrors.practice_hours} />
          </div>
          <div className={styles.twoCol}>
            <FieldRow label="Общая стоимость" value={addForm.total_price}
              inputMode="decimal" placeholder="0"
              onChange={v => { setAddForm(f => ({ ...f, total_price: v })); setAddErrors(e => ({ ...e, total_price: '' })); }}
              error={addErrors.total_price} />
            <FieldRow label="Стоимость теории" value={addForm.theory_price}
              inputMode="decimal" placeholder="0"
              onChange={v => { setAddForm(f => ({ ...f, theory_price: v })); setAddErrors(e => ({ ...e, theory_price: '' })); }}
              error={addErrors.theory_price} />
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
