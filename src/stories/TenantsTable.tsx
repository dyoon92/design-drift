import React, { useState, useEffect } from 'react'
import { Badge, UnitBadge } from './Badge'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}
import { Tabs } from './Tabs'

export interface Tenant {
  id: string
  name: string
  unit: string
  status: 'overdue' | 'good-standing' | 'move-out' | 'past'
  moveInDate: string
  balance: string
  recServices: boolean
}

export interface TenantsTableProps {
  tab?: 'current' | 'past'
  tenants?: Tenant[]
  onTabChange?: (tab: string) => void
  onAddTenant?: () => void
  onRowClick?: (id: string) => void
}

const currentTenants: Tenant[] = [
  { id: '1', name: 'Stephanie Anderson', unit: '147', status: 'overdue', moveInDate: 'Apr 29, 2023', balance: '$345.00', recServices: true },
  { id: '2', name: 'John Smith', unit: '052', status: 'good-standing', moveInDate: 'Jan 15, 2023', balance: '$0.00', recServices: false },
  { id: '3', name: 'Sarah Johnson', unit: '281', status: 'move-out', moveInDate: 'Mar 1, 2022', balance: '$132.00', recServices: true },
  { id: '4', name: 'Michael Brown', unit: '021', status: 'overdue', moveInDate: 'Jun 10, 2024', balance: '$89.00', recServices: false },
  { id: '5', name: 'Emily Davis', unit: '319', status: 'good-standing', moveInDate: 'Aug 22, 2023', balance: '$0.00', recServices: false },
]

const pastTenants: Tenant[] = [
  { id: '6', name: 'David Wilson', unit: '112', status: 'past', moveInDate: 'Feb 10, 2021', balance: '$0.00', recServices: false },
  { id: '7', name: 'Jennifer Martinez', unit: '205', status: 'past', moveInDate: 'Sep 5, 2020', balance: '$50.00', recServices: true },
  { id: '8', name: 'Robert Taylor', unit: '318', status: 'past', moveInDate: 'Nov 1, 2019', balance: '$0.00', recServices: false },
  { id: '9', name: 'Lisa Thomas', unit: '407', status: 'past', moveInDate: 'Jul 20, 2022', balance: '$200.00', recServices: false },
  { id: '10', name: 'James Jackson', unit: '509', status: 'past', moveInDate: 'Jan 3, 2021', balance: '$0.00', recServices: true },
]

const StatusBadge = ({ status }: { status: Tenant['status'] }) => {
  if (status === 'overdue')       return <UnitBadge status="overdue" size="sm" contrast="low" />
  if (status === 'good-standing') return <UnitBadge status="occupied" size="sm" contrast="low" />
  if (status === 'move-out')      return <Badge status="inactive" size="sm" contrast="low" label="Move Out" />
  return <Badge status="archive" size="sm" contrast="low" label="Past Tenant" />
}

const balanceColor = (tenant: Tenant): string => {
  if (tenant.balance === '$0.00') return 'var(--ds-color-success)'
  if (tenant.status === 'overdue') return 'var(--ds-color-error)'
  return 'var(--ds-color-text-primary)'
}

const tableTabs = [
  { key: 'current', label: 'Current', count: 24 },
  { key: 'past', label: 'Past', count: 8 },
  { key: 'applicants', label: 'Applicants', count: 3 },
  { key: 'waitlist', label: 'Waitlist', count: 2 },
]

const thStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-color-text-muted)',
  textAlign: 'left',
  padding: '10px 16px',
  borderBottom: '1px solid var(--ds-color-border)',
  whiteSpace: 'nowrap',
  background: 'var(--ds-color-surface-subtle)',
}

const tdStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  color: 'var(--ds-color-text-primary)',
  padding: '12px 16px',
  borderBottom: '1px solid var(--ds-color-border)',
  verticalAlign: 'middle',
}

// Custom checkbox matching Figma node 3478-11956 — square outline, no fill when unchecked
const CheckboxIcon = ({ checked, indeterminate = false, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) => (
  <div
    onClick={e => { e.stopPropagation(); onChange() }}
    style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {checked ? (
        <>
          <rect x="0.5" y="0.5" width="15" height="15" rx="2.5" fill="var(--ds-color-primary)" />
          <path d="M4 8l2.5 2.5L12 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : indeterminate ? (
        <>
          <rect x="0.5" y="0.5" width="15" height="15" rx="2.5" fill="var(--ds-color-primary)" />
          <path d="M4.5 8h7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <rect x="0.5" y="0.5" width="15" height="15" rx="2.5" stroke="var(--ds-color-text-muted)" strokeWidth="1" fill="none" />
      )}
    </svg>
  </div>
)

// Icons matching Figma node 8107-74197
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5" stroke="var(--ds-color-text-muted)" strokeWidth="1.4" />
    <path d="M11 11l3 3" stroke="var(--ds-color-text-muted)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const FilterListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M4 8h8M6 12h4" stroke="var(--ds-color-text-muted)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6l4 4 4-4" stroke="rgba(22,22,22,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="4" r="1.2" fill="rgba(22,22,22,0.88)" />
    <circle cx="8" cy="8" r="1.2" fill="rgba(22,22,22,0.88)" />
    <circle cx="8" cy="12" r="1.2" fill="rgba(22,22,22,0.88)" />
  </svg>
)

type StatusFilter = 'all' | 'overdue' | 'good-standing' | 'move-out' | 'past'
type RecServicesFilter = 'all' | 'enrolled' | 'not-enrolled'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'good-standing', label: 'Good Standing' },
  { value: 'move-out', label: 'Move Out' },
  { value: 'past', label: 'Past Tenant' },
]

const REC_OPTIONS: { value: RecServicesFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'not-enrolled', label: 'Not Enrolled' },
]

export const TenantsTable: React.FC<TenantsTableProps> = ({
  tab = 'current',
  tenants,
  onTabChange,
  onAddTenant,
  onRowClick,
}) => {
  const [selectedTab, setSelectedTab] = useState(tab)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [recFilter, setRecFilter] = useState<RecServicesFilter>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const isMobile = useWindowWidth() < 768

  const handleTabChange = (key: string) => {
    setSelectedTab(key as 'current' | 'past')
    onTabChange?.(key)
  }

  const allTenants = tenants ?? (selectedTab === 'current' ? currentTenants : pastTenants)
  const displayTenants = allTenants.filter(t => {
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase()
      const matchesSearch = t.name.toLowerCase().includes(q) || t.unit.toLowerCase().includes(q) || t.balance.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (recFilter === 'enrolled' && !t.recServices) return false
    if (recFilter === 'not-enrolled' && t.recServices) return false
    return true
  })

  const hasActiveFilters = statusFilter !== 'all' || recFilter !== 'all'
  const clearFilters = () => { setStatusFilter('all'); setRecFilter('all') }

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === displayTenants.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(displayTenants.map((t) => t.id)))
    }
  }

  // Shared field style from Figma node 8107-74197: white, #E1E5EF stroke, 8px radius
  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--ds-color-surface)',
    border: '1px solid var(--ds-color-border)',
    borderRadius: 8,
    padding: '7px 12px',
    height: 34,
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--ds-color-text-muted)',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* Page header — sits on page bg, outside the white card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>Tenants</span>
        <button
          onClick={onAddTenant}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            background: 'var(--ds-color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '9px 16px',
            cursor: 'pointer',
          }}
        >
          + Add Tenant
        </button>
      </div>

      {/* Tab bar — Tabs component from Figma node 8107-365538 */}
      <div style={{ marginBottom: 20 }}>
        <Tabs
          tabs={tableTabs.map(t => ({ key: t.key, label: t.label, count: t.count }))}
          activeKey={selectedTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Filter bar — on page bg, outside white card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {/* Row 1: search + kebab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...fieldStyle, flex: 1, cursor: 'text' }}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                color: 'var(--ds-color-text-muted)',
                background: 'transparent',
                flex: 1,
                minWidth: 0,
              }}
            />
            <FilterListIcon />
          </div>
          <button
            style={{ width: 32, height: 32, background: 'var(--ds-color-surface-muted)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, flexShrink: 0 }}
          >
            <MoreVerticalIcon />
          </button>
        </div>

        {/* Row 2: filter dropdowns — span full width, functional for Status + Rec. Services */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

          {/* Status filter — wired */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              style={{ ...fieldStyle, justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', background: statusFilter !== 'all' ? 'var(--ds-color-primary-light)' : 'var(--ds-color-surface)', color: statusFilter !== 'all' ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                {statusFilter === 'all' ? 'Status' : STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              </span>
              <ChevronDownIcon />
            </div>
            {openDropdown === 'status' && (
              <>
                <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => { setStatusFilter(opt.value); setOpenDropdown(null) }}
                      style={{ padding: '9px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: 'pointer', color: statusFilter === opt.value ? 'var(--ds-color-primary)' : 'var(--ds-color-text-primary)', background: statusFilter === opt.value ? 'var(--ds-color-primary-light)' : 'transparent', fontWeight: statusFilter === opt.value ? 500 : 400 }}
                      onMouseEnter={e => { if (statusFilter !== opt.value) e.currentTarget.style.background = 'var(--ds-color-surface-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = statusFilter === opt.value ? 'var(--ds-color-primary-light)' : 'transparent' }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Rec. Services filter — wired */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => setOpenDropdown(openDropdown === 'rec' ? null : 'rec')}
              style={{ ...fieldStyle, justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', background: recFilter !== 'all' ? 'var(--ds-color-primary-light)' : 'var(--ds-color-surface)', color: recFilter !== 'all' ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                {recFilter === 'all' ? 'Rec. Services' : REC_OPTIONS.find(o => o.value === recFilter)?.label}
              </span>
              <ChevronDownIcon />
            </div>
            {openDropdown === 'rec' && (
              <>
                <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                  {REC_OPTIONS.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => { setRecFilter(opt.value); setOpenDropdown(null) }}
                      style={{ padding: '9px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: 'pointer', color: recFilter === opt.value ? 'var(--ds-color-primary)' : 'var(--ds-color-text-primary)', background: recFilter === opt.value ? 'var(--ds-color-primary-light)' : 'transparent', fontWeight: recFilter === opt.value ? 500 : 400 }}
                      onMouseEnter={e => { if (recFilter !== opt.value) e.currentTarget.style.background = 'var(--ds-color-surface-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = recFilter === opt.value ? 'var(--ds-color-primary-light)' : 'transparent' }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#7D52F8', padding: '3px 0', letterSpacing: 0.28, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* White card: bulk bar + table */}
      <div style={{ background: 'var(--ds-color-surface)', borderRadius: 8, overflow: 'hidden' }}>

      {/* Bulk action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 24px',
          background: 'var(--ds-color-surface-subtle)',
          borderBottom: '1px solid var(--ds-color-border)',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
          {selectedRows.size} unit(s) selected
        </span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          <button
            style={{
              background: 'none',
              border: '1px solid var(--ds-color-border)',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--ds-color-text-primary)',
            }}
          >
            Send Notice
          </button>
          <button
            style={{
              background: 'none',
              border: '1px solid var(--ds-color-border)',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--ds-color-text-primary)',
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>
                <CheckboxIcon
                  checked={selectedRows.size === displayTenants.length && displayTenants.length > 0}
                  indeterminate={selectedRows.size > 0 && selectedRows.size < displayTenants.length}
                  onChange={toggleAll}
                />
              </th>
              <th style={thStyle}>Tenant Name</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Move-In Date</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Rec. Services</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTenants.map((tenant) => (
              <tr
                key={tenant.id}
                onClick={() => onRowClick?.(tenant.id)}
                style={{
                  background: selectedRows.has(tenant.id) ? 'var(--ds-color-primary-light)' : 'var(--ds-color-white)',
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = 'var(--ds-color-surface-subtle)' }}
                onMouseLeave={e => { e.currentTarget.style.background = selectedRows.has(tenant.id) ? 'var(--ds-color-primary-light)' : 'var(--ds-color-white)' }}
              >
                <td style={{ ...tdStyle, width: 36 }}>
                  <CheckboxIcon
                    checked={selectedRows.has(tenant.id)}
                    onChange={() => toggleRow(tenant.id)}
                  />
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 500, color: 'var(--ds-color-primary)', cursor: 'pointer' }}>
                    {tenant.name}
                  </span>
                </td>
                <td style={tdStyle}>{tenant.unit}</td>
                <td style={tdStyle}>
                  <StatusBadge status={tenant.status} />
                </td>
                <td style={tdStyle}>{tenant.moveInDate}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: balanceColor(tenant) }}>
                  {tenant.balance}
                </td>
                <td style={tdStyle}>
                  <Badge
                    status={tenant.recServices ? 'active' : 'archive'}
                    size="sm"
                    contrast="low"
                    label={tenant.recServices ? 'Enrolled' : 'Not Enrolled'}
                  />
                </td>
                <td style={tdStyle}>
                  <button
                    style={{
                      background: 'none',
                      border: '1px solid var(--ds-color-border)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--ds-color-text-primary)',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}

export default TenantsTable
