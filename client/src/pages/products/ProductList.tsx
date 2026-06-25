import { useEffect, useState } from 'react';
import { Table, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getStockSummary } from '../../services/stock';
import { Product } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, StatusChip } from '../../styles/design';
import { useCompany } from '../../contexts/CompanyContext';

const fmtQty = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useCompany();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [{ data }, stock] = await Promise.all([
        api.get('/products'),
        getStockSummary().catch(() => []),
      ]);
      setProducts(data.data);
      setStockMap(new Map(stock.map((s) => [s.productId, s.currentStock])));
    } catch {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deactivated');
      fetchProducts();
    } catch {
      message.error('Failed to deactivate product');
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'productCode',
      key: 'productCode',
      width: 90,
      render: (v: string) => v ? <code style={{ fontSize: 12, background: D.surfaceLow, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', color: D.onSurfaceVar }}>{v}</code> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      title: 'HS Code',
      dataIndex: 'hsCode',
      key: 'hsCode',
      className: 'hidden md:table-cell',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'VAT %',
      dataIndex: 'vatRate',
      key: 'vatRate',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{v}%</span>
      ),
    },
    {
      title: 'SD %',
      dataIndex: 'sdRate',
      key: 'sdRate',
      className: 'hidden sm:table-cell',
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{v > 0 ? `${v}%` : '—'}</span>,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      className: 'hidden sm:table-cell',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_: unknown, record: Product) => {
        if (record.type !== 'product') return <span style={{ color: D.onSurfaceVar }}>—</span>;
        const qty = stockMap.get(record.id);
        if (qty === undefined) return <span style={{ color: D.onSurfaceVar }}>—</span>;
        return (
          <span style={{ fontFamily: D.manrope, fontWeight: 700, color: qty < 0 ? D.red : D.tertiary }}>
            {fmtQty(qty)} <span style={{ fontWeight: 500, fontSize: 11, color: D.onSurfaceVar }}>{record.unit}</span>
          </span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {record.type === 'product' && (
            <TonalBtn icon="inventory_2" size="sm" onClick={() => navigate(`/products/${record.id}/stock`)}>Stock</TonalBtn>
          )}
          <TonalBtn icon="edit" size="sm" onClick={() => navigate(`/products/${record.id}/edit`)}>Edit</TonalBtn>
          <Popconfirm title="Deactivate this product?" onConfirm={() => handleDelete(record.id)}>
            <TonalBtn icon="delete" size="sm" danger>Deactivate</TonalBtn>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Inventory"
        title="Products & Services"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && (
              <TonalBtn icon="published_with_changes" onClick={() => navigate('/products/bulk-rates')}>Update Rates</TonalBtn>
            )}
            <GradBtn icon="add" onClick={() => navigate('/products/new')}>Add Product</GradBtn>
          </div>
        }
      />
      <TableWrap>
        <Table columns={columns} dataSource={products} rowKey="id" loading={loading} scroll={{ x: 'max-content' }} />
      </TableWrap>
    </div>
  );
}
