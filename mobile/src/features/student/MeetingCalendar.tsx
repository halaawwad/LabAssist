import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { AppText } from "@/components";
import { meetingDay, meetingZone } from "@/domain/meetingTime";

export function MeetingClock({ next }: { next?: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: meetingZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((v) => [v.type, v.value]),
  );
  const hand = (angle: number, length: number, color: string, width: number) => (
    <Line
      x1={40}
      y1={40}
      x2={40 + Math.sin((angle * Math.PI) / 180) * length}
      y2={40 - Math.cos((angle * Math.PI) / 180) * length}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
  const date = next ? new Date(next) : now;
  const difference = next
    ? Math.round(
        (Date.parse(meetingDay(date) + "T12:00:00Z") - Date.parse(meetingDay(now) + "T12:00:00Z")) /
          86400000,
      )
    : null;
  return (
    <View style={s.visual}>
      <View style={s.desk}>
        <View style={s.rings}>
          <View style={s.ring} />
          <View style={s.ring} />
        </View>
        <AppText style={s.month}>
          {new Intl.DateTimeFormat("en-US", { timeZone: meetingZone, month: "short" })
            .format(date)
            .toUpperCase()}
        </AppText>
        <AppText style={s.big}>
          {new Intl.DateTimeFormat("en-US", { timeZone: meetingZone, day: "2-digit" }).format(date)}
        </AppText>
        <AppText style={s.day}>
          {new Intl.DateTimeFormat("en-US", { timeZone: meetingZone, weekday: "short" }).format(
            date,
          )}
        </AppText>
      </View>
      <View style={s.clock}>
        <Svg width={78} height={78} viewBox="0 0 80 80" accessibilityLabel="Current Palestine time">
          <Circle cx={40} cy={40} r={36} fill="#fffdf8" stroke="#d0b5a0" strokeWidth={3} />
          {[0, 90, 180, 270].map((a) => (
            <Line
              key={a}
              x1={40 + Math.sin((a * Math.PI) / 180) * 29}
              y1={40 - Math.cos((a * Math.PI) / 180) * 29}
              x2={40 + Math.sin((a * Math.PI) / 180) * 32}
              y2={40 - Math.cos((a * Math.PI) / 180) * 32}
              stroke="#c6b8a2"
              strokeWidth={2}
            />
          ))}
          {hand((Number(p.hour) % 12) * 30 + Number(p.minute) * 0.5, 18, "#647b52", 3)}
          {hand(Number(p.minute) * 6, 27, "#647b52", 2)}
          {hand(Number(p.second) * 6, 29, "#b38d80", 1)}
          <Circle cx={40} cy={40} r={3} fill="#b38d80" />
        </Svg>
        <AppText style={s.tiny}>PALESTINE TIME</AppText>
      </View>
      <View style={s.relative}>
        <View style={s.dot} />
        <AppText style={s.relativeText}>
          {difference === null
            ? "Time to plan"
            : difference === 0
              ? "Today"
              : difference === 1
                ? "Tomorrow"
                : difference < 0
                  ? "In progress"
                  : `In ${difference} days`}
        </AppText>
      </View>
    </View>
  );
}
export function MeetingCalendar({
  month,
  selected,
  onMonth,
  onSelect,
  marked = [],
  minimumDay,
}: {
  month: string;
  selected: string;
  onMonth: (value: string) => void;
  onSelect: (value: string) => void;
  marked?: string[];
  minimumDay?: string;
}) {
  const [year, m] = month.split("-").map(Number),
    first = new Date(Date.UTC(year, m - 1, 1, 12));
  const offset = (first.getUTCDay() + 6) % 7,
    days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const shift = (delta: number) =>
    onMonth(new Date(Date.UTC(year, m - 1 + delta, 1, 12)).toISOString().slice(0, 7));
  return (
    <View style={s.calendar}>
      <View style={s.header}>
        <AppText style={s.heading}>
          {first.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" })}
        </AppText>
        <View style={s.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => shift(-1)}
            style={s.arrow}
          >
            <ChevronLeft size={19} color="#657e53" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => shift(1)}
            style={s.arrow}
          >
            <ChevronRight size={19} color="#657e53" />
          </Pressable>
        </View>
      </View>
      <View style={s.grid}>
        {["M", "T", "W", "T", "F", "S", "S"].map((v, i) => (
          <View style={s.cell} key={`head${i}`}>
            <AppText style={s.weekday}>{v}</AppText>
          </View>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <View style={s.cell} key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`,
            has = marked.includes(key),
            disabled = !!minimumDay && key < minimumDay;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={key + (has ? ", has meetings" : "")}
              accessibilityState={{ selected: selected === key, disabled }}
              disabled={disabled}
              onPress={() => onSelect(key)}
              style={[
                s.cell,
                selected === key && s.chosen,
                key === meetingDay(new Date()) && s.today,
                disabled && s.disabled,
              ]}
              key={key}
            >
              <AppText style={[s.date, selected === key && s.chosenText]}>{i + 1}</AppText>
              {has && <View style={[s.dot, selected === key && { backgroundColor: "#fff" }]} />}
            </Pressable>
          );
        })}
      </View>
      <View style={s.legend}>
        <View style={s.dot} />
        <AppText style={s.day}>Meeting scheduled · Palestine time</AppText>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  visual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    flexWrap: "wrap",
    paddingBottom: 4,
  },
  desk: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d8d4bd",
    borderRadius: 12,
    width: 73,
    alignItems: "center",
    paddingBottom: 8,
    transform: [{ rotate: "-5deg" }],
  },
  rings: {
    position: "absolute",
    top: -5,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ring: { width: 5, height: 13, borderRadius: 4, backgroundColor: "#8d9d7d" },
  month: {
    fontSize: 9,
    lineHeight: 18,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#8b9f7d",
    width: "100%",
    textAlign: "center",
    paddingTop: 7,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  big: { fontSize: 30, lineHeight: 37, color: "#526443", fontWeight: "700" },
  day: { fontSize: 10, lineHeight: 15, color: "#7c8774" },
  clock: { alignItems: "center", gap: 2 },
  tiny: { fontSize: 7, lineHeight: 11, letterSpacing: 1, color: "#9b8777" },
  relative: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e7eddf",
    borderRadius: 15,
    padding: 8,
  },
  relativeText: { fontSize: 10, lineHeight: 15, color: "#637d51" },
  dot: { height: 4, width: 4, borderRadius: 3, backgroundColor: "#a596bc" },
  calendar: {
    gap: 13,
    padding: 17,
    borderRadius: 23,
    backgroundColor: "#fffdf5eb",
    borderWidth: 1,
    borderColor: "#e1dfd0",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: "700", color: "#374d44" },
  arrows: { flexDirection: "row", gap: 4 },
  arrow: { padding: 8, backgroundColor: "#edf0e3", borderRadius: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 1,
  },
  weekday: { fontSize: 10, color: "#999f89" },
  date: { fontSize: 13, lineHeight: 20, color: "#526443" },
  chosen: { backgroundColor: "#6d845b" },
  chosenText: { color: "white", fontWeight: "700" },
  today: { borderWidth: 1, borderColor: "#99ac80" },
  disabled: { opacity: 0.3 },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e5e4d5",
  },
});
