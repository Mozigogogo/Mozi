'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Modal,
  Tag,
  Alert,
  Descriptions,
  message,
  Popconfirm,
  Space,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';

const WITHDRAW_STATUS = {
  PENDING: { text: '待审核', color: 'warning' },
  APPROVED: { text: '已通过', color: 'processing' },
  REJECTED: { text: '已拒绝', color: 'error' },
  PAID: { text: '已打款', color: 'success' },
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
  return Number(value).toFixed(2);
}

export default function AdminWithdrawPage() {
  const [list] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const filteredList = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return list.filter((item) => {
      const matchStatus = !statusFilter || item.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      return [
        item.id,
        item.applyId,
        item.userId,
        item.nickName,
        item.nickname,
        item.walletAddress,
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [list, keyword, statusFilter]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    if (!list.length) {
      message.info('提现申请列表接口暂未对接');
    }
  };

  const handleViewDetail = (record) => {
    setDetailData(record);
    setDetailOpen(true);
  };

  const handleReview = (action) => {
    message.info(`提现${action === 'approve' ? '通过' : '拒绝'}接口暂未对接`);
  };

  const columns = [
    {
      title: '申请 ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.applyId || record.id || '-',
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
      title: '昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.nickName || record.nickname || '-',
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (v, record) => {
        const currency = record.currency || record.coin || 'USDT';
        return `${formatAmount(v)} ${currency}`;
      },
    },
    {
      title: '收款方式',
      dataIndex: 'payMethod',
      key: 'payMethod',
      width: 100,
      render: (v) => v || '-',
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
      render: (v, record) => formatTime(v || record.applyTime),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const isPending = record.status === 'PENDING' || record.status === 'pending';
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
                <Popconfirm
                  title="确认通过该提现申请？"
                  onConfirm={() => handleReview('approve')}
                >
                  <Button type="link" size="small">
                    通过
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="确认拒绝该提现申请？"
                  onConfirm={() => handleReview('reject')}
                >
                  <Button type="link" size="small" danger>
                    拒绝
                  </Button>
                </Popconfirm>
              </>
            ) : null}
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
        message="审核用户提现申请，支持通过、拒绝及查看详情。列表与审核接口暂未对接，当前仅开放管理员登录。"
      />

      <div className="pc-admin-toolbar">
        <Input
          placeholder="搜索申请 ID / 用户 ID / 昵称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter || undefined}
          onChange={(v) => {
            setStatusFilter(v || '');
            setPage(1);
          }}
          allowClear
          style={{ width: 120 }}
          options={STATUS_OPTIONS}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <div className="pc-admin-table-wrap">
        <Table
          rowKey={(record) => record.applyId || record.id}
          columns={columns}
          dataSource={pagedList}
          loading={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: '暂无提现申请（接口未对接）' }}
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
        title="提现申请详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
      >
        {detailData ? (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="申请 ID" span={2}>
              {detailData.applyId || detailData.id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户 ID">{detailData.userId || '-'}</Descriptions.Item>
            <Descriptions.Item label="昵称">
              {detailData.nickName || detailData.nickname || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="提现金额">
              {formatAmount(detailData.amount)} {detailData.currency || detailData.coin || 'USDT'}
            </Descriptions.Item>
            <Descriptions.Item label="手续费">
              {formatAmount(detailData.fee)} {detailData.currency || detailData.coin || 'USDT'}
            </Descriptions.Item>
            <Descriptions.Item label="收款方式">{detailData.payMethod || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {WITHDRAW_STATUS[detailData.status]?.text || detailData.status || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="收款地址" span={2}>
              {detailData.walletAddress || detailData.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间" span={2}>
              {formatTime(detailData.createdAt || detailData.applyTime)}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detailData.remark || detailData.note || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
        )}
      </Modal>
    </div>
  );
}
