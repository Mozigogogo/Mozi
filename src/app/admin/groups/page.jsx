'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, Button, Avatar, Tag, Select, message } from 'antd';
import { ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import {
  listAdminTgGroups,
  isAdminApiSuccess,
  normalizeAdminTgGroupPage,
} from '@/api/admin';

const GROUP_STATUS = {
  1: { text: '正常', color: 'success' },
  0: { text: '停用', color: 'default' },
};

const STATUS_OPTIONS = Object.entries(GROUP_STATUS).map(([value, item]) => ({
  value: Number(value),
  label: item.text,
}));

function formatTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-CN');
}

function renderStatus(value) {
  if (value == null || value === '') return '-';
  const item = GROUP_STATUS[Number(value)];
  if (!item) return String(value);
  return <Tag color={item.color}>{item.text}</Tag>;
}

export default function AdminGroupsPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: pageSize };
      if (statusFilter !== '') params.status = Number(statusFilter);

      const res = await listAdminTgGroups(params);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '加载群组列表失败');
        setList([]);
        setTotal(0);
        return;
      }

      const pageData = normalizeAdminTgGroupPage(res?.data);
      setList(pageData.list);
      setTotal(pageData.total);
    } catch (error) {
      console.error('[AdminGroups] fetch list failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '加载群组列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const columns = [
    {
      title: '群组',
      key: 'group',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            src={record.avatar || undefined}
            icon={!record.avatar ? <TeamOutlined /> : undefined}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {record.groupTitle || '-'}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {record.groupId != null ? String(record.groupId) : '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '群主 ID',
      dataIndex: 'ownerUserId',
      key: 'ownerUserId',
      width: 180,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 90,
      align: 'right',
      render: (v) => (v == null ? '-' : Number(v).toLocaleString('zh-CN')),
    },
    {
      title: '周指令数',
      dataIndex: 'weeklyCommandCount',
      key: 'weeklyCommandCount',
      width: 100,
      align: 'right',
      render: (v) => (v == null ? '-' : Number(v).toLocaleString('zh-CN')),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: renderStatus,
    },
    {
      title: '首次发现',
      dataIndex: 'firstSeenAt',
      key: 'firstSeenAt',
      width: 170,
      render: formatTime,
    },
    {
      title: '最近活跃',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      width: 170,
      render: formatTime,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: formatTime,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: formatTime,
    },
  ];

  return (
    <div className="pc-admin-page">
      <div className="pc-admin-toolbar">
        <Select
          placeholder="状态筛选"
          value={statusFilter === '' ? undefined : Number(statusFilter)}
          onChange={(v) => {
            setStatusFilter(v == null ? '' : String(v));
            setPage(1);
          }}
          allowClear
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchGroups} loading={loading}>
          刷新
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => String(record.id ?? record.groupId)}
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1300 }}
          locale={{ emptyText: '暂无群组数据' }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </div>
    </div>
  );
}
