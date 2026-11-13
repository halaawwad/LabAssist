export const meetingZone = "Asia/Hebron";
export function meetingDay(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: meetingZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
/** Interpret the chosen wall-clock time in Palestine, independently of the device timezone. */
export function meetingInstant(day: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const desired = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(desired) || new Date(desired).toISOString().slice(0, 10) !== day) return NaN;
  let candidate = desired;
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: meetingZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const local = (at: number) =>
    Object.fromEntries(format.formatToParts(new Date(at)).map((part) => [part.type, part.value]));
  for (let i = 0; i < 3; i++) {
    const p = local(candidate);
    candidate -= Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`) - desired;
  }
  const p = local(candidate);
  return `${p.year}-${p.month}-${p.day}` === day && `${p.hour}:${p.minute}` === time
    ? candidate
    : NaN;
}
