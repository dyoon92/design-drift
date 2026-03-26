import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  title: 'Primitives/Toast',
  component: Toast,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Toast>

const noop = () => {}

export const Success: Story = {
  args: { open: true, type: 'success', message: 'Tax exemption applied successfully.', onClose: noop },
}

export const Error: Story = {
  args: { open: true, type: 'error', message: 'Something went wrong. Please try again.', onClose: noop },
}

export const Warning: Story = {
  args: { open: true, type: 'warning', message: 'This action will affect multiple units.', onClose: noop },
}
