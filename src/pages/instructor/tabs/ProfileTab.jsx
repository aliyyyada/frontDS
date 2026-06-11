import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { instructorAPI, getMediaUrl } from '../../../api/client';
import { filterRuText, filterCarPlate, isValidPlate, parseApiError } from '../../../utils/validators';
import { LegalDocModal } from '../../../components/common/LegalDocModal';
import s from '../instructor.module.css';

function Sp() { return <div className={s.spinner} />; }

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function CarSheet({ profile, onClose, onSaved }) {
  const [form, setForm]         = useState({
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
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Автомобиль</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Марка автомобиля</label>
          <input className={s.fieldInput} placeholder="Lada Granta" value={form.car_brand}
            onChange={e => setForm(p => ({ ...p, car_brand: e.target.value }))} />
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Цвет</label>
          <input className={s.fieldInput} placeholder="Белый" value={form.car_color}
            onChange={e => setForm(p => ({ ...p, car_color: filterRuText(e.target.value) }))} />
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Регистрационный номер</label>
          <input
            className={`${s.fieldInput} ${fieldErr.car_plate ? s.fieldInputError : ''}`}
            placeholder="А001АА77" value={form.car_plate}
            onChange={e => {
              const val = filterCarPlate(e.target.value);
              setForm(p => ({ ...p, car_plate: val }));
              if (fieldErr.car_plate) setFieldErr(p => ({ ...p, car_plate: '' }));
            }}
          />
          {fieldErr.car_plate && <p className={s.fieldErrText}>{fieldErr.car_plate}</p>}
          <p className={s.autoNote}>Буквы: А В Е К М Н О Р С Т У Х · Категории А и B</p>
        </div>
        <div className={s.fieldGroup}>
          <label className={s.fieldLabel}>Тип КПП</label>
          <select className={s.fieldInput} value={form.car_type_kpp}
            onChange={e => setForm(p => ({ ...p, car_type_kpp: e.target.value }))}>
            <option value="МКПП">МКПП (механика)</option>
            <option value="АКПП">АКПП (автомат)</option>
          </select>
        </div>
        {err && <p className={s.err}>{err}</p>}
        <button className={s.btnBlue} onClick={save} disabled={loading}>
          {loading ? <Sp /> : 'Сохранить'}
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
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>
        <div className={s.sheetHeader}>
          <span className={s.sheetTitle}>Лимит занятий</span>
          <button className={s.sheetClose} onClick={onClose}>✕</button>
        </div>
        <p className={s.sheetNote}>
          Максимальное количество занятий в неделю, на которое может записаться студент.
        </p>
        <div className={s.limitRow}>
          <button className={s.limitBtn} onClick={() => setLim(p => Math.max(1, p - 1))}>−</button>
          <span className={s.limitVal}>{lim}</span>
          <button className={s.limitBtn} onClick={() => setLim(p => Math.min(10, p + 1))}>+</button>
        </div>
        {err && <p className={s.err}>{err}</p>}
        <button className={`${s.btnBlue} ${s.btnGap}`} onClick={save} disabled={loading}>
          {loading ? <Sp /> : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

export function ProfileTab() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const fileRef    = useRef(null);

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [sheet,     setSheet]     = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [legalDoc,  setLegalDoc]  = useState(null);

  const load = () => {
    instructorAPI.getProfile()
      .then(r => { setProfile(r.data); setAvatarUrl(getMediaUrl(r.data.avatar_url) || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); 

  const handleAvatarChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await instructorAPI.uploadAvatar(fd);
      setAvatarUrl(getMediaUrl(res.data.avatar_url) || preview);
    } catch(err) {
      setUploadErr(err.response?.data?.detail || 'Ошибка загрузки фото');
      setAvatarUrl(profile?.avatar_url || null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fullName = profile
    ? [profile.last_name, profile.first_name, profile.patronymic].filter(Boolean).join(' ')
    : '—';
  const carLabel = profile?.car_brand
    ? `${profile.car_color ? profile.car_color + ' ' : ''}${profile.car_brand} ${profile.car_plate || ''}`.trim()
    : 'Не указан';

  return (
    <>
      <div className={s.profilePage}>
        <div className={s.profileHeader}>
          <h1 className={s.pageTitle} style={{ margin: 0 }}>Профиль</h1>
        </div>

        {loading ? <div className={s.loading}><Sp /></div> : (
          <>
            <div className={s.avatarWrap} onClick={() => fileRef.current?.click()} title="Изменить фото">
              <div className={s.avatar}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="20" r="11" fill="#B0B8C9" />
                      <ellipse cx="26" cy="46" rx="20" ry="11" fill="#B0B8C9" />
                    </svg>
                }
              </div>
              <div className={s.cameraBadge}>
                {uploading ? <div className={s.spinnerSm} /> : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
                  </svg>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            {uploadErr && <p className={s.err} style={{ textAlign: 'center' }}>{uploadErr}</p>}
            <div className={s.profileName}>{fullName}</div>

            <div className={s.infoCard} onClick={() => setSheet('car')}>
              <div className={s.infoCardRow}>
                <span className={s.infoCardTitle}>Автомобиль</span>
                <PencilIcon />
              </div>
              <div className={s.infoCardValue}>{carLabel}</div>
            </div>

            <div className={s.infoCard} onClick={() => setSheet('limit')}>
              <div className={s.infoCardRow}>
                <span className={s.infoCardTitle}>Лимит</span>
                <PencilIcon />
              </div>
              <div className={s.infoCardValueMuted}>
                Макс. занятий в неделю, на которое может записаться студент —{' '}
                <strong style={{ color: '#1A1A1A' }}>{profile?.weekly_limit ?? 3}</strong>.
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
              <button className={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
                Выйти
              </button>
            </div>
          </>
        )}
      </div>

      {sheet === 'car'   && <CarSheet   profile={profile} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load(); }} />}
      {sheet === 'limit' && <LimitSheet profile={profile} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load(); }} />}
      {legalDoc && <LegalDocModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </>
  );
}
