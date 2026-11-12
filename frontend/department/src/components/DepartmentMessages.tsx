import { useState } from "react";
import { ArrowLeft, Check, Info, Mail, MessageCircle, Search, Send, Star, X } from "lucide-react";
type Person = {
  id: string;
  name: string;
  number: string;
  email: string;
  role: string;
  active: boolean;
};
export type DepartmentMessage = { id: string; to: string; body: string; at: string };
export function DepartmentMessages({
  accounts,
  messages,
  onSend,
  contact,
  onSelect,
}: {
  accounts: Person[];
  messages: DepartmentMessage[];
  onSend: (body: string) => void;
  contact: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [stars, setStars] = useState<string[]>([]),
    [details, setDetails] = useState(false),
    [mobileChat, setMobileChat] = useState(false),
    [search, setSearch] = useState(false),
    [messageQuery, setMessageQuery] = useState(""),
    [body, setBody] = useState("");
  const person = accounts.find((a) => a.id === contact);
  const initials = (name: string) =>
    name
      .replace("Dr. ", "")
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("");
  const filtered = accounts.filter(
    (a) =>
      (filter !== "starred" || stars.includes(a.id)) &&
      `${a.name} ${a.number} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className={"dh-messages " + (mobileChat ? "dh-chat-open" : "")}>
      <aside className="dh-conversations">
        <header>
          <h2>Messages</h2>
          <span>{accounts.length}</span>
        </header>
        <label className="dh-search">
          <Search size={17} />
          <input
            aria-label="Search conversations"
            placeholder="Search your conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="dh-filters">
          {["all", "starred"].map((id) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {id === "all" ? "All" : "Starred"}
              {id === "starred" && <b>{stars.length}</b>}
            </button>
          ))}
        </div>
        <div className="dh-contacts">
          {filtered.map((a) => {
            const last = messages.filter((m) => m.to === a.id).at(-1);
            return (
              <button
                className={"dh-contact " + (contact === a.id ? "active" : "")}
                key={a.id}
                onClick={() => {
                  onSelect(a.id);
                  setMobileChat(true);
                  setDetails(false);
                  setMessageQuery("");
                }}
              >
                <span className={"dh-avatar " + (a.role === "Workshop Manager" ? "blue" : "")}>
                  {initials(a.name)}
                </span>
                <span className="dh-copy">
                  <strong>{a.name}</strong>
                  <small>{last?.body || a.role}</small>
                </span>
                <span className="dh-contact-meta">
                  {stars.includes(a.id) && <Star size={11} fill="currentColor" />}
                  {last && (
                    <small>
                      {new Date(last.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  )}
                </span>
              </button>
            );
          })}
          {!filtered.length && <p className="dh-empty-copy">No conversations match your search.</p>}
        </div>
        <footer>
          <MessageCircle size={22} />
          <p>
            A team, a question, an idea.<small>Keep the conversation going.</small>
          </p>
        </footer>
      </aside>
      <section className="dh-thread">
        <header>
          <button
            className="dh-mobile-back"
            aria-label="Back to conversations"
            onClick={() => setMobileChat(false)}
          >
            <ArrowLeft size={20} />
          </button>
          <span className="dh-avatar">{person ? initials(person.name) : "?"}</span>
          <div className="dh-copy">
            <h3>{person?.name || "Select a conversation"}</h3>
            <p>
              {person?.role} {person?.active ? " · Active account" : ""}
            </p>
          </div>
          <button
            aria-label="Search messages"
            className={search ? "selected" : ""}
            onClick={() => setSearch(!search)}
          >
            <Search size={19} />
          </button>
          <button
            aria-label="Conversation info"
            className={details ? "selected" : ""}
            onClick={() => setDetails(!details)}
          >
            <Info size={19} />
          </button>
        </header>
        {search && (
          <label className="dh-search dh-message-search">
            <Search size={17} />
            <input
              aria-label="Search message text"
              placeholder="Search messages..."
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
            />
            <button
              aria-label="Close message search"
              onClick={() => {
                setSearch(false);
                setMessageQuery("");
              }}
            >
              <X size={17} />
            </button>
          </label>
        )}
        <div className="dh-message-body">
          <span className="dh-date">Your department conversations</span>
          {!messages.some((m) => m.to === contact) && (
            <div className="dh-start">
              <span>
                <MessageCircle size={31} />
              </span>
              <h3>Good conversations start here.</h3>
              <p>Send a message to {person?.name}.</p>
            </div>
          )}
          {messages
            .filter(
              (m) => m.to === contact && m.body.toLowerCase().includes(messageQuery.toLowerCase()),
            )
            .map((m) => (
              <article className="dh-message" key={m.id}>
                <p>{m.body}</p>
                <footer>
                  <time>
                    {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                  <Check size={12} />
                </footer>
              </article>
            ))}
        </div>
        <form
          className="dh-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim() || !person) return;
            onSend(body.trim());
            setBody("");
          }}
        >
          <textarea
            aria-label="Message"
            placeholder="Write a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={1}
          />
          <button disabled={!body.trim() || !person} aria-label="Send message">
            <Send size={18} />
            <span>Send</span>
          </button>
        </form>
      </section>
      {details && person && (
        <aside className="dh-details">
          <button
            className="dh-close-info"
            aria-label="Close conversation info"
            onClick={() => setDetails(false)}
          >
            <X size={19} />
          </button>
          <span className="dh-avatar large">{initials(person.name)}</span>
          <h2>{person.name}</h2>
          <p>{person.role}</p>
          <button
            className="dh-star-conversation"
            onClick={() =>
              setStars(
                stars.includes(person.id)
                  ? stars.filter((id) => id !== person.id)
                  : [...stars, person.id],
              )
            }
          >
            <Star size={17} fill={stars.includes(person.id) ? "currentColor" : "none"} />
            {stars.includes(person.id) ? "Unstar conversation" : "Star conversation"}
          </button>
          <section>
            <h4>CONTACT DETAILS</h4>
            <p>
              <Mail size={15} />
              {person.email}
            </p>
            <p>University / employee number</p>
            <strong>{person.number}</strong>
          </section>
          <section>
            <h4>ACCOUNT</h4>
            <p>{person.active ? "Active" : "Disabled"}</p>
            <p>Department communication</p>
          </section>
        </aside>
      )}
    </section>
  );
}
