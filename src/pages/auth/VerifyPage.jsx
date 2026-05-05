import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import styles from './VerifyPage.module.css';

const CODE_LENGTH = 6;

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const { phone, phoneRaw, from } = location.state || {};
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [sendLoading, setSendLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!phoneRaw) { navigate('/login'); return; }
    if (from === 'register') sendOtp();
    inputRefs.current[0]?.focus();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp() {
    setSendLoading(true);
    try {
      await authAPI.sendOTP(phoneRaw);
      setCooldown(60);
    } catch (err) {
      const ttl = err.response?.data?.cooldown_seconds;
      if (ttl) setCooldown(ttl);
    } finally {
      setSendLoading(false);
    }
  }

  function handleDigit(idx, val) {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...digits];
    newDigits[idx] = val.slice(-1);
    setDigits(newDigits);
    setError('');
    if (val && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    if (newDigits.every((d) => d !== '')) submitCode(newDigits.join(''));
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) submitCode(pasted);
  }

  async function submitCode(code) {
    setLoading(true);
    setError('');
    try {
      if (from === 'forgot') {
        navigate('/reset-password', { state: { phone, phoneRaw, code } });
        return;
      }
      const { data } = await authAPI.verifyOTP(phoneRaw, code);
      login(data, 'instructor');
      navigate('/instructor');
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(msg || 'Неверный или истёкший код');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  const fmtCooldown = `${String(Math.floor(cooldown / 60)).padStart(2, '0')}:${String(cooldown % 60).padStart(2, '0')}`;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoMain}>Экипаж</span>
          <span className={styles.logoSub}>автошкола</span>
        </div>

        <h2 className={styles.title}>Введите код</h2>

        <div className={styles.form}>
          <p className={styles.subtitle}>
            Мы отправили код на номер {phone || phoneRaw}
          </p>

          <div className={styles.codeRow} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className={`${styles.digitInput} ${error ? styles.digitError : ''} ${d ? styles.digitFilled : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {loading && <div className={styles.hint}>Проверяем код...</div>}

          <div className={styles.resend}>
            {cooldown > 0 ? (
              <span className={styles.cooldownText}>
                Получить код повторно через {fmtCooldown}
                <button className={styles.refreshBtn} disabled>↻</button>
              </span>
            ) : (
              <button className={styles.resendBtn} onClick={sendOtp} disabled={sendLoading}>
                {sendLoading ? 'Отправляем...' : 'Отправить код повторно'} ↻
              </button>
            )}
          </div>

          <Link to="/login" className={styles.backLink}>Вернуться ко входу</Link>
        </div>
      </div>
    </div>
  );
}
