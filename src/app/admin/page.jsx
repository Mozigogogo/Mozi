'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Spin, message } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getAdminOverview,
  isAdminApiSuccess,
  normalizeAdminOverview,
} from '@/api/admin';

function StatCard({ label, value, icon, iconColor, precision }) {
  const display =
    precision != null && typeof value === 'number'
      ? value.toLocaleString('en-US', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        })
      : typeof value === 'number'
        ? value.toLocaleString('en-US')
        : value;

  return (
    <div className="pc-admin-stat-card">
      <div className="pc-admin-stat-card__label">{label}</div>
      <div className="pc-admin-stat-card__value">
        <span className="pc-admin-stat-card__icon" style={{ color: iconColor }}>
          {icon}
        </span>
        <span>{display}</span>
      </div>
    </div>
  );
}

const EMPTY_OVERVIEW = normalizeAdminOverview(null);

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getAdminOverview();
      if (!isAdminApiSuccess(res)) {
        const msg = res?.errorMsg || '加载概览失败';
        setErrorMsg(msg);
        message.error(msg);
        setOverview(EMPTY_OVERVIEW);
        return;
      }
      setOverview(normalizeAdminOverview(res?.data));
    } catch (error) {
      console.error('[AdminOverview] fetch failed:', error);
      const msg =
        error?.response?.data?.errorMsg || error?.message || '加载概览失败';
      setErrorMsg(msg);
      message.error(msg);
      setOverview(EMPTY_OVERVIEW);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="pc-admin-page">
      <div className="pc-admin-toolbar">
        <Button icon={<ReloadOutlined />} onClick={fetchOverview} loading={loading}>
          刷新
        </Button>
      </div>

      {errorMsg ? (
        <Alert
          className="pc-admin-alert"
          type="error"
          showIcon
          message={errorMsg}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Spin spinning={loading}>
        <div className="pc-admin-stats">
          <StatCard
            label="总用户数"
            value={overview.userTotalCount}
            icon={<UserOutlined />}
            iconColor="#11B787"
          />
          <StatCard
            label="累计分佣 (USDT)"
            value={overview.totalCommissionAmount}
            icon={<DollarOutlined />}
            iconColor="#faad14"
            precision={2}
          />
          <StatCard
            label="待审核分佣 (USDT)"
            value={overview.pendingCommissionAmount}
            icon={<ClockCircleOutlined />}
            iconColor="#ff4d4f"
            precision={2}
          />
        </div>
      </Spin>
    </div>
  );
}
