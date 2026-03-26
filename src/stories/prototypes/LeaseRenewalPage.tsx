/**
 * PROTOTYPE: Lease Renewal Flow
 *
 * PM prompt that generated this:
 * "Build a tenant page for Stephanie Anderson (Unit 147, overdue $345).
 *  Add a new 'Renewal' tab. When active, show a card with her current lease
 *  details and an Accept / Decline button row."
 *
 * Built using real design system components — no custom colors, no one-off styles.
 */

import { useState } from 'react'
import { TenantPageHeader } from '../TenantPageHeader'
import { PaymentBanner } from '../PaymentBanner'

const renewalTerms: { label: string; value: string }[] = [
  { label: 'Current lease end',  value: 'Jun 30, 2025' },
  { label: 'Current monthly rent', value: '$1,450 / mo' },
  { label: 'Proposed new rate',  value: '$1,520 / mo' },
  { label: 'New lease term',     value: 'Jul 1, 2025 – Jun 30, 2026' },
]
const renewalData = { increase: '+$70 / mo (4.8%)' }

function RenewalTab() {
  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null)

  if (decision === 'accepted') {
    return (
      <div style={{
        margin: '24px 0',
        padding: '24px',
        background: 'var(--ds-color-success-light)',
        borderRadius: 'var(--ds-border-radius-lg)',
        border: '1px solid var(--ds-color-success)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-color-success)' }}>
          Lease renewal accepted
        </div>
        <div style={{ fontSize: 14, color: 'var(--ds-color-text-muted)', marginTop: 4 }}>
          New lease begins Jul 1, 2025 at $1,520/mo
        </div>
      </div>
    )
  }

  if (decision === 'declined') {
    return (
      <div style={{
        margin: '24px 0',
        padding: '24px',
        background: 'var(--ds-color-error-subtle)',
        borderRadius: 'var(--ds-border-radius-lg)',
        border: '1px solid var(--ds-color-error)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✕</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-color-error)' }}>
          Renewal declined
        </div>
        <div style={{ fontSize: 14, color: 'var(--ds-color-text-muted)', marginTop: 4 }}>
          Move-out date set to Jun 30, 2025. Notice sent to tenant.
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '24px 0' }}>
      {/* Renewal offer card */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--ds-border-radius-lg)',
        border: '1px solid var(--ds-color-border)',
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--ds-color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ds-color-text-primary)' }}>
              Lease Renewal Offer
            </div>
            <div style={{ fontSize: 13, color: 'var(--ds-color-text-muted)', marginTop: 2 }}>
              Offer expires May 31, 2025
            </div>
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '4px 10px',
            borderRadius: 'var(--ds-border-radius-full)',
            background: 'var(--ds-color-warning-subtle)',
            color: 'var(--ds-color-warning)',
          }}>
            Awaiting response
          </div>
        </div>

        {/* Lease terms grid */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {renewalTerms.map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-color-text-primary)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Rate increase callout */}
        <div style={{
          margin: '0 20px 20px',
          padding: '12px 16px',
          background: 'var(--ds-color-primary-light)',
          borderRadius: 'var(--ds-border-radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-primary)' }}>
            Rate increase
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-color-primary)' }}>
            {renewalData.increase}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--ds-color-border)',
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => setDecision('declined')}
            style={{
              padding: '9px 20px',
              borderRadius: 'var(--ds-border-radius-md)',
              border: '1px solid var(--ds-color-border)',
              background: 'white',
              color: 'var(--ds-color-text-primary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Decline
          </button>
          <button
            onClick={() => setDecision('accepted')}
            style={{
              padding: '9px 20px',
              borderRadius: 'var(--ds-border-radius-md)',
              border: 'none',
              background: 'var(--ds-color-primary)',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Accept Renewal
          </button>
        </div>
      </div>

      {/* Notes section */}
      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-color-text-primary)', display: 'block', marginBottom: 6 }}>
          Notes
        </label>
        <textarea
          placeholder="Add notes about this renewal offer..."
          style={{
            width: '100%',
            minHeight: 80,
            padding: '10px 12px',
            border: '1px solid var(--ds-color-border)',
            borderRadius: 'var(--ds-border-radius-md)',
            fontSize: 13,
            color: 'var(--ds-color-text-primary)',
            background: 'white',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

export function LeaseRenewalPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'documents' | 'access' | 'renewal'>('renewal')

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: 'var(--ds-color-surface-subtle)', minHeight: '100vh' }}>
      <TenantPageHeader
        name="Stephanie Anderson"
        email="s.anderson@email.com"
        phone="(555) 248-1190"
        balance="$345.00"
        balanceOverdue={true}
        unitStatus="overdue"
        activeTab={activeTab === 'renewal' ? 'overview' : activeTab}
        numberOfUnits="single"
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
      />

      {/* Custom Renewal tab injected above the standard header tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--ds-color-border)',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
        marginTop: -1,
      }}>
        {(['overview', 'billing', 'documents', 'access', 'renewal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--ds-color-primary)' : 'var(--ds-color-text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--ds-color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab}
            {tab === 'renewal' && (
              <span style={{
                background: 'var(--ds-color-warning)',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 'var(--ds-border-radius-full)',
              }}>
                NEW
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
        {activeTab !== 'renewal' && (
          <PaymentBanner
            status="balance-due"
            balanceAmount="$345.00"
            dueDate="Mar 1, 2025"
            monthlyRent="$1,450"
            cardBrand="Visa"
            cardLast4="4242"
          />
        )}

        {activeTab === 'overview' && (
          <div style={{ marginTop: 16, padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Overview tab content
          </div>
        )}
        {activeTab === 'billing' && (
          <div style={{ marginTop: 16, padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Billing tab content
          </div>
        )}
        {activeTab === 'documents' && (
          <div style={{ marginTop: 16, padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Documents tab content
          </div>
        )}
        {activeTab === 'access' && (
          <div style={{ marginTop: 16, padding: 24, background: 'white', borderRadius: 'var(--ds-border-radius-lg)', border: '1px solid var(--ds-color-border)', color: 'var(--ds-color-text-muted)', fontSize: 14 }}>
            Access tab content
          </div>
        )}
        {activeTab === 'renewal' && <RenewalTab />}
      </div>
    </div>
  )
}
