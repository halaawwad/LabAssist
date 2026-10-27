import { useStudentProfile } from "@/lib/studentProfile";
import { useState } from "react";
import { ArrowRight, FileText, Forward, Image, Search, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { people, useMessages, type ChatMessage, type Conversation } from "@/lib/messages";
export function MessageTools({
  active,
  mode,
  onClose,
  forward,
  onNavigate,
}: {
  active: string;
  mode: "forward" | "starred" | "media" | null;
  onClose: () => void;
  forward: ChatMessage | null;
  onNavigate: (chat: string, message?: string) => void;
}) {
  const { chats: rawChats, setChats } = useMessages();
  const { profile } = useStudentProfile();
  const chats = rawChats.map((c) =>
    c.kind === "saved" ? { ...c, name: `${profile.name} (You)`, photo: profile.photo } : c,
  );
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState("Media"),
    [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const current = chats.find((c) => c.id === active)!;
  const recipients = [
    ...chats,
    ...people
      .filter((p) => !chats.some((c) => c.id === p.id))
      .map((p) => ({ ...p, messages: [], unread: 0 })),
  ];
  const forwardTo = (target: Conversation) => {
    if (!forward) return;
    const copy: ChatMessage = {
      id: crypto.randomUUID(),
      text: forward.text,
      sender: "you",
      time: new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Hebron",
        hour: "2-digit",
        minute: "2-digit",
      }),
      forwarded: true,
      ...(forward.attachment ? { attachment: { ...forward.attachment } } : {}),
    };
    setChats((list) =>
      list.some((c) => c.id === target.id)
        ? list.map((c) => (c.id === target.id ? { ...c, messages: [...c.messages, copy] } : c))
        : [...list, { ...target, messages: [copy] }],
    );
    onClose();
    onNavigate(target.id);
  };
  const starred = chats.flatMap((c) =>
    c.messages.filter((m) => m.starred).map((m) => ({ chat: c, message: m })),
  );
  const files = current.messages.filter(
    (m) => m.attachment && (tab === "Media" ? m.attachment.image : !m.attachment.image),
  );
  return (
    <>
      <Dialog
        open={!!mode}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
            setQuery("");
          }
        }}
      >
        <DialogContent className="messages-tools-dialog">
          <DialogHeader>
            <DialogTitle>
              {mode === "forward"
                ? "Forward message"
                : mode === "starred"
                  ? "Starred messages"
                  : "Media, files & links"}
            </DialogTitle>
            <DialogDescription>
              {mode === "forward"
                ? "Choose a conversation or a person. Forwarding stays in this local session."
                : mode === "starred"
                  ? "Important messages from all your conversations."
                  : `Shared in ${current.name}`}
            </DialogDescription>
          </DialogHeader>
          {mode === "forward" && (
            <>
              <div className="message-forward-preview">
                <Forward size={14} />
                <p>{forward?.text || forward?.attachment?.name}</p>
              </div>
              <label className="messages-search">
                <Search size={15} />
                <input
                  aria-label="Search forwarding recipients"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a conversation or person…"
                />
              </label>
              <div className="messages-tools-list">
                {recipients
                  .filter((c) =>
                    `${c.name} ${c.detail}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((c) => (
                    <button key={c.id} className="message-recipient" onClick={() => forwardTo(c)}>
                      <span className={`messages-avatar kind-${c.kind}`}>
                        {c.kind === "saved" ? <Star size={18} /> : c.initials || "PT"}
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.detail}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                {!recipients.some((c) =>
                  `${c.name} ${c.detail}`.toLowerCase().includes(query.toLowerCase()),
                ) && <p className="messages-no-results">No matching recipients.</p>}
              </div>
            </>
          )}
          {mode === "starred" && (
            <div className="messages-tools-list">
              {starred.map(({ chat, message: m }) => (
                <div key={m.id} className="message-starred-item">
                  <button
                    className="message-starred-content"
                    onClick={() => {
                      onClose();
                      onNavigate(chat.id, m.id);
                    }}
                  >
                    <small>
                      {chat.name} · {m.sender === "you" ? "You" : m.sender}
                    </small>
                    <p>{m.text || m.attachment?.name}</p>
                    <time>{m.time}</time>
                  </button>
                  <button
                    className="message-unstar"
                    aria-label={`Unstar ${m.id}`}
                    onClick={() =>
                      setChats((list) =>
                        list.map((c) =>
                          c.id === chat.id
                            ? {
                                ...c,
                                messages: c.messages.map((item) =>
                                  item.id === m.id ? { ...item, starred: false } : item,
                                ),
                              }
                            : c,
                        ),
                      )
                    }
                  >
                    <Star size={15} fill="currentColor" />
                  </button>
                </div>
              ))}
              {!starred.length && (
                <p className="messages-tools-empty">
                  <Star size={27} />
                  Star messages to keep the important ones close.
                </p>
              )}
            </div>
          )}
          {mode === "media" && (
            <>
              <div className="messages-people-filters">
                {["Media", "Files", "Links"].map((t) => (
                  <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="messages-tools-list">
                {tab !== "Links" ? (
                  <div className={tab === "Media" ? "message-media-grid" : "message-files-list"}>
                    {files.map(
                      (m) =>
                        m.attachment &&
                        (m.attachment.image ? (
                          <button
                            key={m.id}
                            onClick={() =>
                              setPreview({ url: m.attachment!.url, name: m.attachment!.name })
                            }
                          >
                            <img src={m.attachment.url} alt={m.attachment.name} />
                            <span>{m.attachment.name}</span>
                          </button>
                        ) : (
                          <a key={m.id} href={m.attachment.url} download={m.attachment.name}>
                            <FileText size={24} />
                            <span>
                              {m.attachment.name}
                              <small>{m.time} · Download</small>
                            </span>
                          </a>
                        )),
                    )}
                    {!files.length && (
                      <p className="messages-no-results">
                        No {tab.toLowerCase()} shared in this conversation yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="message-files-list">
                    {current.messages.flatMap((m) =>
                      (m.text.match(/https?:\/\/[^\s<>]+/g) || []).map((url, i) => (
                        <a
                          key={`${m.id}-${i}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowRight size={17} />
                          <span>{url}</span>
                        </a>
                      )),
                    )}
                    {!current.messages.some((m) => /https?:\/\//.test(m.text)) && (
                      <p className="messages-no-results">No links shared yet.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="message-image-viewer">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>Shared image</DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <img src={preview.url} alt={preview.name} />
              <a href={preview.url} download={preview.name}>
                Download image
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
