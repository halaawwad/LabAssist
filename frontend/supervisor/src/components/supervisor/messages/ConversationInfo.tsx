import { Bell, BellOff, CalendarDays, ChartColumn, Download, FileText, MailCheck, MailOpen, X } from 'lucide-react'
import type { ChatAttachment, Conversation } from '../../../data/supervisor/messagesMockData'
import { useI18n } from '../../../i18n/i18nContext'
import { ChatAvatar } from './ConversationList'

type ConversationInfoProps = {
  conversation: Conversation
  onClose: () => void
  onViewProgress: () => void
  onScheduleMeeting: () => void
  onToggleMute: () => void
  onToggleRead: () => void
  onOpenFile: (name: string) => void
}

export function ConversationInfo({
  conversation,
  onClose,
  onViewProgress,
  onScheduleMeeting,
  onToggleMute,
  onToggleRead,
  onOpenFile,
}: ConversationInfoProps) {
  const { t, tp } = useI18n()
  const files = conversation.messages
    .map((message) => message.attachment)
    .filter((attachment): attachment is ChatAttachment => Boolean(attachment))
    .reverse()

  return (
    <aside className="glass-panel messages-info-panel" aria-label={t('messages.infoAria')}>
      <button className="tasks-menu messages-info-close" type="button" aria-label={t('messages.hideInfo')} onClick={onClose}>
        <X size={18} />
      </button>

      <div className="messages-info-profile">
        <ChatAvatar initials={conversation.initials} tone={conversation.tone} online={conversation.online} team={conversation.kind === 'team'} size="lg" />
        <h2>{conversation.name}</h2>
        <p>
          {conversation.kind === 'team' ? tp('messages.memberCount', conversation.members.length) : t('messages.roles.student')}
        </p>
      </div>

      <div className="messages-info-actions">
        <button className="dialog-primary-button" type="button" onClick={onScheduleMeeting}>
          <CalendarDays size={17} aria-hidden="true" />
          {t('messages.scheduleMeeting')}
        </button>
        <button className="dialog-secondary-button" type="button" onClick={onViewProgress}>
          <ChartColumn size={17} aria-hidden="true" />
          {t('messages.viewProgress')}
        </button>
      </div>

      <section className="messages-info-section">
        <h3>{t('messages.project')}</h3>
        <p className="messages-info-project">
          <strong>{conversation.projectCode}</strong>
          <span>{conversation.projectName}</span>
        </p>
      </section>

      <section className="messages-info-section">
        <h3>{t('messages.members')}</h3>
        <ul className="messages-info-members">
          {conversation.members.map((member) => (
            <li key={member.name}>
              <ChatAvatar initials={member.initials} tone={member.tone} size="sm" />
              <span>
                <strong>{member.name}</strong>
                <small>{t(`messages.roles.${member.role}`)}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="messages-info-section">
        <h3>{t('messages.sharedFiles')}</h3>
        {files.length > 0 ? (
          <ul className="messages-info-files">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <button type="button" onClick={() => onOpenFile(file.name)} aria-label={t('messages.download', { name: file.name })}>
                  <FileText size={18} aria-hidden="true" />
                  <span>
                    <strong>{file.name}</strong>
                    <small>{file.size}</small>
                  </span>
                  <Download size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="messages-info-empty">{t('messages.noFiles')}</p>
        )}
      </section>

      <div className="messages-info-footer">
        <button type="button" aria-pressed={conversation.muted} onClick={onToggleMute}>
          {conversation.muted ? <Bell size={17} aria-hidden="true" /> : <BellOff size={17} aria-hidden="true" />}
          {conversation.muted ? t('messages.unmute') : t('messages.mute')}
        </button>
        <button type="button" onClick={onToggleRead}>
          {conversation.unread > 0 ? <MailCheck size={17} aria-hidden="true" /> : <MailOpen size={17} aria-hidden="true" />}
          {conversation.unread > 0 ? t('messages.markRead') : t('messages.markUnread')}
        </button>
      </div>
    </aside>
  )
}
