import { useState, useEffect } from 'react';
import { adminAPI, getMediaUrl } from '../../../api/client';
import { formatPhone } from '../../../utils/phone';
import { formatDate } from '../../../utils/date';
import { IconSearch } from '../../../components/icons';
import styles from '../AdminPage.module.css';

export function ReferralTab() {
  const [students, setStudents]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [selDetail, setSelDetail] = useState(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [paying, setPaying]       = useState(null);

  useEffect(() => {
    setLoading(true);
    adminAPI.getReferralStudents(search)
      .then(r => setStudents(r.data))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selected) { setReferrals([]); setSelDetail(null); return; }
    const s = students.find(x => x.id === selected);
    setSelDetail(s || null);
    adminAPI.getReferrals(selected)
      .then(r => setReferrals(r.data.referrals || []))
      .catch(() => setReferrals([]));
  }, [selected, students]);

  function handlePayBonus(referredId) {
    setPaying(referredId);
    adminAPI.payBonus(referredId)
      .then(() => setReferrals(rs => rs.map(r => r.id === referredId ? { ...r, bonus_paid_at: new Date().toISOString() } : r)))
      .catch(() => {})
      .finally(() => setPaying(null));
  }

  return (
    <div className={styles.referralWrapper}>
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
                <div className={styles.listItemSub}>{formatPhone(s.phone_number)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.referralDetail}>
        {!selDetail ? (
          <p className={styles.emptyText}>Выберите студента</p>
        ) : (
          <>
            <div className={styles.referralHeader}>
              <div className={styles.photoPlaceholder}>
                {getMediaUrl(selDetail.photo_url) && <img src={getMediaUrl(selDetail.photo_url)} alt="" className={styles.avatarDetail} />}
              </div>
              <div>
                <div className={styles.detailName}>{selDetail.full_name}</div>
                <div className={styles.detailPhone}>{formatPhone(selDetail.phone_number)}</div>
              </div>
            </div>
            <div className={styles.referralList}>
              {referrals.length === 0 ? (
                <p className={styles.emptyText}>Нет рефералов</p>
              ) : referrals.map(ref => (
                <div key={ref.id} className={styles.referralRow}>
                  <span className={styles.refName}>{ref.full_name}</span>
                  {ref.bonus_paid_at ? (
                    <div>
                      <button className={styles.bonusPaidBtn} disabled>бонус выплачен</button>
                      <div className={styles.bonusDate}>бонус выплачен {formatDate(ref.bonus_paid_at.slice(0, 10))}</div>
                    </div>
                  ) : (
                    <button className={styles.payBonusBtn}
                      onClick={() => handlePayBonus(ref.id)} disabled={paying === ref.id}>
                      {paying === ref.id ? '...' : 'выплатить бонус'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
