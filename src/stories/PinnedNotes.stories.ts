import type { Meta, StoryObj } from '@storybook/react-vite'
import { PinnedNotes } from './PinnedNotes'

const meta: Meta<typeof PinnedNotes> = {
  title: 'Components/PinnedNotes',
  component: PinnedNotes,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof PinnedNotes>

export const Default: Story = {
  name: 'Default (3 notes)',
}

export const SingleNote: Story = {
  name: 'Single Note',
  args: {
    notes: [
      {
        pinnedBy: 'Jane Doe',
        pinnedAt: '6/25/25 at 6:00PM',
        createdBy: 'David Peterson',
        createdAt: '5/14/25 at 9:00AM',
        message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor.',
      },
    ],
  },
}

export const WithReadMore: Story = {
  name: 'With Read More',
  args: {
    notes: [
      {
        pinnedBy: 'Jane Doe',
        pinnedAt: '6/25/25 at 6:00PM',
        createdBy: 'David Peterson',
        createdAt: '5/14/25 at 9:00AM',
        message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team to investigate and repair the source of the leak.',
        truncated: true,
      },
    ],
  },
}
