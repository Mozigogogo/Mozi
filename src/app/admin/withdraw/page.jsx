'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Select,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Descriptions,
  message,
  Space,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listAdminCommissionWithdrawals,
  updateAdminCommissionWithdrawalStatus,
  isAdminApiSuccess,
  normalizeAdminWithdrawPage,
} from '@/api/admin';

const WITHDRAW_STATUS = {
  PENDING: { text: '审核中', color: 'warning' },
  PAID: { text: '已打款', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
};

const STATUS_OPTIONS = Object.entries(WITHDRAW_STATUS).map(([value, item]) => ({
  value,
  label: item.text,
}));

function formatTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-CN');
}

function formatAmount(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(4);
}

function formatAddress(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= 16) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

export default function AdminWithdrawPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewType, setReviewType] = useState(null);
  const [reviewingRecord, setReviewingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: pageSize };
      if (statusFilter) params.status = statusFilter;

      const res = await listAdminCommissionWithdrawals(params);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '加载提现申请失败');
        setList([]);
        setTotal(0);
        return;
      }

      const pageData = normalizeAdminWithdrawPage(res?.data);
      setList(pageData.list);
      setTotal(pageData.total);
    } catch (error) {
      console.error('[AdminWithdraw] fetch list failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '加载提现申请失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleViewDetail = (record) => {
    setDetailData(record);
    setDetailOpen(true);
  };

  const openReviewModal = (record, type) => {
    setReviewingRecord(record);
    setReviewType(type);
    form.resetFields();
    setReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    try {
      const values = await form.validateFields();
      if (!reviewingRecord?.id) {
        message.error('缺少申请 ID');
        return;
      }

      setSubmitting(true);
      const payload =
        reviewType === 'paid'
          ? { status: 'PAID', txHash: values.txHash?.trim() }
          : { status: 'REJECTED', remark: values.remark?.trim() || undefined };

      const res = await updateAdminCommissionWithdrawalStatus(reviewingRecord.id, payload);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '操作失败');
        return;
      }

      message.success(reviewType === 'paid' ? '已标记为已打款' : '已驳回该申请');
      setReviewOpen(false);
      setReviewingRecord(null);
      setReviewType(null);
      fetchWithdrawals();
    } catch (error) {
      if (error?.errorFields) return;
      console.error('[AdminWithdraw] update status failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '申请 ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (v) => v ?? '-',
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 180,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v) => `${formatAmount(v)} USDT`,
    },
    {
      title: '收款地址',
      dataIndex: 'toAddress',
      key: 'toAddress',
      width: 180,
      ellipsis: true,
      render: (v) => formatAddress(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = WITHDRAW_STATUS[status] || { text: status || '-', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => formatTime(v),
    },
    {
      title: '处理时间',
      dataIndex: 'processedAt',
      key: 'processedAt',
      width: 170,
      render: (v) => formatTime(v),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const isPending = record.status === 'PENDING';
        return (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
            {isPending ? (
              <>
                <Button type="link" size="small" onClick={() => openReviewModal(record, 'paid')}>
                  打款
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => openReviewModal(record, 'reject')}
                >
                  驳回
                </Button>
              </>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="pc-admin-page">
      <div className="pc-admin-toolbar">
        <Select
          placeholder="状态筛选"
          value={statusFilter || undefined}
          onChange={(v) => {
            setStatusFilter(v || '');
            setPage(1);
          }}
          allowClear
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchWithdrawals}>
          刷新
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={list}
          loading={loading}
          scroll={{ x: 1200 }}
          locale={{ emptyText: '暂无提现申请' }}
          pagination={{
            current: page,
            pageSize,
            total,
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
        title="提现申请详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
      >
        {detailData ? (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="申请 ID">{detailData.id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="用户 ID">{detailData.userId || '-'}</Descriptions.Item>
            <Descriptions.Item label="提现金额">
              {formatAmount(detailData.amount)} USDT
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {WITHDRAW_STATUS[detailData.status]?.text || detailData.status || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="收款地址" span={2}>
              {detailData.toAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="交易哈希" span={2}>
              {detailData.txHash || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {formatTime(detailData.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="处理时间">
              {formatTime(detailData.processedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detailData.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
        )}
      </Modal>

      <Modal
        title={reviewType === 'paid' ? '确认打款' : '驳回提现申请'}
        open={reviewOpen}
        onCancel={() => {
          setReviewOpen(false);
          setReviewingRecord(null);
          setReviewType(null);
        }}
        onOk={handleSubmitReview}
        confirmLoading={submitting}
        okText={reviewType === 'paid' ? '确认打款' : '确认驳回'}
        okButtonProps={reviewType === 'reject' ? { danger: true } : undefined}
        destroyOnClose
      >
        {reviewingRecord ? (
          <div style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
            申请 ID：{reviewingRecord.id}，金额：{formatAmount(reviewingRecord.amount)} USDT
          </div>
        ) : null}
        <Form form={form} layout="vertical" preserve={false}>
          {reviewType === 'paid' ? (
            <Form.Item
              name="txHash"
              label="交易哈希"
              rules={[{ required: true, message: '请输入交易哈希' }]}
            >
              <Input placeholder="0xabc123..." />
            </Form.Item>
          ) : (
            <Form.Item name="remark" label="驳回原因">
              <Input.TextArea rows={3} placeholder="可选，填写驳回原因" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};
