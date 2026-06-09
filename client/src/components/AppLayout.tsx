import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../contexts/CompanyContext';
import { useLang } from '../contexts/LanguageContext';
import HelpDrawer from './HelpDrawer';
import type { StringKey } from '../i18n/strings';

interface NavItem {
  key: string;
  icon: string;
  label: StringKey; // plain-language label (translated)
  jargon?: string;  // NBR/accountant term kept as a constant subtitle
}
interface NavGroup {
  header: StringKey;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    header: 'nav.group.home',
    items: [
      { key: '/home', icon: 'home', label: 'nav.home' },
      { key: '/dashboard', icon: 'dashboard', label: 'nav.overview', jargon: 'Dashboard' },
    ],
  },
  {
    header: 'nav.group.daily',
    items: [
      { key: '/invoices', icon: 'receipt_long', label: 'nav.invoices', jargon: 'Invoices · Musak 6.3' },
      { key: '/customers', icon: 'group', label: 'nav.customers', jargon: 'Customers' },
      { key: '/products', icon: 'inventory_2', label: 'nav.products', jargon: 'Products' },
    ],
  },
  {
    header: 'nav.group.money',
    items: [
      { key: '/accounts/ar', icon: 'payments', label: 'nav.ar', jargon: 'Receivables (AR)' },
      { key: '/accounts/ap', icon: 'money_off', label: 'nav.ap', jargon: 'Payables (AP)' },
      { key: '/accounts/cashbook', icon: 'menu_book', label: 'nav.cashbook', jargon: 'Cash/Bank Book' },
      { key: '/accounts/party-ledger', icon: 'contacts', label: 'nav.partyLedger', jargon: 'Party Ledger' },
      { key: '/accounts/payment-accounts', icon: 'account_balance', label: 'nav.paymentAccounts', jargon: 'Money Accounts' },
    ],
  },
  {
    header: 'nav.group.taxes',
    items: [
      { key: '/vds/certificates', icon: 'verified', label: 'nav.vds', jargon: 'VDS · Musak 6.6' },
      { key: '/vds/deposits', icon: 'account_balance', label: 'nav.deposits', jargon: 'Treasury Deposits' },
      { key: '/registers/sales', icon: 'point_of_sale', label: 'nav.salesRegister', jargon: 'Musak 6.7' },
      { key: '/registers/purchase', icon: 'shopping_cart', label: 'nav.purchaseRegister', jargon: 'Musak 6.7' },
      { key: '/returns', icon: 'assignment_turned_in', label: 'nav.returns', jargon: 'Return · Musak 9.1' },
      { key: '/tds/deductions', icon: 'percent', label: 'nav.tdsDeductions', jargon: 'TDS' },
      { key: '/tds/payments', icon: 'receipt', label: 'nav.tdsPayments', jargon: 'TDS' },
      { key: '/income-tax', icon: 'account_balance_wallet', label: 'nav.incomeTax', jargon: 'Income Tax · Individual' },
    ],
  },
  {
    header: 'nav.group.insights',
    items: [
      { key: '/reports', icon: 'summarize', label: 'nav.reports', jargon: 'Reports' },
      { key: '/audit-logs', icon: 'manage_history', label: 'nav.audit', jargon: 'Audit Log' },
    ],
  },
  {
    header: 'nav.group.setup',
    items: [
      { key: '/companies', icon: 'business_center', label: 'nav.business', jargon: 'Companies' },
      { key: '/import-export', icon: 'import_export', label: 'nav.importExport' },
      { key: '/settings', icon: 'settings', label: 'nav.settings' },
    ],
  },
];

// Minimal nav for income-tax-only users (userType 'income_tax', no company).
const incomeTaxNavGroups: NavGroup[] = [
  {
    header: 'nav.group.incomeTax',
    items: [
      { key: '/income-tax-home', icon: 'home', label: 'nav.itHome' },
      { key: '/income-tax', icon: 'account_balance_wallet', label: 'nav.itCalculator', jargon: 'Income Tax · Individual' },
    ],
  },
  {
    header: 'nav.group.setup',
    items: [
      { key: '/welcome', icon: 'add_business', label: 'nav.addCompany' },
      { key: '/settings', icon: 'settings', label: 'nav.settings' },
    ],
  },
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
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, companies, logout } = useAuth();
  const { activeCompany } = useCompany();
  const { t, lang, setLang } = useLang();

  // Income-tax-only mode: a personal income-tax user who hasn't added a company.
  // Drives which nav, header chip, and bottom CTA are shown.
  const incomeTaxMode = user?.userType === 'income_tax' && companies.length === 0;
  const groups = incomeTaxMode ? incomeTaxNavGroups : navGroups;

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
    { key: 'logout', label: t('nav.logout'), danger: true, icon: <MaterialIcon name="logout" /> },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') handleLogout();
  };

  const isActive = (key: string) => {
    if (key === '/home') return location.pathname === '/home';
    if (key === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(key);
  };

  const handleNav = (key: string) => {
    navigate(key);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 80 : 272;
  const showText = (isMobile: boolean) => isMobile || !collapsed;

  /* ─── Sidebar content (shared between desktop fixed & mobile drawer) ─── */
  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className={`${showText(isMobile) ? 'px-6' : 'px-3'} mb-6`}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #001d52, #00307e)' }}
          >
            <MaterialIcon name="account_balance" filled />
          </div>
          {showText(isMobile) && (
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
      <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
        {groups.map((group) => (
          <div key={group.header} className="mb-3">
            {showText(isMobile) && (
              <p
                className="px-3 mb-1 mt-2"
                style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa0a6' }}
              >
                {t(group.header)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-150 text-left"
                    title={!showText(isMobile) ? t(item.label) : undefined}
                    style={{
                      fontFamily: "'Manrope', sans-serif",
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
                    {showText(isMobile) && (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate" style={{ fontWeight: active ? 700 : 500, fontSize: 13 }}>{t(item.label)}</span>
                        {item.jargon && (
                          <span className="block truncate" style={{ fontSize: 10.5, fontWeight: 500, color: '#9aa0a6' }}>{item.jargon}</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`${showText(isMobile) ? 'px-6' : 'px-3'} mt-auto pt-4 pb-6 space-y-3`}
        style={{ borderTop: '1px solid rgba(196,198,207,0.18)' }}
      >
        <button
          onClick={() => { handleNav(incomeTaxMode ? '/income-tax' : '/invoices/new'); }}
          className="w-full text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, background: 'linear-gradient(135deg, #001d52, #00307e)' }}
        >
          <MaterialIcon name={incomeTaxMode ? 'calculate' : 'add'} className="text-sm" />
          {showText(isMobile) && t(incomeTaxMode ? 'nav.calculateTax' : 'nav.newInvoice')}
        </button>

        {showText(isMobile) && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 transition-colors text-sm font-medium text-left px-1"
            style={{ color: '#74777f', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ba1a1a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#74777f'; }}
          >
            <MaterialIcon name="logout" className="text-xl" />
            <span>{t('nav.logout')}</span>
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
                placeholder={t('header.search')}
                className="w-full bg-surface-container-low border-none rounded-3xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language toggle */}
            <div className="flex items-center rounded-full overflow-hidden" style={{ background: 'rgba(0,29,82,0.06)' }}>
              {(['en', 'bn'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-2.5 py-1 transition-colors"
                  style={{
                    fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: lang === l ? '#001d52' : 'transparent',
                    color: lang === l ? '#fff' : '#74777f',
                  }}
                >
                  {l === 'en' ? 'EN' : 'বাং'}
                </button>
              ))}
            </div>

            {/* Help */}
            <button
              onClick={() => setHelpOpen(true)}
              title={t('help.open')}
              className="text-slate-600 hover:text-primary transition-colors p-1"
            >
              <MaterialIcon name="help" />
            </button>

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
                    {incomeTaxMode ? (user?.fullName || 'Income Tax') : (activeCompany?.name || 'No Company')}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">
                    {incomeTaxMode ? t('ithome.eyebrow') : activeCompany ? `BIN: ${activeCompany.bin}` : 'Select company'}
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

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
