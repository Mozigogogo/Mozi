'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  InputNumber,
  Alert,
  message,
  Popconfirm,
  Space,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  listCommissionLevels,
  createCommissionLevel,
  updateCommissionLevel,
  deleteCommissionLevel,
  isAdminApiSuccess,
} from '@/api/admin';
import {
  formatCommissionRate,
  getCommissionLevelId,
  normalizeCommissionLevelList,
  toApiCommissionRate,
  toFormCommissionRate,
} from './userLevelConstants';

/** 暂时隐藏搜索，改为 true 可恢复 */
const SHOW_LEVEL_SEARCH = false;

export default function AdminUserLevelPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCommissionLevels();
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '加载分佣等级失败');
        setList([]);
        return;
      }
      setList(normalizeCommissionLevelList(res?.data));
    } catch (error) {
      console.error('[AdminUserLevel] fetch levels failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '加载分佣等级失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const filteredList = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      [item.levelCode, item.levelName, item.description].some((v) =>
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
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      levelCode: record.levelCode,
      levelName: record.levelName,
      commissionRatePercent: toFormCommissionRate(record.commissionRate),
      description: record.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        levelCode: String(values.levelCode || '').trim(),
        levelName: String(values.levelName || '').trim(),
        commissionRate: toApiCommissionRate(values.commissionRatePercent),
        description: String(values.description || '').trim(),
      };

      const editingId = editingRecord ? getCommissionLevelId(editingRecord) : null;
      const res = editingId
        ? await updateCommissionLevel(editingId, payload)
        : await createCommissionLevel(payload);

      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '保存失败');
        return;
      }

      message.success(editingId ? '等级已更新' : '等级已创建');
      setModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      await fetchLevels();
    } catch (error) {
      if (error?.errorFields) return;
      console.error('[AdminUserLevel] save failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const id = getCommissionLevelId(record);
    if (id == null) {
      message.error('缺少等级 ID，无法删除');
      return;
    }

    try {
      const res = await deleteCommissionLevel(id);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '删除失败');
        return;
      }
      message.success('等级已删除');
      await fetchLevels();
    } catch (error) {
      console.error('[AdminUserLevel] delete failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '删除失败');
    }
  };

  const columns = [
    {
      title: '等级 ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (_, record) => getCommissionLevelId(record) ?? '-',
    },
    {
      title: '等级编码',
      dataIndex: 'levelCode',
      key: 'levelCode',
      width: 120,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '等级名称',
      dataIndex: 'levelName',
      key: 'levelName',
      width: 160,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '分佣比例',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      width: 120,
      render: (v) => formatCommissionRate(v),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该等级？"
            description="删除后不可恢复，请确认没有用户正在使用该等级。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            placement="topLeft"
            getPopupContainer={() => document.body}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="pc-admin-page">
      <Alert
        className="pc-admin-alert"
        type="info"
        showIcon
        message="配置分佣等级规则。管理员可新增、编辑或删除等级，并设置对应的分佣比例。"
      />

      <div className="pc-admin-toolbar">
        {SHOW_LEVEL_SEARCH ? (
          <>
            <Input
              placeholder="搜索等级编码 / 名称 / 说明"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              style={{ width: 260 }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
          </>
        ) : null}
        <Button icon={<ReloadOutlined />} onClick={fetchLevels} loading={loading}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增等级
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => String(getCommissionLevelId(record) ?? record.levelCode)}
          columns={columns}
          dataSource={pagedList}
          loading={loading}
          locale={{ emptyText: '暂无分佣等级，请点击「新增等级」创建' }}
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
        title={editingRecord ? '编辑分佣等级' : '新增分佣等级'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="levelCode"
            label="等级编码"
            rules={[
              { required: true, message: '请输入等级编码' },
              { max: 32, message: '编码不超过 32 个字符' },
            ]}
          >
            <Input placeholder="如 L1、KOL" disabled={Boolean(editingRecord)} />
          </Form.Item>
          <Form.Item
            name="levelName"
            label="等级名称"
            rules={[
              { required: true, message: '请输入等级名称' },
              { max: 64, message: '名称不超过 64 个字符' },
            ]}
          >
            <Input placeholder="如 普通代理、KOL" />
          </Form.Item>
          <Form.Item
            name="commissionRatePercent"
            label="分佣比例 (%)"
            rules={[
              { required: true, message: '请输入分佣比例' },
              { type: 'number', min: 0, max: 100, message: '比例范围 0-100' },
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: '100%' }}
              addonAfter="%"
              placeholder="如 10 表示 10%"
            />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="可选，补充等级说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
