import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { isPhoneComplete } from '../../utils/phone';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!isPhoneComplete(phone)) { setError('Введите корректный номер телефона'); return; }
    setError(''); setApiError(''); setLoading(true);
    try {
      await authAPI.forgotPassword(phoneRaw);
      navigate('/verify', { state: { phone, phoneRaw, from: 'forgot' } });
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 429) {
        const ttl = err.response.data.cooldown_seconds;
        navigate('/verify', { state: { phone, phoneRaw, from: 'forgot', initialCooldown: ttl } });
      } else {
        setApiError(msg || 'Ошибка при отправке кода');
      }
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

        <h2 className={styles.title}>Восстановление пароля</h2>

        <div className={styles.form}>
          <p className={styles.subtitle}>
            Введите номер телефона, на который будет отправлен код подтверждения
          </p>
          <Input
            label="Номер телефона"
            type="phone"
            value={phone}
            onChange={(fmt, raw) => { setPhone(fmt); setPhoneRaw(raw); setError(''); }}
            placeholder="+7 (999) 000-00-00"
            error={error}
            autoComplete="tel"
          />
          {apiError && <div className={styles.apiError}>{apiError}</div>}
          <Button fullWidth variant="primary" size="lg" loading={loading} onClick={handleSubmit}>
            Получить код
          </Button>
          <div className={styles.links}>
            <Link to="/login" className={styles.link}>Вернуться ко входу</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
