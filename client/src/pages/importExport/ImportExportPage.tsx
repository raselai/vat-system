import { useState } from 'react';
import { Tabs, Select, DatePicker, message, Table, Alert, Upload, Spin } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import api from '../../services/api';
import { D, Icon, PageHeader, GradBtn, TonalBtn, SLCard, TableWrap } from '../../styles/design';

const { RangePicker } = DatePicker;
const { Dragger } = Upload;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef { name: string; label: string; required: boolean; }
interface PreviewData {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  fields: FieldDef[];
  suggestedMap: Record<string, string>;
}
interface ImportError { row: number; field: string; message: string; }
interface ImportResultData { imported: number; errors: ImportError[]; }

// ─── Export Section ───────────────────────────────────────────────────────────

function ExportSection() {
  const [invoiceType, setInvoiceType] = useState<string | undefined>();
  const [dateRange, setDateRange]     = useState<[string, string] | null>(null);

  const download = async (path: string, filename: string) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { message.error('Export failed'); }
  };

  const exports = [
    {
      key: 'products',
      icon: 'inventory_2',
      title: 'Products',
      desc: 'All products with VAT rates, pricing, and product codes.',
      onCsv:  () => download('export/products?format=csv', 'products.csv'),
      onXlsx: () => download('export/products?format=xlsx', 'products.xlsx'),
    },
    {
      key: 'customers',
      icon: 'group',
      title: 'Customers & Suppliers',
      desc: 'All counterparties with BIN/NID and contact information.',
      onCsv:  () => download('export/customers?format=csv', 'customers.csv'),
      onXlsx: () => download('export/customers?format=xlsx', 'customers.xlsx'),
    },
    {
      key: 'invoices',
      icon: 'receipt_long',
      title: 'Invoices',
      desc: 'Challans filtered by type and date range.',
      isInvoice: true,
      onCsv:  () => {
        const params = new URLSearchParams({ format: 'csv' });
        if (invoiceType) params.set('invoiceType', invoiceType);
        if (dateRange) { params.set('from', dateRange[0]); params.set('to', dateRange[1]); }
        download(`export/invoices?${params}`, 'invoices.csv');
      },
      onXlsx: () => {
        const params = new URLSearchParams({ format: 'xlsx' });
        if (invoiceType) params.set('invoiceType', invoiceType);
        if (dateRange) { params.set('from', dateRange[0]); params.set('to', dateRange[1]); }
        download(`export/invoices?${params}`, 'invoices.xlsx');
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {exports.map(e => (
        <div
          key={e.key}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: D.surfaceBright, borderRadius: 14, padding: '1.25rem 1.5rem', boxShadow: D.ambient }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={e.icon} size={20} style={{ color: D.primary }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 14, color: D.onSurface, marginBottom: 2 }}>{e.title}</p>
              <p style={{ fontSize: 12, color: D.onSurfaceVar, lineHeight: 1.4 }}>{e.desc}</p>
              {e.isInvoice && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Select
                    allowClear
                    placeholder="All types"
                    style={{ width: 140 }}
                    options={[
                      { value: 'sales', label: 'Sales only' },
                      { value: 'purchase', label: 'Purchase only' },
                    ]}
                    onChange={setInvoiceType}
                  />
                  <RangePicker
                    style={{ width: 240 }}
                    onChange={(_, strs) => {
                      if (strs[0] && strs[1]) setDateRange([strs[0], strs[1]]);
                      else setDateRange(null);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <TonalBtn icon="download" size="sm" onClick={e.onCsv}>CSV</TonalBtn>
            <GradBtn icon="table_view" size="sm" onClick={e.onXlsx}>Excel</GradBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Import Wizard ────────────────────────────────────────────────────────────

function ImportWizard({ entity }: { entity: 'products' | 'customers' | 'invoices' }) {
  const [step, setStep]           = useState<0 | 1 | 2>(0);
  const [loading, setLoading]     = useState(false);
  const [file, setFile]           = useState<RcFile | null>(null);
  const [preview, setPreview]     = useState<PreviewData | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [result, setResult]       = useState<ImportResultData | null>(null);

  const reset = () => {
    setStep(0); setLoading(false); setFile(null);
    setPreview(null); setColumnMap({}); setResult(null);
  };

  const handleUpload = async (f: RcFile) => {
    setFile(f); setLoading(true);
    const form = new FormData();
    form.append('file', f);
    try {
      const { data } = await api.post(`import/preview?entity=${entity}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.data);
      setColumnMap(data.data.suggestedMap);
      setStep(1);
    } catch { message.error('Failed to parse file. Check it is a valid CSV or Excel file.'); }
    finally { setLoading(false); }
    return false;
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('columnMap', JSON.stringify(columnMap));
    try {
      const { data } = await api.post(`import/${entity}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      setStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Import failed');
    } finally { setLoading(false); }
  };

  // Step 0: Drag & Drop
  if (step === 0) {
    return (
      <Spin spinning={loading}>
        <Dragger
          beforeUpload={handleUpload}
          accept=".csv,.xlsx,.xls"
          showUploadList={false}
          style={{ padding: '20px 0', background: D.surfaceLow, borderRadius: 16, border: 'none' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: D.surfaceMid, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <InboxOutlined style={{ fontSize: 28, color: D.primary }} />
            </div>
            <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 15, color: D.onSurface }}>
              Drop a file here or click to upload
            </p>
            <p style={{ fontSize: 12, color: D.onSurfaceVar }}>
              Supports CSV, XLSX, XLS — max 10 MB
            </p>
          </div>
        </Dragger>
      </Spin>
    );
  }

  // Step 1: Map Columns
  if (step === 1 && preview) {
    const headerOptions = preview.headers.map(h => ({ value: h, label: h }));
    const missingRequired = preview.fields.filter(f => f.required && !columnMap[f.name]);

    const mappingColumns = [
      {
        title: 'Expected Field',
        dataIndex: 'label',
        key: 'label',
        render: (label: string, rec: FieldDef) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: D.manrope, fontWeight: 600, fontSize: 13, color: D.onSurface }}>{label}</span>
            {rec.required && (
              <span style={{ background: D.redBg, color: D.red, borderRadius: 5, padding: '1px 8px', fontSize: 10, fontWeight: 800, fontFamily: D.manrope, letterSpacing: '0.04em' }}>
                required
              </span>
            )}
          </div>
        ),
      },
      {
        title: `Column in "${file?.name}"`,
        key: 'mapping',
        render: (_: unknown, rec: FieldDef) => (
          <Select
            style={{ width: 280 }}
            allowClear
            placeholder="— skip field —"
            options={headerOptions}
            value={columnMap[rec.name] ?? undefined}
            onChange={(val: string | undefined) =>
              setColumnMap(prev =>
                val
                  ? { ...prev, [rec.name]: val }
                  : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== rec.name))
              )
            }
          />
        ),
      },
    ];

    return (
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,29,82,0.06)', borderRadius: 10, padding: '10px 14px' }}>
            <Icon name="info" size={16} style={{ color: D.primary }} />
            <span style={{ fontSize: 13, color: D.onSurface }}>
              Detected <strong>{preview.totalRows}</strong> data rows in <strong>{file?.name}</strong>. Map columns below.
            </span>
          </div>
          <TableWrap>
            <Table
              dataSource={preview.fields}
              columns={mappingColumns}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </TableWrap>
          {missingRequired.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`Map required fields first: ${missingRequired.map(f => f.label).join(', ')}`}
            />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <TonalBtn icon="arrow_back" onClick={reset}>Back</TonalBtn>
            <GradBtn
              icon="upload"
              disabled={missingRequired.length > 0}
              loading={loading}
              onClick={handleImport}
            >
              Import {preview.totalRows} rows
            </GradBtn>
          </div>
        </div>
      </Spin>
    );
  }

  // Step 2: Result
  if (step === 2 && result) {
    const ok = result.errors.length === 0;
    const errorColumns = [
      { title: 'Row',   dataIndex: 'row',     key: 'row',     width: 80 },
      { title: 'Field', dataIndex: 'field',   key: 'field',   width: 160 },
      { title: 'Error', dataIndex: 'message', key: 'message' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 14, background: ok ? D.green12 : D.amberBg }}>
          <Icon name={ok ? 'check_circle' : 'warning'} filled size={24} style={{ color: ok ? D.tertiary : D.amber, flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 14, color: D.onSurface, marginBottom: 2 }}>
              {ok ? 'Import Successful' : 'Import Completed with Errors'}
            </p>
            <p style={{ fontSize: 12, color: D.onSurfaceVar }}>
              {result.imported} record{result.imported !== 1 ? 's' : ''} imported
              {result.errors.length > 0 ? `, ${result.errors.length} row${result.errors.length !== 1 ? 's' : ''} skipped` : ' successfully'}
            </p>
          </div>
        </div>
        {result.errors.length > 0 && (
          <TableWrap>
            <div style={{ padding: '12px 16px 0', fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar }}>
              Skipped Rows
            </div>
            <Table
              dataSource={result.errors}
              columns={errorColumns}
              rowKey={(r) => `${r.row}-${r.field}`}
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </TableWrap>
        )}
        <div>
          <TonalBtn icon="refresh" onClick={reset}>Import Another File</TonalBtn>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Import Section ───────────────────────────────────────────────────────────

function ImportSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tips card */}
      <div style={{ display: 'flex', gap: 12, background: D.surfaceLow, borderRadius: 14, padding: '14px 18px' }}>
        <Icon name="lightbulb" filled size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>
            Import Tips
          </p>
          <ul style={{ fontSize: 12, color: D.onSurface, lineHeight: 1.7, paddingLeft: 14, margin: 0 }}>
            <li>Supports CSV, XLS, XLSX files up to 10 MB.</li>
            <li>First row must be a header row with column names.</li>
            <li>For Invoices: each row creates one invoice with one item. Match products by Product Code.</li>
            <li>Rows with validation errors are skipped; valid rows are always imported.</li>
          </ul>
        </div>
      </div>

      <Tabs
        type="card"
        items={[
          { key: 'products',  label: 'Products',            children: <ImportWizard entity="products"  /> },
          { key: 'customers', label: 'Customers/Suppliers', children: <ImportWizard entity="customers" /> },
          { key: 'invoices',  label: 'Invoices',            children: <ImportWizard entity="invoices"  /> },
        ]}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Data Management"
        title="Import / Export"
        sub="Bulk import data from CSV or Excel, or export for external use"
      />
      <SLCard style={{ padding: '1.5rem' }}>
        <Tabs
          defaultActiveKey="export"
          items={[
            { key: 'export', label: 'Export Data', children: <ExportSection /> },
            { key: 'import', label: 'Import Data', children: <ImportSection /> },
          ]}
        />
      </SLCard>
    </div>
  );
}
