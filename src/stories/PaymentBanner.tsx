import React from 'react'

export interface PaymentBannerProps {
  status: 'updated' | 'past-tenant' | 'good-standing' | 'balance-due' | 'vacant' | 'move-out' | 'transfer'
  balanceAmount?: string
  dueDate?: string
  paidThrough?: string
  lastPayment?: string
  cardBrand?: string
  cardLast4?: string
  cardExpiry?: string
  autopay?: boolean
  monthlyRent?: string
  onPayBalance?: () => void
  onCollectPayment?: () => void
  onManage?: () => void
}

const statusConfig = {
  updated: {
    borderColor: '#e02c3b',
    iconBg: '#fdf0f1',
    iconColor: '#e02c3b',
    amountColor: '#e02c3b',
    balanceLabel: 'Outstanding Balance',
    icon: '⚠',
  },
  'past-tenant': {
    borderColor: '#e02c3b',
    iconBg: '#fdf0f1',
    iconColor: '#e02c3b',
    amountColor: '#e02c3b',
    balanceLabel: 'Outstanding Balance',
    icon: '⚠',
  },
  'good-standing': {
    borderColor: '#08875c',
    iconBg: '#e4f5e8',
    iconColor: '#08875c',
    amountColor: '#08875c',
    balanceLabel: 'Balance Due',
    icon: '👍',
  },
  'balance-due': {
    borderColor: '#7d52f7',
    iconBg: '#f5f0ff',
    iconColor: '#7d52f7',
    amountColor: '#7d52f7',
    balanceLabel: 'Balance Due',
    icon: '$',
  },
  vacant: {
    borderColor: '#94a0b8',
    iconBg: '#f0f2f8',
    iconColor: '#94a0b8',
    amountColor: '#94a0b8',
    balanceLabel: 'Balance Due',
    icon: '🏢',
  },
  'move-out': {
    borderColor: '#b25d09',
    iconBg: '#fff8eb',
    iconColor: '#b25d09',
    amountColor: '#b25d09',
    balanceLabel: 'Balance Due',
    icon: '📦',
  },
  transfer: {
    borderColor: '#1a1e27',
    iconBg: '#f0f2f8',
    iconColor: '#1a1e27',
    amountColor: '#1a1e27',
    balanceLabel: 'Balance Due',
    icon: '↗',
  },
}

const SectionDivider = () => (
  <div
    style={{
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--ds-color-border)',
      flexShrink: 0,
    }}
  />
)

const purpleButton: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--ds-color-primary)',
  color: 'var(--ds-color-white)',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const outlineButton: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--ds-color-white)',
  color: 'var(--ds-color-text-primary)',
  border: '1px solid var(--ds-color-border)',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export const PaymentBanner: React.FC<PaymentBannerProps> = ({
  status,
  balanceAmount = '$0.00',
  dueDate = 'Jul 29, 2024',
  paidThrough = 'Jun 29, 2024',
  lastPayment = 'May 2, 2024',
  cardBrand = 'Visa',
  cardLast4 = '4242',
  cardExpiry = '12/26',
  autopay = true,
  monthlyRent = '$1,200.00',
  onPayBalance,
  onCollectPayment,
  onManage,
}) => {
  const config = statusConfig[status]

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--ds-color-white)',
        display: 'flex',
        flexDirection: 'row',
        fontFamily: 'Inter, sans-serif',
        border: '1px solid var(--ds-color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 120,
      }}
    >
      {/* Left colored border bar */}
      <div style={{ width: 16, background: config.borderColor, flexShrink: 0 }} />

      {/* Icon box */}
      <div
        style={{
          width: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.iconBg,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 24, color: config.iconColor }}>{config.icon}</span>
      </div>

      <SectionDivider />

      {/* Section 1: Balance Due */}
      <div
        style={{
          flex: '0 0 220px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>
          {config.balanceLabel}
        </span>
        <span style={{ fontSize: 24, fontWeight: 600, color: config.amountColor }}>{balanceAmount}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Due {dueDate}</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {status === 'balance-due' && (
            <button onClick={onPayBalance} style={purpleButton}>
              Pay Balance
            </button>
          )}
          {(status === 'updated' || status === 'past-tenant') && (
            <>
              <button style={outlineButton}>Apply Credit</button>
              <button style={outlineButton}>Apply Fee</button>
              <button onClick={onCollectPayment} style={purpleButton}>
                Collect Payment
              </button>
            </>
          )}
          {status === 'balance-due' && (
            <>
              <button style={outlineButton}>Apply Credit</button>
            </>
          )}
        </div>
      </div>

      <SectionDivider />

      {/* Section 2: Paid Through */}
      <div
        style={{
          flex: '0 0 200px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Paid Through</span>
        <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--ds-color-text-primary)' }}>{paidThrough}</span>
        <span style={{ fontSize: 14, color: 'var(--ds-color-text-muted)' }}>Last Payment on {lastPayment}</span>
      </div>

      <SectionDivider />

      {/* Section 3: Payment Method */}
      <div
        style={{
          flex: '0 0 260px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Payment Method</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--ds-color-text-primary)' }}>
            💳 {cardBrand} **** {cardLast4}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Exp {cardExpiry}</span>
          {autopay && (
            <span
              style={{
                background: 'var(--ds-color-success-light)',
                color: 'var(--ds-color-success)',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              Autopay
            </span>
          )}
        </div>
        <button
          onClick={onManage}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-color-primary)',
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            padding: 0,
            textAlign: 'left',
            width: 'fit-content',
          }}
        >
          Manage
        </button>
      </div>

      <SectionDivider />

      {/* Section 4: Total Monthly Rent */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>
          Total Monthly Rent
        </span>
        <span style={{ fontSize: 24, fontWeight: 400, color: 'var(--ds-color-text-primary)' }}>{monthlyRent}</span>
      </div>
    </div>
  )
}

export default PaymentBanner
