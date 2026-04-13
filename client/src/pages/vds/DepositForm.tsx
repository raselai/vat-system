import { useState, useEffect } from 'react';
import { Button, Card, Typography, message, DatePicker, Input, InputNumber, Space, Divider, Table, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { createDeposit } from '../../services/vds';
import { VdsCertificate } from '../../types';

const { Title, Text } = Typography;

export default function DepositForm() {
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState<VdsCertificate[]>([]);
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [challanNo, setChallanNo] = useState('');
  const [depositDate, setDepositDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/vds/certificates?role=deductor&status=finalized').then(res => {
      setCertificates(res.data.data.certificates);
    }).catch(() => {});
  }, []);

  const toggleCertificate = (id: string, checked: boolean) => {
    const next = checked ? [...selectedCertIds, id] : selectedCertIds.filter(c => c !== id);
    setSelectedCertIds(next);
    const total = certificates
      .filter(c => next.includes(c.id))
      .reduce((sum, c) => sum + c.vdsAmount, 0);
    setTotalAmount(Math.round(total * 100) / 100);
  };

  const certColumns = [
    {
      title: '', key: 'select', width: 40,
      render: (_: unknown, r: VdsCertificate) => (
        <Checkbox checked={selectedCertIds.includes(r.id)} onChange={e => toggleCertificate(r.id, e.target.checked)} />
      ),
    },
    { title: 'Certificate No', dataIndex: 'certificateNo', key: 'certificateNo' },
    { title: 'Counterparty', dataIndex: 'counterpartyName', key: 'counterpartyName' },
    { title: 'VDS Amount', dataIndex: 'vdsAmount', key: 'vdsAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth' },
  ];

  const handleSubmit = async () => {
    if (!challanNo || !bankName) {
      message.error('Challan number and bank name are required');
      return;
    }
    if (totalAmount <= 0) {
      message.error('Total amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await createDeposit({
        challanNo,
        depositDate,
        bankName,
        bankBranch: bankBranch || undefined,
        accountCode: accountCode || undefined,
        totalAmount,
        notes: notes || undefined,
        certificateIds: selectedCertIds.length > 0 ? selectedCertIds : undefined,
      });
      message.success('Treasury deposit created');
      navigate('/vds/deposits');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>New Treasury Deposit</Title>

      <Card title="Deposit Details" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Treasury Challan No: </Text>
            <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="e.g. TC-2026-001" style={{ width: 200 }} />
          </div>
          <div>
            <Text strong>Date: </Text>
            <DatePicker value={dayjs(depositDate)} onChange={(d) => setDepositDate(d?.format('YYYY-MM-DD') || '')} />
          </div>
        </Space>
        <div style={{ marginTop: 16 }}>
          <Space size="large" wrap>
            <div>
              <Text strong>Bank Name: </Text>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" style={{ width: 220 }} />
            </div>
            <div>
              <Text strong>Branch: </Text>
              <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Branch (optional)" style={{ width: 200 }} />
            </div>
            <div>
              <Text strong>Account Code: </Text>
              <Input value={accountCode} onChange={e => setAccountCode(e.target.value)} placeholder="Govt account code" style={{ width: 160 }} />
            </div>
          </Space>
        </div>
      </Card>

      <Card title="Link VDS Certificates (Deductor)" style={{ marginBottom: 16 }}>
        <Table columns={certColumns} dataSource={certificates} rowKey="id" pagination={false} scroll={{ x: 600 }} size="small" />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>Notes: </Text>
        <Input.TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes" />
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Linked Certificates:</span><span>{selectedCertIds.length}</span>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
              <span>Total Amount:</span>
              <span>{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Override Amount: </Text>
          <InputNumber value={totalAmount} min={0} onChange={v => setTotalAmount(v || 0)} style={{ width: 200 }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </div>
        <Divider />
        <Space>
          <Button type="primary" size="large" loading={loading} onClick={handleSubmit}>
            Create Deposit
          </Button>
          <Button size="large" onClick={() => navigate('/vds/deposits')}>Cancel</Button>
        </Space>
      </Card>
    </div>
  );
}
