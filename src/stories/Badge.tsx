import React from 'react'

// Badge components — Figma node 2214:26187
// Monument Design System

export type BadgeSize = 'lg' | 'sm'
export type BadgeContrast = 'high' | 'low'

// ─── Shared pill renderer ──────────────────────────────────────────────────────

function BadgePill({
  label,
  bg,
  color,
  size = 'lg',
  icon,
}: {
  label: string
  bg: string
  color: string
  size?: BadgeSize
  icon?: React.ReactNode
}) {
  const iconSize = size === 'lg' ? 14 : 11
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'lg' ? 4 : 3,
        height: size === 'lg' ? 24 : 16,
        padding: size === 'lg' ? '4px 10px' : '2px 6px',
        borderRadius: 100,
        background: bg,
        color,
        fontFamily: 'Inter, sans-serif',
        fontSize: size === 'lg' ? 14 : 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        boxSizing: 'border-box',
      }}
    >
      {icon && (
        <span style={{ display: 'flex', alignItems: 'center', width: iconSize, height: iconSize, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      {label}
    </span>
  )
}

// ─── General Badge ─────────────────────────────────────────────────────────────
// Text-only per Figma Component 1 — no icons

export type GeneralStatus = 'active' | 'inactive' | 'in-progress' | 'secondary' | 'error' | 'archive'

export interface BadgeProps {
  status: GeneralStatus
  size?: BadgeSize
  contrast?: BadgeContrast
  label?: string
}

const GENERAL_COLORS: Record<GeneralStatus, { high: string[]; low: string[] }> = {
  'active':      { high: ['#08875D', '#ffffff'], low: ['#E5F5E9', '#08875D'] },
  'inactive':    { high: ['#B25E09', '#ffffff'], low: ['#FFF8EB', '#B25E09'] },
  'in-progress': { high: ['#7D52F8', '#ffffff'], low: ['#F5F0FF', '#7D52F8'] },
  'secondary':   { high: ['#548BF7', '#ffffff'], low: ['#D1DFFF', '#356DDE'] },
  'error':       { high: ['#E02D3C', '#ffffff'], low: ['#FEE1E3', '#E02D3C'] },
  'archive':     { high: ['#5F6C85', '#ffffff'], low: ['#E1E6EF', '#161616'] },
}

const GENERAL_LABELS: Record<GeneralStatus, string> = {
  'active':      'Active',
  'inactive':    'Inactive',
  'in-progress': 'In Progress',
  'secondary':   'Secondary',
  'error':       'Error',
  'archive':     'Archive',
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'lg', contrast = 'high', label }) => {
  const [bg, color] = GENERAL_COLORS[status][contrast]
  return <BadgePill label={label ?? GENERAL_LABELS[status]} bg={bg} color={color} size={size} />
}

// ─── Unit Status Badge ─────────────────────────────────────────────────────────

export type UnitStatus =
  | 'delinquent' | 'occupied' | 'overdue' | 'overlock' | 'in-progress'
  | 'vacant' | 'waitlisted' | 'reserved' | 'lien' | 'auction' | 'pending'
  | 'owner-occupied' | 'unrentable' | 'maintenance' | 'paused' | 'transferring' | 'tax-exempt'

export interface UnitBadgeProps {
  status: UnitStatus
  size?: BadgeSize
  contrast?: BadgeContrast
}

const UNIT_COLORS: Record<UnitStatus, { high: string; low: string[] }> = {
  'delinquent':     { high: '#E02D3C', low: ['#FEE1E3', '#E02D3C'] },
  'occupied':       { high: '#548BF7', low: ['#D1DFFF', '#356DDE'] },
  'overdue':        { high: '#E02D3C', low: ['#FEE1E3', '#E02D3C'] },
  'overlock':       { high: '#981B25', low: ['#FEC8CD', '#981B25'] },
  'in-progress':    { high: '#548BF7', low: ['#D1DFFF', '#356DDE'] },
  'vacant':         { high: '#08875D', low: ['#E5F5E9', '#08875D'] },
  'waitlisted':     { high: '#7D52F8', low: ['#F5F0FF', '#7D52F8'] },
  'reserved':       { high: '#7D52F8', low: ['#F5F0FF', '#7D52F8'] },
  'lien':           { high: '#E02D3C', low: ['#FEE1E3', '#E02D3C'] },
  'auction':        { high: '#981B25', low: ['#FEE1E3', '#981B25'] },
  'pending':        { high: '#5F6C85', low: ['#CBD2E1', '#161616'] },
  'owner-occupied': { high: '#5F6C85', low: ['#CBD2E1', '#161616'] },
  'unrentable':     { high: '#E02D3C', low: ['#FEE1E3', '#E02D3C'] },
  'maintenance':    { high: '#B25E09', low: ['#FFF8EB', '#B25E09'] },
  'paused':         { high: '#FFA928', low: ['#FEE5B3', '#DB7712'] },
  'transferring':   { high: '#1B1F27', low: ['#F1F3F9', '#1B1F27'] },
  'tax-exempt':     { high: '#2152B5', low: ['#EBF1FF', '#2152B5'] },
}

const UNIT_LABELS: Record<UnitStatus, string> = {
  'delinquent':     'Delinquent',
  'occupied':       'Occupied',
  'overdue':        'Overdue',
  'overlock':       'Overlock',
  'in-progress':    'In Progress',
  'vacant':         'Vacant',
  'waitlisted':     'Waitlisted',
  'reserved':       'Reserved',
  'lien':           'Lien',
  'auction':        'Auction',
  'pending':        'Pending',
  'owner-occupied': 'Owner Occupied',
  'unrentable':     'Unrentable',
  'maintenance':    'Maintenance',
  'paused':         'Paused',
  'transferring':   'Transferring',
  'tax-exempt':     'Tax Exempt',
}

// Icons sized to fill their container (width/height="100%")
const UNIT_ICONS: Record<UnitStatus, React.ReactNode> = {
  'delinquent':     <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M7 2H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M9 2l1.5 1.5L7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'occupied':       <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 12c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  'overdue':        <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M7 2L1.5 11.5h11L7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M7 6v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="10" r="0.6" fill="currentColor"/></svg>,
  'overlock':       <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><rect x="2.5" y="6.5" width="9" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 6.5V5a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="9.5" r="1" fill="currentColor"/></svg>,
  'in-progress':    <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M7 2a5 5 0 100 10A5 5 0 007 2z" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2"/><path d="M7 4v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'vacant':         <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M2 12V6l5-4 5 4v6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 12V9h4v3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M9.5 6v-.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  'waitlisted':     <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 5h4M5 7.5h4M5 10h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  'reserved':       <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><rect x="2" y="3.5" width="10" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 2v3M9 2v3M2 6.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M5 9l1.5 1.5L9 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'lien':           <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M7 2L2 4.5V7c0 3 2 5 5 5s5-2 5-5V4.5L7 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M7 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="10" r="0.5" fill="currentColor"/></svg>,
  'auction':        <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.5v1.5l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  'pending':        <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 4.5V7l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 11.5l-.5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  'owner-occupied': <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M2 12V6l5-4 5 4v6" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="7" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/></svg>,
  'unrentable':     <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="9.5" r="0.6" fill="currentColor"/></svg>,
  'maintenance':    <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M9 2.5a2.5 2.5 0 00-3 3.5L2.5 9.5a1.4 1.4 0 002 2L8 7a2.5 2.5 0 003.5-3l-1.5 1.5-1-1 1.5-1.5A2.5 2.5 0 009 2.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>,
  'paused':         <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 5v4M8.5 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  'transferring':   <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'tax-exempt':     <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L2.5 4v3.5C2.5 10 4.5 12 7 12.5c2.5-.5 4.5-2.5 4.5-5V4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 7l1.5 1.5L9 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

export const UnitBadge: React.FC<UnitBadgeProps> = ({ status, size = 'lg', contrast = 'high' }) => {
  const c = UNIT_COLORS[status]
  const [bg, color] = contrast === 'high' ? [c.high, '#ffffff'] : c.low
  return (
    <BadgePill
      label={UNIT_LABELS[status]}
      bg={bg}
      color={color}
      size={size}
      icon={<span style={{ color, display: 'flex', width: '100%', height: '100%' }}>{UNIT_ICONS[status]}</span>}
    />
  )
}

// ─── Communication Status Badge ────────────────────────────────────────────────

export type CommStatus = 'delivered' | 'bounced' | 'deferred' | 'blocked'

export interface CommBadgeProps {
  status: CommStatus
  size?: BadgeSize
  contrast?: BadgeContrast
}

const COMM_COLORS: Record<CommStatus, { high: string; low: string[] }> = {
  'delivered': { high: '#08875D', low: ['#E5F5E9', '#08875D'] },
  'bounced':   { high: '#B25E09', low: ['#FFF8EB', '#B25E09'] },
  'deferred':  { high: '#5F6C85', low: ['#CBD2E1', '#161616'] },
  'blocked':   { high: '#E02D3C', low: ['#FEE1E3', '#E02D3C'] },
}

const COMM_LABELS: Record<CommStatus, string> = {
  'delivered': 'Delivered',
  'bounced':   'Bounced',
  'deferred':  'Deferred',
  'blocked':   'Blocked',
}

const COMM_ICONS: Record<CommStatus, React.ReactNode> = {
  'delivered': <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'bounced':   <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><path d="M9 5H3.5L6 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 9h5.5L8 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  'deferred':  <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><rect x="1" y="3.5" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 1.5v2M11.5 2.5h-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  'blocked':   <svg width="100%" height="100%" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
}

export const CommBadge: React.FC<CommBadgeProps> = ({ status, size = 'lg', contrast = 'high' }) => {
  const c = COMM_COLORS[status]
  const [bg, color] = contrast === 'high' ? [c.high, '#ffffff'] : c.low
  return (
    <BadgePill
      label={COMM_LABELS[status]}
      bg={bg}
      color={color}
      size={size}
      icon={<span style={{ color, display: 'flex', width: '100%', height: '100%' }}>{COMM_ICONS[status]}</span>}
    />
  )
}

export default Badge
Badge.displayName = 'Badge'
