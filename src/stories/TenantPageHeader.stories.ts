import type { Meta, StoryObj } from '@storybook/react-vite'
import { TenantPageHeader } from './TenantPageHeader'

const meta: Meta<typeof TenantPageHeader> = {
  title: 'Tenants/TenantPageHeader',
  component: TenantPageHeader,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof TenantPageHeader>

const defaultArgs = {
  name: 'Stephanie Anderson',
  email: 'stephanie.anderson@email.com',
  phone: '(555) 012-3456',
  balance: '$132.00',
  balanceOverdue: false,
  accessStatus: 'enabled' as const,
  accessCode: '1234',
  accessHours: '24/7',
  unitStatus: 'overdue' as const,
}

export const OverviewSingleUnitGateYesPersonal: Story = {
  name: 'Overview, Single Unit, Gate Yes, Personal',
  args: {
    ...defaultArgs,
    activeTab: 'overview',
    numberOfUnits: 'single',
    gateIntegrated: true,
    tenantType: 'personal',
  },
}

export const OverviewSingleUnitGateYesBusiness: Story = {
  name: 'Overview, Single Unit, Gate Yes, Business',
  args: {
    ...defaultArgs,
    activeTab: 'overview',
    numberOfUnits: 'single',
    gateIntegrated: true,
    tenantType: 'business',
  },
}

export const OverviewSingleUnitGateNoPersonal: Story = {
  name: 'Overview, Single Unit, Gate No, Personal',
  args: {
    ...defaultArgs,
    activeTab: 'overview',
    numberOfUnits: 'single',
    gateIntegrated: false,
    tenantType: 'personal',
  },
}

export const AccessTabSingleUnitGateNoPersonal: Story = {
  name: 'Access Tab, Single Unit, Gate No, Personal',
  args: {
    ...defaultArgs,
    activeTab: 'access',
    numberOfUnits: 'single',
    gateIntegrated: false,
    tenantType: 'personal',
    balanceOverdue: true,
    name: "Jorge Gonzalez"
  },
}

export const DocumentsTab: Story = {
  name: 'Documents Tab',
  args: {
    ...defaultArgs,
    activeTab: 'documents',
    numberOfUnits: 'single',
    gateIntegrated: true,
    tenantType: 'personal',
  },
}

export const OverviewMultiUnitGateYesPersonal: Story = {
  name: 'Overview, Multi Unit, Gate Yes, Personal',
  args: {
    ...defaultArgs,
    activeTab: 'overview',
    numberOfUnits: 'multi',
    gateIntegrated: true,
    tenantType: 'personal',
  },
}
