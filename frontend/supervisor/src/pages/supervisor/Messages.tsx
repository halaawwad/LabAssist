import { useState } from 'react'
import { MessageSquarePlus, MessagesSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SupervisorTopBar } from '../../components/supervisor/SupervisorTopBar'
import { Notice } from '../../components/supervisor/account/Notice'
import { useNotice } from '../../components/supervisor/account/useNotice'
import { ChatPanel } from '../../components/supervisor/messages/ChatPanel'
import { ConversationInfo } from '../../components/supervisor/messages/ConversationInfo'
import { ConversationList } from '../../components/supervisor/messages/ConversationList'
import { NewMessageDialog, type NewMessage } from '../../components/supervisor/messages/NewMessageDialog'
import {
  compareByRecent,
  conversationFilters,
  currentTime,
  initialsOf,
  matchesFilter,
  matchesSearch,
  type ConversationFilter,
} from '../../components/supervisor/messages/messageHelpers'
import { ScheduleMeetingDialog, type NewTask } from '../../components/supervisor/tasks/QuickActionDialogs'
import {
  conversations as initialConversations,
  messagesMockToday,
  type ChatAttachment,
  type ChatMessage,
  type Conversation,
} from '../../data/supervisor/messagesMockData'
import { findProject } from '../../components/supervisor/tasks/taskHelpers'
import { useI18n } from '../../i18n/i18nContext'

type OpenDialog = 'new' | 'meeting' | null

/** Below this width the info panel overlays the chat, so it starts closed. */
const wideLayoutQuery = '(min-width: 1281px)'

const newChatTones: Conversation['tone'][] = ['blue', 'violet', 'gold', 'coral', 'green']

export function Messages() {
  const { t, formatDay, formatDate } = useI18n()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ConversationFilter>('all')
  const [infoOpen, setInfoOpen] = useState(() => window.matchMedia(wideLayoutQuery).matches)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const [notice, setNotice] = useNotice()

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null
  const visible = conversations
    .filter((conversation) => matchesFilter(conversation, filter) && matchesSearch(conversation, query))
    .sort(compareByRecent)
  const counts = Object.fromEntries(
    conversationFilters.map((item) => [item, conversations.filter((conversation) => matchesFilter(conversation, item)).length]),
  ) as Record<ConversationFilter, number>
  // "All" shows no badge; the other tabs show how many conversations they hold.
  counts.all = 0

  const update = (id: string, change: (conversation: Conversation) => Partial<Conversation>) =>
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, ...change(conversation) } : conversation)),
    )

  const append = (id: string, message: Omit<ChatMessage, 'id' | 'from' | 'date' | 'time'>) =>
    update(id, (conversation) => ({
      unread: 0,
      messages: [
        ...conversation.messages,
        { ...message, id: `m-${Date.now()}`, from: 'me', date: messagesMockToday, time: currentTime() },
      ],
    }))

  const select = (id: string) => {
    setActiveId(id)
    update(id, () => ({ unread: 0 }))
  }

  const openFile = (name: string) => setNotice(t('messages.downloadNotice', { name }))

  const sendNewMessage = ({ studentName, projectCode, text }: NewMessage) => {
    const existing = conversations.find((conversation) => conversation.kind === 'direct' && conversation.name === studentName)
    const id = existing?.id ?? `direct-${Date.now()}`
    if (!existing) {
      const project = findProject(projectCode)
      const initials = initialsOf(studentName)
      const tone = newChatTones[conversations.length % newChatTones.length]
      setConversations((current) => [
        {
          id,
          kind: 'direct',
          name: studentName,
          initials,
          tone,
          projectCode,
          projectName: project?.name ?? '',
          members: [{ name: studentName, initials, tone, role: 'student' }],
          online: false,
          unread: 0,
          starred: false,
          muted: false,
          messages: [],
        },
        ...current,
      ])
    }
    append(id, { text })
    setActiveId(id)
    setFilter('all')
    setQuery('')
    setNotice(t('messages.newDialog.notice', { name: studentName }))
  }

  // A scheduled meeting is announced in that project's team chat (or the open chat if the team has none).
  const announceMeeting = (task: NewTask) => {
    const target =
      conversations.find((conversation) => conversation.kind === 'team' && conversation.projectCode === task.projectCode) ?? active
    if (!target) return
    append(target.id, {
      text: t('messages.meetingMessage', {
        title: task.title,
        date: task.dueDate === messagesMockToday ? formatDay(task.dueDate, messagesMockToday) : formatDate(task.dueDate),
      }),
    })
    setActiveId(target.id)
  }

  return (
    <>
      <SupervisorTopBar />

      <section className="account-page messages-page" aria-labelledby="messages-title">
        <header className="account-heading">
          <div>
            <h1 id="messages-title">{t('messages.title')}</h1>
            <p>{t('messages.subtitle')}</p>
          </div>
          <button className="new-project-button account-heading-action" type="button" onClick={() => setOpenDialog('new')}>
            <MessageSquarePlus size={18} aria-hidden="true" />
            {t('messages.newMessage')}
          </button>
        </header>

        <div className={`messages-layout ${infoOpen && active ? 'is-info-open' : ''}`}>
          <ConversationList
            conversations={visible}
            activeId={activeId}
            query={query}
            filter={filter}
            counts={counts}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
            onSelect={select}
          />

          {active ? (
            <ChatPanel
              key={active.id}
              conversation={active}
              infoOpen={infoOpen}
              onToggleInfo={() => setInfoOpen((open) => !open)}
              onToggleStar={() => update(active.id, (conversation) => ({ starred: !conversation.starred }))}
              onSend={(text) => append(active.id, { text })}
              onAttach={(attachment: ChatAttachment) => {
                append(active.id, { text: '', attachment })
                setNotice(t('messages.attachNotice', { name: attachment.name }))
              }}
              onOpenFile={openFile}
            />
          ) : (
            <section className="glass-panel messages-chat-panel messages-chat-empty">
              <MessagesSquare size={40} strokeWidth={1.5} aria-hidden="true" />
              <p>{t('messages.selectConversation')}</p>
            </section>
          )}

          {/* Stays mounted while closed so its column can slide shut; `inert` takes it out of focus and the a11y tree. */}
          {active ? (
            <div className="messages-info-slot" inert={!infoOpen}>
              <ConversationInfo
                conversation={active}
                onClose={() => setInfoOpen(false)}
                onViewProgress={() => navigate(`/supervisor/progress?project=${active.projectCode}`)}
                onScheduleMeeting={() => setOpenDialog('meeting')}
                onToggleMute={() => {
                  update(active.id, (conversation) => ({ muted: !conversation.muted }))
                  setNotice(t(active.muted ? 'messages.unmutedNotice' : 'messages.mutedNotice', { name: active.name }))
                }}
                onToggleRead={() => update(active.id, (conversation) => ({ unread: conversation.unread > 0 ? 0 : 1 }))}
                onOpenFile={openFile}
              />
            </div>
          ) : null}
        </div>
      </section>

      {openDialog === 'new' ? <NewMessageDialog onClose={() => setOpenDialog(null)} onSend={sendNewMessage} /> : null}
      {openDialog === 'meeting' ? (
        <ScheduleMeetingDialog onClose={() => setOpenDialog(null)} onNotice={setNotice} onCreate={announceMeeting} />
      ) : null}

      <Notice message={notice} />
    </>
  )
}
