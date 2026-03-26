import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  parameters: { layout: 'padded' },
  decorators: [
    (Story: React.ComponentType) => {
      const React = require('react')
      return React.createElement('div', { style: { maxWidth: 360 } }, React.createElement(Story))
    },
  ],
}
export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { label: 'Label', placeholder: 'Placeholder text' },
}

export const Filled: Story = {
  args: { label: 'Email', value: 'jane.doe@email.com', state: 'filled' },
}

export const Focused: Story = {
  args: { label: 'Search', state: 'focused' },
}

export const WithHint: Story = {
  args: { label: 'Password', hint: 'Must be at least 8 characters' },
}

export const Error: Story = {
  args: {
    label: 'Email',
    value: 'not-an-email',
    state: 'error',
    feedback: 'Please enter a valid email address.',
    feedbackType: 'error',
  },
}

export const Required: Story = {
  args: { label: 'Full Name', required: true },
}

export const Disabled: Story = {
  args: { label: 'Unit Number', value: '147', state: 'disabled' },
}

export const WithSuccess: Story = {
  name: 'With Success Feedback',
  args: {
    label: 'Promo Code',
    value: 'SUMMER25',
    state: 'filled',
    feedback: 'Promo code applied — 25% off first month.',
    feedbackType: 'success',
  },
}
