import type { Meta, StoryObj } from '@storybook/react-vite'
import { Modal } from './Modal'

const meta: Meta<typeof Modal> = {
  title: 'Primitives/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Modal>

const noop = () => {}

export const Default: Story = {
  args: {
    open: true,
    title: 'Are you sure?',
    message: 'This action cannot be undone.',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: noop,
    onCancel: noop,
  },
}

export const TaxExemption: Story = {
  name: 'Apply Tax Exemption',
  render: () => {
    const React = require('react')
    const { Modal: M } = require('./Modal')
    return React.createElement(M, {
      open: true,
      title: 'Apply Tax Exemption?',
      message: React.createElement('span', null,
        'Are you sure you want to apply tax exemption? This will apply to ',
        React.createElement('strong', null, 'ALL UNITS'),
        ' currently rented by this tenant, as well as any ',
        React.createElement('strong', null, 'future rentals'),
        '.'
      ),
      confirmLabel: 'Yes, apply tax exemption',
      cancelLabel: 'Cancel',
      onConfirm: noop,
      onCancel: noop,
    })
  },
}
