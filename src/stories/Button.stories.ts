import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'warning', 'white'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}
export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { label: 'Button label', variant: 'primary', size: 'md' } }
export const Secondary: Story = { args: { label: 'Button label', variant: 'secondary', size: 'md' } }
export const Danger: Story = { args: { label: 'Delete', variant: 'danger', size: 'md' } }
export const Warning: Story = { args: { label: 'Confirm', variant: 'warning', size: 'md' } }
export const Disabled: Story = { args: { label: 'Button label', variant: 'primary', size: 'md', disabled: true } }

export const Sizes: Story = {
  name: 'All Sizes — Primary',
  render: () => {
    const React = require('react')
    const { Button: Btn } = require('./Button')
    return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      React.createElement(Btn, { label: 'Small', variant: 'primary', size: 'sm' }),
      React.createElement(Btn, { label: 'Medium', variant: 'primary', size: 'md' }),
      React.createElement(Btn, { label: 'Large', variant: 'primary', size: 'lg' }),
    )
  },
}

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => {
    const React = require('react')
    const { Button: Btn } = require('./Button')
    return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 16 } },
      React.createElement(Btn, { label: 'Primary', variant: 'primary' }),
      React.createElement(Btn, { label: 'Secondary', variant: 'secondary' }),
      React.createElement(Btn, { label: 'Danger', variant: 'danger' }),
      React.createElement(Btn, { label: 'Warning', variant: 'warning' }),
      React.createElement('div', { style: { background: '#1B1F27', padding: '4px 8px', borderRadius: 8 } },
        React.createElement(Btn, { label: 'White', variant: 'white' })
      ),
    )
  },
}
