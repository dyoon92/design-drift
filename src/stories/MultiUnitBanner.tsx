import React from 'react'

export interface MultiUnitBannerProps {
  state: 'overdue' | 'past-tenant' | 'good-standing' | 'balance-exists' | 'move-out' | 'transfer' | 'default' | 'updated-default'
  balanceAmount?: string
  dueDate?: string
  paidThrough?: string
  lastPayment?: string
  moveOutDate?: string
  transferToUnit?: string
  transferAmount?: string
  onCollectPayment?: () => void
  onManageMoveOut?: () => void
  onCancelMoveOut?: () => void
  onCompleteTransfer?: () => void
  onCancelTransfer?: () => void
  onPayBalance?: () => void
}

const stripColorMap: Record<MultiUnitBannerProps['state'], string> = {
  overdue: '#e02c3b',
  'past-tenant': '#e02c3b',
  'good-standing': '#08875c',
  'balance-exists': '#7d52f7',
  'move-out': '#2152b4',
  transfer: '#1a1e27',
  default: '#e02c3b',
  'updated-default': '#e02c3b',
}

const purpleBtn: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--ds-color-primary)',
  color: 'var(--ds-color-white)',
  border: 'none',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
  flex: 1,
}

const outlineBtn: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--ds-color-white)',
  color: 'var(--ds-color-text-primary)',
  border: '1px solid var(--ds-color-border)',
  borderRadius: 6,
  padding: '7px 14px',
  cursor: 'pointer',
  flex: 1,
}

export const MultiUnitBanner: React.FC<MultiUnitBannerProps> = ({
  state,
  balanceAmount = '$345.00',
  dueDate = 'Jul 29, 2024',
  paidThrough = 'Jun 29, 2024',
  lastPayment = 'May 2, 2024',
  moveOutDate = 'Apr 25, 2025',
  transferToUnit = 'A-500',
  transferAmount = '$117.00',
  onCollectPayment,
  onManageMoveOut,
  onCancelMoveOut,
  onCompleteTransfer,
  onCancelTransfer,
  onPayBalance,
}) => {
  const stripColor = stripColorMap[state]

  const renderContent = () => {
    if (state === 'move-out') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Move Out Date</span>
            <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--ds-color-text-primary)' }}>{moveOutDate}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onManageMoveOut} style={purpleBtn}>Manage Move Out</button>
            <button onClick={onCancelMoveOut} style={outlineBtn}>Cancel Move Out</button>
          </div>
        </div>
      )
    }

    if (state === 'transfer') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            {/* Transferring To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Transferring To</span>
              <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--ds-color-text-primary)' }}>{transferToUnit}</span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-color-primary)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                Resend Lease
              </button>
            </div>
            {/* Due At Transfer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Due At Transfer</span>
              <span style={{ fontSize: 24, fontWeight: 400, color: 'var(--ds-color-text-primary)' }}>{transferAmount}</span>
              <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Collected upon lease signing</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCompleteTransfer} style={purpleBtn}>Complete Transfer</button>
            <button onClick={onCancelTransfer} style={outlineBtn}>Cancel Transfer</button>
          </div>
        </div>
      )
    }

    if (state === 'good-standing') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Balance Due</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-color-success)' }}>$0.00</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Paid Through</span>
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{paidThrough}</span>
            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Last Payment on {lastPayment}</span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--ds-color-border)',
              paddingTop: 10,
              display: 'flex',
              gap: 8,
            }}
          >
            <button style={outlineBtn}>Apply Credit</button>
            <button style={outlineBtn}>Apply Fee</button>
            <button onClick={onCollectPayment} style={purpleBtn}>Collect Payment</button>
          </div>
        </div>
      )
    }

    if (state === 'balance-exists') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Outstanding Balance</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-color-primary)' }}>{balanceAmount}</span>
              <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Due {dueDate}</span>
            </div>
            <button onClick={onPayBalance} style={{ ...purpleBtn, flex: 'none' }}>Pay Balance</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Paid Through</span>
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{paidThrough}</span>
            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Last Payment on {lastPayment}</span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--ds-color-border)',
              paddingTop: 10,
              display: 'flex',
              gap: 8,
            }}
          >
            <button style={outlineBtn}>Apply Credit</button>
            <button style={outlineBtn}>Apply Fee</button>
            <button onClick={onCollectPayment} style={purpleBtn}>Collect Payment</button>
          </div>
        </div>
      )
    }

    if (state === 'past-tenant') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Outstanding Balance</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-color-error)' }}>{balanceAmount}</span>
              <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Due {dueDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Paid Through</span>
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{paidThrough}</span>
            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Last Payment on {lastPayment}</span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--ds-color-border)',
              paddingTop: 10,
              display: 'flex',
              gap: 8,
            }}
          >
            <button style={outlineBtn}>Apply Credit</button>
            <button style={outlineBtn}>Apply Fee</button>
            <button onClick={onCollectPayment} style={purpleBtn}>Collect Payment</button>
          </div>
        </div>
      )
    }

    // default / updated-default / overdue — all show outstanding balance with red
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Outstanding Balance</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-color-error)' }}>{balanceAmount}</span>
            <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Due {dueDate}</span>
          </div>
          <button onClick={onPayBalance} style={{ ...purpleBtn, flex: 'none' }}>Pay Balance</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Paid Through</span>
          <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>{paidThrough}</span>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Last Payment on {lastPayment}</span>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--ds-color-border)',
            paddingTop: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          {state === 'default' ? (
            <>
              <button style={outlineBtn}>Apply Credit / Fee</button>
              <button onClick={onCollectPayment} style={purpleBtn}>Collect Payment</button>
            </>
          ) : (
            <>
              <button style={outlineBtn}>Apply Credit</button>
              <button style={outlineBtn}>Apply Fee</button>
              <button onClick={onCollectPayment} style={purpleBtn}>Collect Payment</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--ds-color-white)',
        border: '1px solid var(--ds-color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        fontFamily: 'Inter, sans-serif',
        maxWidth: 560,
        width: '100%',
      }}
    >
      {/* Colored left strip */}
      <div style={{ width: 8, background: stripColor, flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 14px' }}>{renderContent()}</div>
    </div>
  )
}

export default MultiUnitBanner
