import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { FileText, Info, Paperclip, Search, SendHorizontal, Star, X } from 'lucide-react'
import { messagesMockToday, type Conversation } from '../../../data/supervisor/messagesMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { interactionLabels } from '../interactionLabels'
import { ChatAvatar } from './ConversationList'
import { formatFileSize } from './messageHelpers'

type ChatPanelProps = {
  conversation: Conversation
  infoOpen: boolean
  onToggleInfo: () => void
  onToggleStar: () => void
  onSend: (text: string) => void
  onAttach: (attachment: { name: string; size: string; dataUrl?: string }) => void
  onOpenFile: (name: string) => void
}

/** Active chat. The page keys it by conversation, so the draft and in-chat search reset when switching. */
export function ChatPanel({
  conversation,
  infoOpen,
  onToggleInfo,
  onToggleStar,
  onSend,
  onAttach,
  onOpenFile,
}: ChatPanelProps) {
  const { t, tp, formatDay, formatTime, language } = useI18n()
  const l = interactionLabels[language]
  const [fileError, setFileError] = useState('')
  const [draft, setDraft] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const threadRef = useRef<HTMLOListElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const draftRef = useRef<HTMLInputElement>(null)

  const needle = searchQuery.trim().toLowerCase()
  const messages = needle
    ? conversation.messages.filter((message) =>
        `${message.text} ${message.attachment?.name ?? ''}`.toLowerCase().includes(needle),
      )
    : conversation.messages

  // Keep the newest message in view.
  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [conversation.messages.length, needle])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
  }

  const subtitle =
    conversation.kind === 'team'
      ? tp('messages.memberCount', conversation.members.length)
      : conversation.online
        ? t('messages.online')
        : t('messages.offline')

  return (
    <section
      className="glass-panel messages-chat-panel"
      aria-label={t('messages.chatAria', { name: conversation.name })}
    >
      <header className="messages-chat-header">
        <ChatAvatar
          initials={conversation.initials}
          tone={conversation.tone}
          online={conversation.online}
          team={conversation.kind === 'team'}
        />
        <div className="messages-chat-title">
          <h2>{conversation.name}</h2>
          <p>
            <span className={conversation.online ? 'is-online' : ''}>{subtitle}</span> ·{' '}
            {conversation.projectCode} · {conversation.projectName}
          </p>
        </div>
        <div className="messages-chat-actions">
          <button
            className={`tasks-menu ${conversation.starred ? 'is-starred' : ''}`}
            type="button"
            aria-pressed={conversation.starred}
            aria-label={conversation.starred ? t('messages.unstar') : t('messages.star')}
            title={conversation.starred ? t('messages.unstar') : t('messages.star')}
            onClick={onToggleStar}
          >
            <Star size={19} />
          </button>
          <button
            className="tasks-menu"
            type="button"
            aria-pressed={searchOpen}
            aria-label={t('messages.searchInChat')}
            title={t('messages.searchInChat')}
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          >
            <Search size={19} />
          </button>
          <button
            className="tasks-menu"
            type="button"
            aria-pressed={infoOpen}
            aria-label={infoOpen ? t('messages.hideInfo') : t('messages.showInfo')}
            title={infoOpen ? t('messages.hideInfo') : t('messages.showInfo')}
            onClick={onToggleInfo}
          >
            <Info size={19} />
          </button>
        </div>
      </header>

      {searchOpen ? (
        <div className="messages-chat-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            placeholder={t('messages.searchInChatPlaceholder')}
            aria-label={t('messages.searchInChat')}
            autoFocus
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                closeSearch()
              }
            }}
          />
          <button
            className="tasks-menu"
            type="button"
            aria-label={t('messages.closeSearch')}
            onClick={closeSearch}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <ol className="messages-thread" ref={threadRef} aria-live="polite">
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const newDay = !previous || previous.date !== message.date
          const mine = message.from === 'me'
          const showSender =
            !mine && conversation.kind === 'team' && (newDay || previous.from !== message.from)

          return (
            <Fragment key={message.id}>
              {newDay ? (
                <li className="messages-day">
                  <span>{formatDay(message.date, messagesMockToday)}</span>
                </li>
              ) : null}
              <li className={`messages-bubble-row ${mine ? 'is-mine' : ''}`}>
                <div className="messages-bubble">
                  {showSender ? <strong className="messages-sender">{message.from}</strong> : null}
                  {message.attachment ? (
                    <button
                      className="messages-attachment"
                      type="button"
                      onClick={() => onOpenFile(message.attachment!.name)}
                    >
                      <FileText size={20} aria-hidden="true" />
                      <span>
                        <b>{message.attachment.name}</b>
                        <small>{message.attachment.size}</small>
                      </span>
                    </button>
                  ) : null}
                  {message.text ? <p>{message.text}</p> : null}
                  <time dateTime={`${message.date}T${message.time}`}>
                    {formatTime(message.time)}
                  </time>
                </div>
              </li>
            </Fragment>
          )
        })}
        {messages.length === 0 ? (
          <li className="tasks-empty messages-empty">
            {needle
              ? t('messages.noMatches', { query: searchQuery.trim() })
              : t('messages.noMessages')}
          </li>
        ) : null}
      </ol>

      <form className="messages-composer" onSubmit={submit}>
        <input
          className="visually-hidden"
          ref={fileRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              setFileError('')
              if (file.size > 2 * 1024 * 1024) setFileError(l.fileLimit)
              else {
                const reader = new FileReader()
                reader.onload = () =>
                  onAttach({
                    name: file.name,
                    size: formatFileSize(file.size),
                    dataUrl: String(reader.result),
                  })
                reader.onerror = () => setFileError(l.fileError)
                reader.readAsDataURL(file)
              }
            }
            event.target.value = ''
            draftRef.current?.focus()
          }}
        />
        <button
          className="tasks-menu messages-attach"
          type="button"
          aria-label={t('messages.attach')}
          title={t('messages.attach')}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={20} />
        </button>
        <input
          className="messages-input"
          ref={draftRef}
          type="text"
          value={draft}
          maxLength={1000}
          placeholder={t('messages.inputPlaceholder')}
          aria-label={t('messages.inputAria')}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="messages-send"
          type="submit"
          disabled={!draft.trim()}
          aria-label={t('messages.send')}
          title={!draft.trim() ? l.required : t('messages.send')}
        >
          <SendHorizontal size={19} />
          <span>{t('messages.send')}</span>
        </button>
      </form>
      {fileError && <p role="alert">{fileError}</p>}
    </section>
  )
}
