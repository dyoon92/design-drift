import type { Meta, StoryObj } from '@storybook/react-vite'
import { CommunicationsPanel } from './CommunicationsPanel'

const meta: Meta<typeof CommunicationsPanel> = {
  title: 'Tenants/CommunicationsPanel',
  component: CommunicationsPanel,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof CommunicationsPanel>

export const Default: Story = {
  name: 'Default',
  args: {},
}

export const WithPinnedNotes: Story = {
  name: 'With Pinned Notes',
  args: {
    pinnedNotes: [
      {
        pinnedBy: 'Jane Doe',
        pinnedAt: '6/25/25 at 6:00PM',
        createdBy: 'David Peterson',
        createdAt: '5/14/25 at 9:00AM',
        message: 'Unit 204 has been marked as Unrentable due to a roof leak that caused significant water damage on the back wall and floor. A task has been opened with the maintenance team!',
      },
    ],
  },
}

export const MessagesOnly: Story = {
  name: 'Messages Only (No Pinned)',
  args: {
    pinnedNotes: [],
    messages: [
      {
        type: 'email',
        time: '6/25/25, 8:45 AM',
        subject: 'Rent Due Reminder for Unit150',
        body: "Just a quick reminder that rent for your unit150 is now due. To avoid late fees or any access interruptions, we kindly ask that you submit your payment at your earliest convenience.\n\nIf you've already made your payment—thank you, and please disregard this message.",
        attachments: ['TX Self Storage.pdf  150KB'],
        sentBy: 'David Peterson',
        delivered: true,
      },
      {
        type: 'note',
        time: '6/24/25, 4:30 PM',
        text: 'Tenant called about access hours. Updated gate code and informed tenant of new extended schedule...',
      },
      {
        type: 'lock',
        time: '6/24/25, 2:00 PM',
        lockName: 'Lock',
        unitName: 'Wilburton Unit 102',
        code: '5930',
      },
    ],
  },
}

export const LockActivity: Story = {
  name: 'Lock Activity Only',
  args: {
    pinnedNotes: [],
    messages: [
      {
        type: 'lock',
        time: '6/25/25, 9:15 AM',
        lockName: 'Lock',
        unitName: 'Wilburton Unit 102',
        code: '5930',
      },
      {
        type: 'lock',
        time: '6/24/25, 11:00 AM',
        lockName: 'Lock',
        unitName: 'Wilburton Unit 102',
        code: '4421',
      },
    ],
  },
}
