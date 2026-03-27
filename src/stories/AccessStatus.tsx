import React from 'react'

export interface AccessStatusProps {
  status: 'enabled' | 'revoked' | 'mixed'
}

const EnabledIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" fill="var(--ds-color-success)" />
    <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const RevokedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" fill="var(--ds-color-error)" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const AccessStatus: React.FC<AccessStatusProps> = ({ status }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {status === 'enabled' && (
        <>
          <EnabledIcon />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--ds-color-text-primary)' }}>
            Access
          </span>
        </>
      )}
      {status === 'revoked' && (
        <>
          <RevokedIcon />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--ds-color-text-primary)' }}>
            Access
          </span>
        </>
      )}
      {status === 'mixed' && (
        <>
          <RevokedIcon />
          <EnabledIcon />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--ds-color-text-primary)' }}>
            Access
          </span>
        </>
      )}
    </div>
  )
}

export default AccessStatus
