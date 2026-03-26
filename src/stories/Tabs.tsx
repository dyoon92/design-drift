import React from 'react'

// Tabs component — Figma node 8107-365538
// Monument Design System / Type=Horizontal, Size=Large

export interface Tab {
  key: string
  label: string
  count?: number
}

export interface TabsProps {
  tabs: Tab[]
  activeKey?: string
  onTabChange?: (key: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeKey, onTabChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        borderBottom: '1px solid var(--ds-color-border)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange?.(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 12,
              height: 50,
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '3px solid #7D52F8' : '3px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--ds-color-text-primary)' : 'var(--ds-color-text-muted)',
              letterSpacing: isActive ? 0.225 : 0.3,
              lineHeight: '26px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--ds-color-surface-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ds-color-text-primary)',
                  letterSpacing: 0.24,
                  flexShrink: 0,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
