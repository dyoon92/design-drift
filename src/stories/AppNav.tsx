import React, { useState, useEffect } from 'react'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Monument Logo ─────────────────────────────────────────────────────────────

const MonumentLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.1592 11.7899L25.3745 3.50002V24.3542H17.1592V11.7899Z" fill="#7D52F8"/>
    <path d="M2.625 15.3637V3.50002L17.1597 18.3296L11.4367 24.3542L2.625 15.3637Z" fill="#7D52F8"/>
    <path d="M2.625 19.9305H7.04861V24.3541H2.625V19.9305Z" fill="#7D52F8"/>
  </svg>
)

// ─── Nav Icons ────────────────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const UnitsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4" width="13" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6.5 8v6" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const TenantsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 13.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M11 7.5c1.38 0 2.5 1.12 2.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M13.5 4.5a1.5 1.5 0 110 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const LeadsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const CommunicationsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 2v-2H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const DelinquenciesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
  </svg>
)


const InsightsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="9" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="6.5" y="5.5" width="3" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="11" y="2" width="3" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const ReportsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1.5V8l4.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const BillingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4.5v7M6 6c0-.83.895-1.5 2-1.5s2 .67 2 1.5S9.105 7.5 8 7.5 6 8.17 6 9s.895 1.5 2 1.5 2-.67 2-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6.5 2l-.5 1.5a5 5 0 00-1.2.7L3.2 3.7 1.7 6.3l1.3 1a5 5 0 000 1.4l-1.3 1 1.5 2.6 1.6-.5a5 5 0 001.2.7L6.5 14h3l.5-1.5a5 5 0 001.2-.7l1.6.5 1.5-2.6-1.3-1a5 5 0 000-1.4l1.3-1L12 3.7l-1.6.5A5 5 0 009.2 3.5L8.5 2h-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M10.5 5L14 8l-3.5 3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CallsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 2h2.6l1.1 2.8-1.6 1a9 9 0 004.6 4.6l1-1.6 2.8 1.1v2.6a1 1 0 01-1 1C5.7 13.5 2.5 10.3 2.5 3.5a1 1 0 011-1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const ChevronLeftSmallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SubArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.6 }}>
    <path d="M3 3v5a2 2 0 002 2h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 8l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 13.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M11.5 7.5c1.38 0 2.5 1.12 2.5 2.5v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M13.5 5a1.5 1.5 0 110 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 14V9h6v5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="5" y="4" width="2" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="9" y="4" width="2" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const DoorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3.5" y="2" width="9" height="13" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="10.5" cy="8.5" r="0.75" fill="currentColor"/>
    <path d="M3.5 15h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L3 4.5v4C3 11.5 5.5 14 8 14.5c2.5-.5 5-3 5-6V4.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 2h5.5L12 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const BoltIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 2L4 9h4.5L6.5 14 13 7H8.5L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="5.5" cy="5.5" r="1" fill="currentColor"/>
  </svg>
)

const TemplateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 6h12" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 6v8" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const FormIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 6h6M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const StorefrontIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6.5L3.5 2h9L14 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M2 6.5c0 1.1.9 2 2 2s2-.9 2-2 .9 2 2 2 2-.9 2-2 .9 2 2 2 2-.9 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M3 8.5V14h10V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <rect x="6" y="10" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const SlidersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="5" cy="4" r="1.5" fill="var(--ds-color-surface)" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="10" cy="8" r="1.5" fill="var(--ds-color-surface)" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="6" cy="12" r="1.5" fill="var(--ds-color-surface)" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const AddUserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 13.5c0-2.485 2.239-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M13 7v4M11 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const TasksIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavId = 'dashboard' | 'units' | 'tenants' | 'leads' | 'communications' | 'calls' | 'delinquencies' | 'revenue' | 'insights' | 'reports' | 'billing' | 'settings'

export interface AppNavProps {
  activeNav?: NavId
  onNav?: (id: NavId) => void
  facilityName?: string
  userName?: string
  userEmail?: string
  tasksCount?: number
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',       label: 'Dashboard',       icon: <DashboardIcon /> },
  { id: 'units',           label: 'Units',            icon: <UnitsIcon /> },
  { id: 'tenants',         label: 'Tenants',          icon: <TenantsIcon /> },
  { id: 'leads',           label: 'Leads',            icon: <LeadsIcon /> },
  { id: 'communications',  label: 'Communications',   icon: <CommunicationsIcon /> },
  { id: 'calls',           label: 'Calls',            icon: <CallsIcon /> },
  { id: 'delinquencies',   label: 'Delinquencies',    icon: <DelinquenciesIcon /> },
  { id: 'insights',        label: 'Insights',         icon: <InsightsIcon /> },
  { id: 'reports',         label: 'Reports',          icon: <ReportsIcon /> },
  { id: 'billing',         label: 'Billing',          icon: <BillingIcon /> },
]

// Settings sub-nav items
type SettingsChild = { label: string }
type SettingsItem = { label: string; icon?: React.ReactNode; indent?: number; expandable?: boolean; children?: SettingsChild[] }

const SETTINGS_ITEMS: SettingsItem[] = [
  { label: 'Portfolio Configurations', icon: <SlidersIcon /> },
  { label: 'Users & Permissions',      icon: <UsersIcon /> },
  { label: 'Facility Management',      icon: <BuildingIcon /> },
  { label: 'Call Center Setup',        icon: <CallsIcon /> },
  { label: 'Phone Numbers',            icon: <SubArrowIcon />, indent: 1, expandable: true,
    children: [
      { label: 'Ring Groups' },
      { label: 'Routing Rules' },
    ],
  },
  { label: 'Access Management',        icon: <DoorIcon /> },
  { label: 'Coverage Management',      icon: <ShieldIcon /> },
  { label: 'Document Management',      icon: <DocIcon /> },
  { label: 'Unit Types Management',    icon: <UnitsIcon /> },
  { label: 'Billing & Taxes',          icon: <BillingIcon /> },
  { label: 'Automation Rules',         icon: <BoltIcon /> },
  { label: 'Rate Plans',               icon: <TagIcon /> },
  { label: 'Template Library',         icon: <TemplateIcon /> },
  { label: 'Rental Form Builder',      icon: <FormIcon /> },
  { label: 'My Storefront',            icon: <StorefrontIcon /> },
]

// ─── Navbar (top bar) ─────────────────────────────────────────────────────────

export const Navbar: React.FC<Pick<AppNavProps, 'facilityName' | 'userName' | 'tasksCount'> & { darkMode?: boolean; onToggleDarkMode?: () => void }> = ({
  facilityName = 'Sunrise Self Storage',
  userName = 'DY',
  tasksCount = 0,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const isMobile = useWindowWidth() < 768
  return (
  <div style={{
    height: 64,
    background: 'var(--ds-color-surface)',
    borderBottom: '1px solid var(--ds-color-border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 12,
    flexShrink: 0,
    fontFamily: 'Inter, sans-serif',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  }}>
    {/* Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <MonumentLogo />
    </div>

    {/* Facility dropdown */}
    <button style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--ds-color-surface-subtle)',
      border: '1px solid var(--ds-color-border)',
      borderRadius: 'var(--ds-border-radius-md)',
      padding: '6px 12px',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--ds-color-text-primary)',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
      flexShrink: 0,
    }}>
      {facilityName}
      <ChevronDownIcon />
    </button>

    {/* Search */}
    {isMobile ? (
      <button style={{ width: 32, height: 32, borderRadius: 'var(--ds-border-radius-md)', background: 'var(--ds-color-surface-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-color-text-primary)', flexShrink: 0 }}>
        <SearchIcon />
      </button>
    ) : (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--ds-color-surface-muted)',
        borderRadius: 40,
        padding: '8px 12px',
        maxWidth: 560,
      }}>
        <span style={{ color: 'var(--ds-color-text-muted)', display: 'flex' }}><SearchIcon /></span>
        <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
          Search units, tenants, leads, invoices, or phone numbers...
        </span>
      </div>
    )}

    <div style={{ flex: 1 }} />

    {/* Quick actions */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Dark mode toggle */}
      <button
        onClick={onToggleDarkMode}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{ width: 32, height: 32, borderRadius: 'var(--ds-border-radius-md)', background: 'var(--ds-color-surface-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-color-text-primary)' }}
      >
        {darkMode ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8.53A6 6 0 117.47 2 4.5 4.5 0 0014 8.53z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <button style={{ width: 32, height: 32, borderRadius: 'var(--ds-border-radius-md)', background: 'var(--ds-color-surface-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-color-text-primary)' }}>
        <AddUserIcon />
      </button>

      {/* Tasks with badge */}
      <div style={{ position: 'relative' }}>
        <button style={{ width: 32, height: 32, borderRadius: 'var(--ds-border-radius-md)', background: 'var(--ds-color-surface-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-color-text-primary)' }}>
          <TasksIcon />
        </button>
        {tasksCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--ds-color-error)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 'var(--ds-border-radius-full)',
            padding: '1px 5px',
            lineHeight: 1.4,
          }}>{tasksCount}</span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'var(--ds-color-border)', margin: '0 4px' }} />

      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--ds-color-primary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        position: 'relative',
      }}>
        {userName}
        <span style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--ds-color-success)',
          border: '1.5px solid var(--ds-color-surface)',
        }} />
      </div>
    </div>
  </div>
  )
}

// ─── Shared nav item button ────────────────────────────────────────────────────

const NavButton = ({
  active = false,
  onClick,
  title,
  style,
  children,
}: {
  active?: boolean
  onClick?: () => void
  title?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: 'none',
        background: active
          ? 'var(--ds-color-primary-light)'
          : hovered
          ? 'var(--ds-color-color-1)'
          : 'transparent',
        color: active
          ? 'var(--ds-color-primary)'
          : 'color-mix(in srgb, var(--ds-color-text-primary) 80%, transparent)',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
        boxSizing: 'border-box',
        transition: 'background 0.1s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────

const SidebarFooter = ({ userName, userEmail, collapsed }: { userName: string; userEmail: string; collapsed: boolean }) => (
  <div style={{
    padding: '8px 16px',
    borderTop: '1px solid var(--ds-color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    flexShrink: 0,
  }}>
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--ds-color-primary)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600,
      }}>
        {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <span style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--ds-color-success)',
        border: '1.5px solid var(--ds-color-surface)',
      }} />
    </div>
    {!collapsed && (
      <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--ds-color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>{userEmail}</div>
      </div>
    )}
  </div>
)

// ─── Settings sub-nav ──────────────────────────────────────────────────────────

const SettingsSubNav = ({ onBack, collapsed }: { onBack: () => void; collapsed: boolean }) => {
  const [activeItem, setActiveItem] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (label: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(label) ? next.delete(label) : next.add(label)
    return next
  })

  return (
    <>
      {/* Back button */}
      <div style={{ padding: '24px 16px 12px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 8,
            border: '1px solid var(--ds-color-border)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            color: 'var(--ds-color-text-primary)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <ChevronLeftSmallIcon />
          {!collapsed && 'Back'}
        </button>
      </div>

      {/* "Settings" header */}
      {!collapsed && (
        <div style={{ padding: '12px 16px 14px', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>Settings</span>
        </div>
      )}

      {/* Sub-nav items */}
      <nav style={{ flex: 1, padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', overflowX: 'hidden' }}>
        {SETTINGS_ITEMS.map((item) => {
          const active = activeItem === item.label
          const isExpanded = expanded.has(item.label)
          const paddingLeft = item.indent === 1 ? 18 : 12

          return (
            <React.Fragment key={item.label}>
              <NavButton
                active={active}
                onClick={() => { if (item.expandable) toggle(item.label); else setActiveItem(item.label) }}
                title={collapsed ? item.label : undefined}
                style={{ padding: `10px 12px 10px ${paddingLeft}px`, gap: item.indent === 1 ? 6 : 12 }}
              >
                {item.icon && <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>}
                {!item.icon && !collapsed && <span style={{ width: 16, flexShrink: 0 }} />}
                {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                {!collapsed && item.expandable && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', color: 'var(--ds-color-text-muted)' }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </NavButton>

              {/* Children — only shown when expanded */}
              {item.expandable && isExpanded && item.children?.map(child => (
                <NavButton
                  key={child.label}
                  active={activeItem === child.label}
                  onClick={() => setActiveItem(child.label)}
                  title={collapsed ? child.label : undefined}
                  style={{ padding: '10px 12px 10px 44px' }}
                >
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.label}</span>}
                </NavButton>
              ))}
            </React.Fragment>
          )
        })}
      </nav>
    </>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<AppNavProps> = ({
  activeNav = 'tenants',
  onNav,
  userName = 'Dave Yoon',
  userEmail = 'dave@monumentai.com',
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const width = collapsed ? 56 : 240

  return (
    <aside style={{
      width,
      height: '100%',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>
      {/* Edge collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          right: -12, top: 22,
          width: 24, height: 24,
          borderRadius: '50%',
          background: 'var(--ds-color-surface)',
          border: '1px solid var(--ds-color-border)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ds-color-text-muted)',
          zIndex: 10, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Inner container — handles overflow clipping during collapse */}
      <div style={{
        width: '100%', height: '100%',
        overflow: 'hidden',
        background: 'var(--ds-color-surface)',
        borderRight: '1px solid var(--ds-color-border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {showSettings ? (
          <SettingsSubNav onBack={() => setShowSettings(false)} collapsed={collapsed} />
        ) : (
          <>
            {/* Main nav */}
            <nav style={{ flex: 1, padding: '16px 8px 8px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', overflowX: 'hidden' }}>
              {NAV_ITEMS.map(item => {
                const active = activeNav === item.id
                return (
                  <NavButton
                    key={item.id}
                    active={active}
                    onClick={() => onNav?.(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                    {!collapsed && item.label}
                  </NavButton>
                )
              })}
            </nav>

            {/* Bottom: Settings + Logout */}
            <div style={{ padding: '8px 8px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <NavButton
                active={activeNav === 'settings'}
                onClick={() => setShowSettings(true)}
                title={collapsed ? 'Settings' : undefined}
              >
                <span style={{ flexShrink: 0, display: 'flex' }}><SettingsIcon /></span>
                {!collapsed && 'Settings'}
              </NavButton>
              <NavButton title={collapsed ? 'Logout' : undefined}>
                <span style={{ flexShrink: 0, display: 'flex' }}><LogoutIcon /></span>
                {!collapsed && 'Logout'}
              </NavButton>
            </div>
          </>
        )}

        <SidebarFooter userName={userName} userEmail={userEmail} collapsed={collapsed} />
      </div>
    </aside>
  )
}

export default Sidebar
Navbar.displayName = 'Navbar'
Sidebar.displayName = 'Sidebar'
NavButton.displayName = 'NavButton'
SidebarFooter.displayName = 'SidebarFooter'
