import React, { useState } from 'react'
import { Badge, UnitBadge } from './Badge'
import { Dropdown } from './Dropdown'
import { Modal } from './Modal'
import { Toast } from './Toast'

export interface TenantPageHeaderProps {
  name: string
  email: string
  phone: string
  balance: string
  balanceOverdue?: boolean
  tenantType?: 'personal' | 'business'
  isStudent?: boolean
  unitStatus?: 'overdue' | 'normal' | 'move-out'
  activeTab: 'overview' | 'billing' | 'documents' | 'access'
  numberOfUnits?: 'single' | 'multi'
  gateIntegrated?: boolean
  accessStatus?: 'enabled' | 'revoked' | 'mixed'
  accessCode?: string
  accessHours?: string
  hideTabs?: boolean
  tabCounts?: { overview?: number; billing?: number; documents?: number; access?: number }
  onBack?: () => void
  onTransfer?: () => void
  onMoveOut?: () => void
  onTabChange?: (tab: string) => void
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke="var(--ds-color-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PersonIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="var(--ds-color-surface-muted)" />
    <circle cx="16" cy="13" r="5" fill="var(--ds-color-text-muted)" />
    <ellipse cx="16" cy="26" rx="9" ry="5" fill="var(--ds-color-text-muted)" />
  </svg>
)

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="8" rx="1" stroke="var(--ds-color-text-muted)" strokeWidth="1.2" />
    <path d="M1 4l6 4 6-4" stroke="var(--ds-color-text-muted)" strokeWidth="1.2" />
  </svg>
)

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M4.5 1.5h5a1 1 0 011 1v9a1 1 0 01-1 1h-5a1 1 0 01-1-1v-9a1 1 0 011-1z" stroke="var(--ds-color-text-muted)" strokeWidth="1.2" />
    <circle cx="7" cy="10.5" r="0.5" fill="var(--ds-color-text-muted)" />
  </svg>
)

const QuestionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="var(--ds-color-text-muted)" strokeWidth="1.2" />
    <path d="M5.5 5.5a1.5 1.5 0 012.5 1c0 1-1.5 1.5-1.5 2.5" stroke="var(--ds-color-text-muted)" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="7" cy="10.5" r="0.5" fill="var(--ds-color-text-muted)" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill="var(--ds-color-success)" />
    <path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CloseCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill="var(--ds-color-error)" />
    <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="4" r="1.2" fill="currentColor" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="8" cy="12" r="1.2" fill="currentColor" />
  </svg>
)

const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L3 4.5v3.5c0 2.8 2.2 5 5 5.8 2.8-.8 5-3 5-5.8V4.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Divider = () => (
  <span style={{ color: 'var(--ds-color-border)', userSelect: 'none', fontSize: 16 }}>|</span>
)


// ─── Component ────────────────────────────────────────────────────────────────

const tabDefs = [
  { key: 'overview',   label: 'Overview' },
  { key: 'billing',    label: 'Billing History' },
  { key: 'documents',  label: 'Documents' },
  { key: 'access',     label: 'Access' },
]

export const TenantPageHeader: React.FC<TenantPageHeaderProps> = ({
  name,
  email,
  phone,
  balance,
  balanceOverdue = false,
  tenantType = 'personal',
  isStudent = false,
  unitStatus,
  activeTab,
  numberOfUnits = 'single',
  gateIntegrated = false,
  accessStatus = 'enabled',
  accessCode,
  hideTabs = false,
  tabCounts,
  onBack,
  onTabChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [taxExempt, setTaxExempt] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const handleExemptClick = () => {
    setDropdownOpen(false)
    setModalOpen(true)
  }

  const handleRemoveExemptClick = () => {
    setDropdownOpen(false)
    setTaxExempt(false)
    setToastMessage('Tax exemption removed.')
    setToastOpen(true)
  }

  const handleModalConfirm = () => {
    setModalOpen(false)
    setTaxExempt(true)
    setToastMessage('Tax exemption applied successfully.')
    setToastOpen(true)
  }

  const dropdownItems = taxExempt
    ? [{ label: 'Remove tax exemption', icon: <ShieldCheckIcon />, onClick: handleRemoveExemptClick }]
    : [{ label: 'Exempt from tax', icon: <ShieldCheckIcon />, onClick: handleExemptClick }]

  return (
    <>
      <div style={{ background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Row 1: back · avatar · name + badges · kebab ── */}
        <div style={{ padding: '16px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ds-color-surface-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BackIcon />
            </button>

            <PersonIcon />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-color-text-primary)', lineHeight: 1 }}>
                {name}
              </span>

              {taxExempt && <UnitBadge status="tax-exempt" size="lg" contrast="low" />}
              {unitStatus === 'overdue' && <UnitBadge status="overdue" size="lg" contrast="low" />}
              {unitStatus === 'move-out' && <Badge status="inactive" size="sm" contrast="low" label="Move Out" />}
              {isStudent && <Badge status="secondary" size="sm" contrast="low" label="Student" />}
              {tenantType === 'business' && <Badge status="secondary" size="sm" contrast="low" label="Business" />}
              {numberOfUnits === 'multi' && <Badge status="archive" size="sm" contrast="low" label="Multi-Unit" />}
            </div>
          </div>

          {/* Right: kebab menu */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: dropdownOpen ? '#F5F0FF' : 'var(--ds-color-surface-muted)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MoreVerticalIcon />
            </button>

            {dropdownOpen && (
              <Dropdown
                items={dropdownItems}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        </div>

        {/* ── Row 2: email · phone · balance · access ── */}
        <div style={{ paddingTop: 0, paddingRight: 24, paddingBottom: 14, paddingLeft: 56, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <MailIcon />
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{email}</span>
          </div>

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <PhoneIcon />
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{phone}</span>
          </div>

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>
              Total Balance{' '}
              <span style={{ color: balanceOverdue ? 'var(--ds-color-error)' : 'var(--ds-color-success)', fontWeight: 600 }}>
                {balance}
              </span>
            </span>
            <QuestionIcon />
          </div>

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {(accessStatus === 'enabled' || accessStatus === 'mixed') && <CheckCircleIcon />}
            {(accessStatus === 'revoked' || accessStatus === 'mixed') && <CloseCircleIcon />}
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>Access</span>
          </div>

          {gateIntegrated && (
            <>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>Access Code</span>
                {accessCode && (
                  <span style={{ background: 'var(--ds-color-info-light, #eaf1ff)', fontSize: 13, fontWeight: 600, borderRadius: 6, padding: '2px 10px', color: 'var(--ds-color-text-primary)', border: '1px solid var(--ds-color-border)' }}>
                    {accessCode}
                  </span>
                )}
              </div>

              <Divider />

              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-color-primary)', fontSize: 14, fontFamily: 'Inter, sans-serif', padding: 0, fontWeight: 400 }}>
                View Access Hours
              </button>
            </>
          )}
        </div>

        {/* ── Tabs ── */}
        {!hideTabs && (
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 24, borderTop: '1px solid var(--ds-color-border)' }}>
            {tabDefs.map(tab => {
              const isActive = activeTab === tab.key
              const count = tabCounts?.[tab.key as keyof typeof tabCounts]
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange?.(tab.key)}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--ds-color-primary)' : 'var(--ds-color-text-primary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--ds-color-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {tab.label}
                  {count !== undefined && (
                    <span style={{ background: 'var(--ds-color-surface-muted)', color: 'var(--ds-color-text-muted)', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal — Figma 8107:71831 */}
      <Modal
        open={modalOpen}
        title="Apply Tax Exemption?"
        message={
          <span>
            Are you sure you want to apply tax exemption? This will apply to{' '}
            <strong>ALL UNITS</strong> currently rented by this tenant, as well as any{' '}
            <strong>future rentals</strong>.
          </span>
        }
        confirmLabel="Yes, apply tax exemption"
        cancelLabel="Cancel"
        onConfirm={handleModalConfirm}
        onCancel={() => setModalOpen(false)}
      />

      {/* Toast notification */}
      <Toast
        open={toastOpen}
        type={taxExempt ? 'success' : 'warning'}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </>
  )
}

export default TenantPageHeader
TenantPageHeader.displayName = 'TenantPageHeader'
