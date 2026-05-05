import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { LegalDocModal } from '../../components/common/LegalDocModal';
import { isPhoneComplete } from '../../utils/phone';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    last_name: '', first_name: '', patronymic: '',
    phone: '', phoneRaw: '',
    birth_date: '',
    password: '', confirmPassword: '',
    consent1: false, consent2: false,
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // 'privacy' | 'terms' | null

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  function validate() {
    const e = {};
    if (!form.last_name.trim()) e.last_name = 'Введите фамилию';
    if (!form.first_name.trim()) e.first_name = 'Введите имя';
    if (!isPhoneComplete(form.phone)) e.phone = 'Введите корректный номер';
    if (!form.birth_date) e.birth_date = 'Введите дату рождения';
    if (form.password.length < 8) e.password = 'Минимум 8 символов';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Пароли не совпадают';
    if (!form.consent1 || !form.consent2) e.consent = 'Необходимо принять оба согласия';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await authAPI.registerInstructor({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        patronymic: form.patronymic.trim(),
        phone_number: form.phoneRaw,
        birth_date: form.birth_date,
        password: form.password,
        consent: true,
      });
      navigate('/verify', { state: { phone: form.phone, phoneRaw: form.phoneRaw, from: 'register' } });
    } catch (err) {
      const data = err.response?.data;
      if (data?.phone_number) setApiError(data.phone_number[0]);
      else setApiError(data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Регистрация<br />инструктора</h1>

        <div className={styles.form}>
          <Input label="Фамилия" value={form.last_name} onChange={set('last_name')}
            placeholder="Иванов" error={errors.last_name} maxLength={100} />
          <Input label="Имя" value={form.first_name} onChange={set('first_name')}
            placeholder="Иван" error={errors.first_name} maxLength={100} />
          <Input label="Отчество" value={form.patronymic} onChange={set('patronymic')}
            placeholder="Иванович" maxLength={100} />
          <Input label="Номер телефона" type="phone" value={form.phone}
            onChange={(fmt, raw) => setForm((f) => ({ ...f, phone: fmt, phoneRaw: raw }))}
            placeholder="+7 (999) 000-00-00" error={errors.phone} />
          <Input label="Дата рождения" type="date" value={form.birth_date} onChange={set('birth_date')}
            error={errors.birth_date} />
          <Input label="Пароль" type="password" value={form.password} onChange={set('password')}
            placeholder="Не менее 8 символов" error={errors.password} autoComplete="new-password" />
          <Input label="Повторите пароль" type="password" value={form.confirmPassword}
            onChange={set('confirmPassword')} placeholder="Повторите пароль"
            error={errors.confirmPassword} autoComplete="new-password" />

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={form.consent1}
                onChange={(e) => setForm((f) => ({ ...f, consent1: e.target.checked }))} />
              <span>
                Я ознакомлен(а) и принимаю условия{' '}
                <button type="button" className={styles.docLink}
                  onClick={() => setLegalDoc('privacy')}>
                  Политики обработки персональных данных
                </button>
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={form.consent2}
                onChange={(e) => setForm((f) => ({ ...f, consent2: e.target.checked }))} />
              <span>
                Я принимаю условия{' '}
                <button type="button" className={styles.docLink}
                  onClick={() => setLegalDoc('terms')}>
                  Пользовательского соглашения
                </button>{' '}
                и даю согласие на обработку моих персональных данных
              </span>
            </label>
            {errors.consent && <span className={styles.checkboxError}>{errors.consent}</span>}
          </div>

          {apiError && <div className={styles.apiError}>{apiError}</div>}

          <Button fullWidth variant="primary" size="lg" loading={loading} onClick={handleSubmit}>
            Зарегистрироваться
          </Button>

          <p className={styles.loginLink}>
            Уже зарегистрированы?{' '}
            <Link to="/login" className={styles.link}>Нажмите, чтобы войти.</Link>
          </p>
        </div>
      </div>
    </div>

    {legalDoc && <LegalDocModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </>
  );
}
