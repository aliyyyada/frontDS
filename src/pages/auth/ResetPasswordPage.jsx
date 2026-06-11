import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../../api/client';
import { formatPhone } from '../../utils/phone';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { phoneRaw, code } = location.state || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!phoneRaw || !code) {
    navigate('/login');
    return null;
  }

  function validate() {
    const e = {};
    if (newPassword.length < 8) e.newPassword = 'Минимум 8 символов';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Пароли не совпадают';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true); setApiError('');
    try {
      await authAPI.resetPassword(phoneRaw, code, newPassword);
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail;
      setApiError(msg || 'Ошибка при сбросе пароля');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMain}>Экипаж</span>
          <span className={styles.logoSub}>автошкола</span>
        </div>

        <h2 className={styles.title}>Новый пароль</h2>

        <div className={styles.form}>
          <p className={styles.subtitle}>
            Придумайте новый пароль для аккаунта {formatPhone(phoneRaw)}
          </p>
          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Не менее 8 символов"
            error={errors.newPassword}
            autoComplete="new-password"
          />
          <Input
            label="Повторите пароль"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Повторите пароль"
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
          {apiError && <div className={styles.apiError}>{apiError}</div>}
          <Button fullWidth variant="primary" size="lg" loading={loading} onClick={handleSubmit}>
            Сохранить пароль
          </Button>
          <Link to="/login" className={styles.backLink}>Вернуться ко входу</Link>
        </div>
      </div>
    </div>
  );
}
