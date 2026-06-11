import { useState, useEffect } from 'react';
import { formatPhone, normalizePhone } from '../../../utils/phone';
import { FieldRow } from './FieldRow';
import styles from '../AdminPage.module.css';

export function PhoneRow({ label, rawValue, disabled, onChange, error }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    setDisplay(rawValue ? formatPhone(normalizePhone(rawValue)) : '');
  }, [rawValue, disabled]); 

  if (disabled) {
    return <FieldRow label={label} value={formatPhone(rawValue || '')} disabled />;
  }

  function handleKeyDown(e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const digits = normalizePhone(rawValue || '');
      const trimmed = digits.slice(0, -1);
      setDisplay(trimmed ? formatPhone(trimmed) : '');
      onChange(trimmed);
    }
  }

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    const normalized = normalizePhone(digits);
    setDisplay(normalized ? formatPhone(normalized) : '');
    onChange(normalized);
  }

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={`${styles.fieldInput} ${error ? styles.fieldInputError : ''}`}
        type="tel"
        value={display}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
      />
      {error && <span className={styles.fieldErrText}>{error}</span>}
    </div>
  );
}
