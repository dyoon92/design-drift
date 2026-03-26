import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaymentBanner } from './PaymentBanner'

const meta: Meta<typeof PaymentBanner> = {
  title: 'Tenants/PaymentBanner',
  component: PaymentBanner,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof PaymentBanner>

const defaultArgs = {
  balanceAmount: '$345.00',
  dueDate: 'Jul 29, 2024',
  paidThrough: 'Jun 29, 2024',
  lastPayment: 'May 2, 2024',
  cardBrand: 'Visa',
  cardLast4: '4242',
  cardExpiry: '12/26',
  autopay: true,
  monthlyRent: '$1,200.00',
}

export const Updated: Story = {
  name: 'Updated',
  args: {
    ...defaultArgs,
    status: 'updated',
  },
}

export const GoodStanding: Story = {
  name: 'GoodStanding',
  args: {
    ...defaultArgs,
    status: 'good-standing',
    balanceAmount: '$0.00',
  },
}

export const BalanceDue: Story = {
  name: 'BalanceDue',
  args: {
    ...defaultArgs,
    status: 'balance-due',
  },
}

export const MoveOut: Story = {
  name: 'MoveOut',
  args: {
    ...defaultArgs,
    status: 'move-out',
  },
}

export const Transfer: Story = {
  name: 'Transfer',
  args: {
    ...defaultArgs,
    status: 'transfer',
  },
}

export const Vacant: Story = {
  name: 'Vacant',
  args: {
    ...defaultArgs,
    status: 'vacant',
    balanceAmount: '$0.00',
  },
}
