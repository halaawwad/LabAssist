import type { ChatMessage, Conversation } from '../../../data/supervisor/messagesMockData'

export type ConversationFilter = 'all' | 'unread' | 'starred'

export const conversationFilters: ConversationFilter[] = ['all', 'unread', 'starred']

export function lastMessage(conversation: Conversation): ChatMessage | undefined {
  return conversation.messages[conversation.messages.length - 1]
}

/** Sortable "YYYY-MM-DDTHH:mm" stamp of the latest message (empty for a cleared chat). */
function lastStamp(conversation: Conversation) {
  const message = lastMessage(conversation)
  return message ? `${message.date}T${message.time}` : ''
}

export function compareByRecent(a: Conversation, b: Conversation) {
  return lastStamp(b).localeCompare(lastStamp(a))
}

export function matchesFilter(conversation: Conversation, filter: ConversationFilter) {
  if (filter === 'unread') return conversation.unread > 0
  if (filter === 'starred') return conversation.starred
  return true
}

export function matchesSearch(conversation: Conversation, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [
    conversation.name,
    conversation.projectCode,
    conversation.projectName,
    ...conversation.members.map((member) => member.name),
    lastMessage(conversation)?.text ?? '',
  ].some((value) => value.toLowerCase().includes(needle))
}

/** Current wall-clock time as "HH:mm", used for messages sent during the session. */
export function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
