import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Table, Select, InputNumber, Switch, Input, message, Popconfirm } from 'antd';
import {
  D, PageHeader, SLCard, CardSection, TableWrap, StatusChip,
  GradBtn, TonalBtn, SummaryRow, MoneyDisplay,
} from '../../styles/design';
import HelpHint from '../../components/HelpHint';
import { useLang } from '../../contexts/LanguageContext';
import {
  computeIncomeTaxReturn, IncomeTaxCategory, IncomeTaxpayerStatus,
} from '../../utils/incomeTaxCalc';
import {
  listComputations, saveComputation, deleteComputation, downloadComputationPdf,
} from '../../services/incomeTax';
import { IncomeTaxComputation } from '../../types';

const CATEGORY_OPTIONS: { value: IncomeTaxCategory; label: string }[] = [
  { value: 'general', label: 'General individual (৳3,75,000 free)' },
  { value: 'women_senior', label: 'Woman / Senior 65+ (৳4,25,000 free)' },
  { value: 'third_gender_disabled', label: 'Third gender / Disabled (৳5,00,000 free)' },
  { value: 'freedom_fighter', label: 'Freedom fighter (৳5,25,000 free)' },
];

const CATEGORY_LABEL: Record<string, string> = {
  general: 'General',
  women_senior: 'Woman / Senior 65+',
  third_gender_disabled: 'Third gender / Disabled',
  freedom_fighter: 'Freedom fighter',
};

const ASSESSMENT_YEARS = ['2026-2027', '2025-2026'];

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function IncomeTaxCalculator() {
  const { lang } = useLang();

  const [assessmentYear, setAssessmentYear] = useState('2026-2027');
  const [category, setCategory] = useState<IncomeTaxCategory>('general');
  const [taxpayerStatus, setTaxpayerStatus] = useState<IncomeTaxpayerStatus>('existing');
  const [subjectToMin, setSubjectToMin] = useState(true);
  const [taxableIncome, setTaxableIncome] = useState<number>(0);
  const [advanceTaxPaid, setAdvanceTaxPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState<IncomeTaxComputation[]>([]);
  const [loading, setLoading] = useState(true);

  // Live calculation via the client engine (mirrors the server result).
  const result = useMemo(
    () => computeIncomeTaxReturn({ taxableIncome, category, taxpayerStatus, advanceTaxPaid, subjectToMinimum: subjectToMin }),
    [taxableIncome, category, taxpayerStatus, advanceTaxPaid, subjectToMin],
  );

  const fetchSaved = () => {
    setLoading(true);
    listComputations()
      .then(setSaved)
      .catch(() => message.error('Failed to load saved computations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSaved(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveComputation({ assessmentYear, category, taxpayerStatus, subjectToMin, taxableIncome, advanceTaxPaid, notes: notes || undefined });
      message.success(`Saved computation for ${assessmentYear}`);
      fetchSaved();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const loadIntoForm = (c: IncomeTaxComputation) => {
    setAssessmentYear(c.assessmentYear);
    setCategory(c.category);
    setTaxpayerStatus(c.taxpayerStatus);
    setSubjectToMin(c.subjectToMin);
    setTaxableIncome(c.taxableIncome);
    setAdvanceTaxPaid(c.advanceTaxPaid);
    setNotes(c.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComputation(id);
      message.success('Deleted');
      fetchSaved();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const breakdownColumns = [
    { title: 'Income slab', dataIndex: 'label', key: 'label' },
    { title: 'Amount', dataIndex: 'slabAmount', key: 'slabAmount', align: 'right' as const, render: (v: number) => fmt(v) },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right' as const, render: (v: number) => `${v}%` },
    { title: 'Tax', dataIndex: 'tax', key: 'tax', align: 'right' as const, render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(v)}</span> },
  ];

  const savedColumns = [
    {
      title: 'Year', key: 'year',
      render: (_: unknown, r: IncomeTaxComputation) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{r.assessmentYear}</span>
      ),
    },
    { title: 'Category', key: 'cat', className: 'hidden sm:table-cell', render: (_: unknown, r: IncomeTaxComputation) => CATEGORY_LABEL[r.category] || r.category },
    { title: 'Taxable income', key: 'ti', align: 'right' as const, className: 'hidden md:table-cell', render: (_: unknown, r: IncomeTaxComputation) => fmt(r.taxableIncome) },
    {
      title: 'Net payable', key: 'np', align: 'right' as const,
      render: (_: unknown, r: IncomeTaxComputation) =>
        r.refundable > 0
          ? <StatusChip status="approved" label={`Refund ${fmt(r.refundable)}`} />
          : <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{fmt(r.netPayable)}</span>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: IncomeTaxComputation) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <TonalBtn size="sm" icon="edit" onClick={() => loadIntoForm(r)}>Load</TonalBtn>
          <TonalBtn size="sm" icon="download" onClick={() => downloadComputationPdf(r.id, r.assessmentYear)}>PDF</TonalBtn>
          <Popconfirm title="Delete this computation?" onConfirm={() => handleDelete(r.id)}>
            <TonalBtn size="sm" icon="delete" danger>Delete</TonalBtn>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Income Tax"
        title="My Income Tax"
        sub="Estimate your individual income tax — FY 2025–26 (Assessment Year 2026–27)"
      />
      <HelpHint id="income-tax">
        {lang === 'bn'
          ? 'আপনার বার্ষিক করযোগ্য আয় ও শ্রেণি দিন — অ্যাপটি ধাপভিত্তিক হারে কর গণনা করবে (করমুক্ত সীমা, ন্যূনতম কর সহ)। ইতিমধ্যে পরিশোধিত অগ্রিম কর / উৎসে কর্তিত কর বিয়োগ করে প্রদেয় কর দেখাবে। এটি আপনার ব্যক্তিগত হিসাব — কোম্পানির সাথে যুক্ত নয়।'
          : 'Enter your annual taxable income and category — the app computes tax across the progressive slabs (tax-free threshold + minimum tax), then subtracts advance tax / TDS you have already paid. This is your personal calculation, not tied to a company.'}
      </HelpHint>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="it-grid">
        {/* ── Inputs ── */}
        <CardSection title="Your details">
          <div style={{ display: 'grid', gap: 14 }}>
            <label>
              <span style={lblStyle}>Assessment year</span>
              <Select value={assessmentYear} onChange={setAssessmentYear} style={{ width: '100%' }}
                options={ASSESSMENT_YEARS.map(y => ({ value: y, label: y }))} />
            </label>
            <label>
              <span style={lblStyle}>Taxpayer category</span>
              <Select value={category} onChange={v => setCategory(v as IncomeTaxCategory)} style={{ width: '100%' }} options={CATEGORY_OPTIONS} />
            </label>
            <label>
              <span style={lblStyle}>Taxpayer status</span>
              <Select value={taxpayerStatus} onChange={v => setTaxpayerStatus(v as IncomeTaxpayerStatus)} style={{ width: '100%' }}
                options={[
                  { value: 'existing', label: 'Existing taxpayer (min. tax ৳5,000)' },
                  { value: 'new', label: 'New taxpayer (min. tax ৳1,000)' },
                ]} />
            </label>
            <label>
              <span style={lblStyle}>Annual taxable income (৳)</span>
              <InputNumber value={taxableIncome} min={0} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number((v || '').replace(/,/g, ''))}
                onChange={v => setTaxableIncome(Number(v) || 0)} />
            </label>
            <label>
              <span style={lblStyle}>Advance tax / TDS already paid (৳)</span>
              <InputNumber value={advanceTaxPaid} min={0} style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number((v || '').replace(/,/g, ''))}
                onChange={v => setAdvanceTaxPaid(Number(v) || 0)} />
              <span style={hintStyle}>
                {lang === 'bn'
                  ? 'ইতিমধ্যে আপনার কাছ থেকে কর্তিত মোট কর — সনদ থেকে যোগ করুন: বেতনের কর সনদ, ব্যাংক/এফডিআর সুদের সনদ, সঞ্চয়পত্রের কর, গাড়ির (বিআরটিএ) অগ্রিম কর রসিদ, বাড়ি ভাড়া/ফি-এর উৎসে কর্তিত কর সনদ। অনুমান নয় — সনদ অনুযায়ী দিন।'
                  : 'The tax already collected from you during the year — add up your certificates: salary tax certificate, bank/FDR interest certificate, savings-certificate (Sanchayapatra) TDS, car (BRTA) advance-tax receipt, and any rent/fee TDS certificates. Use the certificates, don’t estimate.'}
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Switch checked={subjectToMin} onChange={setSubjectToMin} size="small" />
              <span style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar }}>Apply minimum tax floor</span>
            </div>
            <label>
              <span style={lblStyle}>Notes (optional)</span>
              <Input.TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </label>
            <GradBtn icon="save" onClick={handleSave} loading={saving}>Save computation</GradBtn>
          </div>
        </CardSection>

        {/* ── Live result ── */}
        <SLCard>
          {result.refundable > 0
            ? <MoneyDisplay gradient label="Refundable" amount={fmt(result.refundable)} />
            : <MoneyDisplay gradient label="Net tax payable" amount={fmt(result.netPayable)} />}

          <TableWrap style={{ marginBottom: 16, boxShadow: 'none', background: D.surfaceLow }}>
            <Table columns={breakdownColumns} dataSource={result.breakdown.map((b, i) => ({ ...b, key: i }))}
              pagination={false} size="small" />
          </TableWrap>

          <SummaryRow label="Gross tax (slabs)" value={fmt(result.grossTax)} />
          {result.applicableMinimum > 0 && (
            <SummaryRow label="Minimum tax floor" value={fmt(result.applicableMinimum)} />
          )}
          <SummaryRow label="Tax after minimum" value={fmt(result.taxAfterMinimum)} bold />
          <SummaryRow label="Less: advance tax / TDS" value={`(${fmt(advanceTaxPaid)})`} />
          {result.refundable > 0
            ? <SummaryRow label="Refundable" value={fmt(result.refundable)} bold highlight />
            : <SummaryRow label="Net payable" value={fmt(result.netPayable)} bold highlight />}
        </SLCard>
      </div>

      {/* ── Saved computations ── */}
      <div style={{ marginTop: 28 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 16, color: D.onSurface, margin: '0 0 12px' }}>Saved computations</p>
        <TableWrap>
          <Table columns={savedColumns} dataSource={saved} rowKey="id" loading={loading}
            pagination={{ pageSize: 20, hideOnSinglePage: true }} size="small" scroll={{ x: 700 }}
            locale={{ emptyText: 'No saved computations yet — fill in your details and Save.' }} />
        </TableWrap>
      </div>

      <style>{`@media (max-width: 900px){ .it-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

const lblStyle: CSSProperties = {
  display: 'block', fontFamily: D.manrope, fontSize: 12, fontWeight: 600,
  color: D.onSurfaceVar, marginBottom: 5,
};

const hintStyle: CSSProperties = {
  display: 'block', fontFamily: D.inter, fontSize: 11.5, lineHeight: 1.45,
  color: D.onSurfaceVar, marginTop: 6, opacity: 0.85,
};
