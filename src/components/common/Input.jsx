import { useState, useRef } from 'react';
import { formatPhone, normalizePhone } from '../../utils/phone';
import styles from './Input.module.css';

// Returns the index in `formatted` after which `digitCount` digits have been seen
function cursorPosForDigitCount(formatted, digitCount) {
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (count === digitCount) return i;
    if (/\d/.test(formatted[i])) count++;
  }
  return formatted.length;
}

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function formatBirthdateDisplay(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '.' + digits.slice(2);
  return digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  disabled,
  maxLength,
  autoComplete,
  inputMode,
}) {
  const [showPass, setShowPass] = useState(false);
  const inputRef = useRef(null);
  const isPassword = type === 'password';
  const isPhone = type === 'phone';
  const isBirthdate = type === 'birthdate';

  const handleChange = (e) => {
    if (isPhone) {
      const input = e.target;
      const cursorAfter = input.selectionStart;
      const newVal = input.value;

      // Count digits before cursor in the browser-modified value
      let digitsBeforeCursor = 0;
      for (let i = 0; i < cursorAfter; i++) {
        if (/\d/.test(newVal[i])) digitsBeforeCursor++;
      }

      const digits = newVal.replace(/\D/g, '').slice(0, 11);
      const formatted = formatPhone(digits);
      onChange(formatted, normalizePhone(formatted));

      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        const pos = cursorPosForDigitCount(formatted, digitsBeforeCursor);
        inputRef.current.setSelectionRange(pos, pos);
      });
    } else if (isBirthdate) {
      const formatted = formatBirthdateDisplay(e.target.value);
      onChange(formatted);
    } else if (isPassword) {
      // Allow only ASCII printable characters (no Cyrillic / non-Latin scripts)
      const filtered = e.target.value.replace(/[^\x20-\x7E]/g, '');
      onChange(filtered);
    } else {
      onChange(e.target.value);
    }
  };

  const handlePhoneKeyDown = (e) => {
    const input = e.target;
    const { selectionStart: start, selectionEnd: end, value: val } = input;

    if (e.key === 'Backspace' && start === end) {
      // Find nearest digit to the left of cursor, skipping formatting chars
      let pos = start - 1;
      while (pos >= 0 && !/\d/.test(val[pos])) pos--;
      if (pos < 0) { e.preventDefault(); return; }

      // Count how many digits precede that position
      let digitIndex = 0;
      for (let i = 0; i < pos; i++) {
        if (/\d/.test(val[i])) digitIndex++;
      }

      const digits = val.replace(/\D/g, '').slice(0, 11);
      const newDigits = digits.slice(0, digitIndex) + digits.slice(digitIndex + 1);
      const formatted = newDigits ? formatPhone(newDigits) : '';
      e.preventDefault();
      onChange(formatted, normalizePhone(formatted));

      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        const pos2 = cursorPosForDigitCount(formatted, digitIndex);
        inputRef.current.setSelectionRange(pos2, pos2);
      });
    } else if (e.key === 'Delete' && start === end) {
      // Find nearest digit to the right of cursor, skipping formatting chars
      let pos = start;
      while (pos < val.length && !/\d/.test(val[pos])) pos++;
      if (pos >= val.length) { e.preventDefault(); return; }

      let digitIndex = 0;
      for (let i = 0; i < pos; i++) {
        if (/\d/.test(val[i])) digitIndex++;
      }

      const digits = val.replace(/\D/g, '').slice(0, 11);
      const newDigits = digits.slice(0, digitIndex) + digits.slice(digitIndex + 1);
      const formatted = newDigits ? formatPhone(newDigits) : '';
      e.preventDefault();
      onChange(formatted, normalizePhone(formatted));

      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        const pos2 = cursorPosForDigitCount(formatted, digitIndex);
        inputRef.current.setSelectionRange(pos2, pos2);
      });
    }
  };

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={`${styles.input} ${isPassword ? styles.inputWithEye : ''} ${error ? styles.inputError : ''}`}
          type={isPassword ? (showPass ? 'text' : 'password') : isPhone ? 'tel' : isBirthdate ? 'text' : type}
          value={value}
          onChange={handleChange}
          onKeyDown={isPhone ? handlePhoneKeyDown : undefined}
          placeholder={isBirthdate ? 'ДД.ММ.ГГГГ' : placeholder}
          disabled={disabled}
          maxLength={isBirthdate ? 10 : maxLength || (isPhone ? 18 : undefined)}
          autoComplete={autoComplete}
          inputMode={isPhone ? 'numeric' : isBirthdate ? 'numeric' : inputMode}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPass((p) => !p)}
            tabIndex={-1}
          >
            {showPass ? <EyeOff /> : <EyeOpen />}
          </button>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
