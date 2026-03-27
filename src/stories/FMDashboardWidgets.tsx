import React, { useState, useRef, useEffect } from 'react'
import { cardStyle } from './DashboardWidgets'
import { UnitBadge } from './Badge'

// ─── Popover animation injection ──────────────────────────────────────────────

let _fmAnimInjected = false
function useFMAnimStyles() {
  useEffect(() => {
    if (_fmAnimInjected) return
    _fmAnimInjected = true
    const el = document.createElement('style')
    el.textContent = `
      @keyframes ds-popoverIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(el)
  }, [])
}

// ─── Metric sparkline data (30 days ending Mar 25 2026) ───────────────────────

const SPARK_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 2, 25)
  d.setDate(d.getDate() - (29 - i))
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`
})

interface MetricSeries { values: number[]; fmt: (v: number) => string }

const METRIC_SERIES: Record<string, MetricSeries> = {
  'Occupancy Rate': {
    values: [86,87,85,88,87,89,88,86,87,90,88,87,86,89,88,87,88,90,89,88,87,89,88,87,88,89,87,88,90,89],
    fmt: v => `${v}%`,
  },
  'Revenue': {
    values: [13.2,13.5,13.1,13.8,13.6,14.0,13.8,13.5,13.7,14.2,13.9,13.7,13.5,14.0,13.8,13.7,13.9,14.2,14.0,13.9,13.7,14.0,13.9,13.7,13.9,14.0,13.8,13.9,14.1,14.2],
    fmt: v => `$${v}k`,
  },
  'Net Move-Ins': {
    values: [22,24,20,26,25,28,27,23,25,31,28,26,24,29,27,25,27,31,29,28,25,28,27,25,27,29,25,27,29,30],
    fmt: v => `+${v}`,
  },
  'Leads': {
    values: [510,520,498,532,525,545,538,515,528,562,540,530,515,548,535,525,535,558,548,540,525,542,535,525,538,545,530,538,544,546],
    fmt: v => `${v}`,
  },
  'Lead Conversion': {
    values: [11.2,11.5,10.8,11.8,11.6,12.1,11.9,11.3,11.6,12.4,12.0,11.7,11.3,12.0,11.7,11.5,11.7,12.2,12.0,11.8,11.5,11.8,11.7,11.5,11.7,12.0,11.6,11.8,12.0,12.0],
    fmt: v => `${v}%`,
  },
}

// Smooth cubic-bezier line path
function sparkLine(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1)
    d += ` C ${cpx} ${pts[i-1].y.toFixed(1)} ${cpx} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  return d
}

// ─── Metric Spark Popover ─────────────────────────────────────────────────────

export const MetricSparkPopover = ({ label }: { label: string }) => {
  const series = METRIC_SERIES[label]
  if (!series) return null
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  const W = 240, CH = 68
  const pl = 4, pr = 4, pt = 8, pb = 4
  const cw = W - pl - pr
  const ch = CH - pt - pb
  const vals = series.values
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const range = maxV - minV || 1

  const pts = vals.map((v, i) => ({
    x: pl + (i / (vals.length - 1)) * cw,
    y: pt + (1 - (v - minV) / range) * ch,
  }))
  const linePath = sparkLine(pts)
  const areaPath = linePath + ` L ${pts[pts.length-1].x} ${CH} L ${pts[0].x} ${CH} Z`

  const gid = `spk-${label.replace(/\W/g, '')}`
  const hPt = hovIdx !== null ? pts[hovIdx] : null
  const tooltipY = hPt ? Math.max(hPt.y - 26, 2) : 0

  return (
    <div style={{
      background: 'var(--ds-color-surface)',
      border: '1px solid var(--ds-color-border)',
      borderRadius: 12,
      padding: '12px 14px 10px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'ds-popoverIn 0.15s ease-out',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Last 30 days
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-color-text-primary)', minWidth: 40, textAlign: 'right' }}>
          {hovIdx !== null ? series.fmt(vals[hovIdx]) : ''}
        </span>
      </div>

      {/* SVG chart */}
      <svg
        width={W} height={CH}
        style={{ display: 'block', cursor: 'crosshair', overflow: 'visible' }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const step = cw / (vals.length - 1)
          setHovIdx(Math.max(0, Math.min(vals.length - 1, Math.round((x - pl) / step))))
        }}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7d52f7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7d52f7" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke="#7d52f7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hPt && (
          <>
            <line x1={hPt.x} y1={pt} x2={hPt.x} y2={CH} stroke="var(--ds-color-border)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx={hPt.x} cy={hPt.y} r={6} fill="#7d52f7" fillOpacity={0.15} />
            <circle cx={hPt.x} cy={hPt.y} r={3.5} fill="#7d52f7" />
            {/* Tooltip bubble */}
            <rect x={hPt.x - 22} y={tooltipY} width={44} height={18} rx={4} fill="var(--ds-color-text-primary)" />
            <text x={hPt.x} y={tooltipY + 12.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ds-color-surface)" fontFamily="Inter, sans-serif">
              {series.fmt(vals[hovIdx!])}
            </text>
          </>
        )}
      </svg>

      {/* Date axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[0, 14, 29].map(i => (
          <span key={i} style={{ fontSize: 10, color: 'var(--ds-color-text-muted)' }}>{SPARK_DAYS[i]}</span>
        ))}
      </div>
      {hovIdx !== null && (
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ds-color-text-muted)', marginTop: 2 }}>
          {SPARK_DAYS[hovIdx]}
        </div>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ArrowUpRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M6 14L14 6M14 6H8M14 6v6" stroke="var(--ds-color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DollarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 5.5v9M7.5 7.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2-.9 2-2.5 2-2.5.9-2.5 2 .9 2 2.5 2 2.5-.9 2.5-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="10" cy="13.5" r="1.25" fill="currentColor"/>
  </svg>
)

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M10 3L18 17H2L10 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M10 9v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="10" cy="14.5" r="0.75" fill="currentColor"/>
  </svg>
)

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M10 2l2.4 5 5.6.8-4 4 .9 5.6L10 14.8l-4.9 2.6.9-5.6-4-4 5.6-.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const CommentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <path d="M17 11a2 2 0 01-2 2H7l-4 3V4a2 2 0 012-2h10a2 2 0 012 2v7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="#9BA3B8" strokeWidth="1.3"/>
    <path d="M5 8l2.5 2.5L11 5.5" stroke="#9BA3B8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ─── Shared primitives ────────────────────────────────────────────────────────

const LinkBtn = ({ label }: { label: string }) => (
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0, letterSpacing: 0.24, whiteSpace: 'nowrap', flexShrink: 0 }}>
    {label}
  </button>
)

const OverdueBadge = () => <UnitBadge status="overdue" size="sm" contrast="low" />

const FMCardHeader = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>{title}</span>
    {right}
  </div>
)

// Hover-aware row wrapper — extends to card edges on hover
const HoverRow = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        margin: '0 -20px',
        padding: '0 20px',
        background: hovered ? 'var(--ds-color-color-4)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.1s',
        borderRadius: 4,
      }}
    >
      {children}
    </div>
  )
}

// ─── KPI Row ──────────────────────────────────────────────────────────────────

const TrendUp = ({ color = '#08875D' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 10l3-3 2 2 5-5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 4h3v3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const KPICard = ({ label, value, trend, trendUp = true }: { label: string; value: string; trend: string; trendUp?: boolean }) => {
  useFMAnimStyles()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 160) }

  return (
    <div
      style={{ ...cardStyle, flex: 1, minWidth: 0, gap: 8, padding: '16px 20px', position: 'relative', cursor: 'default' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, color: 'var(--ds-color-text-primary)', lineHeight: '28px', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendUp color={trendUp ? '#08875D' : '#E12C3C'} />
          <span style={{ fontSize: 12, fontWeight: 600, color: trendUp ? '#08875D' : '#E12C3C', fontFamily: 'Inter, sans-serif' }}>{trend}</span>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', fontFamily: 'Inter, sans-serif' }}>From last period</span>
        </div>
      </div>
      {open && (
        <div
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, minWidth: 268 }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <MetricSparkPopover label={label} />
        </div>
      )}
    </div>
  )
}

export const FMKPIRow = () => (
  <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
    <KPICard label="Occupancy Rate" value="89%" trend="1.8%" trendUp={false} />
    <KPICard label="Revenue" value="$14.2k" trend="1.8%" trendUp={true} />
    <KPICard label="Net Move-Ins" value="+30" trend="23.7%" trendUp={true} />
    <KPICard label="Leads" value="546" trend="1.8%" trendUp={true} />
    <KPICard label="Lead Conversion" value="12%" trend="0.5%" trendUp={true} />
  </div>
)

// ─── Follow Up With Lead Detail ────────────────────────────────────────────────

const FOLLOW_UP_LEADS = [
  { name: 'John doe', overdue: '2 Days Overdue', facility: 'Facility Name' },
  { name: 'Sally smith', overdue: '2 Days Overdue', facility: 'Facility Name' },
  { name: 'Joao santos', overdue: '1 Day Overdue', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
  { name: 'Lead Name', overdue: '1 Day Old', facility: 'Facility Name' },
]

const FollowUpWithLeadDetail = ({ onBack }: { onBack: () => void }) => {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  return (
    <div style={{ ...cardStyle }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              width: 28, height: 28,
              background: 'var(--ds-color-surface-muted)',
              border: 'none',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'var(--ds-color-text-primary)',
            }}
          >
            <ArrowLeftIcon />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Follow up with lead
          </span>
        </div>
        <LinkBtn label="Manage" />
      </div>

      {/* Task list */}
      <div style={{ border: '1px solid #e1e5ef', borderRadius: 8, overflow: 'hidden' }}>
        {FOLLOW_UP_LEADS.map((lead, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredRow(i)}
            onMouseLeave={() => setHoveredRow(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              minHeight: 62,
              boxSizing: 'border-box',
              background: hoveredRow === i ? 'var(--ds-color-color-4)' : 'transparent',
              borderTop: i > 0 ? '1px solid #e1e5ef' : 'none',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {/* Check circle button */}
            <button
              onClick={() => {
                const next = new Set(checked)
                next.has(i) ? next.delete(i) : next.add(i)
                setChecked(next)
              }}
              style={{
                width: 28, height: 28,
                background: 'var(--ds-color-surface-muted)',
                border: 'none',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon />
            </button>

            {/* Lead info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 14, fontWeight: 500, color: 'var(--ds-color-primary)',
                  fontFamily: 'Inter, sans-serif', textAlign: 'left',
                }}>
                  {lead.name}
                </button>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#e02c3b', fontFamily: 'Inter, sans-serif' }}>
                  {lead.overdue}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
                {lead.facility}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Priority Tasks ───────────────────────────────────────────────────────────

const PRIORITY_TASKS = [
  { name: 'Collection Calls', count: 5 },
  { name: 'Follow up with lead', count: 12 },
  { name: 'Overlock Units', count: 4 },
  { name: 'Move-In', count: 3 },
  { name: 'Move-Out', count: 5 },
  { name: 'Clean out unit', count: 5 },
  { name: 'Reverse Overlocks', count: 3 },
  { name: 'Other', count: 3 },
]

const dividerStyle: React.CSSProperties = { borderTop: '1px solid var(--ds-color-border)', margin: '0 -20px' }

export const PriorityTasksPanel = () => {
  const [expanded, setExpanded] = useState(false)

  if (expanded) {
    return <FollowUpWithLeadDetail onBack={() => setExpanded(false)} />
  }

  return (
    <div style={{ ...cardStyle }}>
      <FMCardHeader title="Priority Tasks" right={<LinkBtn label="Manage" />} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PRIORITY_TASKS.map((task, i) => (
          <div key={task.name}>
            {i > 0 && <div style={dividerStyle} />}
            <HoverRow onClick={task.name === 'Follow up with lead' ? () => setExpanded(true) : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {task.name} ({task.count})
                  </span>
                  <OverdueBadge />
                </div>
                <ChevronRightIcon />
              </div>
            </HoverRow>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recent Communications ────────────────────────────────────────────────────

const RECENT_COMMS = [
  { label: 'New messages from Leads', count: 12 },
  { label: 'New messages from Tenants', count: 4 },
  { label: 'New messages from Past Tenants', count: 1 },
]

export const RecentCommunicationsPanel = () => (
  <div style={{ ...cardStyle }}>
    <FMCardHeader title="Recent Communications" />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {RECENT_COMMS.map((item, i) => (
        <div key={item.label}>
          {i > 0 && <div style={dividerStyle} />}
          <HoverRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
                  {item.label} ({item.count})
                </span>
                <OverdueBadge />
              </div>
              <ArrowUpRightIcon />
            </div>
          </HoverRow>
        </div>
      ))}
    </div>
  </div>
)

// ─── Goal Tracker ─────────────────────────────────────────────────────────────

const GOALS = [
  { label: 'Rent Roll', progress: 30, current: '$10,000', target: '$30,000', unit: '' },
  { label: 'Coverage Capture', progress: 50, current: '100', target: '200', unit: ' Plans' },
  { label: 'Autopay Enrollment', progress: 50, current: '100', target: '200', unit: ' Units' },
  { label: 'Leads Captured', progress: 90, current: '45', target: '50', unit: ' Leads' },
]

const GoalRow = ({ label, progress, current, target, unit }: { label: string; progress: number; current: string; target: string; unit: string }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>{current}/{target}{unit}</span>
    </div>
    <div style={{ height: 24, background: '#f5f0ff', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${progress}%`, background: '#5d1dd6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{progress}% complete</span>
      </div>
    </div>
  </div>
)

export const GoalTrackerPanel = () => (
  <div style={{ ...cardStyle }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif' }}>Monthly Goal Tracker</span>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0 }}>Edit Goals</button>
    </div>
    {GOALS.map(g => <GoalRow key={g.label} {...g} />)}
  </div>
)

// ─── Delinquencies ────────────────────────────────────────────────────────────

const DELINQUENCIES = [
  { icon: <DollarIcon />, value: '4 Auctions', trend: '+3% from last month', trendUp: true },
  { icon: <LockIcon />, value: '8 Liens', trend: '+1% from last month', trendUp: true },
  { icon: <LockIcon />, value: '12 Overlocks', trend: '+10% from last month', trendUp: true },
  { icon: <WarningIcon />, value: '16 Overdue payments', trend: '+11% from last month', trendUp: true },
]

export const DelinquenciesPanel = () => (
  <div style={{ ...cardStyle }}>
    <FMCardHeader title="Delinquencies" right={<LinkBtn label="Manage" />} />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {DELINQUENCIES.map((item, i) => (
        <div key={item.value}>
          {i > 0 && <div style={dividerStyle} />}
          <HoverRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: 'var(--ds-color-text-primary)', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif', lineHeight: '20px' }}>{item.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--ds-color-text-muted)', fontFamily: 'Inter, sans-serif' }}>{item.trend}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 400, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0 }}>See more</button>
                <ArrowUpRightIcon />
              </div>
            </div>
          </HoverRow>
        </div>
      ))}
    </div>
  </div>
)

// ─── Google Reviews ───────────────────────────────────────────────────────────

const REVIEWS = [
  { icon: <StarIcon />, value: '4.7 average rating', trend: '+0.1 from last month' },
  { icon: <CommentIcon />, value: '456 reviews', trend: '+10 from last month' },
]

export const GoogleReviewsPanel = () => (
  <div style={{ ...cardStyle }}>
    <FMCardHeader title="Google Reviews" />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {REVIEWS.map((item, i) => (
        <div key={item.value}>
          {i > 0 && <div style={dividerStyle} />}
          <HoverRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: 'var(--ds-color-text-primary)', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif', lineHeight: '20px' }}>{item.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--ds-color-text-muted)', fontFamily: 'Inter, sans-serif' }}>{item.trend}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 400, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0 }}>See Google Business</button>
                <ArrowUpRightIcon />
              </div>
            </div>
          </HoverRow>
        </div>
      ))}
    </div>
  </div>
)

// ─── Promotions ───────────────────────────────────────────────────────────────

const PROMOTIONS = [
  { title: 'New Year Special: $10 off rent for 3 months', meta: 'Ends on 3/17 • For all units', status: 'Active' },
  { title: 'Student Storage Special: 10% off rent for 3 months', meta: 'Ends on 4/22 • For specific units', status: 'Upcoming' },
  { title: 'Summer: $20 off rent for 3 months', meta: 'Ends on 5/5 • For 10x10x10 units', status: 'Active' },
]

export const PromotionsPanel = () => (
  <div style={{ ...cardStyle }}>
    <FMCardHeader title="Current Promotions" />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {PROMOTIONS.map((promo, i) => (
        <div key={promo.title}>
          {i > 0 && <div style={dividerStyle} />}
          <HoverRow>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text-primary)', fontFamily: 'Inter, sans-serif', marginBottom: 4, lineHeight: '20px' }}>{promo.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)', fontFamily: 'Inter, sans-serif' }}>{promo.meta}</span>
                  <span style={{ background: 'var(--ds-color-surface-muted)', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 500, color: 'var(--ds-color-text-muted)', fontFamily: 'Inter, sans-serif' }}>{promo.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 400, color: 'var(--ds-color-primary)', fontFamily: 'Inter, sans-serif', padding: 0, whiteSpace: 'nowrap' }}>See more</button>
                <ArrowUpRightIcon />
              </div>
            </div>
          </HoverRow>
        </div>
      ))}
    </div>
  </div>
)
