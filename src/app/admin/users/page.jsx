'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  Select,
  Alert,
  message,
  Space,
} from 'antd';
import { SearchOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listAdminUsers,
  listCommissionLevels,
  updateUserCommissionLevel,
  isAdminApiSuccess,
  normalizeAdminUserPage,
} from '@/api/admin';
import { getCommissionLevelId, normalizeCommissionLevelList } from '../user-level/userLevelConstants';

export default function AdminUsersPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nickNameInput, setNickNameInput] = useState('');
  const [telegramIdInput, setTelegramIdInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [appliedNickName, setAppliedNickName] = useState('');
  const [appliedTelegramId, setAppliedTelegramId] = useState('');
  const [appliedUserId, setAppliedUserId] = useState('');
  const [levelOptions, setLevelOptions] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const levelLabelMap = useMemo(() => {
    const map = new Map();
    levelOptions.forEach((item) => {
      const id = getCommissionLevelId(item);
      if (id != null) {
        map.set(Number(id), item.levelName || item.levelCode || String(id));
      }
    });
    return map;
  }, [levelOptions]);

  const fetchLevels = useCallback(async () => {
    try {
      const res = await listCommissionLevels();
      if (!isAdminApiSuccess(res)) return;
      setLevelOptions(normalizeCommissionLevelList(res?.data));
    } catch (error) {
      console.error('[AdminUsers] fetch levels failed:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: pageSize };
      if (appliedNickName) params.nickName = appliedNickName;
      if (appliedTelegramId) params.telegramId = appliedTelegramId;
      if (appliedUserId) params.userId = appliedUserId;

      const res = await listAdminUsers(params);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '加载用户列表失败');
        setList([]);
        setTotal(0);
        return;
      }

      const pageData = normalizeAdminUserPage(res?.data);
      setList(pageData.list);
      setTotal(pageData.total);
    } catch (error) {
      console.error('[AdminUsers] fetch users failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '加载用户列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedNickName, appliedTelegramId, appliedUserId, page, pageSize]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setAppliedNickName(nickNameInput.trim());
    setAppliedTelegramId(telegramIdInput.trim());
    setAppliedUserId(userIdInput.trim());
    setPage(1);
  };

  const handleClearNickName = () => {
    setNickNameInput('');
    setAppliedNickName('');
    setPage(1);
  };

  const handleClearTelegramId = () => {
    setTelegramIdInput('');
    setAppliedTelegramId('');
    setPage(1);
  };

  const handleClearUserId = () => {
    setUserIdInput('');
    setAppliedUserId('');
    setPage(1);
  };

  const openEditModal = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      commissionLevelId:
        record.commissionLevelId == null ? undefined : Number(record.commissionLevelId),
    });
    setEditOpen(true);
  };

  const handleSaveLevel = async () => {
    try {
      const values = await form.validateFields();
      if (!editingUser?.userId) {
        message.error('缺少用户 ID');
        return;
      }

      setSaving(true);
      const res = await updateUserCommissionLevel({
        userId: editingUser.userId,
        commissionLevelId:
          values.commissionLevelId == null || values.commissionLevelId === ''
            ? null
            : Number(values.commissionLevelId),
      });

      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '保存失败');
        return;
      }

      message.success('分佣等级已更新');
      setEditOpen(false);
      setEditingUser(null);
      form.resetFields();
      await fetchUsers();
    } catch (error) {
      if (error?.errorFields) return;
      console.error('[AdminUsers] update commission level failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 220,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'TGID',
      dataIndex: 'telegramId',
      key: 'telegramId',
      width: 140,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 140,
      ellipsis: true,
      render: (_, record) => record.nickName || record.nickname || '-',
    },
    {
      title: '邀请码',
      dataIndex: 'inviteCode',
      key: 'inviteCode',
      width: 120,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '分佣等级',
      dataIndex: 'commissionLevelId',
      key: 'commissionLevelId',
      width: 160,
      render: (v) => {
        if (v == null || v === '') return '未分配';
        return levelLabelMap.get(Number(v)) || `等级 #${v}`;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditModal(record)}
        >
          设置等级
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
        message="查询正常状态用户，支持按用户 ID / TGID 精确搜索、按昵称模糊搜索，并为用户分配分佣等级。"
      />

      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索用户 ID"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onPressEnter={handleSearch}
          onClear={handleClearUserId}
          allowClear
          style={{ width: 280 }}
        />
        <Input
          placeholder="搜索 TGID"
          value={telegramIdInput}
          onChange={(e) => setTelegramIdInput(e.target.value)}
          onPressEnter={handleSearch}
          onClear={handleClearTelegramId}
          allowClear
          style={{ width: 220 }}
        />
        <Input
          placeholder="搜索昵称"
          value={nickNameInput}
          onChange={(e) => setNickNameInput(e.target.value)}
          onPressEnter={handleSearch}
          onClear={handleClearNickName}
          allowClear
          style={{ width: 220 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
          刷新
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => String(record.userId || record.id)}
          columns={columns}
          dataSource={list}
          loading={loading}
          locale={{
            emptyText:
              appliedNickName || appliedTelegramId || appliedUserId
                ? '未找到匹配的用户'
                : '暂无用户数据',
          }}
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

      <Modal
        title="设置用户分佣等级"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        onOk={handleSaveLevel}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={480}
      >
        {editingUser ? (
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item label="用户 ID">
              <Input value={editingUser.userId} disabled />
            </Form.Item>
            <Form.Item label="昵称">
              <Input value={editingUser.nickName || editingUser.nickname || '-'} disabled />
            </Form.Item>
            <Form.Item name="commissionLevelId" label="分佣等级">
              <Select
                allowClear
                placeholder="请选择分佣等级，清空表示取消分配"
                options={levelOptions.map((item) => {
                  const id = getCommissionLevelId(item);
                  return {
                    value: Number(id),
                    label: `${item.levelName || item.levelCode || id}${
                      item.levelCode ? ` (${item.levelCode})` : ''
                    }`,
                  };
                })}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </div>
  );
}
