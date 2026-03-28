import React from 'react'

// PinnedNotes component — Figma node 17392-4568
// Monument Design System / Pinned Notes

export interface PinnedNote {
  pinnedBy: string
  pinnedAt: string
  createdBy: string
  createdAt: string
  message: string
  truncated?: boolean
}

export interface PinnedNotesProps {
  notes?: PinnedNote[]
  onReadMore?: (index: number) => void
}

// Pin icon — purple fill, 24x24px from Figma pin-message / Property 1=selected
const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M9.5 2L14 6.5L11 9.5L11.5 13L8 11L4.5 13L5 9.5L2 6.5L6.5 2L9.5 2Z" fill="#7D52F8" stroke="#7D52F8" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 11V15" stroke="#7D52F8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Info circle icon — 14x14px, rgba(22,22,22,0.8)
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <circle cx="7" cy="7" r="6" stroke="rgba(22,22,22,0.8)" strokeWidth="1.2" />
    <path d="M7 6.5V10" stroke="rgba(22,22,22,0.8)" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="7" cy="4.5" r="0.75" fill="rgba(22,22,22,0.8)" />
  </svg>
)

const DEFAULT_NOTES: PinnedNote[] = [
  {
    pinnedBy: 'Jane Doe',
    pinnedAt: '6/25/25 at 6:00PM',
    createdBy: 'David Peterson',
    createdAt: '5/14/25 at 9:00AM',
    message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team!',
  },
  {
    pinnedBy: 'Jane Doe',
    pinnedAt: '6/25/25 at 6:00PM',
    createdBy: 'David Peterson',
    createdAt: '5/14/25 at 9:00AM',
    message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team!',
  },
  {
    pinnedBy: 'Jane Doe',
    pinnedAt: '6/25/25 at 6:00PM',
    createdBy: 'David Peterson',
    createdAt: '5/14/25 at 9:00AM',
    message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team!',
    truncated: true,
  },
]

export const PinnedNotes: React.FC<PinnedNotesProps> = ({
  notes = DEFAULT_NOTES,
  onReadMore,
}) => {
  if (!notes.length) return null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(224,230,239,1)',
        borderBottom: 'none',
        borderRadius: 16,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {notes.map((note, i) => (
        <div
          key={i}
          style={{
            background: '#FFFAF0',
            border: '1.5px solid #F7C96E',
            borderRadius: 12,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Metadata row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PinIcon />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: 'rgba(22,22,22,0.8)',
                  lineHeight: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Pinned on {note.pinnedAt} by {note.pinnedBy} · Created on {note.createdAt} by {note.createdBy}
              </span>
              <InfoIcon />
            </div>
          </div>

          {/* Message body */}
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 400,
              lineHeight: '16px',
              color: '#161616',
            }}
          >
            {note.message}
            {note.truncated && (
              <>
                {' '}
                <button
                  onClick={() => onReadMore?.(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7D52F8',
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif',
                    padding: 0,
                    fontWeight: 400,
                  }}
                >
                  Read More
                </button>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}

export default PinnedNotes
PinnedNotes.displayName = 'PinnedNotes'
