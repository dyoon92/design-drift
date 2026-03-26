/**
 * Design System Component Manifest
 * ─────────────────────────────────
 * Lists every React component that has an official entry in the design system
 * (i.e. it has a Storybook story in src/stories/).
 *
 * The fiber scanner cross-references `fiber.type.name` against this Set at
 * runtime to classify renders as "in DS" (green) or "gap" (red).
 *
 * Run `npm run ds-manifest` (TODO: add script) to auto-generate from stories.
 */

/**
 * Maps component display name → Storybook story path.
 * URL: http://localhost:6006/?path=/story/{path}
 * IDs derived from: title sanitized to kebab + '--' + export name lowercased.
 */
export const DS_STORY_PATHS: Record<string, string> = {
  // Primitives
  Button:                    'primitives-button--primary',
  Input:                     'primitives-input--default',
  Badge:                     'primitives-badge--default',
  UnitBadge:                 'primitives-badge--unitstatuses',
  CommBadge:                 'primitives-badge--communicationstatuses',
  Tabs:                      'components-tabs--default',
  Modal:                     'primitives-modal--default',
  Toast:                     'primitives-toast--success',
  Dropdown:                  'primitives-dropdown--default',
  PinnedNotes:               'components-pinned-notes--default',
  // Navigation
  Navbar:                    'shell-navbar--default',
  Sidebar:                   'shell-navbar--sidebardefault',
  // Tenant
  AccessStatus:              'tenants-access-status--enabled',
  CommunicationsPanel:       'tenants-communications-panel--default',
  PaymentBanner:             'tenants-payment-banner--balancedue',
  TenantInfoCard:            'tenants-tenant-info-card--collapsed',
  TenantPageHeader:          'tenants-tenant-page-header--overviewsingleunitgateyespersonal',
  TenantStatsWidget:         'tenants-tenant-stats-widget--default',
  TenantsTable:              'tenants-tenants-table--current',
  UnitDetailsCard:           'tenants-unit-details-card--overdue',
  // Portfolio dashboard
  OccupancyWidget:           'dashboard--occupancy',
  RevenueWidget:             'dashboard--revenue',
  NetMoveInsWidget:          'dashboard--netmoveins',
  LeadsWidget:               'dashboard--leads',
  PastDueWidget:             'dashboard--pastdue',
  UnitStatusWidget:          'dashboard--unitstatus',
  ProtectionAutopayWidget:   'dashboard--protectionautopay',
  ECRIWidget:                'dashboard--ecri',
  // FM dashboard
  FMKPIRow:                  'fm-dashboard--kpirow',
  PriorityTasksPanel:        'fm-dashboard--prioritytasks',
  RecentCommunicationsPanel: 'fm-dashboard--recentcommunications',
  GoalTrackerPanel:          'fm-dashboard--goaltracker',
  DelinquenciesPanel:        'fm-dashboard--delinquencies',
  GoogleReviewsPanel:        'fm-dashboard--googlereviews',
  PromotionsPanel:           'fm-dashboard--promotions',
  MetricSparkPopover:        'fm-dashboard--sparkpopoveroccupancy',
}

/**
 * Maps component display name → Figma node URL.
 * Format: https://www.figma.com/design/{fileId}/{fileName}?node-id={nodeId}
 *
 * Run `npm run figma-sync` to auto-populate from Figma.
 * Leave as empty Record until real node IDs are available — no FIG↗ badge
 * will appear for empty entries, so there are no broken links.
 */
export const DS_FIGMA_LINKS: Record<string, string> = {
  // Populate via figma-sync or add manually:
  // Button: 'https://www.figma.com/design/YOUR_FILE_ID/StorageOS?node-id=X-Y',
}

export const DS_COMPONENTS = new Set<string>([
  // ─── Core primitives ──────────────────────────────────────────────────────
  'Button',
  'Input',
  'Badge',
  'UnitBadge',
  'CommBadge',
  'Tabs',
  'Modal',
  'Toast',
  'Dropdown',

  // ─── Navigation ───────────────────────────────────────────────────────────
  'Navbar',
  'Sidebar',

  // ─── Status / access ──────────────────────────────────────────────────────
  'AccessStatus',

  // ─── Tenant components ────────────────────────────────────────────────────
  'TenantPageHeader',
  'PaymentBanner',
  'TenantInfoCard',
  'TenantsTable',
  'UnitDetailsCard',
  'TenantStatsWidget',
  'MultiUnitBanner',

  // ─── Communication ────────────────────────────────────────────────────────
  'CommunicationsPanel',
  'PinnedNotes',

  // ─── Portfolio dashboard widgets ──────────────────────────────────────────
  'OccupancyWidget',
  'RevenueWidget',
  'NetMoveInsWidget',
  'LeadsWidget',
  'PastDueWidget',
  'UnitStatusWidget',
  'ProtectionAutopayWidget',
  'ECRIWidget',

  // ─── FM dashboard widgets ─────────────────────────────────────────────────
  'FMKPIRow',
  'PriorityTasksPanel',
  'RecentCommunicationsPanel',
  'GoalTrackerPanel',
  'DelinquenciesPanel',
  'GoogleReviewsPanel',
  'PromotionsPanel',
  'MetricSparkPopover',
])
