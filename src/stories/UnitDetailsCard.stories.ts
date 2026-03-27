import type { Meta, StoryObj } from '@storybook/react-vite'
import { UnitDetailsCard } from './UnitDetailsCard'

const meta: Meta<typeof UnitDetailsCard> = {
  title: 'Tenants/UnitDetailsCard',
  component: UnitDetailsCard,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof UnitDetailsCard>

export const Overdue: Story = {
  name: 'Overdue',
  args: {
    unitNumber: '147',
    status: 'overdue',
  },
}

export const GoodStanding: Story = {
  name: 'Good Standing',
  args: {
    unitNumber: '052',
    status: 'good-standing',
    excludedFromRentIncreases: false,
  },
}

export const MoveOut: Story = {
  name: 'Move Out',
  args: {
    unitNumber: '281',
    status: 'move-out',
    excludedFromRentIncreases: false,
  },
}

export const Vacant: Story = {
  name: 'Vacant',
  args: {
    unitNumber: '319',
    status: 'vacant',
    excludedFromRentIncreases: false,
  },
}
