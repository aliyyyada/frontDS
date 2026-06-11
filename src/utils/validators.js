const PLATE_LETTERS = 'АВЕКМНОРСТУХ';
const PLATE_ALLOWED = new RegExp(`[^${PLATE_LETTERS}\\d]`, 'g');
const PLATE_B = new RegExp(`^[${PLATE_LETTERS}]\\d{3}[${PLATE_LETTERS}]{2}\\d{2,3}$`);
const PLATE_A = new RegExp(`^\\d{4}[${PLATE_LETTERS}]{2}\\d{2,3}$`);

export function filterCarPlate(val) {
  return val.toUpperCase().replace(PLATE_ALLOWED, '').slice(0, 9);
}

export function isValidPlate(val) {
  if (!val) return true;
  return PLATE_B.test(val) || PLATE_A.test(val);
}

export function filterRuText(val) {
  const cleaned = val.replace(/[^а-яёА-ЯЁ\s\-']/g, '');
  return cleaned.replace(/(^|[\s\-'])([а-яёА-ЯЁ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function parseApiError(e) {
  const data = e?.response?.data;
  if (!data) return 'Что-то пошло не так. Попробуйте позже.';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data === 'object') {
    const msgs = Object.values(data).flat().filter(v => typeof v === 'string');
    if (msgs.length) return msgs[0];
  }
  return 'Что-то пошло не так. Попробуйте позже.';
}
