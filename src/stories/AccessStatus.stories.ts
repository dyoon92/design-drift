import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccessStatus } from './AccessStatus'

const meta: Meta<typeof AccessStatus> = {
  title: 'Tenants/AccessStatus',
  component: AccessStatus,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof AccessStatus>

export const Enabled: Story = {
  args: {
    status: 'enabled',
  },
}

export const Revoked: Story = {
  args: {
    status: 'revoked',
  },
}

export const Mixed: Story = {
  args: {
    status: 'mixed',
  },
}
