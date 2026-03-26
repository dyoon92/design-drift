import type { Meta, StoryObj } from '@storybook/react-vite'
import { TenantsTable } from './TenantsTable'

const meta: Meta<typeof TenantsTable> = {
  title: 'Tenants/TenantsTable',
  component: TenantsTable,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TenantsTable>

export const Current: Story = {
  name: 'Current',
  args: {
    tab: 'current',
  },
}

export const Past: Story = {
  name: 'Past',
  args: {
    tab: 'past',
  },
}
