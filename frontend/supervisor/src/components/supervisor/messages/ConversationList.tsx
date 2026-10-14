import { BellOff, Paperclip, Search, Star, Users } from 'lucide-react'
import type { Conversation } from '../../../data/supervisor/messagesMockData'
import { messagesMockToday } from '../../../data/supervisor/messagesMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { conversationFilters, lastMessage, type ConversationFilter } from './messageHelpers'

type ConversationListProps = {
  conversations: Conversation[]
  activeId: string | null
  query: string
  filter: ConversationFilter
  counts: Record<ConversationFilter, number>
  onQueryChange: (query: string) => void
  onFilterChange: (filter: ConversationFilter) => void
  onSelect: (id: string) => void
}

export function ConversationList({
  conversations,
  activeId,
  query,
  filter,
  counts,
  onQueryChange,
  onFilterChange,
  onSelect,
}: ConversationListProps) {
  const { t, formatDate, formatTime } = useI18n()

  return (
    <section className="glass-panel messages-list-panel" aria-label={t('messages.listAria')}>
      <label className="messages-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder={t('messages.searchPlaceholder')}
          aria-label={t('messages.searchPlaceholder')}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="tasks-filters messages-tabs" role="group" aria-label={t('messages.filterAria')}>
        {conversationFilters.map((item) => (
          <button type="button" aria-pressed={filter === item} onClick={() => onFilterChange(item)} key={item}>
            {t(`messages.filters.${item}`)}
            {counts[item] > 0 ? <span className="notifications-filter-count">{counts[item]}</span> : null}
          </button>
        ))}
      </div>

      <ul className="messages-conversations">
        {conversations.map((conversation) => {
          const last = lastMessage(conversation)
          const isActive = conversation.id === activeId
          const preview = last
            ? `${last.from === 'me' ? `${t('messages.you')}: ` : conversation.kind === 'team' ? `${last.from.split(' ')[0]}: ` : ''}${
                last.text || last.attachment?.name || ''
              }`
            : t('messages.noMessages')

          return (
            <li key={conversation.id}>
              <button
                className={`messages-conversation ${isActive ? 'is-active' : ''} ${conversation.unread > 0 ? 'is-unread' : ''}`}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelect(conversation.id)}
              >
                <ChatAvatar initials={conversation.initials} tone={conversation.tone} online={conversation.online} team={conversation.kind === 'team'} />
                <span className="messages-conversation-copy">
                  <span className="messages-conversation-top">
                    <strong>{conversation.name}</strong>
                    {conversation.starred ? <Star className="messages-star-mark" size={13} aria-label={t('messages.filters.starred')} /> : null}
                    {conversation.muted ? <BellOff className="messages-muted-mark" size={13} aria-label={t('messages.muted')} /> : null}
                    {last ? (
                      <time dateTime={last.date}>
                        {last.date === messagesMockToday ? formatTime(last.time) : formatDate(last.date)}
                      </time>
                    ) : null}
                  </span>
                  <small className="messages-conversation-project">
                    {conversation.projectCode} · {conversation.projectName}
                  </small>
                  <span className="messages-conversation-preview">
                    {last?.attachment && !last.text ? <Paperclip size={13} aria-hidden="true" /> : null}
                    <span>{preview}</span>
                    {conversation.unread > 0 ? (
                      <b className="messages-unread-badge" aria-label={t('messages.unreadBadge', { count: conversation.unread })}>
                        {conversation.unread}
                      </b>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        {conversations.length === 0 ? <li className="tasks-empty messages-empty">{t('messages.empty')}</li> : null}
      </ul>
    </section>
  )
}

type ChatAvatarProps = {
  initials: string
  tone: Conversation['tone']
  online?: boolean
  team?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ChatAvatar({ initials, tone, online, team, size = 'md' }: ChatAvatarProps) {
  return (
    <span className={`student-initials messages-avatar is-${size} tone-${tone}`} aria-hidden="true">
      {initials}
      {team ? (
        <i className="messages-avatar-team">
          <Users size={10} strokeWidth={2.4} />
        </i>
      ) : null}
      {online ? <i className="messages-avatar-online" /> : null}
    </span>
  )
}
