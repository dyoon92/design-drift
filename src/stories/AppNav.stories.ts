import type { Meta, StoryObj } from '@storybook/react-vite'
import { Navbar, Sidebar } from './AppNav'

const navbarMeta: Meta<typeof Navbar> = {
  title: 'Shell/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
}
export default navbarMeta
type NavbarStory = StoryObj<typeof Navbar>

export const Default: NavbarStory = {
  name: 'Default',
  args: {
    facilityName: 'Drift Storage Co.',
    userName: 'DU',
  },
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const SidebarDefault: StoryObj<typeof Sidebar> = {
  name: 'Sidebar',
  render: (args) => {
    const React = require('react')
    return React.createElement(
      'div',
      { style: { display: 'flex', height: '100vh' } },
      React.createElement(Sidebar, args)
    )
  },
  args: {
    activeNav: 'tenants',
    userName: 'Demo User',
    userEmail: 'demo@driftstorage.co',
  },
}
