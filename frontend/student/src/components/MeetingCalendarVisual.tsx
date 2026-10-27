import { useEffect, useState } from "react";

const palestineDay = (date: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function MeetingCalendarVisual({ startsAt }: { startsAt?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const date = startsAt ? new Date(startsAt) : null;
  const parts = now
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hebron",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now)
    : [];
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0),
    hour = number("hour"),
    minute = number("minute"),
    second = number("second");
  const diff =
    date && now
      ? Math.round(
          (Date.parse(palestineDay(date) + "T12:00:00Z") -
            Date.parse(palestineDay(now) + "T12:00:00Z")) /
            86400000,
        )
      : null;
  const relative =
    diff === null
      ? "Time to plan"
      : date && now && date.getTime() <= now.getTime()
        ? "In progress"
        : diff === 0
          ? "Today"
          : diff === 1
            ? "Tomorrow"
            : `In ${diff} days`;
  const time = date
    ? date.toLocaleTimeString("en-US", {
        timeZone: "Asia/Hebron",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return (
    <div className="meeting-calendar-visual">
      <div
        className="meeting-desk-calendar"
        aria-label={date ? `Next meeting ${palestineDay(date)}` : "No upcoming meetings"}
      >
        <i />
        <i />
        <div className="desk-calendar-month">
          {date
            ? date.toLocaleDateString("en-US", { timeZone: "Asia/Hebron", month: "short" })
            : "NEXT"}
        </div>
        <strong>
          {date
            ? date.toLocaleDateString("en-US", { timeZone: "Asia/Hebron", day: "2-digit" })
            : "—"}
        </strong>
        <small>
          {date
            ? date.toLocaleDateString("en-US", { timeZone: "Asia/Hebron", weekday: "long" })
            : "Your calendar"}
        </small>
      </div>
      <div
        className="meeting-desk-clock"
        role="img"
        aria-label={`Current Palestine time${now ? ` ${now.toLocaleTimeString("en-US", { timeZone: "Asia/Hebron" })}` : ""}`}
      >
        <div className="desk-clock-face">
          <span className="clock-tick tick-twelve" />
          <span className="clock-tick tick-three" />
          <span className="clock-tick tick-six" />
          <span className="clock-tick tick-nine" />
          <span
            className="clock-hand hour-hand"
            style={{ transform: `rotate(${(hour % 12) * 30 + minute * 0.5}deg)` }}
          />
          <span
            className="clock-hand minute-hand"
            style={{ transform: `rotate(${minute * 6 + second * 0.1}deg)` }}
          />
          <span
            className="clock-hand second-hand"
            style={{ transform: `rotate(${second * 6}deg)` }}
          />
          <i />
        </div>
        <small>PALESTINE TIME</small>
      </div>
      <div className="meeting-countdown-pill">
        <i />
        {relative}
        {time && <> · {time}</>}
      </div>
    </div>
  );
}
