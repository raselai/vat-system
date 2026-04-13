import { useState } from 'react';
import {
  Tabs, Button, Space, Select, DatePicker, Typography, Card, Row, Col,
  message, Table, Tag, Alert, Upload, Spin,
} from 'antd';
import { DownloadOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  name: string;
  label: string;
  required: boolean;
}

interface PreviewData {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  fields: FieldDef[];
  suggestedMap: Record<string, string>;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResultData {
  imported: number;
  errors: ImportError[];
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportSection() {
  const [invoiceType, setInvoiceType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const download = async (path: string, filename: string) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed');
    }
  };

  const downloadProducts = (format: 'csv' | 'xlsx') =>
    download(`export/products?format=${format}`, `products.${format}`);

  const downloadCustomers = (format: 'csv' | 'xlsx') =>
    download(`export/customers?format=${format}`, `customers.${format}`);

  const downloadInvoices = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (invoiceType) params.set('invoiceType', invoiceType);
    if (dateRange) {
      params.set('from', dateRange[0]);
      params.set('to', dateRange[1]);
    }
    download(`export/invoices?${params.toString()}`, `invoices.${format}`);
  };

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Products" size="small">
            <Text type="secondary" className="block mb-4">
              Export all products with VAT rates, pricing, and codes.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadProducts('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadProducts('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Customers / Suppliers" size="small">
            <Text type="secondary" className="block mb-4">
              Export all customers and suppliers with BIN/NID and contact info.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadCustomers('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadCustomers('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Invoices" size="small">
            <div className="space-y-3 mb-4">
              <Select
                allowClear
                placeholder="All types"
                style={{ width: '100%' }}
                options={[
                  { value: 'sales', label: 'Sales only' },
                  { value: 'purchase', label: 'Purchase only' },
                ]}
                onChange={setInvoiceType}
              />
              <RangePicker
                style={{ width: '100%' }}
                onChange={(_, strs) => {
                  if (strs[0] && strs[1]) setDateRange([strs[0], strs[1]]);
                  else setDateRange(null);
                }}
              />
            </div>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadInvoices('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadInvoices('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ─── Import Wizard ────────────────────────────────────────────────────────────

function ImportWizard({ entity }: { entity: 'products' | 'customers' | 'invoices' }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<RcFile | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResultData | null>(null);

  const reset = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setColumnMap({});
    setResult(null);
  };

  // Step 0 → Step 1: upload and preview
  const handleUpload = async (f: RcFile) => {
    setFile(f);
    setLoading(true);
    const form = new FormData();
    form.append('file', f);
    try {
      const { data } = await api.post(`import/preview?entity=${entity}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.data);
      setColumnMap(data.data.suggestedMap);
      setStep(1);
    } catch {
      message.error('Failed to parse file. Check it is a valid CSV or Excel file.');
    } finally {
      setLoading(false);
    }
    return false; // prevent antd auto-upload
  };

  // Step 1 → Step 2: import with confirmed mapping
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
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Upload ──
  if (step === 0) {
    return (
      <Spin spinning={loading}>
        <Dragger
          beforeUpload={handleUpload}
          accept=".csv,.xlsx,.xls"
          showUploadList={false}
          style={{ padding: '24px 0' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#00503a' }} />
          </p>
          <p className="ant-upload-text">Click or drag a CSV / Excel file here</p>
          <p className="ant-upload-hint">Supports .csv, .xlsx, .xls — max 10 MB</p>
        </Dragger>
      </Spin>
    );
  }

  // ── Step 1: Map Columns ──
  if (step === 1 && preview) {
    const headerOptions = preview.headers.map(h => ({ value: h, label: h }));

    const mappingColumns = [
      {
        title: 'Expected Field',
        dataIndex: 'label',
        key: 'label',
        render: (label: string, rec: FieldDef) => (
          <span>
            {label}
            {rec.required && <Tag color="red" style={{ marginLeft: 8 }}>required</Tag>}
          </span>
        ),
      },
      {
        title: `Map to column in "${file?.name}"`,
        key: 'mapping',
        render: (_: unknown, rec: FieldDef) => (
          <Select
            style={{ width: 280 }}
            allowClear
            placeholder="— skip —"
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

    const missingRequired = preview.fields.filter(f => f.required && !columnMap[f.name]);

    return (
      <Spin spinning={loading}>
        <div className="space-y-4">
          <Alert
            type="info"
            message={`Detected ${preview.totalRows} data rows in "${file?.name}". Map the columns below, then click Import.`}
          />
          <Table
            dataSource={preview.fields}
            columns={mappingColumns}
            rowKey="name"
            pagination={false}
            size="small"
          />
          {missingRequired.length > 0 && (
            <Alert
              type="warning"
              message={`Map required fields first: ${missingRequired.map(f => f.label).join(', ')}`}
            />
          )}
          <Space>
            <Button onClick={reset}>Back</Button>
            <Button
              type="primary"
              disabled={missingRequired.length > 0}
              loading={loading}
              onClick={handleImport}
            >
              Import {preview.totalRows} rows
            </Button>
          </Space>
        </div>
      </Spin>
    );
  }

  // ── Step 2: Result ──
  if (step === 2 && result) {
    const errorColumns = [
      { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
      { title: 'Field', dataIndex: 'field', key: 'field', width: 160 },
      { title: 'Error', dataIndex: 'message', key: 'message' },
    ];

    return (
      <div className="space-y-4">
        <Alert
          type={result.errors.length === 0 ? 'success' : 'warning'}
          icon={result.errors.length === 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          message={
            `Imported ${result.imported} record${result.imported !== 1 ? 's' : ''}` +
            (result.errors.length > 0
              ? `, ${result.errors.length} row${result.errors.length !== 1 ? 's' : ''} skipped due to errors`
              : ' successfully')
          }
          showIcon
        />
        {result.errors.length > 0 && (
          <Table
            dataSource={result.errors}
            columns={errorColumns}
            rowKey={(r) => `${r.row}-${r.field}`}
            size="small"
            pagination={{ pageSize: 10 }}
            title={() => <Text strong>Skipped rows</Text>}
          />
        )}
        <Button onClick={reset}>Import another file</Button>
      </div>
    );
  }

  return null;
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportSection() {
  return (
    <div className="space-y-6">
      <Alert
        type="info"
        showIcon
        message="Import tips"
        description={
          <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
            <li>Supports CSV, XLS, and XLSX files up to 10 MB.</li>
            <li>The first row must be a header row.</li>
            <li>For Invoices: each row creates one invoice with one item. Match products by their Product Code.</li>
            <li>Rows with validation errors are skipped; valid rows are always imported.</li>
          </ul>
        }
      />
      <Tabs
        type="card"
        items={[
          { key: 'products', label: 'Products', children: <ImportWizard entity="products" /> },
          { key: 'customers', label: 'Customers / Suppliers', children: <ImportWizard entity="customers" /> },
          { key: 'invoices', label: 'Invoices', children: <ImportWizard entity="invoices" /> },
        ]}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Import / Export</Title>
      <Tabs
        defaultActiveKey="export"
        items={[
          { key: 'export', label: 'Export Data', children: <ExportSection /> },
          { key: 'import', label: 'Import Data', children: <ImportSection /> },
        ]}
      />
    </div>
  );
}
