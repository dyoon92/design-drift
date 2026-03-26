import { useState } from 'react'
import { TenantPageHeader } from '../TenantPageHeader'
import { PaymentBanner } from '../PaymentBanner'
import { TenantInfoCard } from '../TenantInfoCard'
import { CommunicationsPanel } from '../CommunicationsPanel'
import { UnitDetailsCard } from '../UnitDetailsCard'

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Billing History', 'Documents', 'Access'] as const
type Tab = typeof TABS[number]

export function TenantOverviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: 'var(--ds-color-surface-subtle)', minHeight: '100vh', width: '100%' }}>

      <TenantPageHeader
        name="Stephanie Anderson"
        email="stephaniea@gmail.com"
        phone="(714) 948-2639"
        balance="$132.00"
        balanceOverdue={true}
        unitStatus="overdue"
        activeTab="overview"
        numberOfUnits="single"
        gateIntegrated={true}
        accessCode="430388"
        hideTabs={true}
        onBack={() => {}}
      />

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--ds-color-border)', padding: '0 24px', display: 'flex' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            fontFamily: 'Inter, sans-serif',
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--ds-color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            marginBottom: -1,
          }}>{tab}</button>
        ))}
      </div>

      {/* PaymentBanner — full width above columns */}
      <div style={{ padding: '20px 24px 0' }}>
        <PaymentBanner
          status="balance-due"
          balanceAmount="$132.00"
          dueDate="Jul 29, 2024"
          paidThrough="Jun 29, 2024"
          lastPayment="May 2, 2024"
          cardBrand="Mastercard"
          cardLast4="8425"
          cardExpiry="Dec, 2025"
          autopay={true}
          monthlyRent="$115"
        />
      </div>

      {/* Two-column content */}
      <div style={{ display: 'flex', gap: 20, padding: '16px 24px 24px', alignItems: 'flex-start', boxSizing: 'border-box', width: '100%' }}>

        {/* Left */}
        <div style={{ flex: '0 0 520px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <UnitDetailsCard />
          <TenantInfoCard
            details={[
              { label: 'Account Type', value: 'Business' },
              { label: 'Business Name', value: 'Business Name' },
              { label: 'Tax ID', value: '123456789' },
              { label: 'Name', value: 'Stephanie Anderson' },
              { label: 'Email', value: 'stephaniea@gmail.com' },
              { label: 'Email Enrollment', value: 'No' },
              { label: 'Phone (Mobile)', value: '(714) 948-2639' },
              { label: 'SMS Enrollment', value: 'Yes' },
              { label: 'Address', value: '4834 N State Highway 16, Suite 500, Fredericksburg, TX 78624' },
              { label: "Driver's License", value: '123456' },
              { label: 'Issued State', value: 'Texas' },
            ]}
          />
        </div>

        {/* Right */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CommunicationsPanel />
        </div>

      </div>
    </div>
  )
}
