export function formatPhone(raw) {
  
  const digits = raw.replace(/\D/g, '');
  let d = digits;
  
  if (d.startsWith('8')) d = '7' + d.slice(1);
  
  let result = '';
  if (d.length === 0) return '';
  result = '+7';
  if (d.length > 1) result += ' (' + d.slice(1, 4);
  if (d.length >= 4) result += ') ' + d.slice(4, 7);
  if (d.length >= 7) result += '-' + d.slice(7, 9);
  if (d.length >= 9) result += '-' + d.slice(9, 11);
  return result;
}

export function normalizePhone(display) {
  const digits = display.replace(/\D/g, '');
  if (digits.startsWith('8')) return '7' + digits.slice(1);
  return digits;
}

export function isPhoneComplete(display) {
  return normalizePhone(display).length === 11;
}
