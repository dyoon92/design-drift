import React from 'react'

// TenantStatsWidget — illustrative component, no Figma node
// Built using established design tokens + Badge primitive

export interface TenantStat {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface TenantStatsWidgetProps {
  stats?: TenantStat[]
}

const DEFAULT_STATS: TenantStat[] = [
  { label: 'Total Paid (YTD)', value: '$17,400', sub: '12 payments', trend: 'up' },
  { label: 'Outstanding Balance', value: '$1,450', sub: 'Due Mar 1', trend: 'down' },
  { label: 'Late Payments', value: '2', sub: 'Last 12 months', trend: 'neutral' },
  { label: 'Lease Remaining', value: '4 mo', sub: 'Ends Jul 31, 2025', trend: 'neutral' },
]

const TrendUp = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 10l4-4 3 3 3-5" stroke="#08875D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TrendDown = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 4l4 4 3-3 3 5" stroke="#E02D3C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const TenantStatsWidget: React.FC<TenantStatsWidgetProps> = ({
  stats = DEFAULT_STATS,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
        gap: 12,
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            background: 'var(--ds-color-surface)',
            border: '1px solid var(--ds-color-border)',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-color-text-muted)' }}>
            {stat.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ds-color-text-primary)', lineHeight: 1 }}>
              {stat.value}
            </span>
            {stat.trend === 'up' && <TrendUp />}
            {stat.trend === 'down' && <TrendDown />}
          </div>
          {stat.sub && (
            <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>{stat.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default TenantStatsWidget
