import { useState } from 'react';
import { Tabs, Button, Space, Select, DatePicker, Typography, Card, Row, Col, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed');
    }
  };

  const downloadProducts = (format: 'csv' | 'xlsx') =>
    download(`/export/products?format=${format}`, `products.${format}`);

  const downloadCustomers = (format: 'csv' | 'xlsx') =>
    download(`/export/customers?format=${format}`, `customers.${format}`);

  const downloadInvoices = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (invoiceType) params.set('invoiceType', invoiceType);
    if (dateRange) {
      params.set('from', dateRange[0]);
      params.set('to', dateRange[1]);
    }
    download(`/export/invoices?${params.toString()}`, `invoices.${format}`);
  };

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        {/* Products */}
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

        {/* Customers */}
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

        {/* Invoices */}
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

// ─── Import Tab (stub — will be replaced in Task 7) ──────────────────────────

function ImportSection() {
  return (
    <div className="flex items-center justify-center h-40 text-slate-400">
      Import feature coming soon
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
