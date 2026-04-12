import { useEffect, useState } from 'react';
import { Table, Typography, Tag, Select, DatePicker, Input, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AuditLog } from '../../types';
import { listAuditLogs, AuditLogFilters } from '../../services/auditLog';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const METHOD_COLORS: Record<string, string> = {
  POST:   'green',
  PUT:    'blue',
  PATCH:  'orange',
  DELETE: 'red',
};

function statusColor(code: number): string {
  if (code >= 500) return '#ef4444';
  if (code >= 400) return '#f97316';
  if (code >= 300) return '#eab308';
  return '#22c55e';
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 50 });

  const fetchLogs = async (f: AuditLogFilters) => {
    setLoading(true);
    try {
      const result = await listAuditLogs(f);
      setLogs(result.items);
      setTotal(result.total);
    } catch {
      message.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(filters); }, []);

  const handleFilterChange = (patch: Partial<AuditLogFilters>) => {
    const next = { ...filters, ...patch, page: 1 };
    setFilters(next);
    fetchLogs(next);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    const next = { ...filters, page, limit: pageSize };
    setFilters(next);
    fetchLogs(next);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      render: (v: string | null) => v ?? <span className="text-slate-400">—</span>,
      width: 100,
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (v: string) => <Tag color={METHOD_COLORS[v] ?? 'default'}>{v}</Tag>,
      width: 90,
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (v: string) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v}</code>,
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (v: number) => (
        <span className="font-mono font-bold text-sm" style={{ color: statusColor(v) }}>{v}</span>
      ),
      width: 80,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Title level={4} style={{ margin: 0 }}>Audit Log</Title>
      </div>

      {/* Filters */}
      <Space wrap className="mb-4">
        <RangePicker
          onChange={(dates) => {
            handleFilterChange({
              from: dates?.[0]?.startOf('day').toISOString() ?? undefined,
              to:   dates?.[1]?.endOf('day').toISOString()   ?? undefined,
            });
          }}
        />
        <Select
          allowClear
          placeholder="Method"
          style={{ width: 120 }}
          options={[
            { value: 'POST',   label: 'POST' },
            { value: 'PUT',    label: 'PUT' },
            { value: 'PATCH',  label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
          onChange={(v) => handleFilterChange({ method: v ?? undefined })}
        />
        <Input.Search
          placeholder="User ID"
          allowClear
          style={{ width: 160 }}
          onSearch={(v) => handleFilterChange({ userId: v || undefined })}
        />
      </Space>

      <Table<AuditLog>
        rowKey="id"
        dataSource={logs}
        columns={columns}
        loading={loading}
        pagination={{
          current:  filters.page,
          pageSize: filters.limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100'],
          showTotal: (t) => `${t} entries`,
          onChange: handlePageChange,
        }}
        size="small"
      />
    </div>
  );
}
