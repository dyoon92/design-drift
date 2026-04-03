---
drift-spec: "1.0"
screen: BulkPaymentScreen
feature: bulk-payment-processing
owner: payments-team
created: 2026-04-02
updated: 2026-04-02
intent: |
  Facility managers select multiple overdue tenants and process batch payments
  or send payment notices in a single workflow — without opening each tenant record
  individually.
components:
  required: [Navbar, Sidebar, KPICard, Tabs, TenantsTable, PaymentBanner, Badge, Modal, Toast, Button, Dropdown]
  optional: [Input, PinnedNotes, TenantInfoCard, CommunicationsPanel, TenantPageHeader, UnitDetailsCard]
  gaps:
    - name: BulkActionBar
      description: "Multi-select action toolbar — appears when tenants are selected, shows count + bulk actions"
      priority: high
      approved: false
      figma-request: pending
tokens-required:
  - "--ds-color-danger-*"
  - "--ds-color-brand-*"
  - "--ds-color-surface-elevated"
threshold: 80
status: draft
---

## Feature: Bulk Payment Processing

Facility managers need to select multiple overdue tenants, review balances, and
process batch payments or send payment notices in one workflow.

### User actions
- View overdue tenant list filtered by status (All / Overdue / Pending)
- See KPI summary strip: total overdue, collected today, overdue tenant count
- Select one or more tenants using checkboxes
- Process payments for all selected tenants at once
- Send payment notices to selected tenants in bulk
- Export selected tenant records to CSV
- View per-tenant details without leaving the list

### Screens in scope
- BulkPaymentScreen (list + multi-select + confirmation modal)
- Payment detail slide-over (optional — can use existing TenantPage)

### Acceptance criteria
- [ ] All required DS components used — no custom equivalents
- [ ] BulkActionBar replaced by DS ActionBar once Figma spec complete
- [ ] Hardcoded colors = 0 (token violations = 0)
- [ ] catchdrift spec validate passes
- [ ] DS coverage ≥ 80%

### Gap: BulkActionBar
No DS equivalent exists for a multi-select bulk action toolbar.
Design request filed via /drift-push request BulkActionBar.
Expected Figma delivery: TBD.
Workaround: inline Button row until ActionBar ships.
