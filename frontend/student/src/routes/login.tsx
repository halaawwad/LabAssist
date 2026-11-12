import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Cpu, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import "./access-login.css";
import workshopScene from "@/assets/login-workshop-backlight-sage.png";
export const Route = createFileRoute("/login")({ ssr: false, component: AccessLogin });
const roles = [
  {
    id: "student",
    label: "Student",
    identifier: "University email",
    example: "noor@demo.com",
    number: "8-digit student number",
  },
  {
    id: "supervisor",
    label: "Supervisor",
    identifier: "University number",
    example: "1024",
    number: "4 digits",
  },
  {
    id: "workshop",
    label: "Workshop Manager",
    identifier: "Employee number",
    example: "10001",
    number: "5 digits",
  },
  {
    id: "department",
    label: "Department Head",
    identifier: "Email",
    example: "head@demo.com",
    number: "Department administration",
  },
];
function AccessLogin() {
  const [role, setRole] = useState("student"),
    [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [reveal, setReveal] = useState(false),
    [error, setError] = useState(""),
    [phase, setPhase] = useState("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const current = roles.find((r) => r.id === role)!;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      (role === "supervisor" && !/^\d{4}$/.test(identifier)) ||
      (role === "workshop" && !/^\d{5}$/.test(identifier))
    ) {
      setError(`Enter your ${current.number.toLowerCase()} number.`);
      return;
    }
    if (identifier.trim().toLowerCase() !== current.example || password !== "Noor123!") {
      setError("Check your login details. Use the demo details below to try this preview.");
      return;
    }
    setError("");
    setPhase("connecting");
    timer.current = setTimeout(() => {
      setPhase("success");
      timer.current = setTimeout(() => {
        if (role === "department") window.location.assign("/department");
        else if (role === "student") window.location.assign("/");
        else {
          const url = new URL(window.location.href);
          url.port = role === "supervisor" ? "5174" : "5175";
          url.pathname = role === "supervisor" ? "/supervisor/dashboard" : "/dashboard";
          url.search = "";
          window.location.assign(url.href);
        }
      }, 650);
    }, 1100);
  }
  return (
    <main className={`access-login access-${phase}`}>
      <div className="access-grid" aria-hidden="true" />
      <svg
        className="access-background-circuit"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {[
          "M0 125 H65 L120 70 H370 L395 45 H650",
          "M0 150 H80 L135 95 H350",
          "M1600 155 H1530 L1470 95 H1240 L1205 60 H1000",
          "M1600 180 H1515 L1455 120 H1340",
          "M0 720 H80 L130 770 H310 L350 810 H580",
          "M0 745 H65 L115 795 H285",
          "M1600 735 H1525 L1470 790 H1310 L1275 825 H1080",
          "M1600 760 H1540 L1485 815 H1370",
        ].map((d, i) => (
          <g key={d} style={{ animationDelay: `${i * 0.7}s` }}>
            <path className="access-background-track" d={d} />
            <path className="access-background-signal" d={d} pathLength="100" />
          </g>
        ))}
        {[
          [350, 95],
          [650, 45],
          [1000, 60],
          [1340, 120],
          [285, 795],
          [580, 810],
          [1080, 825],
          [1370, 815],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
        ))}
      </svg>
      <div className="access-layout">
        <div className="access-topbar">
          <a className="access-brand" href="/">
            <span>
              <Cpu size={25} />
            </span>
            LabAssist
          </a>
          <nav className="access-roles" aria-label="Account role">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={role === r.id}
                disabled={phase !== "idle"}
                onClick={() => {
                  setRole(r.id);
                  setIdentifier("");
                  setPassword("");
                  setError("");
                }}
              >
                {r.label}
              </button>
            ))}
          </nav>
          <span className="access-top-note">YOUR CONNECTED WORKSPACE</span>
        </div>
        <img
          className="access-workshop-art"
          src={workshopScene}
          alt="Electronics workbench with a desk lamp, laptop, microcontroller and connected breadboard"
        />
        <div className="access-lab-motion" aria-hidden="true">
          <span className="access-led-halo" />
          <span className="access-lamp-halo" />
          <svg viewBox="0 0 1748 1020" preserveAspectRatio="none">
            <defs>
              <filter id="access-current-glow" x="-50%" y="-100%" width="200%" height="300%">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>
            {[
              "M143 837 H215 L253 875 H316",
              "M143 861 H209 L247 900 H315 L338 914 H422",
              "M970 492 H1030 L1060 522 H1115 L1143 548 H1195",
            ].map((path, i) => (
              <g key={path} style={{ animationDelay: `${i * 1.4}s` }}>
                <path className="access-current-bloom" d={path} pathLength="100" />
                <path className="access-current" d={path} pathLength="100" />
              </g>
            ))}
          </svg>
        </div>
        <section className="access-card">
          <header>
            <span className="access-eyebrow">YOUR ACCESS CARD</span>
            <span className="access-card-status">
              <i />
              {phase === "success" ? "Connected" : "Secure workspace"}
            </span>
          </header>
          <h2>
            Welcome Back<span>.</span>
          </h2>
          <p>Sign in to your LabAssist workspace.</p>
          <form aria-label="Workspace login" onSubmit={submit}>
            <label htmlFor="access-id">{current.identifier}</label>
            <div className={"access-input " + (error ? "invalid" : "")}>
              <UserRound size={18} />
              <input
                id="access-id"
                aria-invalid={!!error}
                aria-describedby={error ? "access-error" : undefined}
                required
                value={identifier}
                disabled={phase !== "idle"}
                autoComplete="username"
                inputMode={role === "supervisor" || role === "workshop" ? "numeric" : "email"}
                placeholder={role === "student" ? "s12345678@stu.najah.edu" : current.example}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError("");
                }}
              />
            </div>
            <label htmlFor="access-password">Password</label>
            <div className={"access-input " + (error ? "invalid" : "")}>
              <LockKeyhole size={18} />
              <input
                id="access-password"
                placeholder="Password"
                required
                value={password}
                disabled={phase !== "idle"}
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />
              <button
                type="button"
                aria-label={reveal ? "Hide password" : "Show password"}
                onClick={() => setReveal(!reveal)}
              >
                {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p className="access-error" role="alert" id="access-error">
                {error}
              </p>
            )}
            <button className="access-submit" disabled={phase !== "idle"}>
              {phase === "success" ? (
                <>
                  <Check size={20} />
                  Access granted
                </>
              ) : phase === "connecting" ? (
                "Connecting your workspace - "
              ) : (
                <>
                  Log in
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>
          <button
            className="access-demo"
            disabled={phase !== "idle"}
            onClick={() => {
              setIdentifier(current.example);
              setPassword("Noor123!");
              setError("");
            }}
          >
            Use demo details <ArrowRight size={15} />
          </button>
          <footer>
            <span>{current.number}</span>
            <span>BUILD - LEARN - CONNECT</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
