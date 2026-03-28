/**
 * Drift Configuration
 * ─────────────────────────
 * Edit this file to register your own design system components.
 *
 * Each key in `components` must exactly match the React component's
 * display name (what you'd see in React DevTools).
 *
 * Run `npm run figma-sync` to auto-populate figmaLinks from Figma.
 * Run `npm run drift-check` to validate coverage in CI.
 */

import type { DesignDriftConfig } from './types'

const config: DesignDriftConfig = {
  storybookUrl: 'http://localhost:6006',
  figmaFileKey: 'yO7V6x2VhxuIhDyR24fQ2h',
  threshold: 80,

  components: {
    // ─── Core primitives ──────────────────────────────────────────────────────
    Button: {
      storyPath: 'primitives-button--primary',
      // figmaLink: 'https://www.figma.com/design/yx1WkUL3HKF2YVpFRKA7y7/StorageOS?node-id=X-Y',
    },
    Input: {
      storyPath: 'primitives-input--default',
    },
    Badge: {
      storyPath: 'primitives-badge--default',
    },
    UnitBadge: {
      storyPath: 'primitives-badge--unitstatuses',
    },
    CommBadge: {
      storyPath: 'primitives-badge--communicationstatuses',
    },
    Tabs: {
      storyPath: 'components-tabs--default',
    },
    Modal: {
      storyPath: 'primitives-modal--default',
    },
    Toast: {
      storyPath: 'primitives-toast--success',
    },
    Dropdown: {
      storyPath: 'primitives-dropdown--default',
    },
    PinnedNotes: {
      storyPath: 'components-pinned-notes--default',
    },

    // ─── Navigation ───────────────────────────────────────────────────────────
    Navbar: {
      storyPath: 'shell-navbar--default',
    },
    Sidebar: {
      storyPath: 'shell-navbar--sidebardefault',
    },

    // ─── Status / access ──────────────────────────────────────────────────────
    AccessStatus: {
      storyPath: 'tenants-access-status--enabled',
    },

    // ─── Tenant components ────────────────────────────────────────────────────
    TenantPageHeader: {
      storyPath: 'tenants-tenant-page-header--overviewsingleunitgateyespersonal',
    },
    PaymentBanner: {
      storyPath: 'tenants-payment-banner--balancedue',
    },
    TenantInfoCard: {
      storyPath: 'tenants-tenant-info-card--collapsed',
    },
    TenantsTable: {
      storyPath: 'tenants-tenants-table--current',
    },
    UnitDetailsCard: {
      storyPath: 'tenants-unit-details-card--overdue',
    },
    TenantStatsWidget: {
      storyPath: 'tenants-tenant-stats-widget--default',
    },
    MultiUnitBanner: {
      // storyPath: 'tenants-multi-unit-banner--default',  // TODO: add stories file
    },

    // ─── Communication ────────────────────────────────────────────────────────
    CommunicationsPanel: {
      storyPath: 'tenants-communications-panel--default',
    },

    // ─── Portfolio dashboard widgets ──────────────────────────────────────────
    OccupancyWidget: {
      storyPath: 'dashboard--occupancy',
    },
    RevenueWidget: {
      storyPath: 'dashboard--revenue',
    },
    NetMoveInsWidget: {
      storyPath: 'dashboard--netmoveins',
    },
    LeadsWidget: {
      storyPath: 'dashboard--leads',
    },
    PastDueWidget: {
      storyPath: 'dashboard--pastdue',
    },
    UnitStatusWidget: {
      storyPath: 'dashboard--unitstatus',
    },
    ProtectionAutopayWidget: {
      storyPath: 'dashboard--protectionautopay',
    },
    ECRIWidget: {
      storyPath: 'dashboard--ecri',
    },

    // ─── FM dashboard widgets ─────────────────────────────────────────────────
    FMKPIRow: {
      storyPath: 'fm-dashboard--kpirow',
    },
    PriorityTasksPanel: {
      storyPath: 'fm-dashboard--prioritytasks',
    },
    RecentCommunicationsPanel: {
      storyPath: 'fm-dashboard--recentcommunications',
    },
    GoalTrackerPanel: {
      storyPath: 'fm-dashboard--goaltracker',
    },
    DelinquenciesPanel: {
      storyPath: 'fm-dashboard--delinquencies',
    },
    GoogleReviewsPanel: {
      storyPath: 'fm-dashboard--googlereviews',
    },
    PromotionsPanel: {
      storyPath: 'fm-dashboard--promotions',
    },
    MetricSparkPopover: {
      storyPath: 'fm-dashboard--sparkpopoveroccupancy',
    },
  },
}

export default config
