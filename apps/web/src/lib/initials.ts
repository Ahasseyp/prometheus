export function getInitials(value: string | null | undefined): string {
  if (!value) {
    return '?';
  }

  const parts = value.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const second = parts[1];

  if (second) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }

  return first.slice(0, 2).toUpperCase();
}
