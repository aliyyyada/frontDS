import styles from '../AdminPage.module.css';

export function FieldRow({ label, value, onChange, disabled = false, type = 'text', dimmed = false, inputMode, placeholder, min, max, step, error }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={`${styles.fieldLabel} ${dimmed ? styles.fieldLabelDisabled : ''}`}>{label}</label>
      <input
        className={`${styles.fieldInput} ${dimmed ? styles.fieldInputDimmed : ''} ${error ? styles.fieldInputError : ''}`}
        type={type}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        disabled={disabled}
        readOnly={!onChange}
        inputMode={inputMode}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      {error && <span className={styles.fieldErrText}>{error}</span>}
    </div>
  );
}
