import { useEffect, useState } from 'react';
import { Table, Typography, message, DatePicker, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { RegisterResult } from '../../types';
import { getRegister, downloadRegisterPdf } from '../../services/register';

const { Title } = Typography;

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

interface RegisterPageProps {
  type: 'sales' | 'purchase';
  title: string;
}

export default function RegisterPage({ type, title }: RegisterPageProps) {
  const [data, setData] = useState<RegisterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [taxMonth, setTaxMonth] = useState<string>(dayjs().format('YYYY-MM'));

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const result = await getRegister(type, taxMonth);
      setData(result);
    } catch {
      message.error('Failed to load register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegister(); }, [taxMonth, type]);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await downloadRegisterPdf(type, taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const columns = [
    { title: 'SL', dataIndex: 'sl', key: 'sl', width: 50 },
    { title: 'Challan No', dataIndex: 'challanNo', key: 'challanNo', width: 140 },
    { title: 'Date', dataIndex: 'challanDate', key: 'challanDate', width: 100, render: (d: string) => new Date(d).toLocaleDateString('en-GB') },
    { title: type === 'sales' ? 'Buyer' : 'Seller', dataIndex: 'customerName', key: 'customerName', render: (v: string | null) => v || '-' },
    { title: 'BIN', dataIndex: 'customerBin', key: 'customerBin', width: 130, render: (v: string | null) => v || '-' },
    { title: 'Taxable Value', dataIndex: 'subtotal', key: 'subtotal', width: 120, render: fmt },
    { title: 'SD', dataIndex: 'sdTotal', key: 'sdTotal', width: 90, render: fmt },
    { title: 'VAT', dataIndex: 'vatTotal', key: 'vatTotal', width: 110, render: fmt },
    { title: 'Specific Duty', dataIndex: 'specificDutyTotal', key: 'specificDutyTotal', width: 110, render: fmt },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', width: 120, render: (v: number) => <strong>{fmt(v)}</strong> },
    { title: 'VDS', dataIndex: 'vdsAmount', key: 'vdsAmount', width: 100, render: fmt },
    { title: 'Net Receivable', dataIndex: 'netReceivable', key: 'netReceivable', width: 120, render: fmt },
  ];

  const summary = data?.summary;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        <Space>
          <DatePicker
            picker="month"
            value={dayjs(taxMonth, 'YYYY-MM')}
            onChange={(d) => setTaxMonth(d?.format('YYYY-MM') || dayjs().format('YYYY-MM'))}
            allowClear={false}
          />
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={handlePdf}>
            Download PDF
          </Button>
        </Space>
      </div>

      {summary && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="Invoices" value={summary.totalInvoices} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="Taxable Value" value={summary.subtotal} precision={2} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="VAT Total" value={summary.vatTotal} precision={2} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="Grand Total" value={summary.grandTotal} precision={2} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="VDS" value={summary.vdsAmount} precision={2} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Statistic title="Net Receivable" value={summary.netReceivable} precision={2} />
            </Col>
          </Row>
        </Card>
      )}

      <Table
        columns={columns}
        dataSource={data?.entries || []}
        rowKey="invoiceId"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={false}
        summary={() =>
          summary && summary.totalInvoices > 0 ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5}><strong>{fmt(summary.subtotal)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6}><strong>{fmt(summary.sdTotal)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={7}><strong>{fmt(summary.vatTotal)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={8}><strong>{fmt(summary.specificDutyTotal)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={9}><strong>{fmt(summary.grandTotal)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={10}><strong>{fmt(summary.vdsAmount)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={11}><strong>{fmt(summary.netReceivable)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </div>
  );
}
