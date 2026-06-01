'use client';

import { useState } from 'react';
import {
  Table,
  Tabs,
  Card,
  Tag,
  Button,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Alert,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';

const STATUS_MAP = {
  pending: { text: '待结算', color: 'warning' },
  settled: { text: '已结算', color: 'success' },
};

const TYPE_MAP = {
  invite: '邀请奖励',
  subscription: '订阅分佣',
  recharge: '充值分佣',
  vip: 'VIP 分佣',
};

const DEFAULT_RULES = [{ level: 1 }, { level: 2 }, { level: 3 }];

export default function AdminCommissionPage() {
  const [activeTab, setActiveTab] = useState('records');
  const [records] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();

  const notifyApiPending = () => {
    message.info('分佣接口暂未对接');
  };

  const recordColumns = [
    { title: '记录 ID', dataIndex: 'id', key: 'id', width: 100, ellipsis: true },
    {
      title: '受益用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 180,
      ellipsis: true,
      render: (_, record) => record.userNickName || record.userId || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type) => TYPE_MAP[type] || type || '-',
    },
    {
      title: '金额 (USDT)',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v) => (v != null ? Number(v).toFixed(2) : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = STATUS_MAP[status] || { text: status || '-', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 88,
      render: () => (
        <Popconfirm title="确认结算？" onConfirm={notifyApiPending}>
          <Button type="link" size="small" icon={<CheckOutlined />}>
            结算
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="pc-admin-page">
      <Alert
        className="pc-admin-alert"
        type="info"
        showIcon
        message="分佣管理接口暂未对接，当前仅开放管理员登录。"
        style={{ marginBottom: 16 }}
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'records',
            label: '分佣记录',
            children: (
              <div>
                <div className="pc-admin-toolbar">
                  <Button type="primary" disabled onClick={notifyApiPending}>
                    批量结算 (0)
                  </Button>
                </div>
                <div className="pc-admin-table-wrap">
                  <Table
                    rowKey="id"
                    columns={recordColumns}
                    dataSource={records}
                    loading={false}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: '暂无数据（接口未对接）' }}
                    rowSelection={{
                      selectedRowKeys,
                      onChange: setSelectedRowKeys,
                    }}
                    pagination={{
                      current: page,
                      pageSize,
                      total: 0,
                      showSizeChanger: true,
                      showTotal: () => '共 0 条',
                      onChange: (p, ps) => {
                        setPage(p);
                        setPageSize(ps);
                        setSelectedRowKeys([]);
                      },
                    }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'rules',
            label: '分佣规则',
            children: (
              <Card title="各级分佣比例设置" style={{ maxWidth: 560 }}>
                <Form form={form} layout="vertical">
                  {DEFAULT_RULES.map((rule) => (
                    <Form.Item
                      key={rule.level}
                      name={`level_${rule.level}`}
                      label={`${rule.level} 级分佣比例 (%)`}
                      rules={[
                        { required: true, message: '请输入分佣比例' },
                        { type: 'number', min: 0, max: 100, message: '比例范围 0-100' },
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={100}
                        precision={2}
                        style={{ width: 200 }}
                        addonAfter="%"
                      />
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button type="primary" onClick={notifyApiPending}>
                      保存规则
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
