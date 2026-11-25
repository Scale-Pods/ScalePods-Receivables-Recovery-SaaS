import type { ActiveTab } from './components/Sidebar';

// Flat, deep-linkable page routes. The overview tab keeps /dashboard as its
// page name; every other dashboard tab gets its own top-level path.
export const TAB_ROUTES: Record<ActiveTab, string> = {
  overview: '/dashboard',
  focus: '/approvals',
  ledger: '/ledger',
  intake: '/intake',
  sequence: '/sequence',
  forecast: '/forecast',
};

export const ROUTE_TABS: Record<string, ActiveTab> = {
  '/dashboard': 'overview',
  '/approvals': 'focus',
  '/ledger': 'ledger',
  '/intake': 'intake',
  '/sequence': 'sequence',
  '/forecast': 'forecast',
};

const normalizePath = (path: string) => {
  const trimmed = path.toLowerCase().replace(/\/+$/, '');
  return trimmed || '/';
};

export const tabFromPath = (path: string): ActiveTab =>
  ROUTE_TABS[normalizePath(path)] || 'overview';

export const isDashboardPath = (path: string): boolean =>
  normalizePath(path) in ROUTE_TABS;
