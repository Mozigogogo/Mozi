'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Modal,
  Form,
  InputNumber,
  Tag,
  Alert,
  Descriptions,
  message,
} from 'antd';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import {
  USER_LEVEL_OPTIONS,
  USER_LEVEL_RATE_PRESETS,
  formatRate,
  getUserLevelMeta,
} from './userLevelConstants';

export default function AdminUserLevelPage() {
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const filteredList = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return list.filter((item) => {
      const matchLevel = !levelFilter || item.userLevel === levelFilter;
      if (!matchLevel) return false;
      if (!q) return true;
      return [item.userId, item.nickName, item.nickname, item.email].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [list, keyword, levelFilter]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    if (!list.length) {
      message.info('用户等级列表接口暂未对接');
    }
  };

  const openEditModal = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      userLevel: record.userLevel || 'NORMAL',
      rateL1: record.rateL1,
      rateL2: record.rateL2,
      rateL3: record.rateL3,
    });
    setEditOpen(true);
  };

  const handleLevelChange = (level) => {
    const preset = USER_LEVEL_RATE_PRESETS[level];
    if (preset) {
      form.setFieldsValue(preset);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // TODO: 对接用户等级与分佣比例保存接口
      message.info('用户等级保存接口暂未对接，已在前端预览更新');

      setList((prev) =>
        prev.map((item) => {
          const id = item.userId || item.id;
          const editingId = editingUser?.userId || editingUser?.id;
          if (id !== editingId) return item;
          return {
            ...item,
            userLevel: values.userLevel,
            rateL1: values.rateL1,
            rateL2: values.rateL2,
            rateL3: values.rateL3,
          };
        })
      );
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
      title: '用户等级',
      dataIndex: 'userLevel',
      key: 'userLevel',
      width: 120,
      render: (level) => {
        const meta = getUserLevelMeta(level);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '一级分佣',
      dataIndex: 'rateL1',
      key: 'rateL1',
      width: 100,
      render: (v) => formatRate(v),
    },
    {
      title: '二级分佣',
      dataIndex: 'rateL2',
      key: 'rateL2',
      width: 100,
      render: (v) => formatRate(v),
    },
    {
      title: '三级分佣',
      dataIndex: 'rateL3',
      key: 'rateL3',
      width: 100,
      render: (v) => formatRate(v),
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
          设置
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
        message="为每位用户设置身份等级（如 KOL）及对应分佣比例。选择等级后会填充推荐比例，可再手动调整。接口暂未对接。"
      />

      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索用户 ID / 昵称 / 邮箱"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Select
          placeholder="等级筛选"
          value={levelFilter || undefined}
          onChange={(v) => {
            setLevelFilter(v || '');
            setPage(1);
          }}
          allowClear
          style={{ width: 140 }}
          options={USER_LEVEL_OPTIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
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
          scroll={{ x: 1040 }}
          locale={{ emptyText: '暂无用户等级数据（接口未对接）' }}
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
        title="设置用户等级与分佣"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        {editingUser ? (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 20 }}>
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
                name="userLevel"
                label="用户等级 / 身份"
                rules={[{ required: true, message: '请选择用户等级' }]}
              >
                <Select
                  placeholder="请选择用户等级"
                  options={USER_LEVEL_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={handleLevelChange}
                />
              </Form.Item>

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
