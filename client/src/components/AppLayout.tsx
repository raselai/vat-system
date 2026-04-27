import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../contexts/CompanyContext';

interface NavItem {
  key: string;
  icon: string;
  label: string;
}

const menuItems: NavItem[] = [
  { key: '/dashboard', icon: 'dashboard', label: 'Overview' },
  { key: '/companies', icon: 'business_center', label: 'Business Setup' },
  { key: '/invoices', icon: 'receipt_long', label: 'Invoices' },
  { key: '/vds/certificates', icon: 'verified', label: 'VDS Certificates' },
  { key: '/vds/deposits', icon: 'account_balance', label: 'Treasury Deposits' },
  { key: '/registers/sales', icon: 'point_of_sale', label: 'Sales Register' },
  { key: '/registers/purchase', icon: 'shopping_cart', label: 'Purchase Register' },
  { key: '/returns', icon: 'assignment_turned_in', label: 'Monthly Return' },
  { key: '/accounts/ar', icon: 'payments', label: 'Receivables (AR)' },
  { key: '/accounts/ap', icon: 'money_off', label: 'Payables (AP)' },
  { key: '/tds/deductions', icon: 'percent', label: 'TDS Deductions' },
  { key: '/tds/payments', icon: 'receipt', label: 'TDS Payments' },
  { key: '/reports', icon: 'summarize', label: 'Reports' },
  { key: '/audit-logs', icon: 'manage_history', label: 'Audit Log' },
  { key: '/import-export', icon: 'import_export', label: 'Import / Export' },
  { key: '/products', icon: 'inventory_2', label: 'Products' },
  { key: '/customers', icon: 'group', label: 'Customers' },
  { key: '/settings', icon: 'settings', label: 'Settings' },
];

function MaterialIcon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className || ''}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { activeCompany } = useCompany();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Track if desktop
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', label: user?.fullName || 'User', icon: <MaterialIcon name="person" /> },
    { key: 'logout', label: 'Log Out', danger: true, icon: <MaterialIcon name="logout" /> },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') handleLogout();
  };

  const isActive = (key: string) => {
    if (key === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(key);
  };

  const handleNav = (key: string) => {
    navigate(key);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 80 : 272;

  /* ─── Sidebar content (shared between desktop fixed & mobile drawer) ─── */
  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className={`${isMobile || !collapsed ? 'px-6' : 'px-3'} mb-8`}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #001d52, #00307e)' }}
          >
            <MaterialIcon name="account_balance" filled />
          </div>
          {(isMobile || !collapsed) && (
            <div className="min-w-0">
              <h1
                className="text-base font-black tracking-tight truncate"
                style={{ fontFamily: "'Manrope', sans-serif", color: '#001d52', letterSpacing: '-0.03em' }}
              >
                Sovereign Ledger
              </h1>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: '#006a4e' }}>
                ● Compliance Active
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const active = isActive(item.key);
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-150 text-left`}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                color: active ? '#001d52' : '#74777f',
                background: active ? 'rgba(0,29,82,0.06)' : 'transparent',
                borderLeft: active ? '3px solid #001d52' : '3px solid transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,29,82,0.04)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <MaterialIcon name={item.icon} className="text-[20px]" />
              {(isMobile || !collapsed) && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`${isMobile || !collapsed ? 'px-6' : 'px-3'} mt-auto pt-6 pb-6 space-y-3`}
        style={{ borderTop: '1px solid rgba(196,198,207,0.18)' }}
      >
        <button
          onClick={() => { handleNav('/invoices/new'); }}
          className="w-full text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, background: 'linear-gradient(135deg, #001d52, #00307e)' }}
        >
          <MaterialIcon name="add" className="text-sm" />
          {(isMobile || !collapsed) && 'New Invoice'}
        </button>

        {(isMobile || !collapsed) && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 transition-colors text-sm font-medium text-left px-1"
            style={{ color: '#74777f', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ba1a1a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#74777f'; }}
          >
            <MaterialIcon name="logout" className="text-xl" />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface font-body">

      {/* ─── Desktop Sidebar (hidden on mobile) ─── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col py-6 h-full border-r border-slate-200/50 bg-surface font-headline tracking-tight transition-all duration-300"
        style={{ width: sidebarWidth }}
      >
        {sidebarContent(false)}
      </aside>

      {/* ─── Mobile Drawer Overlay ─── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 flex flex-col py-6 h-full w-72 bg-surface font-headline tracking-tight shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <MaterialIcon name="close" />
            </button>
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
      >
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 flex justify-between items-center px-4 sm:px-6 lg:px-10 h-16 lg:h-20 bg-surface/80 backdrop-blur-xl border-b border-slate-100 font-headline font-medium text-primary">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger / Desktop collapse */}
            <button
              onClick={() => { if (!isDesktop) setMobileOpen(true); else setCollapsed(!collapsed); }}
              className="text-slate-500 hover:text-primary transition-colors"
            >
              <MaterialIcon name={mobileOpen ? 'close' : 'menu'} />
            </button>

            {/* Search — hidden on small screens */}
            <div className="relative w-64 hidden md:block">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">search</span>
              <input
                type="text"
                placeholder="Search records..."
                className="w-full bg-surface-container-low border-none rounded-3xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Notification */}
            <button className="relative text-slate-600 hover:opacity-80 transition-opacity p-1">
              <MaterialIcon name="notifications" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface" />
            </button>

            {/* User / Company */}
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div className="flex items-center gap-2.5 cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-on-surface leading-none truncate max-w-[160px]">
                    {activeCompany?.name || 'No Company'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                    {activeCompany ? `BIN: ${activeCompany.bin}` : 'Select company'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container flex-shrink-0">
                  <MaterialIcon name="person" filled className="text-lg" />
                </div>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* Page Content — responsive padding */}
        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
