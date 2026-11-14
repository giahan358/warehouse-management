export function formatNumber(value, maximumFractionDigits = 0) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(number)
    : String(value);
}

export function formatCurrency(value) {
  if (value == null || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(number)} đ`
    : String(value);
}

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', withTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'short' }).format(date);
}
