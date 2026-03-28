import React, { useState } from 'react'

export interface DetailItem {
  label: string
  value: string
}

export interface ContactInfo {
  name: string
  relationship: string
  type: string
  phone: string
  email: string
}

export interface TenantInfoCardProps {
  details: DetailItem[]
  alternateContact?: ContactInfo
  beneficiary?: ContactInfo
  militaryDetails?: DetailItem[]
  defaultExpanded?: boolean
  onEdit?: () => void
}

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6l4 4 4-4" stroke="var(--ds-color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 10l4-4 4 4" stroke="var(--ds-color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--ds-color-text-primary)',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fontWeight: 400,
        color: 'var(--ds-color-text-primary)',
        whiteSpace: 'pre-line',
      }}
    >
      {value}
    </span>
  </div>
)

const ContactSection: React.FC<{ title: string; contact: ContactInfo }> = ({ title, contact }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--ds-color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </span>
    <DetailRow label="Name" value={contact.name} />
    <DetailRow label="Relationship" value={contact.relationship} />
    <DetailRow label="Type" value={contact.type} />
    <DetailRow label="Phone" value={contact.phone} />
    <DetailRow label="Email" value={contact.email} />
  </div>
)

export const TenantInfoCard: React.FC<TenantInfoCardProps> = ({
  details,
  alternateContact,
  beneficiary,
  militaryDetails,
  defaultExpanded = false,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const hasAdditionalSection = alternateContact !== undefined || beneficiary !== undefined || militaryDetails !== undefined

  return (
    <div
      style={{
        background: 'var(--ds-color-white)',
        border: '1px solid var(--ds-color-border)',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        fontFamily: 'Inter, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>
          Tenant Information
        </span>
        <button
          onClick={onEdit}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-color-primary)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            padding: 0,
          }}
        >
          Edit
        </button>
      </div>

      {/* Detail list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {details.map((item, i) => (
          <DetailRow key={i} label={item.label} value={item.value} />
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--ds-color-border)',
          margin: '20px 0',
        }}
      />

      {/* Additional Details section */}
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: 0,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-color-text-primary)' }}>
            Additional Details
          </span>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expanded && hasAdditionalSection && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {alternateContact && (
              <ContactSection title="Alternate Contact" contact={alternateContact} />
            )}

            {beneficiary && (
              <>
                <div style={{ height: 1, background: 'var(--ds-color-border)' }} />
                <ContactSection title="Beneficiary" contact={beneficiary} />
              </>
            )}

            {militaryDetails && militaryDetails.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--ds-color-border)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--ds-color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Military Details
                  </span>
                  {militaryDetails.map((item, i) => (
                    <DetailRow key={i} label={item.label} value={item.value} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {expanded && !hasAdditionalSection && (
          <div
            style={{
              marginTop: 16,
              padding: '20px',
              background: 'var(--ds-color-surface-subtle)',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--ds-color-text-muted)' }}>
              No additional details added yet.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default TenantInfoCard
TenantInfoCard.displayName = 'TenantInfoCard'
