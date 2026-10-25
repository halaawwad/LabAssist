import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import type { ConversationKind } from '../data/messages'
import { useI18n } from '../i18n/i18nContext'
import { useWorkshop } from '../state/workshopContext'

type Filter = ConversationKind | 'all'
const kinds: ConversationKind[] = ['student', 'group', 'supervisor']

export function MessagesPage() {
  const { t, formatRelative } = useI18n()
  const { conversations, sendMessage, openConversation } = useWorkshop()
  const [filter, setFilter] = useState<Filter>('all')
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLOListElement>(null)

  const listed = conversations.filter((item) => filter === 'all' || item.kind === filter)
  const active = conversations.find((item) => item.id === activeId)

  // Reading a thread clears its unread count.
  useEffect(() => {
    if (activeId) openConversation(activeId)
  }, [activeId, openConversation])

  useEffect(() => {
    threadRef.current?.lastElementChild?.scrollIntoView({ block: 'end' })
  }, [active?.messages.length, activeId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!active || !draft.trim()) return
    sendMessage(active.id, draft.trim())
    setDraft('')
  }

  return (
    <div className="page">
      <PageHeader title={t('messages.title')} subtitle={t('messages.subtitle')} />
      <div className="page-toolbar">
        <FilterChips
          label={t('messages.title')}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('messages.all') },
            ...kinds.map((kind) => ({ id: kind, label: t(`messages.kinds.${kind}`) })),
          ]}
        />
      </div>

      <div className="messages-layout">
        <section className="panel conversation-list" aria-label={t('messages.title')}>
          <ul>
            {listed.map((item) => {
              const last = item.messages[item.messages.length - 1]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === activeId ? 'is-active' : ''}
                    aria-current={item.id === activeId ? 'true' : undefined}
                    onClick={() => setActiveId(item.id)}
                  >
                    <Avatar name={item.name} />
                    <span className="conversation-text">
                      <strong>{item.name}</strong>
                      <span>{last?.text}</span>
                    </span>
                    {item.unread ? <span className="unread-dot">{item.unread}</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel thread" aria-label={active?.name ?? t('messages.title')}>
          {active ? (
            <>
              <header className="thread-header">
                <Avatar name={active.name} />
                <div>
                  <strong>{active.name}</strong>
                  <span>
                    {t(`messages.kinds.${active.kind}`)} · {active.detail}
                  </span>
                </div>
              </header>
              <ol className="thread-messages" ref={threadRef}>
                {active.messages.map((message) => (
                  <li key={message.id} className={message.fromMe ? 'is-mine' : ''}>
                    <p>{message.text}</p>
                    <time dateTime={message.at}>
                      {message.fromMe ? `${t('messages.you')} · ` : ''}
                      {formatRelative(message.at)}
                    </time>
                  </li>
                ))}
              </ol>
              <form className="composer" onSubmit={submit}>
                <input
                  className="input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('messages.placeholder')}
                  aria-label={t('messages.placeholder')}
                  maxLength={500}
                />
                <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>
                  <Send size={17} className="flip-rtl" />
                  {t('messages.send')}
                </button>
              </form>
            </>
          ) : (
            <p className="empty-note">{t('messages.select')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
