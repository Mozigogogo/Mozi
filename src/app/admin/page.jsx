'use client';

import { Alert } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

function StatCard({ label, value, icon, iconColor, precision }) {
  const display =
    precision != null && typeof value === 'number'
      ? value.toFixed(precision)
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

export default function AdminDashboardPage() {
  return (
    <div className="pc-admin-page">
      <Alert
        className="pc-admin-alert"
        type="info"
        showIcon
        message="概览数据接口暂未对接，当前仅开放管理员登录。"
      />
      <div className="pc-admin-stats">
        <StatCard
          label="总用户数"
          value={0}
          icon={<UserOutlined />}
          iconColor="#11B787"
        />
        <StatCard
          label="活跃用户"
          value={0}
          icon={<TeamOutlined />}
          iconColor="#1677ff"
        />
        <StatCard
          label="累计分佣 (USDT)"
          value={0}
          icon={<DollarOutlined />}
          iconColor="#faad14"
          precision={2}
        />
        <StatCard
          label="待结算 (USDT)"
          value={0}
          icon={<ClockCircleOutlined />}
          iconColor="#ff4d4f"
          precision={2}
        />
      </div>
    </div>
  );
}
