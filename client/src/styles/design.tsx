/**
 * Sovereign Ledger — Shared Design Tokens & Micro-Components
 * Source of truth: DESIGN.md
 * Import: { D, Icon, PageHeader, GradBtn, TonalBtn, StatusChip, TableWrap, SLCard, ... }
 */
import type { CSSProperties, ReactNode } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const D = {
  primary:      '#001d52',
  primaryCont:  '#00307e',
  grad:         'linear-gradient(135deg, #001d52, #00307e)',
  surface:      '#f7f9fb',
  surfaceLow:   '#f2f4f6',
  surfaceMid:   '#eaecef',
  surfaceBright:'#ffffff',
  onSurface:    '#191c1e',
  onSurfaceVar: '#44474a',
  tertiary:     '#006a4e',
  tertiaryDark: '#003e28',
  outline:      '#c4c6cf',
  ghost:        'rgba(196,198,207,0.15)',
  red:          '#dc2626',
  redBg:        'rgba(220,38,38,0.10)',
  amber:        '#b45309',
  amberBg:      'rgba(180,83,9,0.10)',
  navy10:       'rgba(0,29,82,0.10)',
  green12:      'rgba(0,106,78,0.12)',
  ambient:      '0 16px 32px rgba(25,28,30,.06)',
  elevated:     '0 24px 48px rgba(0,29,82,.12)',
  manrope:      "'Manrope', sans-serif",
  inter:        "'Inter', sans-serif",
} as const;

// ─── Icon ─────────────────────────────────────────────────────────────────────
interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  style?: CSSProperties;
}
export function Icon({ name, filled, size = 20, style }: IconProps) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
        ...style,
      }}
    >
      {name}
    </span>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  action?: ReactNode;
}
export function PageHeader({ eyebrow, title, sub, action }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div>
        {eyebrow && (
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 4px' }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{ fontFamily: D.manrope, fontSize: 26, fontWeight: 800, color: D.onSurface, margin: 0, lineHeight: 1.15 }}>
          {title}
        </h1>
        {sub && <p style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar, margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─── GradBtn — Primary gradient CTA ──────────────────────────────────────────
interface GradBtnProps {
  onClick?: () => void;
  children: ReactNode;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
  danger?: boolean;
}
export function GradBtn({ onClick, children, icon, loading, disabled, type = 'button', size = 'md', danger }: GradBtnProps) {
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 26px' : '10px 20px';
  const fs  = size === 'sm' ? 12 : size === 'lg' ? 15 : 14;
  const bg  = disabled ? D.surfaceMid : danger ? `linear-gradient(135deg, #7f1d1d, #991b1b)` : D.grad;
  const col = disabled ? D.onSurfaceVar : '#fff';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ background: bg, color: col, border: 'none', borderRadius: 12, padding: pad, fontFamily: D.manrope, fontWeight: 700, fontSize: fs, cursor: disabled || loading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: loading ? 0.75 : 1, transition: 'opacity .15s' }}
    >
      {loading ? <Icon name="progress_activity" size={16} /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

// ─── TonalBtn — Secondary ─────────────────────────────────────────────────────
interface TonalBtnProps {
  onClick?: () => void;
  children: ReactNode;
  icon?: string;
  danger?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
}
export function TonalBtn({ onClick, children, icon, danger, size = 'md', disabled, loading }: TonalBtnProps) {
  const pad = size === 'sm' ? '6px 12px' : '9px 18px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{ background: danger ? D.redBg : D.surfaceMid, color: danger ? D.red : D.onSurface, border: 'none', borderRadius: 10, padding: pad, fontFamily: D.manrope, fontWeight: 600, fontSize: fs, cursor: disabled || loading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled || loading ? 0.6 : 1 }}
    >
      {loading ? <Icon name="progress_activity" size={14} /> : icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  );
}

// ─── BackBtn ──────────────────────────────────────────────────────────────────
interface BackBtnProps { onClick: () => void; label?: string; }
export function BackBtn({ onClick, label = 'Back' }: BackBtnProps) {
  return (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', padding: '4px 0', fontFamily: D.manrope, fontWeight: 600, fontSize: 13, color: D.onSurfaceVar, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon name="arrow_back" size={16} />
      {label}
    </button>
  );
}

// ─── SLCard — White ambient card ──────────────────────────────────────────────
interface SLCardProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number | string;
}
export function SLCard({ children, style, padding = 24 }: SLCardProps) {
  return (
    <div style={{ background: D.surfaceBright, borderRadius: 16, boxShadow: D.ambient, padding, ...style }}>
      {children}
    </div>
  );
}

// ─── TableWrap — Card shell for Ant Design Table ─────────────────────────────
interface TableWrapProps { children: ReactNode; style?: CSSProperties; }
export function TableWrap({ children, style }: TableWrapProps) {
  return (
    <div style={{ background: D.surfaceBright, borderRadius: 16, boxShadow: D.ambient, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
interface FilterBarProps { children: ReactNode; style?: CSSProperties; }
export function FilterBar({ children, style }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center', ...style }}>
      {children}
    </div>
  );
}

// ─── CardSection — styled section inside a form/card ─────────────────────────
interface CardSectionProps {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
}
export function CardSection({ title, children, style }: CardSectionProps) {
  return (
    <div style={{ background: D.surfaceBright, borderRadius: 16, boxShadow: D.ambient, padding: 24, marginBottom: 16, ...style }}>
      {title && (
        <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 16px' }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── SL Divider ───────────────────────────────────────────────────────────────
export function SLDivider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: D.ghost, margin: '16px 0', ...style }} />;
}

// ─── StatusChip ───────────────────────────────────────────────────────────────
const STATUS_PALETTE: Record<string, { bg: string; color: string }> = {
  draft:     { bg: D.surfaceMid,   color: D.onSurfaceVar },
  approved:  { bg: D.green12,      color: '#006a4e' },
  locked:    { bg: D.navy10,       color: D.primary },
  cancelled: { bg: D.redBg,        color: D.red },
  finalized: { bg: D.green12,      color: '#006a4e' },
  reviewed:  { bg: 'rgba(0,71,171,0.10)',  color: '#0047ab' },
  submitted: { bg: D.amberBg,      color: D.amber },
  pending:   { bg: D.amberBg,      color: D.amber },
  deposited: { bg: D.green12,      color: '#006a4e' },
  verified:  { bg: D.navy10,       color: D.primary },
  product:   { bg: D.navy10,       color: D.primary },
  service:   { bg: D.green12,      color: '#006a4e' },
  deductor:  { bg: D.navy10,       color: D.primary },
  deductee:  { bg: D.amberBg,      color: D.amber },
  sales:     { bg: D.navy10,       color: D.primary },
  purchase:  { bg: D.green12,      color: '#006a4e' },
  yes:       { bg: D.green12,      color: '#006a4e' },
  no:        { bg: D.surfaceMid,   color: D.onSurfaceVar },
  POST:      { bg: D.green12,      color: '#006a4e' },
  PUT:       { bg: 'rgba(0,71,171,0.10)', color: '#0047ab' },
  PATCH:     { bg: D.amberBg,      color: D.amber },
  DELETE:    { bg: D.redBg,        color: D.red },
};
interface StatusChipProps { status: string; label?: string; }
export function StatusChip({ status, label }: StatusChipProps) {
  const s = STATUS_PALETTE[status] || { bg: D.surfaceMid, color: D.onSurfaceVar };
  return (
    <span style={{ display: 'inline-block', background: s.bg, color: s.color, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, fontFamily: D.manrope, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {label ?? status}
    </span>
  );
}

// ─── SummaryRow — key/value row inside a card ─────────────────────────────────
interface SummaryRowProps {
  label: string;
  value: ReactNode;
  bold?: boolean;
  highlight?: boolean;
  style?: CSSProperties;
}
export function SummaryRow({ label, value, bold, highlight, style }: SummaryRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${D.ghost}`, ...style }}>
      <span style={{ fontFamily: D.inter, fontSize: 13, color: bold ? D.onSurface : D.onSurfaceVar }}>{label}</span>
      <span style={{ fontFamily: D.manrope, fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color: highlight ? D.primary : D.onSurface }}>{value}</span>
    </div>
  );
}

// ─── MoneyDisplay — large monetary figure ────────────────────────────────────
interface MoneyDisplayProps {
  label: string;
  amount: string;
  gradient?: boolean;
}
export function MoneyDisplay({ label, amount, gradient }: MoneyDisplayProps) {
  if (gradient) {
    return (
      <div style={{ background: D.grad, borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>{label}</p>
          <span style={{ fontFamily: D.manrope, fontSize: 28, fontWeight: 800, color: '#fff' }}>{amount}</span>
        </div>
        <Icon name="account_balance" size={36} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
    );
  }
  return (
    <div style={{ background: D.surfaceLow, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
      <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 4px' }}>{label}</p>
      <span style={{ fontFamily: D.manrope, fontSize: 22, fontWeight: 800, color: D.onSurface }}>{amount}</span>
    </div>
  );
}

// ─── FormActions ──────────────────────────────────────────────────────────────
interface FormActionsProps { children: ReactNode; }
export function FormActions({ children }: FormActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: `1px solid ${D.ghost}`, marginTop: 20 }}>
      {children}
    </div>
  );
}
