import { useState } from "react";
import { BellOff, CalendarDays, Camera, ChartNoAxesCombined, Mail, Star, X } from "lucide-react";
import { ConversationMedia } from "@/components/ConversationMedia";
import { Button } from "@/components/ui/button";
import { useMessages, type Conversation } from "@/lib/messages";
import { useStudentProfile } from "@/lib/studentProfile";
import { project, teammates } from "@/lib/projectWorkspace";

type Props = {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: (change: Partial<Conversation>) => void;
  onProgress: () => void;
  onStarred: () => void;
  onEditGroup: () => void;
  onMeeting: (text: string) => void;
};
export function ConversationDetails({
  conversation,
  open,
  onClose,
  onUpdate,
  onProgress,
  onStarred,
  onEditGroup,
  onMeeting,
}: Props) {
  const { profile } = useStudentProfile(),
    { meetings, setMeetings } = useMessages();
  const [meeting, setMeeting] = useState(false),
    [title, setTitle] = useState(""),
    [date, setDate] = useState(""),
    [location, setLocation] = useState(""),
    [duration, setDuration] = useState(30),
    [agenda, setAgenda] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  if (!open) return null;
  return (
    <aside
      className="conversation-details conversation-info-panel"
      aria-label="Conversation details"
    >
      <button
        className="conversation-info-close"
        aria-label="Close conversation details"
        onClick={() => {
          onClose();
          setMeeting(false);
          setError("");
        }}
      >
        <X size={19} />
      </button>
      <div className="conversation-detail-profile">
        <span className={`messages-avatar kind-${conversation.kind}`}>
          {conversation.photo ? (
            <img src={conversation.photo} alt="" />
          ) : conversation.kind === "team" ? (
            "PT"
          ) : (
            conversation.initials || "You"
          )}
        </span>
        <h3>{conversation.kind === "saved" ? `${profile.name} (You)` : conversation.name}</h3>
        <p>
          {conversation.kind === "team"
            ? `${teammates.length} members`
            : conversation.kind === "saved"
              ? "Only you"
              : conversation.detail}
        </p>
        {conversation.kind === "team" && (
          <button className="conversation-group-photo-edit" onClick={onEditGroup}>
            <Camera size={15} />
            Edit group photo & name
          </button>
        )}
      </div>
      {conversation.kind !== "saved" && (
        <div className="conversation-primary-actions">
          <Button onClick={() => setMeeting((value) => !value)}>
            <CalendarDays size={17} />
            Schedule Meeting
          </Button>
          <Button variant="secondary" onClick={onProgress}>
            <ChartNoAxesCombined size={17} />
            View Progress
          </Button>
        </div>
      )}
      {conversation.kind === "team" && (
        <>
          <section className="conversation-info-section">
            <h3>Project</h3>
            <p className="conversation-project-name">{project.name}</p>
            <p className="conversation-project-subtitle">{project.subtitle}</p>
          </section>
          <section className="conversation-info-section">
            <h3>Members</h3>
            <ul className="conversation-members">
              {teammates.map((member, index) => (
                <li key={member.name}>
                  <span className={`conversation-member-avatar tone-${member.tone}`}>
                    {index === 0 ? <img src={profile.photo} alt="" /> : member.initials}
                  </span>
                  <span>
                    <strong>{index === 0 ? profile.name : member.name}</strong>
                    <small>{index === 0 ? "You" : "Project teammate"}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {meeting && (
        <form
          className="conversation-meeting-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || !date || !location.trim()) return;
            if (new Date(date).getTime() <= Date.now()) {
              setError("Choose a future meeting time.");
              return;
            }
            const startsAt = new Date(date).toISOString();
            setMeetings((items) => [
              ...items,
              {
                id: crypto.randomUUID(),
                conversationId: conversation.id,
                title: title.trim(),
                startsAt,
                duration,
                location: location.trim(),
                agenda: agenda.trim(),
              },
            ]);
            onMeeting(
              `Meeting scheduled (local preview): ${title.trim()}\nTime: ${new Date(startsAt).toLocaleString("en-US", { timeZone: "Asia/Hebron", dateStyle: "medium", timeStyle: "short" })} (Palestine time)\nDuration: ${duration} minutes\nLocation / link: ${location.trim()}${agenda.trim() ? `\nAgenda: ${agenda.trim()}` : ""}`,
            );
            setSaved(true);
            setMeeting(false);
            setTitle("");
            setDate("");
            setError("");
          }}
        >
          <h3>Schedule Meeting</h3>
          <label>
            Topic
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
            />
          </label>
          <label>
            Suggested date & time (your local time)
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            Duration (minutes)
            <input
              type="number"
              min={15}
              max={240}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Location or meeting link
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              maxLength={300}
            />
          </label>
          <label>
            Agenda
            <input value={agenda} onChange={(e) => setAgenda(e.target.value)} maxLength={1000} />
          </label>
          {error && <p role="alert">{error}</p>}
          <p>Saved for this session. Calendar invitations are not sent.</p>
          <Button type="submit">Schedule Meeting</Button>
        </form>
      )}
      {saved && (
        <p role="status" className="reports-notice">
          Meeting scheduled in this local session.
        </p>
      )}
      {meetings.some((item) => item.conversationId === conversation.id) && (
        <section className="conversation-info-section">
          <h3>Meetings</h3>
          {meetings
            .filter((item) => item.conversationId === conversation.id)
            .map((item) => (
              <div key={item.id} className="conversation-scheduled-meeting">
                <strong>{item.title}</strong>
                <p>
                  {new Date(item.startsAt).toLocaleString("en-US", {
                    timeZone: "Asia/Hebron",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {item.duration} min
                </p>
                <p>{item.location}</p>
              </div>
            ))}
        </section>
      )}
      <ConversationMedia key={conversation.id} conversation={conversation} />
      <div className="conversation-detail-actions">
        <Button variant="secondary" onClick={onStarred}>
          <Star size={15} />
          Starred messages
        </Button>
        <Button
          variant="secondary"
          aria-pressed={!!conversation.starred}
          onClick={() => onUpdate({ starred: !conversation.starred })}
        >
          <Star size={15} fill={conversation.starred ? "currentColor" : "none"} />
          {conversation.starred ? "Remove star" : "Star conversation"}
        </Button>
        {conversation.kind !== "saved" && (
          <Button
            variant="secondary"
            aria-pressed={!!conversation.muted}
            onClick={() => onUpdate({ muted: !conversation.muted })}
          >
            <BellOff size={15} />
            {conversation.muted ? "Unmute conversation" : "Mute conversation"}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => onUpdate({ unread: conversation.unread ? 0 : 1 })}
        >
          <Mail size={15} />
          {conversation.unread ? "Mark as read" : "Mark as unread"}
        </Button>
      </div>
      <p className="messages-directory-note">
        Settings apply to this local session. Notification delivery is not connected.
      </p>
    </aside>
  );
}
