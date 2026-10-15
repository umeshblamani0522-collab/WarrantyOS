const NAME_RE = /^[\p{L}][\p{L} .'-]{1,99}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+91[ -]?)?[6-9]\d{9}$/;
const SERIAL_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,59}$/;

export function validateName(value) {
  const v = String(value || '').trim();
  if (v.length < 2 || v.length > 100) return 'Full name must be between 2 and 100 characters.';
  if (!NAME_RE.test(v)) return 'Full name may contain letters, spaces, hyphens and apostrophes only.';
  return '';
}

export function validateEmail(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Please enter a valid email address.';
  return '';
}

export function validatePhone(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!PHONE_RE.test(v.replaceAll(' ', ''))) return 'Enter a valid Indian mobile number, for example +91 98765 43210.';
  return '';
}

export function validatePassword(value) {
  const v = String(value || '');
  if (v.length < 8 || v.length > 64) return 'Password must be 8 to 64 characters long.';
  if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
    return 'Password needs uppercase, lowercase, number and special character.';
  }
  return '';
}

export function validateSerial(value) {
  const v = String(value || '').trim();
  if (!SERIAL_RE.test(v)) return 'Serial number must be 2-60 characters and use letters, numbers, ., _, / or -.';
  return '';
}

export function validateIssue(value) {
  const v = String(value || '').trim();
  if (v.length < 5 || v.length > 1000) return 'Issue description must be between 5 and 1000 characters.';
  return '';
}
