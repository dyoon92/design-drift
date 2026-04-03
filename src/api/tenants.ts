/**
 * Tenant API
 * ───────────
 * Shape: GET /api/tenants → TenantRecord[]
 *
 * To wire a real backend, replace the body of fetchTenants() with a real
 * fetch call and remove the seed data below.
 */

export interface TenantRecord {
  id: string
  name: string
  email: string
  phone: string
  unit: string
  balance: string
  balanceOverdue: boolean
  paymentStatus: 'balance-due' | 'good-standing' | 'move-out' | 'updated'
  unitStatus: 'overdue' | 'normal' | 'move-out'
  moveInDate: string
  leaseEnd: string
  autopay: boolean
  cardBrand?: string
  cardLast4?: string
}

// ─── Seed data (remove when wiring a real backend) ────────────────────────────

const seed: TenantRecord[] = [
  {
    id: '1',
    name: 'Stephanie Anderson',
    email: 's.anderson@email.com',
    phone: '(555) 248-1190',
    unit: '147',
    balance: '$345.00',
    balanceOverdue: true,
    paymentStatus: 'balance-due',
    unitStatus: 'overdue',
    moveInDate: 'Apr 29, 2023',
    leaseEnd: 'Jun 30, 2025',
    autopay: false,
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'j.smith@email.com',
    phone: '(555) 391-2047',
    unit: '052',
    balance: '$0.00',
    balanceOverdue: false,
    paymentStatus: 'good-standing',
    unitStatus: 'normal',
    moveInDate: 'Jan 15, 2023',
    leaseEnd: 'Jan 14, 2026',
    autopay: true,
    cardBrand: 'Visa',
    cardLast4: '4242',
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 's.johnson@email.com',
    phone: '(555) 774-3301',
    unit: '281',
    balance: '$132.00',
    balanceOverdue: true,
    paymentStatus: 'move-out',
    unitStatus: 'move-out',
    moveInDate: 'Mar 1, 2022',
    leaseEnd: 'Apr 30, 2025',
    autopay: false,
  },
  {
    id: '4',
    name: 'Michael Brown',
    email: 'm.brown@email.com',
    phone: '(555) 509-8812',
    unit: '021',
    balance: '$89.00',
    balanceOverdue: true,
    paymentStatus: 'balance-due',
    unitStatus: 'overdue',
    moveInDate: 'Jun 10, 2024',
    leaseEnd: 'Jun 9, 2025',
    autopay: false,
  },
  {
    id: '5',
    name: 'Emily Davis',
    email: 'e.davis@email.com',
    phone: '(555) 122-6630',
    unit: '319',
    balance: '$0.00',
    balanceOverdue: false,
    paymentStatus: 'good-standing',
    unitStatus: 'normal',
    moveInDate: 'Aug 22, 2023',
    leaseEnd: 'Aug 21, 2025',
    autopay: true,
    cardBrand: 'Mastercard',
    cardLast4: '8731',
  },
]

// ─── API ──────────────────────────────────────────────────────────────────────

export async function fetchTenants(): Promise<TenantRecord[]> {
  // Wire to real backend:
  // return fetch('/api/tenants').then(r => r.json())
  return seed
}
