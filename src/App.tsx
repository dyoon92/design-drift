import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchTenants } from './api/tenants'
import type { TenantRecord } from './api/tenants'
import './tokens/variables.css'
import { DSCoverageOverlay } from './ds-coverage/DSCoverageOverlay'
import { StoryModal } from './landing/StoryModal'
import { WaitlistModal } from './landing/LandingPage'
import { Tabs } from './stories/Tabs'
import { Button } from './stories/Button'
import { Dropdown } from './stories/Dropdown'
import type { DropdownItem } from './stories/Dropdown'
import { OccupancyWidget, RevenueWidget, NetMoveInsWidget, LeadsWidget, PastDueWidget, UnitStatusWidget, ProtectionAutopayWidget, ECRIWidget } from './stories/DashboardWidgets'
import { FMKPIRow, KPICard, PriorityTasksPanel, RecentCommunicationsPanel, GoalTrackerPanel, DelinquenciesPanel, GoogleReviewsPanel, PromotionsPanel } from './stories/FMDashboardWidgets'
import { TenantsTable } from './stories/TenantsTable'
import { TenantPageHeader } from './stories/TenantPageHeader'
import { PaymentBanner } from './stories/PaymentBanner'
import { TenantInfoCard } from './stories/TenantInfoCard'
import { CommunicationsPanel } from './stories/CommunicationsPanel'
import { UnitDetailsCard } from './stories/UnitDetailsCard'
import { Navbar, Sidebar } from './stories/AppNav'
import type { NavId } from './stories/AppNav'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

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
Placeholder.displayName = 'Placeholder'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'billing' | 'documents' | 'access' | 'renewal'

// ─── Tenant detail view ───────────────────────────────────────────────────────

const TENANT_TABS: { key: ActiveTab; label: string }[] = [
  { key: 'overview',   label: 'Overview'   },
  { key: 'billing',    label: 'Billing'    },
  { key: 'documents',  label: 'Documents'  },
  { key: 'access',     label: 'Access'     },
  { key: 'renewal',    label: 'Renewal'    },
]

function TenantDetail({ tenant, onBack, isMobile }: { tenant: TenantRecord; onBack: () => void; isMobile: boolean }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  return (
    <div style={{ padding: isMobile ? '12px 12px 20px' : '20px 20px 24px' }}>
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

      <div style={{ margin: '16px 0', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Tabs
          tabs={TENANT_TABS}
          activeKey={activeTab}
          onTabChange={key => setActiveTab(key as ActiveTab)}
        />
      </div>

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

      <div>
        {activeTab === 'overview' && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 20,
            alignItems: 'flex-start',
          }}>
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
                  { label: 'Name',      value: tenant.name      },
                  { label: 'Email',     value: tenant.email     },
                  { label: 'Phone',     value: tenant.phone     },
                  { label: 'Lease end', value: tenant.leaseEnd  },
                ]}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
              <CommunicationsPanel />
            </div>
          </div>
        )}

        {(activeTab === 'billing' || activeTab === 'documents' || activeTab === 'access') && (
          <div style={{ padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon
          </div>
        )}

        {activeTab === 'renewal' && <Placeholder name="RenewalTab" />}
      </div>
    </div>
  )
}
TenantDetail.displayName = 'TenantDetail'

// ─── Dashboard view ───────────────────────────────────────────────────────────

type DashMode = 'portfolio' | 'facility'

const DASH_TABS = [
  { key: 'portfolio', label: 'Portfolio Owner'  },
  { key: 'facility',  label: 'Facility Manager' },
]

const DATE_RANGE_OPTIONS = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last Year']

function DashboardView({ isMobile }: { isMobile: boolean }) {
  const gap = 20
  const [mode, setMode]               = useState<DashMode>('portfolio')
  const [dateRange, setDateRange]     = useState('Last 30 Days')
  const [showDateMenu, setShowDateMenu] = useState(false)

  const dateItems: DropdownItem[] = DATE_RANGE_OPTIONS.map(label => ({
    label,
    onClick: () => setDateRange(label),
  }))

  return (
    <div style={{ padding: isMobile ? '12px 12px 32px' : '20px 20px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Dashboard</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tabs
            tabs={DASH_TABS}
            activeKey={mode}
            onTabChange={key => setMode(key as DashMode)}
          />
          <div style={{ position: 'relative' }}>
            <Button
              label={dateRange}
              variant="white"
              size="sm"
              onClick={() => setShowDateMenu(m => !m)}
            />
            {showDateMenu && (
              <Dropdown items={dateItems} onClose={() => setShowDateMenu(false)} />
            )}
          </div>
        </div>
      </div>

      {mode === 'portfolio' ? (
        <>
          <OccupancySummaryRow />
          <div style={{ display: 'flex', gap, marginBottom: gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><OccupancyWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><RevenueWidget /></div>
          </div>
          <div style={{ display: 'flex', gap, marginBottom: gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><NetMoveInsWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><LeadsWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><PastDueWidget /></div>
          </div>
          <div style={{ display: 'flex', gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}><UnitStatusWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><ProtectionAutopayWidget /></div>
            <div style={{ flex: 1, minWidth: 0 }}><ECRIWidget /></div>
          </div>
        </>
      ) : (
        <>
          <FMKPIRow />
          <div style={{ display: 'flex', gap, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
              <PriorityTasksPanel />
              <RecentCommunicationsPanel />
              <GoalTrackerPanel />
            </div>
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
DashboardView.displayName = 'DashboardView'

// ─── Drift demo: intentional custom (non-DS) components ──────────────────────
// These components were written by AI and are NOT in the design system.
// Drift surfaces them in the coverage panel as gaps to promote.

function OverdueAlertBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 8, padding: '10px 16px', marginBottom: 16,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <span style={{ fontSize: 14 }}>⚠️</span>
      <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
        {count} tenant{count !== 1 ? 's' : ''} with overdue balance
      </span>
      <span style={{ fontSize: 12, color: '#9090aa', marginLeft: 'auto' }}>Review now</span>
    </div>
  )
}
OverdueAlertBanner.displayName = 'OverdueAlertBanner'

function QuickActionsBar() {
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 14,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {['Export CSV', 'Send Notices', 'Bulk Update'].map(label => (
        <button key={label} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 500,
          background: 'var(--ds-color-surface)', color: 'var(--ds-color-text-primary)',
          border: '1px solid var(--ds-color-border)', borderRadius: 6, cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  )
}
QuickActionsBar.displayName = 'QuickActionsBar'

// Migrated from OccupancySummaryCard → DS KPICard (/drift fix OccupancySummaryCard)
function OccupancySummaryRow() {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
      <KPICard label="Occupied" value="86%" trend="2.1%" trendUp={true} />
      <KPICard label="Overdue"  value="12%" trend="0.8%" trendUp={false} />
      <KPICard label="Vacant"   value="14%" trend="2.1%" trendUp={false} />
    </div>
  )
}

// ─── Tenants list view ────────────────────────────────────────────────────────

function TenantsView({ tenants, onSelectTenant }: { tenants: TenantRecord[]; onSelectTenant: (id: string) => void }) {
  const overdueCount = tenants.filter(t => t.balanceOverdue).length
  const rows = useMemo(() => tenants.map(t => ({
    id: t.id,
    name: t.name,
    unit: t.unit,
    status: (
      t.paymentStatus === 'balance-due' || t.paymentStatus === 'updated' ? 'overdue'
      : t.paymentStatus === 'move-out' ? 'move-out'
      : 'good-standing'
    ) as 'overdue' | 'good-standing' | 'move-out' | 'past',
    moveInDate: t.moveInDate,
    balance: t.balance,
    recServices: t.autopay,
  })), [tenants])

  return (
    <div>
      <OverdueAlertBanner count={overdueCount} />
      <QuickActionsBar />
      <TenantsTable
        tenants={rows}
        onRowClick={onSelectTenant}
        onAddTenant={() => {}}
      />
    </div>
  )
}
TenantsView.displayName = 'TenantsView'

// ─── App shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [tenants, setTenants]             = useState<TenantRecord[]>([])
  const [nav, setNav]                     = useState<NavId>('dashboard')
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [darkMode, setDarkMode]           = useState(true)
  const [showTour, setShowTour]           = useState(true)
  const [openOverlay, setOpenOverlay]     = useState(false)
  const [showWaitlist, setShowWaitlist]   = useState(false)

  const isMobile = useWindowWidth() < 768

  useEffect(() => { fetchTenants().then(setTenants) }, [])

  const selectedTenant = tenants.find(t => t.id === selectedTenantId) ?? null

  const handleNav = useCallback((id: NavId) => {
    setNav(id)
    setSelectedTenantId(null)
  }, [])

  return (
    <div data-theme={darkMode ? 'dark' : undefined} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <Navbar facilityName="Drift Storage Co." userName="DU" darkMode={darkMode} onToggleDarkMode={() => setDarkMode(d => !d)} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isMobile && (
          <Sidebar activeNav={nav} onNav={handleNav} userName="Demo User" userEmail="demo@driftstorage.co" />
        )}

        <main style={{ flex: 1, minWidth: 0, background: 'var(--ds-color-page-bg)', overflowY: 'auto' }}>
          {selectedTenant ? (
            <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenantId(null)} isMobile={isMobile} />
          ) : nav === 'tenants' ? (
            <div style={{ padding: '20px 20px 24px' }}>
              <TenantsView tenants={tenants} onSelectTenant={setSelectedTenantId} />
            </div>
          ) : nav === 'dashboard' ? (
            <DashboardView isMobile={isMobile} />
          ) : (
            <div style={{ color: 'var(--ds-color-text-muted)', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
              Select <strong>Tenants</strong> or <strong>Dashboard</strong> from the sidebar to see the demo
            </div>
          )}
        </main>
      </div>

      {/* drift:ignore reason="Internal Drift tooling overlay — not product UI" approvedBy="Dave Yoon" */}
      {(import.meta.env.DEV || import.meta.env.VITE_SHOW_OVERLAY === 'true') && <DSCoverageOverlay autoOpen={openOverlay} onOpenWaitlist={() => setShowWaitlist(true)} />}

      {/* drift:ignore reason="Marketing waitlist modal — not product UI" approvedBy="Dave Yoon" */}
      {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}

      {/* drift:ignore reason="Landing page story preview — marketing surface only" approvedBy="Dave Yoon" */}
      {showTour && <StoryModal onDone={() => { setShowTour(false); setOpenOverlay(true) }} />}

      <div style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 99995,
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <a
          href="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, padding: '6px 12px',
            background: 'rgba(10,10,15,0.85)', color: '#e8e8f0',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            textDecoration: 'none', backdropFilter: 'blur(8px)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        >
          ← Back
        </a>
        <button
          onClick={() => setShowTour(true)}
          title="How to use this demo"
          style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'rgba(10,10,15,0.85)', color: '#e8e8f0',
            border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(79,142,247,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(10,10,15,0.85)' }}
        >
          ?
        </button>
      </div>
    </div>
  )
}
