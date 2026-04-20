import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AuditLog } from '../../types';
import { listAuditLogs, AuditLogFilters } from '../../services/auditLog';
import { D, Icon, PageHeader, TableWrap, FilterBar, StatusChip } from '../../styles/design';

const { RangePicker } = DatePicker;

function statusColor(code: number): { color: string; bg: string } {
  if (code >= 500) return { color: '#ba1a1a', bg: 'rgba(186,26,26,0.10)' };
  if (code >= 400) return { color: '#b45309', bg: 'rgba(180,83,9,0.10)' };
  if (code >= 300) return { color: '#0047ab', bg: 'rgba(0,71,171,0.10)' };
  return { color: '#006a4e', bg: 'rgba(0,106,78,0.10)' };
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
      // silent
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
      width: 180,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: D.onSurfaceVar }}>
          {dayjs(v).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 110,
      render: (v: string | null) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: v ? D.onSurface : D.onSurfaceVar }}>
          {v ?? '—'}
        </span>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (v: string) => (
        <code style={{
          fontSize: 12, background: D.surfaceLow,
          padding: '3px 8px', borderRadius: 6,
          fontFamily: 'monospace', color: D.onSurfaceVar,
        }}>
          {v}
        </code>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 90,
      render: (v: number) => {
        const s = statusColor(v);
        return (
          <span style={{
            display: 'inline-block',
            background: s.bg, color: s.color,
            borderRadius: 6, padding: '2px 10px',
            fontFamily: D.manrope, fontSize: 11,
            fontWeight: 800, letterSpacing: '0.04em',
          }}>
            {v}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="System Log"
        title="Audit Trail"
        sub={`${total.toLocaleString()} total entries`}
      />

      <FilterBar>
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
          placeholder="HTTP Method"
          style={{ width: 140 }}
          options={[
            { value: 'POST',   label: 'POST' },
            { value: 'PUT',    label: 'PUT' },
            { value: 'PATCH',  label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
          onChange={(v) => handleFilterChange({ method: v ?? undefined })}
        />
        <Input.Search
          placeholder="Filter by User ID"
          allowClear
          style={{ width: 200 }}
          prefix={<Icon name="person_search" size={15} style={{ color: D.onSurfaceVar, marginRight: 2 }} />}
          onSearch={(v) => handleFilterChange({ userId: v || undefined })}
        />
      </FilterBar>

      <TableWrap>
        <Table<AuditLog>
          rowKey="id"
          dataSource={logs}
          columns={columns}
          loading={loading}
          size="small"
          pagination={{
            current:  filters.page,
            pageSize: filters.limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100'],
            showTotal: (t) => (
              <span style={{ fontFamily: D.manrope, fontSize: 12, color: D.onSurfaceVar }}>
                {t.toLocaleString()} entries
              </span>
            ),
            onChange: handlePageChange,
          }}
        />
      </TableWrap>
    </div>
  );
}
