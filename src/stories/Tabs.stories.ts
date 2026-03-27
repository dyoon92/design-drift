import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs } from './Tabs'

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof Tabs>

export const Default: Story = {
  name: 'Default',
  args: {
    activeKey: 'current',
    tabs: [
      { key: 'current', label: 'Current', count: 24 },
      { key: 'past', label: 'Past', count: 8 },
      { key: 'applicants', label: 'Applicants', count: 3 },
      { key: 'waitlist', label: 'Waitlist', count: 2 },
    ],
  },
}

export const TenantDetail: Story = {
  name: 'Tenant Detail',
  args: {
    activeKey: 'overview',
    tabs: [
      { key: 'overview', label: 'Overview' },
      { key: 'billing', label: 'Billing' },
      { key: 'documents', label: 'Documents' },
      { key: 'access', label: 'Access' },
      { key: 'renewal', label: 'Renewal' },
    ],
  },
}

export const NoCounts: Story = {
  name: 'No Counts',
  args: {
    activeKey: 'overview',
    tabs: [
      { key: 'overview', label: 'Overview' },
      { key: 'billing', label: 'Billing' },
      { key: 'documents', label: 'Documents' },
    ],
  },
}
