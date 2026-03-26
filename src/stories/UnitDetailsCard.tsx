import React, { useState } from 'react'
import { Badge, UnitBadge } from './Badge'

// ─── Icons ────────────────────────────────────────────────────────────────────

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="var(--ds-color-primary)" strokeWidth="1.2" />
    <path d="M7 6v4M7 4.5v.5" stroke="var(--ds-color-primary)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const UpArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 10V2M2 6l4-4 4 4" stroke="var(--ds-color-success)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitStatus = 'overdue' | 'good-standing' | 'move-out' | 'vacant'

export interface RentCard {
  label: string
  amount: string
  date: string
  isCurrent: boolean
  increase?: string | null
  streetRate?: string | null
}

export interface UnitDetailsCardProps {
  unitNumber?: string
  status?: UnitStatus
  size?: string
  type?: string
  unitGroup?: string
  tier?: string
  facility?: string
  floor?: string
  moveInDate?: string
  protectionPlan?: string
  recServices?: string
  recServicesExtra?: number
  excludedFromRentIncreases?: boolean
  rentCards?: RentCard[]
  onMoveOut?: () => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RENT_CARDS: RentCard[] = [
  { label: 'Previous', amount: '$110.00', date: 'Dec 29, 2023', isCurrent: false, increase: null, streetRate: null },
  { label: 'Current', amount: '$115.00', date: 'Apr 29, 2024', isCurrent: true, increase: '+$5.00', streetRate: '$130' },
  { label: 'Next', amount: '$120.00', date: 'Jun 29, 2024', isCurrent: false, increase: '+$5.00', streetRate: null },
]

const UnitStatusBadge = ({ status }: { status: UnitStatus }) => {
  if (status === 'overdue')       return <UnitBadge status="overdue" size="sm" contrast="low" />
  if (status === 'good-standing') return <UnitBadge status="occupied" size="sm" contrast="low" />
  if (status === 'vacant')        return <UnitBadge status="vacant" size="sm" contrast="low" />
  return <Badge status="inactive" size="sm" contrast="low" label="Move Out" />
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UnitDetailsCard: React.FC<UnitDetailsCardProps> = ({
  unitNumber = '147',
  status = 'overdue',
  size = '10 × 10 × 8 (10 ft)',
  type = 'Climate-Controlled',
  unitGroup = '10 × 10',
  tier = 'Premium',
  facility = 'West End',
  floor = '1st floor',
  moveInDate = 'Apr 29, 2023',
  protectionPlan = '$12 | $2,000 Coverage',
  recServices = 'Early Ext. Access Hours',
  recServicesExtra = 3,
  excludedFromRentIncreases = true,
  rentCards = DEFAULT_RENT_CARDS,
  onMoveOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const detailRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Size', value: size },
    { label: 'Type', value: type },
    { label: 'Unit Group', value: <span style={{ color: 'var(--ds-color-primary)', cursor: 'pointer' }}>{unitGroup}</span> },
    { label: 'Tier', value: tier },
    { label: 'Facility', value: <span style={{ color: 'var(--ds-color-primary)', cursor: 'pointer' }}>{facility}</span> },
    { label: 'Floor', value: floor },
    { label: 'Move-In Date', value: moveInDate },
    {
      label: 'Protection',
      value: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge status="active" size="sm" contrast="low" label="Enrolled" />
          <span style={{ fontSize: 13 }}>{protectionPlan}</span>
        </span>
      ),
    },
    {
      label: 'Rec. Services',
      value: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{recServices}</span>
          {recServicesExtra > 0 && (
            <Badge status="in-progress" size="sm" contrast="low" label={`+${recServicesExtra}`} />
          )}
        </span>
      ),
    },
  ]

  return (
    <div style={{ background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--ds-color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>{unitNumber}</span>
          <UnitStatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onMoveOut}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, background: 'var(--ds-color-surface)', color: 'var(--ds-color-text-primary)', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-border-radius-md)', padding: '6px 14px', cursor: 'pointer' }}
          >
            Move Out
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{ width: 32, height: 32, borderRadius: 'var(--ds-border-radius-md)', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--ds-color-text-primary)' }}
            >
              ⋮
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 36, right: 0, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-border-radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160, zIndex: 100, overflow: 'hidden' }}>
                {['Move Out', 'Transfer', 'New Unit', 'Edit Unit', 'Apply Promotion'].map(item => (
                  <button
                    key={item}
                    onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--ds-color-text-primary)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-color-surface-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {detailRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-color-text-primary)', minWidth: 110, flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 13, color: 'var(--ds-color-text-primary)' }}>{row.value}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--ds-color-border)', margin: '8px 0' }} />

        {/* Rent section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Rent</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-color-primary)', fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif', padding: 0 }}>Edit</button>
        </div>

        {excludedFromRentIncreases && (
          <div style={{ background: 'var(--ds-color-primary-light)', borderRadius: 'var(--ds-border-radius-md)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <InfoIcon />
            <span style={{ fontSize: 12, color: 'var(--ds-color-primary)', fontWeight: 500 }}>Excluded from rent increases</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {rentCards.map(card => (
            <div
              key={card.label}
              style={{
                flex: 1,
                border: card.isCurrent ? '2px solid var(--ds-color-primary)' : '1px solid var(--ds-color-border)',
                borderRadius: 'var(--ds-border-radius-md)',
                padding: '12px 10px',
                position: 'relative',
                background: card.isCurrent ? 'var(--ds-color-primary-light)' : 'white',
              }}
            >
              {card.isCurrent && (
                <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--ds-color-primary)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 'var(--ds-border-radius-sm)', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  Current
                </span>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
              {card.increase && !card.isCurrent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                  <UpArrowIcon />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-color-success)' }}>{card.increase}</span>
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: card.isCurrent ? 'var(--ds-color-primary)' : 'var(--ds-color-text-primary)', marginBottom: 2 }}>
                {card.amount}<span style={{ fontSize: 11, fontWeight: 400 }}>/Mo</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)' }}>{card.date}</div>
              {card.streetRate && (
                <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', marginTop: 2 }}>
                  Street rate <span style={{ fontWeight: 600, color: 'var(--ds-color-text-primary)' }}>{card.streetRate}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UnitDetailsCard
