import type { Meta, StoryObj } from '@storybook/react-vite'
import { TenantInfoCard } from './TenantInfoCard'

const meta: Meta<typeof TenantInfoCard> = {
  title: 'Tenants/TenantInfoCard',
  component: TenantInfoCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof TenantInfoCard>

const sampleDetails = [
  { label: 'Account Type', value: 'Individual' },
  { label: 'Business Name', value: '—' },
  { label: 'Tax ID', value: '—' },
  { label: 'Name', value: 'Stephanie Anderson' },
  { label: 'Email', value: 'stephanie.anderson@email.com' },
  { label: 'Email Enrollment', value: 'Enrolled' },
  { label: 'Phone (Mobile)', value: '(555) 012-3456' },
  { label: 'SMS Enrollment', value: 'Enrolled' },
  { label: "Driver's License", value: 'D1234567' },
  { label: 'Issued State', value: 'California' },
  { label: 'Address', value: '147 Oak Street\nApt 3B\nLos Angeles, CA 90001' },
]

const sampleAlternateContact = {
  name: 'Robert Anderson',
  relationship: 'Spouse',
  type: 'Emergency Contact',
  phone: '(555) 987-6543',
  email: 'robert.anderson@email.com',
}

const sampleBeneficiary = {
  name: 'Emily Anderson',
  relationship: 'Daughter',
  type: 'Beneficiary',
  phone: '(555) 111-2222',
  email: 'emily.anderson@email.com',
}

const sampleMilitaryDetails = [
  { label: 'Active Military', value: 'Yes' },
  { label: 'Branch', value: 'Army' },
  { label: 'Start Date', value: 'Jan 1, 2018' },
  { label: 'Date of Birth', value: 'Mar 15, 1990' },
  { label: 'Commanding Officer', value: 'Col. James Smith' },
]

export const Collapsed: Story = {
  name: 'Collapsed',
  args: {
    details: sampleDetails,
    defaultExpanded: false,
  },
}

export const AddDetails: Story = {
  name: 'Add Details',
  args: {
    details: sampleDetails,
    defaultExpanded: true,
  },
}

export const Expanded: Story = {
  name: 'Expanded',
  args: {
    details: sampleDetails,
    alternateContact: sampleAlternateContact,
    beneficiary: sampleBeneficiary,
    militaryDetails: sampleMilitaryDetails,
    defaultExpanded: true,
  },
}
