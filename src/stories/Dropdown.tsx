import React, { useState } from 'react'

// Dropdown component — Figma node 8107:71831
// Monument Design System

export interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

export interface DropdownProps {
  items: DropdownItem[]
  onClose: () => void
}

function DropdownRow({ item, onClose }: { item: DropdownItem; onClose: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { item.onClick(); onClose() }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: 36,
        padding: '8px 16px',
        background: hovered ? 'var(--ds-color-primary-light)' : 'var(--ds-color-surface)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fontWeight: 400,
        color: item.variant === 'danger' ? 'var(--ds-color-error)' : 'var(--ds-color-text-primary)',
        textAlign: 'left',
        boxSizing: 'border-box',
        transition: 'background 100ms',
      }}
    >
      {item.icon && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.8 }}>
          {item.icon}
        </span>
      )}
      {item.label}
    </button>
  )
}

export const Dropdown: React.FC<DropdownProps> = ({ items, onClose }) => (
  <>
    {/* Backdrop */}
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={onClose} />
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        width: 298,
        background: 'var(--ds-color-surface)',
        borderRadius: 8,
        boxShadow: '0px 8px 32px rgba(0,0,0,0.16)',
        zIndex: 101,
        padding: '8px 0',
      }}
    >
      {items.map((item, i) => (
        <DropdownRow key={i} item={item} onClose={onClose} />
      ))}
    </div>
  </>
)

export default Dropdown
Dropdown.displayName = 'Dropdown'
