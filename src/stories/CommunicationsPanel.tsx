import React from 'react'
import { PinnedNotes, type PinnedNote } from './PinnedNotes'
import { Button } from './Button'
export type { PinnedNote } from './PinnedNotes'

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#B25E09" strokeWidth="1.2" />
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#B25E09" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="7" cy="9.5" r="1" fill="#B25E09" />
  </svg>
)

const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="#B25E09" strokeWidth="1.2" />
    <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="#B25E09" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
)

const EmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="8" rx="1" stroke="#7D52F8" strokeWidth="1.2" />
    <path d="M1 4l6 4 6-4" stroke="#7D52F8" strokeWidth="1.2" />
  </svg>
)

const PaperclipIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M10 5.5L5.5 10a3 3 0 01-4.243-4.243l5-5a2 2 0 012.829 2.829L4.586 8.086a1 1 0 01-1.414-1.414L8 1.842"
      stroke="rgba(22,22,22,0.6)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M4.5 8h7M7 12h2" stroke="rgba(22,22,22,0.6)" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="#08875D" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5l3 3 3-3" stroke="rgba(22,22,22,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LockMessage {
  type: 'lock'
  time: string
  lockName: string
  unitName: string
  code: string
}

export interface NoteMessage {
  type: 'note'
  time: string
  text: string
  sentBy?: string
}

export interface EmailMessage {
  type: 'email'
  time: string
  subject: string
  body: string
  attachments?: string[]
  sentBy?: string
  delivered?: boolean
}

export type CommunicationMessage = LockMessage | NoteMessage | EmailMessage

export interface CommunicationsPanelProps {
  pinnedNotes?: PinnedNote[]
  messages?: CommunicationMessage[]
  onAddNote?: () => void
  onSendMessage?: () => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MESSAGES: CommunicationMessage[] = [
  {
    type: 'lock',
    time: '6/25/25, 9:15 AM',
    lockName: 'Lock',
    unitName: 'Wilburton Unit 102',
    code: '5930',
  },
  {
    type: 'note',
    time: '6/25/25, 9:01 AM',
    text: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team!',
    sentBy: 'David Peterson',
  },
  {
    type: 'email',
    time: '6/25/25, 8:45 AM',
    subject: 'Rent Due Reminder for Unit150',
    body: 'Just a quick reminder that rent for your unit150 is now due. To avoid late fees or any access interruptions, we kindly ask that you submit your payment at your earliest convenience.\n\nIf you\'ve already made your payment—thank you, and please disregard this message.',
    attachments: ['TX Self Storage.pdf  150KB', 'Terms and co...pdf  150KB'],
    sentBy: 'David Peterson',
    delivered: true,
  },
  {
    type: 'note',
    time: '6/24/25, 4:30 PM',
    text: 'Tenant called about access hours. Updated gate code and informed tenant of new extended schedule...',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const CommunicationsPanel: React.FC<CommunicationsPanelProps> = ({
  pinnedNotes = [],
  messages = DEFAULT_MESSAGES,
  onAddNote,
  onSendMessage,
}) => {
  const mostRecentTime = messages[0]?.time

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, overflow: 'hidden' }}>

      {/* Pinned notes — Figma node 17392-4568 */}
      {pinnedNotes.length > 0 && (
        <PinnedNotes notes={pinnedNotes} />
      )}

      {/* Action bar — Figma node 17386-7237 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 16px',
          borderBottom: '1px solid var(--ds-color-border)',
        }}
      >
        {/* Date Range dropdown */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: 125,
            height: 34,
            padding: '0 10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ds-color-text-primary)',
            background: 'var(--ds-color-surface)',
            border: '1px solid var(--ds-color-border)',
            borderRadius: 8,
            cursor: 'pointer',
            boxSizing: 'border-box',
            justifyContent: 'space-between',
          }}
        >
          <span>Date Range</span>
          <ChevronDownIcon />
        </button>

        {/* Filter icon button */}
        <button
          style={{
            width: 32,
            height: 32,
            background: 'var(--ds-color-surface-muted)',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <FilterIcon />
        </button>

        <div style={{ flex: 1 }} />

        {/* Add note link button */}
        <button
          onClick={onAddNote}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: '#7D52F7',
            background: 'none',
            border: 'none',
            padding: '0 4px',
            cursor: 'pointer',
          }}
        >
          Add note
        </button>

        {/* Send Message primary button */}
        <Button label="Send Message" variant="primary" size="sm" onClick={onSendMessage} />
      </div>

      {/* Message feed */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 520, overflowY: 'auto' }}>

        {/* Most Recent divider */}
        {mostRecentTime && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                background: 'var(--ds-color-surface-muted)',
                borderRadius: 100,
                padding: '4px 14px',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ds-color-text-muted)',
              }}
            >
              Most Recent
            </div>
            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>{mostRecentTime}</span>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          // Card background per Figma: lock/note = #FFF8EB, email = #F5F0FF
          const msgBg =
            msg.type === 'lock' ? 'var(--ds-color-warning-subtle)'
            : msg.type === 'note' ? 'var(--ds-color-warning-subtle)'
            : 'var(--ds-color-primary-light)'

          const icon =
            msg.type === 'lock' ? <LockIcon />
            : msg.type === 'note' ? <NoteIcon />
            : <EmailIcon />

          // Icon circle bg
          const iconBg =
            msg.type === 'lock' ? 'var(--ds-color-warning-light)'
            : msg.type === 'note' ? 'var(--ds-color-warning-light)'
            : 'var(--ds-color-color-5)'

          return (
            <div
              key={i}
              style={{
                background: msgBg,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>{msg.time}</div>

                {msg.type === 'lock' && (
                  <div style={{ fontSize: 12, color: 'var(--ds-color-text-primary)', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>Lock Combination</span>
                    <br />
                    {msg.lockName} added to {msg.unitName} with code <strong>{msg.code}</strong>.
                  </div>
                )}

                {msg.type === 'note' && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.6, color: 'var(--ds-color-text-primary)' }}>{msg.text}</p>
                    {msg.sentBy && (
                      <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>
                        Sent by {msg.sentBy}
                      </span>
                    )}
                  </div>
                )}

                {msg.type === 'email' && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ds-color-text-primary)' }}>{msg.subject}</div>
                    <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line', color: 'var(--ds-color-text-primary)' }}>
                      Hi,{'\n'}{msg.body}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {msg.attachments.map(att => (
                          <div
                            key={att}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'rgba(255,255,255,0.6)',
                              border: '1px solid rgba(125,82,248,0.2)',
                              borderRadius: 6,
                              padding: '4px 8px',
                            }}
                          >
                            <PaperclipIcon />
                            <span style={{ fontSize: 12, color: 'var(--ds-color-text-primary)' }}>{att}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {msg.sentBy && (
                        <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>
                          Sent by {msg.sentBy}
                        </span>
                      )}
                      {msg.delivered && (
                        <>
                          <CheckIcon />
                          <span style={{ fontSize: 12, color: '#08875D' }}>Delivered</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CommunicationsPanel
CommunicationsPanel.displayName = 'CommunicationsPanel'
