'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, Button, Avatar, Tag, Select, Dropdown, Input, message, Popconfirm } from 'antd';
import {
  ReloadOutlined,
  TeamOutlined,
  DownOutlined,
  SearchOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  listAdminTgGroups,
  updateAdminTgGroupCooperationStatus,
  deleteAdminTgGroup,
  isAdminApiSuccess,
  normalizeAdminTgGroupPage,
} from '@/api/admin';

const GROUP_HEALTH = {
  ACTIVE: { text: '活跃', color: 'success' },
  DORMANT: { text: '沉寂', color: 'warning' },
  CHURNED: { text: '流失', color: 'default' },
};

const GROUP_COOPERATION_STATUS = {
  NONE: { text: '洽谈中', color: 'processing' },
  INTENT: { text: '意向合作', color: 'cyan' },
  COOPERATING: { text: '已合作', color: 'success' },
  STOPPED: { text: '暂停合作', color: 'warning' },
};

const HEALTH_OPTIONS = Object.entries(GROUP_HEALTH).map(([value, item]) => ({
  value,
  label: item.text,
}));

const COOPERATION_STATUS_OPTIONS = Object.entries(GROUP_COOPERATION_STATUS).map(([value, item]) => ({
  value,
  label: item.text,
}));

const MEMBER_SIZE_OPTIONS = [
  { value: 'lt500', label: '500人以下' },
  { value: '500-2000', label: '500-2000' },
  { value: 'gt2000', label: '2000+' },
];

const COOPERATION_STATUS_KEYS = Object.keys(GROUP_COOPERATION_STATUS);

function normalizeCooperationStatusKey(value) {
  const key = String(value ?? 'NONE').trim().toUpperCase();
  return COOPERATION_STATUS_KEYS.includes(key) ? key : 'NONE';
}

/** 群规模 → memberCountMin / memberCountMax（与 GET /admin/tg/groups 一致，上下限均含） */
function buildMemberCountRange(sizeFilter) {
  switch (sizeFilter) {
    case 'lt500':
      return { memberCountMax: 499 };
    case '500-2000':
      return { memberCountMin: 500, memberCountMax: 2000 };
    case 'gt2000':
      return { memberCountMin: 2001 };
    default:
      return {};
  }
}

function buildListParams({
  page,
  pageSize,
  groupTitle,
  health,
  cooperationStatus,
  memberSizeFilter,
}) {
  const params = { page, size: pageSize };
  if (groupTitle) params.groupTitle = groupTitle;
  if (health) params.health = health;
  if (cooperationStatus) params.cooperationStatus = cooperationStatus;
  Object.assign(params, buildMemberCountRange(memberSizeFilter));
  return params;
}

function formatTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-CN');
}

function renderHealth(value) {
  if (value == null || value === '') return '-';
  const key = String(value).trim().toUpperCase();
  const item = GROUP_HEALTH[key];
  if (!item) return String(value);
  return <Tag color={item.color}>{item.text}</Tag>;
}

function CooperationStatusCell({ value, record, updating, onChange }) {
  const statusKey = normalizeCooperationStatusKey(value);
  const item = GROUP_COOPERATION_STATUS[statusKey];
  const groupId = record?.groupId;

  if (groupId == null) {
    return item ? <Tag color={item.color}>{item.text}</Tag> : '-';
  }

  const menuItems = COOPERATION_STATUS_KEYS.map((key) => ({
    key,
    label: GROUP_COOPERATION_STATUS[key].text,
    disabled: key === statusKey,
  }));

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: ({ key: next }) => onChange(record, next),
      }}
      trigger={['click']}
      disabled={updating}
    >
      <Tag
        color={item.color}
        style={{ cursor: updating ? 'wait' : 'pointer', margin: 0, userSelect: 'none' }}
      >
        {updating ? '更新中…' : item.text}
        {!updating ? <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} /> : null}
      </Tag>
    </Dropdown>
  );
}

export default function AdminGroupsPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [cooperationStatusFilter, setCooperationStatusFilter] = useState('');
  const [memberSizeFilter, setMemberSizeFilter] = useState('');
  const [appliedGroupTitle, setAppliedGroupTitle] = useState('');
  const [appliedHealth, setAppliedHealth] = useState('');
  const [appliedCooperationStatus, setAppliedCooperationStatus] = useState('');
  const [appliedMemberSize, setAppliedMemberSize] = useState('');
  const [updatingCooperationGroupId, setUpdatingCooperationGroupId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const hasActiveFilters = Boolean(
    appliedGroupTitle || appliedHealth || appliedCooperationStatus || appliedMemberSize,
  );

  const handleDeleteGroup = useCallback(
    async (record) => {
      const groupId = record?.groupId;
      if (groupId == null) {
        message.error('缺少群组 ID');
        return;
      }

      const groupIdStr = String(groupId);
      setDeletingGroupId(groupIdStr);
      try {
        const res = await deleteAdminTgGroup(groupId);
        if (!isAdminApiSuccess(res)) {
          message.error(res?.errorMsg || '删除群组失败');
          return;
        }

        message.success('群组已删除');
        setList((prev) => prev.filter((row) => String(row.groupId) !== groupIdStr));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('[AdminGroups] delete group failed:', error);
        message.error(error?.response?.data?.errorMsg || error?.message || '删除群组失败');
      } finally {
        setDeletingGroupId(null);
      }
    },
    [],
  );

  const handleCooperationStatusChange = useCallback(async (record, cooperationStatus) => {
    const groupId = record?.groupId;
    if (groupId == null) {
      message.error('缺少群组 ID');
      return;
    }

    const current = normalizeCooperationStatusKey(record.cooperationStatus);
    if (current === cooperationStatus) return;

    const groupIdStr = String(groupId);
    setUpdatingCooperationGroupId(groupIdStr);
    try {
      const res = await updateAdminTgGroupCooperationStatus({
        groupId: Number(groupId),
        cooperationStatus,
      });
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '更新合作状态失败');
        return;
      }

      message.success('合作状态已更新');
      setList((prev) =>
        prev.map((row) =>
          String(row.groupId) === groupIdStr ? { ...row, cooperationStatus } : row,
        ),
      );
    } catch (error) {
      console.error('[AdminGroups] update cooperation status failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '更新合作状态失败');
    } finally {
      setUpdatingCooperationGroupId(null);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildListParams({
        page,
        pageSize,
        groupTitle: appliedGroupTitle,
        health: appliedHealth,
        cooperationStatus: appliedCooperationStatus,
        memberSizeFilter: appliedMemberSize,
      });

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
  }, [
    page,
    pageSize,
    appliedGroupTitle,
    appliedHealth,
    appliedCooperationStatus,
    appliedMemberSize,
  ]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSearch = () => {
    setAppliedGroupTitle(groupTitleInput.trim());
    setAppliedHealth(healthFilter);
    setAppliedCooperationStatus(cooperationStatusFilter);
    setAppliedMemberSize(memberSizeFilter);
    setPage(1);
  };

  const handleClearGroupTitle = () => {
    setGroupTitleInput('');
    setAppliedGroupTitle('');
    setPage(1);
  };

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
      width: 220,
      onCell: () => ({
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-all',
          verticalAlign: 'top',
        },
      }),
      render: (v) =>
        v ? (
          <span
            style={{
              display: 'inline-block',
              maxWidth: '100%',
              wordBreak: 'break-all',
              whiteSpace: 'normal',
              lineHeight: 1.5,
            }}
          >
            {String(v)}
          </span>
        ) : (
          '-'
        ),
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
      title: '健康度',
      dataIndex: 'health',
      key: 'health',
      width: 90,
      align: 'center',
      render: renderHealth,
    },
    {
      title: '最近活跃',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      width: 170,
      render: formatTime,
    },
    {
      title: '加入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: formatTime,
    },
    {
      title: '合作状态',
      dataIndex: 'cooperationStatus',
      key: 'cooperationStatus',
      width: 120,
      align: 'center',
      render: (value, record) => (
        <CooperationStatusCell
          value={value}
          record={record}
          updating={updatingCooperationGroupId === String(record.groupId)}
          onChange={handleCooperationStatusChange}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, record) => {
        const groupIdStr = record?.groupId != null ? String(record.groupId) : '';
        const deleting = deletingGroupId === groupIdStr;

        return (
          <Popconfirm
            title="确认删除该群组？"
            description="将物理删除 tg_group 记录及该群的指令日统计，不可恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deleting }}
            placement="topLeft"
            getPopupContainer={() => document.body}
            disabled={!groupIdStr || deleting}
            onConfirm={() => handleDeleteGroup(record)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleting}
              disabled={!groupIdStr}
            >
              删除
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div className="pc-admin-page">
      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索群名称"
          value={groupTitleInput}
          onChange={(e) => setGroupTitleInput(e.target.value)}
          onPressEnter={handleSearch}
          onClear={handleClearGroupTitle}
          allowClear
          style={{ width: 200 }}
        />
        <Select
          placeholder="健康度"
          value={healthFilter || undefined}
          onChange={(v) => setHealthFilter(v || '')}
          allowClear
          style={{ width: 120 }}
          options={HEALTH_OPTIONS}
        />
        <Select
          placeholder="合作状态"
          value={cooperationStatusFilter || undefined}
          onChange={(v) => setCooperationStatusFilter(v || '')}
          allowClear
          style={{ width: 130 }}
          options={COOPERATION_STATUS_OPTIONS}
        />
        <Select
          placeholder="群规模"
          value={memberSizeFilter || undefined}
          onChange={(v) => setMemberSizeFilter(v || '')}
          allowClear
          style={{ width: 140 }}
          options={MEMBER_SIZE_OPTIONS}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
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
          scroll={{ x: 1170 }}
          locale={{ emptyText: hasActiveFilters ? '未找到匹配的群组' : '暂无群组数据' }}
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
