import { useEffect, useMemo, useState } from 'react';
import { Table, message, Input, Select, InputNumber, Checkbox, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Product } from '../../types';
import { D, Icon, PageHeader, BackBtn, GradBtn, TonalBtn, TableWrap, FilterBar, StatusChip } from '../../styles/design';
import HelpHint from '../../components/HelpHint';
import { useLang } from '../../contexts/LanguageContext';

export default function BulkRateUpdate() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [rateFilter, setRateFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // New-rate panel
  const [updateVat, setUpdateVat] = useState(true);
  const [newVat, setNewVat] = useState<number | null>(null);
  const [updateSd, setUpdateSd] = useState(false);
  const [newSd, setNewSd] = useState<number | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Distinct current VAT rates for the filter dropdown.
  const rateOptions = useMemo(() => {
    const rates = Array.from(new Set(products.map((p) => p.vatRate))).sort((a, b) => a - b);
    return rates.map((r) => ({ value: r, label: `${r}%` }));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (rateFilter !== 'all' && p.vatRate !== rateFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.productCode ?? ''} ${p.hsCode ?? ''} ${p.nameBn ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, rateFilter, typeFilter]);

  const selectAllFiltered = () => setSelected(filtered.map((p) => p.id));
  const clearSelection = () => setSelected([]);

  const canApply =
    selected.length > 0 &&
    ((updateVat && newVat !== null) || (updateSd && newSd !== null));

  const handleApply = () => {
    if (!canApply) return;
    const parts: string[] = [];
    if (updateVat && newVat !== null) parts.push(`VAT → ${newVat}%`);
    if (updateSd && newSd !== null) parts.push(`SD → ${newSd}%`);

    Modal.confirm({
      title: 'Apply new rate?',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Set <strong>{parts.join(' and ')}</strong> on <strong>{selected.length}</strong> selected{' '}
            {selected.length === 1 ? 'product' : 'products'}.
          </p>
          <p style={{ color: D.onSurfaceVar, fontSize: 13 }}>
            Only invoices created <em>after</em> this change use the new rate. Existing invoices keep their original rate.
          </p>
        </div>
      ),
      okText: 'Apply',
      onOk: async () => {
        setSaving(true);
        try {
          const body: { productIds: string[]; vatRate?: number; sdRate?: number } = { productIds: selected };
          if (updateVat && newVat !== null) body.vatRate = newVat;
          if (updateSd && newSd !== null) body.sdRate = newSd;
          const { data } = await api.post('/products/bulk-rate-update', body);
          message.success(`Updated ${data.data.updated} ${data.data.updated === 1 ? 'product' : 'products'}`);
          clearSelection();
          fetchProducts();
        } catch (err: any) {
          message.error(err.response?.data?.error || 'Failed to update rates');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Code', dataIndex: 'productCode', key: 'productCode', width: 100,
      render: (v: string) => v
        ? <code style={{ fontSize: 12, background: D.surfaceLow, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', color: D.onSurfaceVar }}>{v}</code>
        : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <StatusChip status={v} /> },
    {
      title: 'HS Code', dataIndex: 'hsCode', key: 'hsCode', className: 'hidden md:table-cell',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Current VAT %', dataIndex: 'vatRate', key: 'vatRate', align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{v}%</span>,
    },
    {
      title: 'Current SD %', dataIndex: 'sdRate', key: 'sdRate', align: 'right' as const, className: 'hidden sm:table-cell',
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{v > 0 ? `${v}%` : '—'}</span>,
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <BackBtn onClick={() => navigate('/products')} label="Products" />
      <PageHeader eyebrow="Inventory" title="Bulk VAT / SD Rate Update" />

      <HelpHint id="bulk-rate-update">
        {lang === 'bn'
          ? 'সরকার প্রতি অর্থবছরে ভ্যাট/সম্পূরক শুল্কের হার পরিবর্তন করে। এখানে একসাথে অনেক পণ্যের হার আপডেট করুন — তালিকা থেকে পণ্য বেছে নিন (HS কোড বা বর্তমান হারে ফিল্টার করুন), নতুন হার দিন, তারপর প্রয়োগ করুন। পুরোনো চালান অপরিবর্তিত থাকবে।'
          : 'The government revises VAT/SD rates each fiscal year. Update many products at once here — filter by HS code or current rate, tick the products, set the new rate, then apply. Past invoices keep their original rate; only future ones use the new one.'}
      </HelpHint>

      {/* New-rate panel */}
      <div style={{ background: D.surfaceBright, borderRadius: 16, boxShadow: D.ambient, padding: 20, marginBottom: 20 }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto]" style={{ gap: 20, alignItems: 'end' }}>
          <div>
            <Checkbox checked={updateVat} onChange={(e) => setUpdateVat(e.target.checked)} style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13 }}>New VAT Rate</span>
            </Checkbox>
            <InputNumber
              min={0} max={100} disabled={!updateVat} value={newVat}
              onChange={(v) => setNewVat(v as number | null)}
              addonAfter="%" placeholder="e.g. 7.5" style={{ width: '100%' }}
            />
          </div>
          <div>
            <Checkbox checked={updateSd} onChange={(e) => setUpdateSd(e.target.checked)} style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13 }}>New SD Rate</span>
            </Checkbox>
            <InputNumber
              min={0} max={100} disabled={!updateSd} value={newSd}
              onChange={(v) => setNewSd(v as number | null)}
              addonAfter="%" placeholder="e.g. 5" style={{ width: '100%' }}
            />
          </div>
          <GradBtn icon="published_with_changes" onClick={handleApply} disabled={!canApply} loading={saving}>
            Apply to {selected.length} selected
          </GradBtn>
        </div>
      </div>

      {/* Filters */}
      <FilterBar>
        <Input
          allowClear prefix={<Icon name="search" size={16} style={{ color: D.onSurfaceVar }} />}
          placeholder="Search name, code, or HS code"
          value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }}
        />
        <Select
          value={rateFilter} onChange={setRateFilter} style={{ width: 170 }}
          options={[{ value: 'all', label: 'All current rates' }, ...rateOptions]}
        />
        <Select
          value={typeFilter} onChange={setTypeFilter} style={{ width: 140 }}
          options={[{ value: 'all', label: 'All types' }, { value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]}
        />
        <TonalBtn icon="select_all" size="sm" onClick={selectAllFiltered}>Select all {filtered.length}</TonalBtn>
        {selected.length > 0 && <TonalBtn icon="close" size="sm" onClick={clearSelection}>Clear ({selected.length})</TonalBtn>}
      </FilterBar>

      <TableWrap>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelected(keys as string[]),
            preserveSelectedRowKeys: true,
          }}
        />
      </TableWrap>
    </div>
  );
}
