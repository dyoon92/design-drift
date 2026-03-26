import type { Meta, StoryObj } from '@storybook/react-vite'
import { TenantOverviewPage } from './TenantOverviewPage'

const meta: Meta<typeof TenantOverviewPage> = {
  title: '🧪 Prototypes / Tenant Overview Page',
  component: TenantOverviewPage,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TenantOverviewPage>

export const Default: Story = {}
