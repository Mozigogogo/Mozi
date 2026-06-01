'use client';

import { useState } from 'react';
import {
  Table,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Modal,
  Descriptions,
  message,
  Popconfirm,
  Alert,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';

const STATUS_MAP = {
  1: { text: '正常', color: 'success' },
  0: { text: '禁用', color: 'error' },
};

function normalizeStatus(status) {
  if (status === 1 || status === 'active') return 1;
  return 0;
}

export default function AdminUsersPage() {
  const [list] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSearch = () => {
    message.info('用户列表接口暂未对接');
  };

  const handleViewDetail = () => {
    setDetailOpen(true);
  };

  const handleToggleStatus = () => {
    message.info('用户状态接口暂未对接');
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
      render: (_, record) => record.nickName || record.nickname || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (v) => v || '-',
    },
    {
      title: '邀请码',
      dataIndex: 'inviteCode',
      key: 'inviteCode',
      render: (v) => v || '-',
    },
    {
      title: '会员等级',
      dataIndex: 'planCode',
      key: 'planCode',
      render: (_, record) => record.planCode || record.memberTier || 'FREE',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => {
        const info = STATUS_MAP[status] || STATUS_MAP[normalizeStatus(status) === 1 ? 1 : 0];
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: () => '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const isActive = normalizeStatus(record.status) === 1;
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleViewDetail}
            >
              详情
            </Button>
            <Popconfirm
              title={isActive ? '确定禁用该用户？' : '确定启用该用户？'}
              onConfirm={handleToggleStatus}
            >
              <Button type="link" size="small" danger={isActive}>
                {isActive ? '禁用' : '启用'}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="pc-admin-page">
      <Alert
        className="pc-admin-alert"
        type="info"
        showIcon
        message="用户管理接口暂未对接，当前仅开放管理员登录。"
      />

      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索用户 ID / 昵称 / 邮箱"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter(v || '')}
          allowClear
          style={{ width: 120 }}
          options={[
            { value: '1', label: '正常' },
            { value: '0', label: '禁用' },
          ]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={false}
        style={{ width: '100%' }}
        tableLayout="fixed"
        locale={{ emptyText: '暂无数据（接口未对接）' }}
        pagination={{
          current: page,
          pageSize,
          total: 0,
          showSizeChanger: true,
          showTotal: () => '共 0 条',
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title="用户详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="说明" span={2}>
            用户详情接口暂未对接
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
}
