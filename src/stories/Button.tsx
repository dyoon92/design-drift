import React, { useState } from 'react'

// Button component — Figma node 8104:359412 (Regular Button)
// Monument Design System

export type ButtonType = 'primary' | 'secondary' | 'danger' | 'warning' | 'white'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label?: string
  variant?: ButtonType
  size?: ButtonSize
  disabled?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 30, padding: '4px 10px', fontSize: 12, lineHeight: '22px' },
  md: { height: 36, padding: '6px 16px', fontSize: 14, lineHeight: '24px' },
  lg: { height: 42, padding: '8px 22px', fontSize: 15, lineHeight: '26px' },
}

type ColorSet = { bg: string; border: string | 'none'; color: string }

const COLORS: Record<ButtonType, { default: ColorSet; hover: ColorSet; disabled: ColorSet }> = {
  primary: {
    default:  { bg: '#7D52F8', border: 'none', color: '#ffffff' },
    hover:    { bg: '#5E1DD6', border: 'none', color: '#ffffff' },
    disabled: { bg: '#E1E6EF', border: 'none', color: '#A4B1CC' },
  },
  secondary: {
    default:  { bg: 'transparent',                    border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-primary)' },
    hover:    { bg: 'var(--ds-color-surface-subtle)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-primary)' },
    disabled: { bg: 'var(--ds-color-surface-muted)',  border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)' },
  },
  danger: {
    default:  { bg: 'transparent', border: '1px solid #E02D3C', color: '#E02D3C' },
    hover:    { bg: '#FEF1F2',     border: '1px solid #BA2532', color: '#BA2532' },
    disabled: { bg: 'transparent', border: '1px solid #CBD2E1', color: '#A4B1CC' },
  },
  warning: {
    default:  { bg: '#B25E09', border: 'none', color: '#ffffff' },
    hover:    { bg: '#96530F', border: 'none', color: '#ffffff' },
    disabled: { bg: '#F1F3F9', border: 'none', color: '#A4B1CC' },
  },
  white: {
    default:  { bg: 'transparent', border: '1px solid #3F444D', color: '#ffffff' },
    hover:    { bg: 'transparent', border: '1px solid #ffffff', color: '#ffffff' },
    disabled: { bg: 'transparent', border: '1px solid #3F444D', color: '#ffffff' },
  },
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}) => {
  const [hovered, setHovered] = useState(false)

  const palette = COLORS[variant]
  const c = disabled ? palette.disabled : hovered ? palette.hover : palette.default
  const sz = SIZES[size]

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        borderRadius: 8,
        border: c.border === 'none' ? 'none' : c.border,
        background: c.bg,
        color: c.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms, border-color 120ms, color 120ms',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...sz,
      }}
    >
      {label ?? children}
    </button>
  )
}

export default Button
