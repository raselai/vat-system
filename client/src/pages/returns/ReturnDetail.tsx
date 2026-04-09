import { useEffect, useState } from 'react';
import {
  Typography, Descriptions, Form, InputNumber, Input, Button, Space,
  message, Tag, Popconfirm, Divider, Row, Col, Card,
} from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { VatReturn, VatReturnStatus } from '../../types';
import {
  getReturn, updateReturn, reviewReturn, submitReturn,
  lockReturn, downloadReturnPdf,
} from '../../services/return';

const { Title } = Typography;
const { TextArea } = Input;

const statusColors: Record<VatReturnStatus, string> = {
  draft: 'default',
  reviewed: 'blue',
  submitted: 'orange',
  locked: 'green',
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ret, setRet] = useState<VatReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Live net payable calculation
  const outputVat = ret?.outputVat ?? 0;
  const sdPayable = ret?.sdPayable ?? 0;
  const inputVat = ret?.inputVat ?? 0;
  const vdsCredit = ret?.vdsCredit ?? 0;
  const [liveCarry, setLiveCarry] = useState(0);
  const [liveInc, setLiveInc] = useState(0);
  const [liveDec, setLiveDec] = useState(0);
  const liveNet = +(outputVat + sdPayable - inputVat - vdsCredit - liveCarry + liveInc - liveDec).toFixed(2);

  const fetchReturn = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getReturn(id);
      setRet(data);
      form.setFieldsValue({
        carryForward: data.carryForward,
        increasingAdjustment: data.increasingAdjustment,
        decreasingAdjustment: data.decreasingAdjustment,
        notes: data.notes,
      });
      setLiveCarry(data.carryForward);
      setLiveInc(data.increasingAdjustment);
      setLiveDec(data.decreasingAdjustment);
    } catch {
      message.error('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturn(); }, [id]);

  const handleSave = async (values: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateReturn(id, values);
      setRet(updated);
      message.success('Adjustments saved');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'review' | 'submit' | 'lock') => {
    if (!id) return;
    try {
      const fns = { review: reviewReturn, submit: submitReturn, lock: lockReturn };
      const updated = await fns[action](id);
      setRet(updated);
      message.success(`Return ${action}ed`);
    } catch (err: any) {
      message.error(err.response?.data?.error || `Failed to ${action}`);
    }
  };

  const handlePdf = async () => {
    if (!ret) return;
    try {
      await downloadReturnPdf(ret.id, ret.taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  if (!ret) return null;

  const isDraft = ret.status === 'draft';

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/returns')}>Back</Button>
        <Title level={4} style={{ margin: 0 }}>
          Musak 9.1 — {ret.taxMonth} &nbsp;
          <Tag color={statusColors[ret.status]}>{ret.status.toUpperCase()}</Tag>
        </Title>
      </Space>

      <Row gutter={24}>
        {/* Left: Auto-calculated (read-only) */}
        <Col xs={24} lg={12}>
          <Card title="Auto-Calculated Figures" loading={loading} style={{ marginBottom: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Total Sales Value">৳ {fmt(ret.totalSalesValue)}</Descriptions.Item>
              <Descriptions.Item label="Output VAT">৳ {fmt(ret.outputVat)}</Descriptions.Item>
              <Descriptions.Item label="SD Payable">৳ {fmt(ret.sdPayable)}</Descriptions.Item>
              <Descriptions.Item label="Total Purchase Value">৳ {fmt(ret.totalPurchaseValue)}</Descriptions.Item>
              <Descriptions.Item label="Input VAT Credit">৳ {fmt(ret.inputVat)}</Descriptions.Item>
              <Descriptions.Item label="VDS Credit">৳ {fmt(ret.vdsCredit)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right: Manual adjustments */}
        <Col xs={24} lg={12}>
          <Card title="Manual Adjustments" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item label="Carry Forward (from prev. month)" name="carryForward">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveCarry(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Increasing Adjustment" name="increasingAdjustment">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveInc(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Decreasing Adjustment" name="decreasingAdjustment">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveDec(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={3} disabled={!isDraft} maxLength={2000} />
              </Form.Item>
              {isDraft && (
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    Save Adjustments
                  </Button>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Net Payable */}
      <Card style={{ marginBottom: 16, borderColor: liveNet > 0 ? '#f5222d' : '#52c41a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            প্রদেয় কর (নিট) / Net VAT Payable
          </Title>
          <Title level={3} style={{ margin: 0, color: liveNet > 0 ? '#f5222d' : '#52c41a' }}>
            ৳ {fmt(isDraft ? liveNet : ret.netPayable)}
          </Title>
        </div>
      </Card>

      {/* Workflow Actions */}
      <Divider />
      <Space>
        <Button icon={<FilePdfOutlined />} onClick={handlePdf}>Download PDF</Button>
        {ret.status === 'draft' && (
          <Popconfirm title="Mark as reviewed?" onConfirm={() => handleAction('review')}>
            <Button type="primary">Mark Reviewed</Button>
          </Popconfirm>
        )}
        {ret.status === 'reviewed' && (
          <Popconfirm title="Submit this return? This cannot be undone easily." onConfirm={() => handleAction('submit')}>
            <Button type="primary" danger>Submit Return</Button>
          </Popconfirm>
        )}
        {ret.status === 'submitted' && (
          <Popconfirm title="Lock this return? It will become immutable." onConfirm={() => handleAction('lock')}>
            <Button danger>Lock Return</Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}
