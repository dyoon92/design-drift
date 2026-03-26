import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaseRenewalPage } from './LeaseRenewalPage'

const meta: Meta<typeof LeaseRenewalPage> = {
  title: '🧪 Prototypes / Lease Renewal Flow',
  component: LeaseRenewalPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**This prototype was generated from a single plain-English PM prompt:**

> *"Build a tenant page for Stephanie Anderson (Unit 147, overdue $345). Add a new Renewal tab. When active, show her current lease details and an Accept / Decline button row."*

It uses **real design system components** — \`TenantPageHeader\`, \`PaymentBanner\` — composed together.
No custom colors. No one-off styles. Every visual value comes from the design tokens.

When engineering picks this up, the heavy lifting is already done.
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LeaseRenewalPage>

export const Default: Story = {}
