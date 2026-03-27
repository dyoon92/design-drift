import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  argTypes: {
    status: { control: 'select', options: ['active', 'inactive', 'in-progress', 'secondary', 'error', 'archive'] },
    size: { control: 'select', options: ['lg', 'sm'] },
    contrast: { control: 'select', options: ['high', 'low'] },
  },
}
export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = { args: { status: 'active', size: 'lg', contrast: 'high' } }
export const LowContrast: Story = { args: { status: 'active', size: 'lg', contrast: 'low' } }
export const Small: Story = { args: { status: 'in-progress', size: 'sm', contrast: 'high' } }

export const AllStatuses: Story = {
  name: 'All Statuses — High Contrast',
  render: () => {
    const React = require('react')
    const { Badge: B } = require('./Badge')
    const statuses = ['active', 'inactive', 'in-progress', 'secondary', 'error', 'archive']
    return React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      ...statuses.map((s: string) => React.createElement(B, { key: s, status: s, contrast: 'high' }))
    )
  },
}

export const AllStatusesLow: Story = {
  name: 'All Statuses — Low Contrast',
  render: () => {
    const React = require('react')
    const { Badge: B } = require('./Badge')
    const statuses = ['active', 'inactive', 'in-progress', 'secondary', 'error', 'archive']
    return React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      ...statuses.map((s: string) => React.createElement(B, { key: s, status: s, contrast: 'low' }))
    )
  },
}

export const UnitStatuses: Story = {
  name: 'Unit Status Badges',
  render: () => {
    const React = require('react')
    const { UnitBadge } = require('./Badge')
    const statuses = [
      'delinquent','occupied','overdue','overlock','in-progress','vacant',
      'waitlisted','reserved','lien','auction','pending','owner-occupied',
      'unrentable','maintenance','paused','transferring','tax-exempt',
    ]
    return React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 600 } },
      ...statuses.map((s: string) => React.createElement(UnitBadge, { key: s, status: s, contrast: 'low' }))
    )
  },
}

export const CommunicationStatuses: Story = {
  name: 'Communication Status Badges',
  render: () => {
    const React = require('react')
    const { CommBadge } = require('./Badge')
    const statuses = ['delivered', 'bounced', 'deferred', 'blocked']
    return React.createElement('div', { style: { display: 'flex', gap: 8 } },
      ...statuses.map((s: string) => React.createElement(CommBadge, { key: s, status: s, contrast: 'low' }))
    )
  },
}
