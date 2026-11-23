export function toApiDateTime(value) {
  if (!value) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
  return match ? `${match[1]}T${match[2]}:${match[3] || '00'}` : undefined;
}
