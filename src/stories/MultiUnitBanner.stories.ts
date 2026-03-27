import type { Meta, StoryObj } from '@storybook/react'
import { MultiUnitBanner } from './MultiUnitBanner'

const meta: Meta<typeof MultiUnitBanner> = {
  title: 'Tenants/Multi Unit Banner',
  component: MultiUnitBanner,
  tags: ['autodocs'],
  args: {
    balanceAmount: '$345.00',
    dueDate: 'Jul 29, 2024',
    paidThrough: 'Jul 29, 2024',
    lastPayment: 'Jun 15, 2024',
    moveOutDate: 'Aug 15, 2024',
    transferToUnit: '204',
    transferAmount: '$1,200.00',
  },
}

export default meta
type Story = StoryObj<typeof MultiUnitBanner>

export const Overdue: Story = {
  args: { state: 'overdue' },
}

export const GoodStanding: Story = {
  args: { state: 'good-standing' },
}

export const BalanceExists: Story = {
  args: { state: 'balance-exists' },
}

export const MoveOut: Story = {
  args: { state: 'move-out' },
}

export const Transfer: Story = {
  args: { state: 'transfer' },
}

export const PastTenant: Story = {
  args: { state: 'past-tenant' },
}
