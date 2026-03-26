import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  OccupancyWidget,
  RevenueWidget,
  NetMoveInsWidget,
  LeadsWidget,
  PastDueWidget,
  UnitStatusWidget,
  ProtectionAutopayWidget,
  ECRIWidget,
} from './DashboardWidgets'

const meta: Meta = {
  title: 'Dashboard',
  parameters: {
    layout: 'padded',
  },
}
export default meta

export const Occupancy: StoryObj = {
  name: 'Occupancy Widget',
  render: () => <div style={{ width: 560, height: 380 }}><OccupancyWidget /></div>,
}

export const Revenue: StoryObj = {
  name: 'Revenue Widget',
  render: () => <div style={{ width: 420, height: 340 }}><RevenueWidget /></div>,
}

export const NetMoveIns: StoryObj = {
  name: 'Net Move-Ins Widget',
  render: () => <div style={{ width: 360, height: 340 }}><NetMoveInsWidget /></div>,
}

export const Leads: StoryObj = {
  name: 'Leads Widget',
  render: () => <div style={{ width: 360, height: 340 }}><LeadsWidget /></div>,
}

export const PastDue: StoryObj = {
  name: 'Past Due Widget',
  render: () => <div style={{ width: 360, height: 340 }}><PastDueWidget /></div>,
}

export const UnitStatus: StoryObj = {
  name: 'Unit Status Widget',
  render: () => <div style={{ width: 360, height: 340 }}><UnitStatusWidget /></div>,
}

export const ProtectionAutopay: StoryObj = {
  name: 'Tenant Protection + Autopay Widget',
  render: () => <div style={{ width: 360, height: 340 }}><ProtectionAutopayWidget /></div>,
}

export const ECRI: StoryObj = {
  name: 'ECRI Widget',
  render: () => <div style={{ width: 360, height: 340 }}><ECRIWidget /></div>,
}
