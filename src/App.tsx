import { useState, useEffect } from 'react'
import { DSCoverageOverlay } from './ds-coverage/DSCoverageOverlay'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}
import { Tabs } from './stories/Tabs'

// ─── Placeholder ──────────────────────────────────────────────────────────────
// Used when a component has not yet been designed in Figma + added to src/stories/

function Placeholder({ name }: { name: string }) {
  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--ds-color-surface-subtle)',
      border: '2px dashed var(--ds-color-border)',
      borderRadius: 'var(--ds-border-radius-lg)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>
        ⚠️ Missing component: {name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>
        This needs to be designed in Figma first before it can be built.
        Next step: file a design request so it can be added to the component library.
      </div>
    </div>
  )
}
import '../src/tokens/variables.css'
import { OccupancyWidget, RevenueWidget, NetMoveInsWidget, LeadsWidget, PastDueWidget, UnitStatusWidget, ProtectionAutopayWidget, ECRIWidget } from './stories/DashboardWidgets'
import { FMKPIRow, PriorityTasksPanel, RecentCommunicationsPanel, GoalTrackerPanel, DelinquenciesPanel, GoogleReviewsPanel, PromotionsPanel } from './stories/FMDashboardWidgets'
import { TenantsTable } from './stories/TenantsTable'
import { TenantPageHeader } from './stories/TenantPageHeader'
import { PaymentBanner } from './stories/PaymentBanner'
import { TenantInfoCard } from './stories/TenantInfoCard'
import { CommunicationsPanel } from './stories/CommunicationsPanel'
import { UnitDetailsCard } from './stories/UnitDetailsCard'
import { Navbar, Sidebar } from './stories/AppNav'
import type { NavId } from './stories/AppNav'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'billing' | 'documents' | 'access' | 'renewal'

interface TenantRecord {
  id: string
  name: string
  email: string
  phone: string
  unit: string
  balance: string
  balanceOverdue: boolean
  paymentStatus: 'balance-due' | 'good-standing' | 'move-out' | 'updated'
  unitStatus: 'overdue' | 'normal' | 'move-out'
  moveInDate: string
  leaseEnd: string
  autopay: boolean
  cardBrand?: string
  cardLast4?: string
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const TENANTS: TenantRecord[] = [
  {
    id: '1',
    name: 'Stephanie Anderson',
    email: 's.anderson@email.com',
    phone: '(555) 248-1190',
    unit: '147',
    balance: '$345.00',
    balanceOverdue: true,
    paymentStatus: 'balance-due',
    unitStatus: 'overdue',
    moveInDate: 'Apr 29, 2023',
    leaseEnd: 'Jun 30, 2025',
    autopay: false,
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'j.smith@email.com',
    phone: '(555) 391-2047',
    unit: '052',
    balance: '$0.00',
    balanceOverdue: false,
    paymentStatus: 'good-standing',
    unitStatus: 'normal',
    moveInDate: 'Jan 15, 2023',
    leaseEnd: 'Jan 14, 2026',
    autopay: true,
    cardBrand: 'Visa',
    cardLast4: '4242',
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 's.johnson@email.com',
    phone: '(555) 774-3301',
    unit: '281',
    balance: '$132.00',
    balanceOverdue: true,
    paymentStatus: 'move-out',
    unitStatus: 'move-out',
    moveInDate: 'Mar 1, 2022',
    leaseEnd: 'Apr 30, 2025',
    autopay: false,
  },
  {
    id: '4',
    name: 'Michael Brown',
    email: 'm.brown@email.com',
    phone: '(555) 509-8812',
    unit: '021',
    balance: '$89.00',
    balanceOverdue: true,
    paymentStatus: 'balance-due',
    unitStatus: 'overdue',
    moveInDate: 'Jun 10, 2024',
    leaseEnd: 'Jun 9, 2025',
    autopay: false,
  },
  {
    id: '5',
    name: 'Emily Davis',
    email: 'e.davis@email.com',
    phone: '(555) 122-6630',
    unit: '319',
    balance: '$0.00',
    balanceOverdue: false,
    paymentStatus: 'good-standing',
    unitStatus: 'normal',
    moveInDate: 'Aug 22, 2023',
    leaseEnd: 'Aug 21, 2025',
    autopay: true,
    cardBrand: 'Mastercard',
    cardLast4: '8731',
  },
]




// ─── Tenant detail view ───────────────────────────────────────────────────────

function TenantDetail({ tenant, onBack }: { tenant: TenantRecord; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const tabs: ActiveTab[] = ['overview', 'billing', 'documents', 'access', 'renewal']
  const width = useWindowWidth()
  const isMobile = width < 768

  return (
    <div style={{ padding: isMobile ? '12px 12px 20px' : '20px 20px 24px' }}>
      {/* Header card */}
      <TenantPageHeader
        name={tenant.name}
        email={tenant.email}
        phone={tenant.phone}
        balance={tenant.balance}
        balanceOverdue={tenant.balanceOverdue}
        unitStatus={tenant.unitStatus}
        activeTab="overview"
        numberOfUnits="single"
        hideTabs={true}
        onBack={onBack}
      />

      {/* Tab bar — Tabs component from Figma node 8107-365538 */}
      <div style={{ margin: '16px 0', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Tabs
          tabs={tabs.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
          activeKey={activeTab}
          onTabChange={key => setActiveTab(key as ActiveTab)}
        />
      </div>

      {/* PaymentBanner */}
      {activeTab !== 'renewal' && (
        <div style={{ marginBottom: 16 }}>
          <PaymentBanner
            status={tenant.paymentStatus}
            balanceAmount={tenant.balance}
            dueDate="Mar 1, 2025"
            monthlyRent="$1,450"
            autopay={tenant.autopay}
            cardBrand={tenant.cardBrand}
            cardLast4={tenant.cardLast4}
          />
        </div>
      )}

      {/* Content */}
      <div>
        {activeTab === 'overview' && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 20,
            alignItems: 'flex-start',
          }}>
            {/* Left column */}
            <div style={{
              flex: isMobile ? 'none' : '0 0 520px',
              width: isMobile ? '100%' : undefined,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <UnitDetailsCard
                unitNumber={tenant.unit}
                status={tenant.unitStatus === 'normal' ? 'good-standing' : tenant.unitStatus}
                moveInDate={tenant.moveInDate}
              />
              <TenantInfoCard
                details={[
                  { label: 'Name', value: tenant.name },
                  { label: 'Email', value: tenant.email },
                  { label: 'Phone', value: tenant.phone },
                  { label: 'Lease end', value: tenant.leaseEnd },
                ]}
              />
            </div>
            {/* Right column — Communications */}
            <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
              <CommunicationsPanel />
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div style={{ padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Billing history coming soon
          </div>
        )}

        {activeTab === 'documents' && (
          <div style={{ padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Documents coming soon
          </div>
        )}

        {activeTab === 'access' && (
          <div style={{ padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Access log coming soon
          </div>
        )}

        {activeTab === 'renewal' && <Placeholder name="RenewalTab" />}
      </div>
    </div>
  )
}

// ─── Dashboard view ───────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

type DashMode = 'portfolio' | 'facility'

function DashboardView() {
  const width = useWindowWidth()
  const isMobile = width < 768
  const gap = 20
  const [mode, setMode] = useState<DashMode>('portfolio')

  return (
    <div style={{ padding: isMobile ? '12px 12px 32px' : '20px 20px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Dashboard</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Role toggle — segmented control matching Figma node 8104-364225 */}
          <div style={{ display: 'flex', gap: 1, background: 'var(--ds-color-border)', borderRadius: 8, padding: 1 }}>
            {(['portfolio', 'facility'] as DashMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 16px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 12,
                  fontWeight: mode === m ? 600 : 500,
                  color: mode === m ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)',
                  background: mode === m ? 'var(--ds-color-primary-light)' : 'var(--ds-color-surface)',
                  whiteSpace: 'nowrap', letterSpacing: 0.24,
                }}
              >{m === 'portfolio' ? 'Portfolio Owner' : 'Facility Manager'}</button>
            ))}
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
            background: 'var(--ds-color-surface)', color: 'var(--ds-color-text-primary)',
            border: '1px solid var(--ds-color-border)', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer',
          }}>
            Last 30 Days <ChevronDownIcon />
          </button>
        </div>
      </div>

      {mode === 'portfolio' ? (
        <>
          {/* Row 1: Occupancy + Revenue (equal width) */}
          <div style={{ display: 'flex', gap, marginBottom: gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><OccupancyWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><RevenueWidget /></div>
          </div>

          {/* Row 2: Net Move-Ins | Leads | Past Due */}
          <div style={{ display: 'flex', gap, marginBottom: gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><NetMoveInsWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><LeadsWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><PastDueWidget /></div>
          </div>

          {/* Row 3: Unit Status | Protection+Autopay stacked | ECRI stacked */}
          <div style={{ display: 'flex', gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><UnitStatusWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><ProtectionAutopayWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><ECRIWidget /></div>
          </div>
        </>
      ) : (
        <>
          {/* FM: KPI row */}
          <FMKPIRow />

          {/* FM: Two-column content */}
          <div style={{ display: 'flex', gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
            {/* Left column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
              <PriorityTasksPanel />
              <RecentCommunicationsPanel />
              <GoalTrackerPanel />
            </div>
            {/* Right column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
              <DelinquenciesPanel />
              <GoogleReviewsPanel />
              <PromotionsPanel />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tenants list view ────────────────────────────────────────────────────────

function TenantsView({ onSelectTenant }: { onSelectTenant: (id: string) => void }) {
  const mappedTenants = TENANTS.map(t => ({
    id: t.id,
    name: t.name,
    unit: t.unit,
    status: (t.paymentStatus === 'balance-due' || t.paymentStatus === 'updated'
      ? 'overdue'
      : t.paymentStatus === 'move-out'
      ? 'move-out'
      : 'good-standing') as 'overdue' | 'good-standing' | 'move-out' | 'past',
    moveInDate: t.moveInDate,
    balance: t.balance,
    recServices: t.autopay,
  }))

  return (
    <TenantsTable
      tenants={mappedTenants}
      onRowClick={onSelectTenant}
      onAddTenant={() => {}}
    />
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState<NavId>('dashboard')
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < 768

  const selectedTenant = TENANTS.find(t => t.id === selectedTenantId)

  const handleNav = (id: NavId) => {
    setNav(id)
    setSelectedTenantId(null)
  }

  return (
    <div data-theme={darkMode ? 'dark' : undefined} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      {/* Top navbar */}
      <Navbar facilityName="Sunrise Self Storage" userName="DY" tasksCount={24} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(d => !d)} />

      {/* Below navbar: sidebar + content — fills remaining height */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isMobile && (
          <Sidebar activeNav={nav} onNav={handleNav} userName="Dave Yoon" userEmail="dave@monumentai.com" />
        )}

        <main style={{ flex: 1, minWidth: 0, background: 'var(--ds-color-page-bg)', overflowY: 'auto' }}>
          {selectedTenant ? (
            <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenantId(null)} />
          ) : nav === 'tenants' ? (
            <div style={{ padding: '20px 20px 24px' }}>
              <TenantsView onSelectTenant={setSelectedTenantId} />
            </div>
          ) : nav === 'dashboard' ? (
            <DashboardView />
          ) : (
            <div style={{ color: 'var(--ds-color-text-muted)', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
              Select <strong>Tenants</strong> or <strong>Dashboard</strong> from the sidebar to see the demo
            </div>
          )}
        </main>
      </div>

      {import.meta.env.DEV && <DSCoverageOverlay />}

      {/* Back to landing page */}
      <a
        href="/"
        style={{
          position: 'fixed', bottom: 16, left: 16, zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, padding: '6px 12px',
          background: 'rgba(10,10,15,0.85)', color: '#e8e8f0',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
          textDecoration: 'none', backdropFilter: 'blur(8px)',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        ← Back to DesignDrift
      </a>
    </div>
  )
}
