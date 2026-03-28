import React, { useEffect } from 'react'

// Toast component — success/error/warning notifications
// Monument Design System

export type ToastType = 'success' | 'error' | 'warning'

export interface ToastProps {
  open: boolean
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#08875D" />
    <path d="M5 8l2.5 2.5L11 5.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#E02D3C" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L1 14h14L8 2z" stroke="#B25E09" strokeWidth="1.3" strokeLinejoin="round" fill="#FFF8EB" />
    <path d="M8 7v3.5" stroke="#B25E09" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="12" r="0.6" fill="#B25E09" />
  </svg>
)

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: 'var(--ds-color-success-light)', border: 'var(--ds-color-success)', color: 'var(--ds-color-success)' },
  error:   { bg: 'var(--ds-color-error-subtle)',  border: 'var(--ds-color-error)',   color: 'var(--ds-color-error)' },
  warning: { bg: 'var(--ds-color-warning-subtle)', border: 'var(--ds-color-warning)', color: 'var(--ds-color-warning)' },
}

export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  type = 'success',
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null

  const s = TOAST_STYLES[type]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 400,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
        fontFamily: 'Inter, sans-serif',
        minWidth: 280,
        maxWidth: 400,
        animation: 'slideUp 200ms ease-out',
      }}
    >
      {type === 'success' && <CheckIcon />}
      {type === 'error' && <ErrorIcon />}
      {type === 'warning' && <WarningIcon />}
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ds-color-text-primary)', lineHeight: 1.5 }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-color-text-muted)', fontSize: 18, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}
      >
        ×
      </button>
    </div>
  )
}

export default Toast
Toast.displayName = 'Toast'
