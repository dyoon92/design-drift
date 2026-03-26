import React from 'react'
import { Button } from './Button'

// Modal component — Figma node 8107:71831
// Monument Design System

export interface ModalProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const WarningIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L2 20h20L12 3z" stroke="#B25E09" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 10v5" stroke="#B25E09" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="0.8" fill="#B25E09" />
  </svg>
)

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.30)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--ds-color-surface)',
          borderRadius: 16,
          padding: '32px 28px 28px',
          width: 440,
          maxWidth: '90vw',
          boxShadow: '0px 16px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Warning icon circle */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#FFF8EB',
          border: '1px solid #F7C96E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <WarningIcon />
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-color-text-primary)', margin: '0 0 12px', textAlign: 'center', lineHeight: 1.3 }}>
          {title}
        </h2>

        <div style={{ fontSize: 14, color: 'var(--ds-color-text-muted)', lineHeight: 1.7, marginBottom: 28, textAlign: 'center' }}>
          {message}
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
          <Button label={cancelLabel} variant="secondary" size="md" onClick={onCancel} />
          <Button label={confirmLabel} variant="primary" size="md" onClick={onConfirm} />
        </div>
      </div>
    </div>
  )
}

export default Modal
