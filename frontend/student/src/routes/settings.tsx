import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Download,
  Eye,
  Image,
  Menu,
  MessageSquare,
  RotateCcw,
  Settings,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Type,
  UserRound,
  Zap,
} from "lucide-react";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultStudentSettings,
  useStudentSettings,
  type StudentSettings,
} from "@/lib/studentSettings";
import { useStudentProfile } from "@/lib/studentProfile";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings | LabAssist" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const navigate = useNavigate(),
    { settings, setSettings } = useStudentSettings(),
    { profile } = useStudentProfile();
  const [menu, setMenu] = useState(false),
    [section, setSection] = useState("Appearance"),
    [draft, setDraft] = useState<StudentSettings>({ ...settings }),
    [notice, setNotice] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(settings);
  const toggle = (key: keyof StudentSettings) => {
    setDraft((value) => ({ ...value, [key]: !value[key] }));
    setNotice("");
  };
  const save = () => {
    setSettings({ ...draft });
    setNotice("Your preferences are applied for this session.");
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ preferences: settings }, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "labassist-preferences.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Preferences downloaded.");
  };
  const rows: Record<
    string,
    { key: keyof StudentSettings; title: string; description: string; icon: typeof Eye }[]
  > = {
    Appearance: [
      {
        key: "motion",
        title: "Gentle motion",
        description: "Animate progress rings, illustrations and small details.",
        icon: Sparkles,
      },
      {
        key: "background",
        title: "Workspace backgrounds",
        description: "Show the photographic backgrounds across your workspace.",
        icon: Image,
      },
      {
        key: "largeText",
        title: "Larger text",
        description: "Give labels, notes and reading areas a little more room.",
        icon: Type,
      },
    ],
    Messages: [
      {
        key: "messagePreviews",
        title: "Conversation previews",
        description: "Show the latest message under each conversation name.",
        icon: Eye,
      },
      {
        key: "enterToSend",
        title: "Enter to send",
        description: "Send with Enter. Use Shift + Enter to start a new line.",
        icon: MessageSquare,
      },
    ],
    Notifications: [
      {
        key: "meetingReminders",
        title: "Meeting reminders",
        description: "Your preference for upcoming meeting reminders.",
        icon: Bell,
      },
      {
        key: "reportReminders",
        title: "Report deadlines",
        description: "Your preference for weekly report reminders.",
        icon: CheckCheck,
      },
      {
        key: "teamUpdates",
        title: "Team updates",
        description: "Your preference for task and project activity updates.",
        icon: UserRound,
      },
    ],
  };
  return (
    <div className="settings-background min-h-screen">
      <div className="settings-ambient" aria-hidden="true">
        <span className="settings-ambient-gear ambient-gear-one">
          <Settings size={210} strokeWidth={0.65} />
        </span>
        <span className="settings-ambient-gear ambient-gear-two">
          <Settings size={110} strokeWidth={0.8} />
        </span>
        <span className="settings-ambient-dial">
          <i />
          <i />
          <i />
        </span>
        <span className="settings-ambient-track">
          <i />
        </span>
        <span className="settings-ambient-gear ambient-gear-three">
          <Settings size={85} strokeWidth={0.8} />
        </span>
        <span className="settings-ambient-gear ambient-gear-four">
          <Settings size={135} strokeWidth={0.65} />
        </span>
        <span className="settings-ambient-gear ambient-gear-five">
          <Settings size={60} strokeWidth={0.9} />
        </span>
        <span className="settings-ambient-top-track">
          <i />
        </span>
        <span className="settings-ambient-light" />
      </div>
      <div className="insight-shell">
        <WorkspaceSidebar
          active="Settings"
          open={menu}
          onClose={() => setMenu(false)}
          onSelect={(label) => {
            if (label === "Dashboard") navigate({ to: "/" });
            else if (label === "My Project") navigate({ to: "/project" });
            else if (label === "Component Catalog") navigate({ to: "/catalog" });
            else if (label === "3D Lab") navigate({ to: "/lab" });
          }}
          className="lg:sticky lg:top-4 lg:h-[calc(100vh-32px)]"
        />
        {menu && (
          <button
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          />
        )}
        <main className="insight-main settings-main">
          <header className="project-page-heading">
            <div className="flex items-center gap-3">
              <button aria-label="Open menu" className="lg:hidden" onClick={() => setMenu(true)}>
                <Menu />
              </button>
              <div>
                <p className="insight-eyebrow">YOUR WORKSPACE / YOUR WAY</p>
                <h1>Settings</h1>
              </div>
            </div>
            <button
              className="settings-profile-shortcut"
              onClick={() => navigate({ to: "/profile" })}
            >
              <img src={profile.photo} alt="" />
              <span>My profile</span>
              <ArrowUpRight size={14} />
            </button>
          </header>

          <div className="settings-layout">
            <aside className="settings-section-nav">
              <span>PREFERENCES</span>
              {[
                { label: "Appearance", icon: SlidersHorizontal },
                { label: "Messages", icon: MessageSquare },
                { label: "Notifications", icon: Bell },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  aria-pressed={section === label}
                  onClick={() => setSection(label)}
                >
                  <Icon size={17} />
                  {label}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </aside>
            <section className={`settings-preferences settings-section-${section.toLowerCase()}`}>
              <header>
                <h2>
                  {section === "Appearance"
                    ? "Appearance"
                    : section === "Messages"
                      ? "Messages"
                      : "Notifications"}
                </h2>
                <p>
                  {section === "Appearance"
                    ? "Adjust motion, backgrounds and text size."
                    : section === "Messages"
                      ? "Choose what appears in the conversation list and how you send."
                      : "Save your reminder preferences. Delivery will be connected with the notification service."}
                </p>
              </header>
              {rows[section]!.map(({ key, title, description, icon: Icon }) => (
                <div className="settings-preference-row" key={key}>
                  <span className="settings-preference-icon">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft[key]}
                    aria-label={title}
                    className="settings-toggle"
                    onClick={() => toggle(key)}
                  >
                    <span />
                  </button>
                </div>
              ))}
              {section === "Appearance" && (
                <div className="settings-live-preview">
                  <span>PREVIEW</span>
                  <div
                    className={`settings-preview-workspace ${draft.background ? "preview-with-background" : ""} ${draft.largeText ? "preview-large-text" : ""}`}
                  >
                    <div className="settings-preview-orbit">
                      <i className={draft.motion ? "preview-motion" : ""} />
                      <Check size={18} />
                    </div>
                    <div>
                      <strong>A little space to build.</strong>
                      <p>Comfortable details. A clearer next step.</p>
                    </div>
                    <span className="settings-preview-dot" />
                  </div>
                </div>
              )}
              {section === "Messages" && (
                <div className="settings-message-preview">
                  <span>CONVERSATION PREVIEW</span>
                  <div>
                    <img src={profile.photo} alt="" />
                    <div>
                      <strong>{profile.name} (You)</strong>
                      <p>
                        {draft.messagePreviews
                          ? "An idea to come back to later…"
                          : "Message preview hidden"}
                      </p>
                    </div>
                    <small>Now</small>
                  </div>
                  <small>
                    {draft.enterToSend
                      ? "Enter sends · Shift + Enter adds a line"
                      : "Enter adds a line · Use the send button"}
                  </small>
                </div>
              )}
              <footer className="settings-save-bar">
                <div aria-live="polite">
                  {notice ? (
                    <span>
                      <Check size={14} />
                      {notice}
                    </span>
                  ) : changed ? (
                    "You have unsaved changes."
                  ) : (
                    "Everything is up to date."
                  )}
                </div>
                <div>
                  <Button
                    variant="ghost"
                    disabled={!changed}
                    onClick={() => {
                      setDraft({ ...settings });
                      setNotice("");
                    }}
                  >
                    Discard
                  </Button>
                  <Button className="settings-save-button" disabled={!changed} onClick={save}>
                    <Check size={14} />
                    Save changes
                  </Button>
                </div>
              </footer>
            </section>
            <section className="settings-tools">
              <div>
                <span>
                  <Download size={20} />
                </span>
                <div>
                  <h3>Export preferences</h3>
                  <p>Download your saved preferences as a JSON file.</p>
                </div>
                <button onClick={download}>
                  Download <ArrowUpRight size={14} />
                </button>
              </div>
              <div>
                <span>
                  <RotateCcw size={20} />
                </span>
                <div>
                  <h3>Reset preferences</h3>
                  <p>Restore the default preferences.</p>
                </div>
                <button onClick={() => setResetOpen(true)}>Reset preferences</button>
              </div>
            </section>
          </div>
        </main>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore default preferences?</DialogTitle>
            <DialogDescription>
              This resets appearance, message and reminder preferences. Your project, messages and
              profile are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSettings({ ...defaultStudentSettings });
                setDraft({ ...defaultStudentSettings });
                setNotice("Default preferences restored.");
                setResetOpen(false);
              }}
            >
              Restore defaults
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
