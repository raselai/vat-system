import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   DESIGN SYSTEM — "The Sovereign Ledger"
   Source: DESIGN.md
   Primary: #001d52  |  Gradient CTA: 135° #001d52→#00307e
   Surface stack: #fff → #f7f9fb → #f2f4f6 → #eaecef → #e4e6e9
   Tertiary (Compliance Green): #003e28 / #006a4e
   Typography: Manrope (Authority) + Inter (Utility)
   Rules: No 1px dividers · Tonal layering · Ambient shadows
──────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Inter:ital,wght@0,300;0,400;0,500;1,300&display=swap');

.ld,
.ld *,
.ld *::before,
.ld *::after { box-sizing: border-box; margin: 0; padding: 0; }

.ld {
  /* DESIGN.md surface hierarchy */
  --s-bright:    #ffffff;
  --s-base:      #f7f9fb;
  --s-low:       #f2f4f6;
  --s-mid:       #eaecef;
  --s-high:      #e4e6e9;
  --on-s:        #191c1e;
  --on-s-var:    #44474a;
  --ov:          #c4c6cf;  /* outline-variant */

  /* Primary navy */
  --p:           #001d52;
  --pc:          #00307e;
  --on-p:        #ffffff;

  /* Compliance green (tertiary) */
  --t:           #006a4e;
  --tc:          #003e28;
  --on-t:        #ffffff;
  --on-tc:       #c8fce4;

  --err:         #ba1a1a;

  /* Derived */
  --grad:        linear-gradient(135deg, var(--p), var(--pc));
  --shadow-a:    0 16px 32px rgba(25,28,30,.06);   /* ambient */
  --shadow-b:    0 32px 64px rgba(0,29,82,.12);    /* elevated */
  --ghost:       rgba(196,198,207,.15);             /* ghost border */

  font-family: 'Inter', sans-serif;
  background: var(--s-base);
  color: var(--on-s);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ── Scroll reveal ─────────────────────────────── */
.r {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity .7s cubic-bezier(.25,.46,.45,.94),
              transform .7s cubic-bezier(.25,.46,.45,.94);
}
.r.on { opacity: 1; transform: none; }
.r.d1 { transition-delay: .08s; }
.r.d2 { transition-delay: .16s; }
.r.d3 { transition-delay: .24s; }
.r.d4 { transition-delay: .32s; }

/* ── Load animations ───────────────────────────── */
@keyframes fadeUp {
  from { opacity:0; transform:translateY(18px); }
  to   { opacity:1; transform:none; }
}
.a1 { animation: fadeUp .7s ease both; }
.a2 { animation: fadeUp .7s .12s ease both; }
.a3 { animation: fadeUp .7s .24s ease both; }
.a4 { animation: fadeUp .7s .36s ease both; }
.a5 { animation: fadeUp .7s .48s ease both; }

/* ── Navbar ────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(247,249,251,.88);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  box-shadow: 0 1px 0 var(--ghost), var(--shadow-a);
}
.nav-in {
  max-width: 1200px; margin: 0 auto;
  padding: 0 2rem; height: 68px;
  display: flex; align-items: center; justify-content: space-between;
}
.logo { display: flex; align-items: center; gap: .75rem; text-decoration: none; }
.logo-mark {
  width: 38px; height: 38px;
  background: var(--grad);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 1rem;
  box-shadow: 0 4px 14px rgba(0,29,82,.3);
}
.logo-text {
  font-family: 'Manrope', sans-serif;
  font-weight: 800; font-size: 1.15rem;
  color: var(--p); letter-spacing: -.03em;
}
.nav-ctas { display: flex; align-items: center; gap: .5rem; }

/* Buttons — DESIGN.md spec */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: .5rem; text-decoration: none; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-weight: 700;
  border: none; transition: all .2s ease;
  border-radius: 1.5rem; /* xl per spec */
}
.btn-ghost {
  padding: .5rem 1.2rem; font-size: .875rem;
  background: transparent; color: var(--p);
}
.btn-ghost:hover { background: var(--s-low); }
.btn-solid {
  padding: .55rem 1.25rem; font-size: .875rem;
  background: var(--grad); color: var(--on-p);
}
.btn-solid:hover { opacity: .88; transform: translateY(-1px); }
.btn-lg {
  padding: .85rem 2.25rem; font-size: .9375rem;
  background: var(--grad); color: var(--on-p);
  border-radius: 1.5rem;
}
.btn-lg:hover { opacity: .88; transform: translateY(-2px); }
.btn-outline-light {
  padding: .85rem 2.25rem; font-size: .9375rem;
  background: rgba(255,255,255,.12); color: #fff;
  border: 1px solid rgba(255,255,255,.22); border-radius: 1.5rem;
  backdrop-filter: blur(8px);
}
.btn-outline-light:hover { background: rgba(255,255,255,.2); }

/* ── Hero ──────────────────────────────────────── */
.hero {
  background: var(--s-bright);
  padding: 5.5rem 2rem 5rem;
  position: relative; overflow: hidden;
}
/* Subtle mesh: per "Glass & Gradient" spirit */
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 55% 55% at 85% 35%, rgba(0,29,82,.04) 0%, transparent 70%),
    radial-gradient(ellipse 40% 50% at 15% 85%, rgba(0,106,78,.03) 0%, transparent 65%);
  pointer-events: none;
}
.hero-in {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 400px;
  gap: 4.5rem; align-items: center;
  position: relative; z-index: 1;
}
.badge {
  display: inline-flex; align-items: center; gap: .45rem;
  padding: .35rem 1rem;
  background: rgba(0,62,40,.08);
  border-radius: 100px;
  color: var(--tc); font-family: 'Manrope', sans-serif;
  font-size: .7rem; font-weight: 800;
  letter-spacing: .09em; text-transform: uppercase;
  margin-bottom: 1.875rem;
}
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--t);
  animation: blink 2.2s ease infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

.hero-h1 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.75rem, 5.5vw, 4.75rem);
  font-weight: 800; line-height: 1.05;
  letter-spacing: -.04em; color: var(--on-s);
  margin-bottom: 1.5rem;
}
.hero-h1 em {
  font-style: italic; font-weight: 300;
  color: var(--p); letter-spacing: -.02em;
}
.hero-sub {
  font-size: 1.0625rem; color: var(--on-s-var);
  line-height: 1.75; font-weight: 400;
  max-width: 44ch; margin-bottom: 2.5rem;
}
.hero-ctas { display: flex; gap: .75rem; flex-wrap: wrap; }

/* Compliance card mockup */
.compliance-card {
  background: var(--s-bright);
  border-radius: 24px;
  box-shadow: var(--shadow-b);
  overflow: hidden;
  position: relative;
}
/* Top accent bar — gradient per DESIGN.md */
.compliance-card::before {
  content: ''; display: block;
  height: 3px; background: var(--grad);
}
.cc-body { padding: 1.75rem; }
.cc-label {
  font-family: 'Manrope', sans-serif;
  font-size: .68rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--on-s-var); margin-bottom: 1.25rem;
}
.cc-metric {
  font-family: 'Manrope', sans-serif;
  font-size: 2.75rem; font-weight: 800;
  letter-spacing: -.04em; color: var(--on-s);
  line-height: 1; margin-bottom: .3rem;
}
.cc-metric span { color: var(--p); }
.cc-meta { font-size: .75rem; color: var(--on-s-var); margin-bottom: 1.25rem; }
.cc-chips { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.chip {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .28rem .75rem; border-radius: 100px;
  font-family: 'Manrope', sans-serif;
  font-size: .68rem; font-weight: 800; letter-spacing: .04em;
}
.chip-green { background: rgba(0,62,40,.1); color: var(--tc); }
.chip-blue  { background: rgba(0,29,82,.08); color: var(--p); }
/* Tonal separator — no 1px line, just bg shift */
.cc-rows { background: var(--s-low); border-radius: 14px; padding: .25rem .875rem; }
.cc-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: .625rem 0;
}
.cc-row + .cc-row {
  /* 4px background shift effect via pseudo — but simpler: just spacing */
  border-top: 1px solid rgba(196,198,207,.12);
}
.cc-row-lbl { font-size: .78rem; color: var(--on-s-var); }
.cc-row-val {
  font-family: 'Manrope', sans-serif;
  font-size: .82rem; font-weight: 700; color: var(--on-s);
}
.cc-row-val.pos { color: var(--t); }
.cc-row-val.neg { color: var(--err); }

/* ── Stats strip ───────────────────────────────── */
.stats { background: var(--s-low); padding: 4rem 2rem; }
.stats-in {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4,1fr); gap: 2rem;
}
.stat { text-align: center; }
.stat-n {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.25rem, 4vw, 3.25rem); font-weight: 800;
  letter-spacing: -.04em; color: var(--p);
  line-height: 1; margin-bottom: .4rem;
}
.stat-l {
  font-size: .78rem; font-weight: 500;
  color: var(--on-s-var); letter-spacing: .02em;
}

/* ── Section shell ─────────────────────────────── */
.sec { padding: 7rem 2rem; }
.sec-in { max-width: 1200px; margin: 0 auto; }
.eyebrow {
  font-family: 'Manrope', sans-serif;
  font-size: .7rem; font-weight: 800;
  letter-spacing: .12em; text-transform: uppercase;
  color: var(--p); margin-bottom: .875rem;
}
.h2 {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 800; letter-spacing: -.04em;
  color: var(--on-s); line-height: 1.08;
  margin-bottom: 1.25rem;
}
.lead {
  font-size: 1rem; color: var(--on-s-var);
  line-height: 1.75; font-weight: 400; max-width: 48ch;
}

/* ── Features ──────────────────────────────────── */
.feat-sec { background: var(--s-base); }
.feat-hdr {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 5rem; align-items: end; margin-bottom: 4.5rem;
}
.feat-grid {
  display: grid; grid-template-columns: repeat(2,1fr);
  gap: 1.25rem;
}
.feat {
  /* surface_container_lowest card on surface base — tonal layering */
  background: var(--s-bright);
  border-radius: 20px; padding: 2rem;
  box-shadow: var(--shadow-a);
  cursor: default;
  transition: transform .25s ease, box-shadow .25s ease;
}
.feat:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 52px rgba(25,28,30,.1);
}
.feat-n {
  font-family: 'Manrope', sans-serif;
  font-size: .65rem; font-weight: 800;
  color: var(--p); letter-spacing: .08em;
  margin-bottom: 1.1rem; opacity: .5;
}
.feat-ico {
  width: 44px; height: 44px;
  background: var(--s-low); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: var(--p); font-size: 1.15rem;
  margin-bottom: 1.1rem;
  transition: background .25s, color .25s;
}
.feat:hover .feat-ico { background: var(--grad); color: #fff; }
.feat-title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.0rem; font-weight: 700;
  color: var(--on-s); letter-spacing: -.025em;
  margin-bottom: .5rem;
}
.feat-desc {
  font-size: .8125rem; color: var(--on-s-var);
  line-height: 1.75;
}

/* ── How it works ──────────────────────────────── */
.how-sec { background: var(--s-low); }
.how-hdr {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 5rem; align-items: end; margin-bottom: 4rem;
}
.steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; }
.step {
  background: var(--s-bright);
  border-radius: 20px; padding: 2.25rem 1.75rem;
  box-shadow: var(--shadow-a);
  position: relative;
}
.step-ghost {
  font-family: 'Manrope', sans-serif;
  font-size: 4.5rem; font-weight: 800;
  color: var(--s-high); line-height: 1;
  letter-spacing: -.05em; margin-bottom: 1.5rem;
  user-select: none;
}
.step-ico {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--s-low);
  display: flex; align-items: center; justify-content: center;
  color: var(--p); font-size: 1.25rem;
  margin-bottom: 1.1rem;
}
.step-title {
  font-family: 'Manrope', sans-serif;
  font-size: 1.0625rem; font-weight: 700;
  color: var(--on-s); letter-spacing: -.025em;
  margin-bottom: .625rem;
}
.step-desc { font-size: .8125rem; color: var(--on-s-var); line-height: 1.75; }

/* ── Why us ────────────────────────────────────── */
.why-sec { background: var(--s-base); }
.why-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 5rem; align-items: start;
}
.why-items { display: flex; flex-direction: column; margin-top: 2.75rem; }
.why-item { display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.625rem 0; }
.why-item + .why-item {
  /* No divider — 24px whitespace per DESIGN.md */
}
.why-ico {
  width: 44px; height: 44px; flex-shrink: 0;
  background: var(--s-low); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: var(--p); font-size: 1.05rem;
}
.why-item h4 {
  font-family: 'Manrope', sans-serif;
  font-size: .9375rem; font-weight: 700;
  color: var(--on-s); letter-spacing: -.025em;
  margin-bottom: .35rem;
}
.why-item p { font-size: .8125rem; color: var(--on-s-var); line-height: 1.75; }

/* Comparison card (navy, on-brand) */
.cmp-card {
  background: var(--p);
  border-radius: 24px; padding: 2.5rem;
  box-shadow: var(--shadow-b);
  position: relative; overflow: hidden;
}
.cmp-card::before {
  content: '';
  position: absolute; top: -30%; right: -20%;
  width: 280px; height: 280px; border-radius: 50%;
  background: rgba(255,255,255,.04); pointer-events: none;
}
.cmp-head-lbl {
  font-family: 'Manrope', sans-serif;
  font-size: .68rem; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase;
  color: rgba(255,255,255,.35); margin-bottom: 1.5rem;
}
.cmp-cols-hdr {
  display: flex; justify-content: flex-end; gap: 1.5rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.cmp-col-lbl {
  font-family: 'Manrope', sans-serif;
  font-size: .65rem; font-weight: 800;
  letter-spacing: .07em; text-transform: uppercase;
  min-width: 90px; text-align: center;
  color: rgba(255,255,255,.3);
}
.cmp-col-lbl.hl { color: rgba(255,255,255,.85); }
.cmp-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: .875rem 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.cmp-row:last-child { border-bottom: none; }
.cmp-lbl { font-size: .78rem; color: rgba(255,255,255,.48); font-weight: 400; }
.cmp-vals { display: flex; gap: 1.5rem; }
.cmp-v {
  font-family: 'Manrope', sans-serif;
  font-size: .84rem; font-weight: 800;
  min-width: 90px; text-align: center;
}
.yes { color: #6ee7b7; }
.no  { color: rgba(255,255,255,.18); }

/* ── CTA ───────────────────────────────────────── */
.cta-sec { background: var(--grad); position: relative; overflow: hidden; }
.cta-sec::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 80% at 85% 40%, rgba(255,255,255,.05) 0%, transparent 60%),
    radial-gradient(ellipse 45% 65% at 5% 95%, rgba(0,106,78,.18) 0%, transparent 55%);
  pointer-events: none;
}
.cta-in {
  max-width: 860px; margin: 0 auto;
  padding: 9rem 2rem; text-align: center;
  position: relative; z-index: 1;
}
.cta-h {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.5rem, 6vw, 5.25rem);
  font-weight: 800; color: #fff;
  letter-spacing: -.045em; line-height: 1.05;
  margin-bottom: 1.5rem;
}
.cta-h em { font-style: italic; font-weight: 300; opacity: .75; }
.cta-sub {
  color: rgba(255,255,255,.6); font-size: 1rem;
  line-height: 1.75; margin-bottom: 3rem;
}
.btn-cta {
  display: inline-flex; align-items: center; gap: .625rem;
  padding: 1rem 2.75rem;
  background: #fff; color: var(--p);
  font-family: 'Manrope', sans-serif; font-weight: 800;
  font-size: 1rem; border-radius: 1.5rem;
  text-decoration: none; border: none; cursor: pointer;
  /* Ambient shadow per DESIGN.md — on_surface 6% / 32px / 16px */
  box-shadow: 0 16px 32px rgba(25,28,30,.06);
  transition: all .22s ease;
}
.btn-cta:hover { transform: translateY(-3px); box-shadow: 0 24px 48px rgba(25,28,30,.14); }

/* ── Footer ────────────────────────────────────── */
.footer { background: #080f1f; padding: 2.5rem 2rem; }
.footer-in {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center;
  justify-content: space-between; gap: 1rem; flex-wrap: wrap;
}
.footer-copy { font-size: .75rem; color: rgba(255,255,255,.2); }

/* ── Responsive ────────────────────────────────── */
@media (max-width: 1024px) {
  .hero-in { grid-template-columns: 1fr; }
  .compliance-card { display: none; }
  .feat-hdr, .how-hdr, .why-grid { grid-template-columns: 1fr; gap: 2rem; }
}
@media (max-width: 768px) {
  .hero { padding: 4rem 1.5rem; }
  .feat-grid { grid-template-columns: 1fr; }
  .steps { grid-template-columns: 1fr; }
  .stats-in { grid-template-columns: repeat(2,1fr); }
  .sec { padding: 5rem 1.5rem; }
}
@media (max-width: 480px) {
  .hero-ctas { flex-direction: column; }
  .btn-lg, .btn-outline-light { justify-content: center; }
}
`;

/* ── Data ───────────────────────────────────────────────── */

const features = [
  { n:'01', icon:'receipt_long',        title:'Tax Invoice — Musak 6.3',              desc:'Bilingual Bangla–English challans with multi-rate VAT, SD, and VDS auto-calculated. Invoices lock on approval — fully audit-safe.' },
  { n:'02', icon:'verified',             title:'VDS Certificates — Musak 6.6',         desc:'End-to-end withholding tax: deduct, certify, deposit to treasury, and claim VDS credit in your return automatically.' },
  { n:'03', icon:'point_of_sale',        title:'Sales & Purchase Register — Musak 6.7', desc:'Auto-aggregated monthly registers from your invoices. Zero manual entry. Export as landscape PDF in one click.' },
  { n:'04', icon:'assignment_turned_in', title:'Monthly VAT Return — Musak 9.1',       desc:'One-click return: Output VAT + SD − Input VAT − VDS Credit ± Adjustments. NBR portal filing guide PDF included.' },
  { n:'05', icon:'summarize',            title:'Reports & Analytics',                  desc:'VAT summary, rate-band breakdowns, VDS summaries — exportable to PDF and Excel for any tax month.' },
  { n:'06', icon:'import_export',        title:'Bulk Import / Export',                 desc:'Upload products, customers, and invoices via CSV or XLSX with a preview step before committing. Export instantly.' },
];

const steps = [
  { n:'01', icon:'edit_document',        title:'Create Your Invoice',     desc:'Enter item details. VAT, SD, and VDS calculate automatically using the correct NBR multi-rate formula.' },
  { n:'02', icon:'assignment_turned_in', title:'Generate Monthly Return', desc:'At month-end, one click aggregates all invoices and VDS credits into a complete Musak 9.1 with net payable computed.' },
  { n:'03', icon:'upload_file',          title:'File with NBR',           desc:'Download the NBR Filing Guide PDF and follow the field-by-field checklist for manual entry on vat.gov.bd.' },
];

const whyItems = [
  { icon:'public',          title:'Web-Based, No Installation',    desc:'Open any browser and go. No .exe, no Windows-only requirement, no IT department.' },
  { icon:'group',           title:'Multi-User with RBAC',          desc:'Admin and Operator roles. Your accountant and manager work simultaneously with correct permissions.' },
  { icon:'cloud_done',      title:'Automatic Daily Backups',       desc:'Encrypted backups run at 2 AM Asia/Dhaka every night. Your data survives any hardware failure.' },
  { icon:'business_center', title:'Multi-Company Management',      desc:'Manage multiple BINs under one account. Every company is fully isolated — zero data leakage.' },
];

const comparison = [
  { label:'Accessible from any device',     us:true,  them:false },
  { label:'Multi-user simultaneous access', us:true,  them:false },
  { label:'Automatic cloud backup',         us:true,  them:false },
  { label:'Multi-company in one account',   us:true,  them:false },
  { label:'Instant updates, no reinstall',  us:true,  them:false },
];

/* ── Helpers ────────────────────────────────────────────── */
function Icon({ name, size='1.15rem' }: { name:string; size?:string }) {
  return <span className="material-symbols-outlined" style={{ fontSize:size, lineHeight:1, display:'block' }}>{name}</span>;
}

/* ── Component ──────────────────────────────────────────── */
export default function LandingPage() {

  /* Inject CSS */
  useEffect(() => {
    const id = 'ld-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = CSS;
      document.head.appendChild(el);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  /* Scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll('.r');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }),
      { threshold: 0.1 },
    );
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <div className="ld">

      {/* ── Navbar ─────────────────────────────────── */}
      <header className="nav">
        <div className="nav-in">
          <Link to="/" className="logo">
            <div className="logo-mark"><Icon name="account_balance" size=".95rem" /></div>
            <span className="logo-text">Sovereign Ledger</span>
          </Link>
          <div className="nav-ctas">
            <Link to="/login"    className="btn btn-ghost">Sign In</Link>
            <Link to="/register" className="btn btn-solid">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="hero">
        <div className="hero-in">

          {/* Left */}
          <div>
            <div className="badge a1"><span className="badge-dot" />NBR Bangladesh · VAT Compliance</div>
            <h1 className="hero-h1 a2">
              Bangladesh VAT,<br />
              <em>Precisely Governed.</em>
            </h1>
            <p className="hero-sub a3">
              Generate Musak 6.3, 6.6, 6.7 &amp; 9.1 forms automatically.
              Manage invoices, VDS certificates, and monthly returns in one
              secure, web-based platform — built for Bangladesh.
            </p>
            <div className="hero-ctas a4">
              <Link to="/register" className="btn btn-lg">
                <Icon name="rocket_launch" size="1rem" />
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-ghost" style={{ padding:'.85rem 1.75rem', fontSize:'.9375rem' }}>
                Sign In <Icon name="arrow_forward" size=".9rem" />
              </Link>
            </div>
          </div>

          {/* Right — Compliance card mockup */}
          <div className="compliance-card a5">
            <div className="cc-body">
              <div className="cc-label">VAT Summary — April 2026</div>
              <div className="cc-metric">৳<span>4,25,750</span></div>
              <div className="cc-meta">Net VAT Payable this month</div>
              <div className="cc-chips">
                <span className="chip chip-green"><Icon name="check_circle" size=".7rem" />Musak 9.1 Ready</span>
                <span className="chip chip-blue"><Icon name="lock" size=".7rem" />Reviewed</span>
              </div>
              <div className="cc-rows">
                <div className="cc-row">
                  <span className="cc-row-lbl">Output VAT</span>
                  <span className="cc-row-val">৳ 6,12,500</span>
                </div>
                <div className="cc-row">
                  <span className="cc-row-lbl">Input VAT Credit</span>
                  <span className="cc-row-val neg">− ৳ 1,45,250</span>
                </div>
                <div className="cc-row">
                  <span className="cc-row-lbl">VDS Credit</span>
                  <span className="cc-row-val neg">− ৳ 41,500</span>
                </div>
                <div className="cc-row">
                  <span className="cc-row-lbl" style={{ fontWeight:600 }}>Net Payable</span>
                  <span className="cc-row-val pos">৳ 4,25,750</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="stats">
        <div className="stats-in">
          {[
            { n:'4',     l:'NBR Forms Supported' },
            { n:'100%',  l:'Web-Based' },
            { n:'Daily', l:'Auto Backup' },
            { n:'0',     l:'Installation Required' },
          ].map(({ n, l }) => (
            <div key={l} className="stat r">
              <div className="stat-n">{n}</div>
              <div className="stat-l">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────── */}
      <section className="sec feat-sec">
        <div className="sec-in">
          <div className="feat-hdr">
            <div>
              <div className="eyebrow r">Full NBR Coverage</div>
              <h2 className="h2 r d1">Every form.<br />Every workflow.</h2>
            </div>
            <p className="lead r d2">
              From your first invoice to the final monthly return — every NBR-required
              document and calculation handled automatically, with zero manual math.
            </p>
          </div>
          <div className="feat-grid">
            {features.map(({ n, icon, title, desc }, i) => (
              <div key={n} className={`feat r d${(i % 3) + 1}`}>
                <div className="feat-n">{n}</div>
                <div className="feat-ico"><Icon name={icon} size="1.2rem" /></div>
                <div className="feat-title">{title}</div>
                <div className="feat-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section className="sec how-sec">
        <div className="sec-in">
          <div className="how-hdr">
            <div>
              <div className="eyebrow r">Workflow</div>
              <h2 className="h2 r d1">Invoice to filing<br />in three steps.</h2>
            </div>
            <p className="lead r d2">
              A clear, linear path from data entry to NBR submission.
              No guesswork, no spreadsheets.
            </p>
          </div>
          <div className="steps">
            {steps.map(({ n, icon, title, desc }, i) => (
              <div key={n} className={`step r d${i + 1}`}>
                <div className="step-ghost">{n}</div>
                <div className="step-ico"><Icon name={icon} size="1.25rem" /></div>
                <div className="step-title">{title}</div>
                <div className="step-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why us ─────────────────────────────────── */}
      <section className="sec why-sec">
        <div className="sec-in">
          <div className="why-grid">

            <div>
              <div className="eyebrow r">Why Sovereign Ledger</div>
              <h2 className="h2 r d1">Beyond the<br />desktop era.</h2>
              <p className="lead r d2">
                Traditional VAT software is desktop-bound, single-user, and
                fragile. We built Sovereign Ledger for the web from day one.
              </p>
              <div className="why-items">
                {whyItems.map(({ icon, title, desc }, i) => (
                  <div key={title} className={`why-item r d${(i % 3) + 1}`}>
                    <div className="why-ico"><Icon name={icon} size="1.05rem" /></div>
                    <div>
                      <h4>{title}</h4>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cmp-card r d2">
              <div className="cmp-head-lbl">Feature Comparison</div>
              <div className="cmp-cols-hdr">
                <span className="cmp-col-lbl">Desktop VAT</span>
                <span className="cmp-col-lbl hl">Sovereign Ledger</span>
              </div>
              {comparison.map(({ label, us, them }) => (
                <div key={label} className="cmp-row">
                  <span className="cmp-lbl">{label}</span>
                  <div className="cmp-vals">
                    <span className={`cmp-v ${them ? 'yes' : 'no'}`}>{them ? '✓' : '✕'}</span>
                    <span className={`cmp-v ${us   ? 'yes' : 'no'}`}>{us   ? '✓' : '✕'}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="cta-sec">
        <div className="cta-in">
          <h2 className="cta-h r">
            Ready to simplify<br />
            <em>your VAT compliance?</em>
          </h2>
          <p className="cta-sub r d1">
            Join businesses across Bangladesh using Sovereign Ledger
            to stay compliant, accurate, and audit-ready every month.
          </p>
          <Link to="/register" className="btn-cta r d2">
            <Icon name="rocket_launch" size="1.1rem" />
            Create Free Account
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-in">
          <div className="logo">
            <div className="logo-mark" style={{ width:32, height:32, borderRadius:8 }}>
              <Icon name="account_balance" size=".8rem" />
            </div>
            <span className="logo-text" style={{ fontSize:'1rem' }}>Sovereign Ledger</span>
          </div>
          <span className="footer-copy">
            © {new Date().getFullYear()} Sovereign Ledger · Built for Bangladesh NBR compliance
          </span>
        </div>
      </footer>

    </div>
  );
}
