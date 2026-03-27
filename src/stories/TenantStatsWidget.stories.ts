import type { Meta, StoryObj } from '@storybook/react-vite'
import { TenantStatsWidget } from './TenantStatsWidget'

const meta: Meta<typeof TenantStatsWidget> = {
  title: 'Tenants/TenantStatsWidget',
  component: TenantStatsWidget,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof TenantStatsWidget>

export const Default: Story = { args: {} }

export const GoodStanding: Story = {
  name: 'Good Standing',
  args: {
    stats: [
      { label: 'Total Paid (YTD)', value: '$17,400', sub: '12 payments', trend: 'up' },
      { label: 'Outstanding Balance', value: '$0', sub: 'All clear', trend: 'up' },
      { label: 'Late Payments', value: '0', sub: 'Last 12 months', trend: 'up' },
      { label: 'Lease Remaining', value: '4 mo', sub: 'Ends Jul 31, 2025', trend: 'neutral' },
    ],
  },
}

export const Delinquent: Story = {
  name: 'Delinquent Tenant',
  args: {
    stats: [
      { label: 'Total Paid (YTD)', value: '$8,700', sub: '6 payments', trend: 'neutral' },
      { label: 'Outstanding Balance', value: '$4,350', sub: 'Overdue 60 days', trend: 'down' },
      { label: 'Late Payments', value: '5', sub: 'Last 12 months', trend: 'down' },
      { label: 'Lease Remaining', value: '2 mo', sub: 'Ends May 31, 2025', trend: 'neutral' },
    ],
  },
}
