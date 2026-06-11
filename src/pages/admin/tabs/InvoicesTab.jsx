import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../api/client';
import { formatPhone } from '../../../utils/phone';
import { formatDate, todayISO } from '../../../utils/date';
import { IconSearch } from '../../../components/icons';
import styles from '../AdminPage.module.css';

const EMPTY_INV = () => ({ service: 'Теоретические занятия', amount: '', deadline: '' });

const statusLabel = (s) => {
  if (s === 'pending') return 'ожидает оплаты студентом';
  if (s === 'awaiting_confirmation') return 'ожидает подтверждения';
  if (s === 'paid') return 'счёт закрыт';
  return s;
};

export function InvoicesTab() {
  const [students, setStudents]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [selDetail, setSelDetail] = useState(null);
  const [invoices, setInvoices]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState([EMPTY_INV()]);
  const [creating, setCreating]   = useState(false);

  const TODAY = todayISO();

  useEffect(() => {
    setLoading(true);
    adminAPI.getInvoiceStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [search]);

  const loadInvoices = useCallback(() => {
    if (!selected) return;
    adminAPI.getStudentInvoices(selected)
      .then(r => { setSelDetail(r.data.student || null); setInvoices(r.data.invoices || []); })
      .catch(() => {});
  }, [selected]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  async function handleCreateInvoices() {
    const valid = pendingInvoices.filter(inv => inv.amount && inv.deadline);
    if (!valid.length) return;
    setCreating(true);
    try {
      for (const inv of valid) {
        await adminAPI.createInvoice(selected, { service: inv.service, amount: inv.amount, deadline: inv.deadline });
      }
      loadInvoices();
      setPendingInvoices([EMPTY_INV()]);
    } catch (e) {
      
    } finally {
      setCreating(false);
    }
  }

  function updatePendingInvoice(idx, field, value) {
    setPendingInvoices(list => list.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv));
  }

  function handleConfirmPayment(id) {
    adminAPI.updateInvoice(id, 'paid').then(() => loadInvoices()).catch(() => {});
  }

  function handleDeleteInvoice(id) {
    adminAPI.deleteInvoice(id).then(() => loadInvoices()).catch(() => {});
  }

  return (
    <div className={styles.invoicesWrapper}>
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
                onClick={() => setSelected(s.id)}>
                <div className={styles.listItemMain}>{s.full_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.invoiceDetail}>
        {!selDetail ? (
          <p className={styles.emptyText}>Выберите студента</p>
        ) : (
          <>
            <div className={styles.invoiceStudentHeader}>
              <span className={styles.detailName}>{selDetail.full_name}</span>
              <div style={{ textAlign: 'right' }}>
                <div className={styles.detailPhone}>{formatPhone(selDetail.phone_number)}</div>
                <div className={styles.tariffLabel}>Тариф: {selDetail.tariff_name || '—'}</div>
              </div>
            </div>

            <div className={styles.newInvoiceCard}>
              <div className={styles.invoiceFormHeader}>
                <h4 className={styles.cardTitle}>Новые счета</h4>
                <button className={styles.addCircleBtn}
                  onClick={() => setPendingInvoices(list => [...list, EMPTY_INV()])} title="Добавить счёт">+</button>
              </div>
              {pendingInvoices.map((inv, idx) => (
                <div key={idx} className={styles.pendingInvRow}>
                  <div className={styles.fieldGroup} style={{ flex: 2 }}>
                    <label className={styles.fieldLabel}>Услуга</label>
                    <input className={styles.fieldInput} value={inv.service}
                      onChange={e => updatePendingInvoice(idx, 'service', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Сумма</label>
                    <div className={styles.amountRow}>
                      <input className={styles.fieldInput} type="number" min="1" step="1" value={inv.amount}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '' || Number(v) >= 1) updatePendingInvoice(idx, 'amount', v);
                        }} placeholder="0" />
                      <span className={styles.rubleSign}>руб</span>
                    </div>
                  </div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Выплатить до</label>
                    <input className={styles.fieldInput} type="date" value={inv.deadline}
                      min={TODAY}
                      onChange={e => updatePendingInvoice(idx, 'deadline', e.target.value)} />
                  </div>
                  {pendingInvoices.length > 1 && (
                    <button className={styles.deleteInvBtn}
                      onClick={() => setPendingInvoices(list => list.filter((_, i) => i !== idx))}
                      title="Удалить строку">−</button>
                  )}
                </div>
              ))}
              <button className={styles.issueBtn} onClick={handleCreateInvoices}
                disabled={creating || !pendingInvoices.some(inv => inv.amount && inv.deadline)}>
                {creating ? 'Выставление...' : `Выставить счет${pendingInvoices.length > 1 ? 'а' : ''}`}
              </button>
            </div>

            <div className={styles.invoiceList}>
              {invoices.map(inv => (
                <div key={inv.id} className={styles.invoiceRow}>
                  <div className={styles.invoiceInfo}>
                    <span className={styles.invoiceService}>{inv.service}</span>
                    <span className={styles.invoiceAmount}>{Number(inv.amount).toLocaleString('ru')} руб</span>
                    {inv.deadline && inv.status !== 'paid' && (
                      <span className={styles.invoiceDeadline}>до {formatDate(inv.deadline)}</span>
                    )}
                    <span className={styles.invoiceStatus}>
                      статус: {statusLabel(inv.status)}{inv.paid_at ? ' ' + formatDate(inv.paid_at.slice(0, 10)) : ''}
                    </span>
                  </div>
                  {inv.status === 'paid' ? (
                    <button className={styles.paidBtn} disabled>Оплата подтверждена</button>
                  ) : (
                    <button className={styles.confirmPayBtn} onClick={() => handleConfirmPayment(inv.id)}>
                      Подтвердить оплату
                    </button>
                  )}
                  <button className={styles.deleteInvBtn} onClick={() => handleDeleteInvoice(inv.id)} title="Удалить">−</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
