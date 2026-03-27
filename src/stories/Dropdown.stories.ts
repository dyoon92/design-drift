import type { Meta, StoryObj } from '@storybook/react-vite'
import { Dropdown } from './Dropdown'

const meta: Meta<typeof Dropdown> = {
  title: 'Primitives/Dropdown',
  component: Dropdown,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof Dropdown>

const noop = () => {}

export const Default: Story = {
  args: {
    onClose: noop,
    items: [
      { label: 'Edit', onClick: noop },
      { label: 'Duplicate', onClick: noop },
      { label: 'Archive', onClick: noop },
      { label: 'Delete', onClick: noop, variant: 'danger' },
    ],
  },
}

export const WithIcons: Story = {
  name: 'With Icons',
  render: () => {
    const React = require('react')
    const { Dropdown: D } = require('./Dropdown')
    const ShieldCheck = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none' },
      React.createElement('path', { d: 'M8 2L3 4.5v3.5c0 2.5 2 4.5 5 5.5 3-1 5-3 5-5.5V4.5L8 2z', stroke: '#161616', strokeWidth: 1.3, strokeLinejoin: 'round' }),
      React.createElement('path', { d: 'M5.5 8l2 2 3-3', stroke: '#161616', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' })
    )
    return React.createElement('div', { style: { position: 'relative', width: 298 } },
      React.createElement(D, {
        onClose: () => {},
        items: [
          { label: 'Exempt from tax', icon: React.createElement(ShieldCheck), onClick: () => {} },
          { label: 'Transfer unit', onClick: () => {} },
          { label: 'Move out', onClick: () => {}, variant: 'danger' },
        ],
      })
    )
  },
}
