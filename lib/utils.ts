export const cx = (...items: (string | boolean | undefined | null)[]): string =>
  items.filter(Boolean).join(' ');

export const shortTime = (iso: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};
