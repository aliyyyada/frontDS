import React from 'react';
import styles from './Button.module.css';

export function Button({ children, onClick, type = 'button', variant = 'primary', disabled, loading, fullWidth, size = 'md' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${loading ? styles.loading : ''}`}
    >
      {loading ? <span className={styles.spinner} /> : children}
    </button>
  );
}
