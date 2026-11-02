# Communication â€” Stage 5

PostgreSQL 17 / PL/pgSQL. Requires account, project, finance and report stages plus the two-semester fixtures.

| Tables | Data |
|---|---|
| conversations, conversation_members | Self/direct/project chats; personal read cursors, star and mute |
| chat_messages | Immutable messages, same-chat replies and forwards |
| chat_message_files, chat_message_links | Frozen attachment metadata and shared links |
| chat_message_stars | Private message stars |
| meetings, meeting_participants | Organizer, schedule, agenda, notes and invitation responses |
| notification_events, notification_inbox | Deduplicated sources and recipient-private read/dismiss state |

Apply `sql/13-communication-schema.sql`, then `sql/14-demo-seed.sql` for demonstration fixtures only.
Project conversations follow current students and all linked supervisors automatically. Self-chat identity and photos come from the existing account profile. Meeting invitations do not represent attendance. Rescheduling requires renewed confirmation from invitees.

Local Docker: `./Initialize-Local.ps1`, then `docker compose up -d --wait`.
Acceptance: `docker compose exec -T db psql -U labassist_owner -d labassist_communication -v ON_ERROR_STOP=1 -f /communication-stage5/tests/acceptance.sql`.
`tests/seed-replay.sql` and `tests/concurrency.mjs` require disposable databases; they retain test changes. Concurrency uses independent psql processes and PostgreSQL lock-state checks. CI uses standard `PG*` connection variables.

Backend actor IDs must come from authenticated sessions; database credentials never belong in clients. Scope conversation summaries by the current account and recheck conversation access. Notification rows are in-app records, not delivered push/email/WebSocket messages. No real files, external meeting links, passwords or invitation tokens are seeded.
