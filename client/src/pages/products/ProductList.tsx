import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Product } from '../../types';

const { Title } = Typography;

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const columns = [
    { title: 'Code', dataIndex: 'productCode', key: 'productCode', width: 80 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={type === 'product' ? 'blue' : 'green'}>{type}</Tag>,
    },
    { title: 'HS Code', dataIndex: 'hsCode', key: 'hsCode' },
    { title: 'VAT %', dataIndex: 'vatRate', key: 'vatRate' },
    { title: 'SD %', dataIndex: 'sdRate', key: 'sdRate' },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => v.toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/products/${record.id}/edit`)} />
          <Popconfirm title="Deactivate this product?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deactivated');
      fetchProducts();
    } catch {
      message.error('Failed to deactivate product');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Products</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
          Add Product
        </Button>
      </div>
      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} scroll={{ x: 800 }} />
    </div>
  );
}
