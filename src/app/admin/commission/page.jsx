'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  InputNumber,
  Alert,
  message,
  Descriptions,
} from 'antd';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';

function formatAmount(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(2);
}

export default function AdminCommissionPage() {
  const [list] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const filteredList = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      [item.userId, item.nickName, item.nickname, item.email].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [list, keyword]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    if (!list.length) {
      message.info('用户分佣列表接口暂未对接');
    }
  };

  const openEditModal = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      rateL1: record.rateL1 ?? record.level1Rate ?? undefined,
      rateL2: record.rateL2 ?? record.level2Rate ?? undefined,
      rateL3: record.rateL3 ?? record.level3Rate ?? undefined,
    });
    setEditOpen(true);
  };

  const handleSaveRates = async () => {
    try {
      await form.validateFields();
      setSaving(true);
      // TODO: 对接用户分佣比例保存接口
      message.info('用户分佣比例保存接口暂未对接');
      setEditOpen(false);
    } catch {
      // 表单校验
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
      render: (_, record) => record.userId || record.id || '-',
    },
    {
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.nickName || record.nickname || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '一级分佣 (%)',
      dataIndex: 'rateL1',
      key: 'rateL1',
      width: 110,
      render: (_, record) => formatAmount(record.rateL1 ?? record.level1Rate),
    },
    {
      title: '二级分佣 (%)',
      dataIndex: 'rateL2',
      key: 'rateL2',
      width: 110,
      render: (_, record) => formatAmount(record.rateL2 ?? record.level2Rate),
    },
    {
      title: '三级分佣 (%)',
      dataIndex: 'rateL3',
      key: 'rateL3',
      width: 110,
      render: (_, record) => formatAmount(record.rateL3 ?? record.level3Rate),
    },
    {
      title: '累计分佣 (USDT)',
      dataIndex: 'totalCommission',
      key: 'totalCommission',
      width: 130,
      render: (v) => formatAmount(v),
    },
    {
      title: '待结算 (USDT)',
      dataIndex: 'pendingCommission',
      key: 'pendingCommission',
      width: 120,
      render: (v) => formatAmount(v),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditModal(record)}
        >
          调整比例
        </Button>
      ),
    },
  ];

  return (
    <div className="pc-admin-page">
      <Alert
        className="pc-admin-alert"
        type="info"
        showIcon
        message="按用户查看并设置分佣比例（一级 / 二级 / 三级）。列表与保存接口暂未对接，当前仅开放管理员登录。"
      />

      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索用户 ID / 昵称 / 邮箱"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => record.userId || record.id}
          columns={columns}
          dataSource={pagedList}
          loading={false}
          scroll={{ x: 1280 }}
          locale={{ emptyText: '暂无用户分佣数据（接口未对接）' }}
          pagination={{
            current: page,
            pageSize,
            total: filteredList.length,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </div>

      <Modal
        title="调整用户分佣比例"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSaveRates}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        {editingUser ? (
          <>
            <Descriptions
              column={1}
              size="small"
              bordered
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="用户 ID">
                {editingUser.userId || editingUser.id}
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                {editingUser.nickName || editingUser.nickname || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {editingUser.email || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item
                name="rateL1"
                label="一级分佣比例 (%)"
                rules={[
                  { required: true, message: '请输入一级分佣比例' },
                  { type: 'number', min: 0, max: 100, message: '比例范围 0-100' },
                ]}
              >
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item
                name="rateL2"
                label="二级分佣比例 (%)"
                rules={[
                  { required: true, message: '请输入二级分佣比例' },
                  { type: 'number', min: 0, max: 100, message: '比例范围 0-100' },
                ]}
              >
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item
                name="rateL3"
                label="三级分佣比例 (%)"
                rules={[
                  { required: true, message: '请输入三级分佣比例' },
                  { type: 'number', min: 0, max: 100, message: '比例范围 0-100' },
                ]}
              >
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </Form>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
