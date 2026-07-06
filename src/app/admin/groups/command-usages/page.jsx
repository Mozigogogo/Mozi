'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Button, Input, DatePicker, Select, message } from 'antd';
import { SearchOutlined, ReloadOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getAdminTgGroupCommandUsages,
  isAdminApiSuccess,
  normalizeAdminTgGroupCommandUsages,
} from '@/api/admin';

const { RangePicker } = DatePicker;
const MAX_RANGE_DAYS = 31;

const COMMAND_OPTIONS = [
  { value: '/ai', label: '/ai' },
  { value: '/chat', label: '/chat' },
  { value: '/predict', label: '/predict' },
  { value: '/alert', label: '/alert' },
  { value: '/price', label: '/price' },
  { value: '/bigorder', label: '/bigorder' },
];

const HIDDEN_COMMANDS = new Set(['/start']);

function isDisplayableCommand(command) {
  const normalized = normalizeCommand(command);
  return Boolean(normalized) && !HIDDEN_COMMANDS.has(normalized);
}

function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('zh-CN');
}

function getDefaultDateRange() {
  const end = dayjs().startOf('day');
  const start = end.subtract(6, 'day');
  return [start, end];
}

function validateDateRange(range) {
  if (!range?.[0] || !range?.[1]) return '请选择起止日期';
  if (range[1].isBefore(range[0], 'day')) return '结束日期不能早于开始日期';
  if (range[1].diff(range[0], 'day') + 1 > MAX_RANGE_DAYS) {
    return `日期跨度不能超过 ${MAX_RANGE_DAYS} 天`;
  }
  return '';
}

function normalizeCommand(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return text.startsWith('/') ? text : `/${text}`;
}

function commandMatches(command, filter) {
  if (!filter) return true;
  return normalizeCommand(command) === normalizeCommand(filter);
}

function buildAppliedQuery(dateRange, groupId, groupTitle, command) {
  return {
    startDate: dateRange[0].format('YYYY-MM-DD'),
    endDate: dateRange[1].format('YYYY-MM-DD'),
    groupId: groupId.trim(),
    groupTitle: groupTitle.trim(),
    command: command || '',
  };
}

function filterDayByCommand(day, commandFilter) {
  if (!commandFilter) return day;

  const groups = (day.groups || [])
    .map((group) => {
      const commands = (group.commands || []).filter((cmd) =>
        commandMatches(cmd.command, commandFilter),
      );
      const useCount = commands.reduce((sum, cmd) => sum + (Number(cmd.useCount) || 0), 0);
      return { ...group, commands, useCount };
    })
    .filter((group) => group.commands.length > 0);

  const useCount = groups.reduce((sum, group) => sum + (Number(group.useCount) || 0), 0);
  return { ...day, groups, useCount };
}

function filterUsageDataByCommand(data, commandFilter) {
  if (!commandFilter) return data;

  const dailyStats = (data.dailyStats || [])
    .map((day) => filterDayByCommand(day, commandFilter))
    .filter((day) => (Number(day.useCount) || 0) > 0 && (day.groups?.length || 0) > 0);

  return {
    ...data,
    dailyStats,
  };
}

const DISPLAY_COMMAND_COLUMNS = COMMAND_OPTIONS.map((option) =>
  normalizeCommand(option.value),
);

function buildDayDetailData(day) {
  const groups = (day?.groups || []).filter((group) =>
    (group.commands || []).some((cmd) => isDisplayableCommand(cmd.command)),
  );

  const rows = groups.map((group, groupIndex) => {
    const commandCounts = {};
    (group.commands || []).forEach((cmd) => {
      const normalized = normalizeCommand(cmd.command);
      if (!isDisplayableCommand(normalized)) return;
      commandCounts[normalized] =
        (commandCounts[normalized] || 0) + (Number(cmd.useCount) || 0);
    });

    return {
      key: `${day.statDate}-${group.groupId ?? groupIndex}`,
      groupTitle:
        group.groupTitle || (group.groupId != null ? String(group.groupId) : '-'),
      groupId: group.groupId,
      commandCounts,
    };
  });

  return { rows, commandColumns: DISPLAY_COMMAND_COLUMNS };
}

function hasDayDetails(day) {
  return buildDayDetailData(day).rows.length > 0;
}

const DETAIL_FIXED_COLUMNS = [
  { key: 'groupTitle', title: '群名称', className: 'pc-admin-usage-detail__cell--title' },
  { key: 'groupId', title: '群 ID', className: 'pc-admin-usage-detail__cell--group-id' },
];

function UsageDetailPanel({ rows, commandColumns }) {
  if (!rows.length) {
    return <div className="pc-admin-usage-detail__empty">当日无群组指令用量</div>;
  }

  return (
    <div className="pc-admin-usage-detail__scroll">
      <div
        className="pc-admin-usage-detail"
        style={{
          gridTemplateColumns: `minmax(180px, 2.2fr) minmax(140px, 1.5fr) repeat(${commandColumns.length}, minmax(72px, 1fr))`,
        }}
      >
        <div className="pc-admin-usage-detail__row">
          {DETAIL_FIXED_COLUMNS.map((column) => (
            <div
              key={column.key}
              className={`pc-admin-usage-detail__cell pc-admin-usage-detail__cell--head ${column.className}`}
            >
              {column.title}
            </div>
          ))}
          {commandColumns.map((command) => (
            <div
              key={command}
              className="pc-admin-usage-detail__cell pc-admin-usage-detail__cell--head pc-admin-usage-detail__cell--cmd"
            >
              {command}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div className="pc-admin-usage-detail__row" key={row.key}>
            {DETAIL_FIXED_COLUMNS.map((column) => (
              <div
                key={column.key}
                className={`pc-admin-usage-detail__cell ${column.className}`}
              >
                {column.key === 'groupTitle' ? (
                  <span className="pc-admin-usage-detail__text" title={row.groupTitle}>
                    {row.groupTitle || '-'}
                  </span>
                ) : row.groupId != null ? (
                  String(row.groupId)
                ) : (
                  '-'
                )}
              </div>
            ))}
            {commandColumns.map((command) => (
              <div
                key={command}
                className="pc-admin-usage-detail__cell pc-admin-usage-detail__cell--cmd"
              >
                {formatCount(row.commandCounts[command] ?? 0)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminCommandUsagesPage() {
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateRange, setDateRange] = useState(defaultRange);
  const [groupIdInput, setGroupIdInput] = useState('');
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [commandFilter, setCommandFilter] = useState('');
  const [appliedQuery, setAppliedQuery] = useState(() =>
    buildAppliedQuery(
      defaultRange[0] && defaultRange[1] ? defaultRange : getDefaultDateRange(),
      '',
      '',
      '',
    ),
  );
  const [usageData, setUsageData] = useState(() => normalizeAdminTgGroupCommandUsages(null));
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const filteredUsageData = useMemo(
    () => filterUsageDataByCommand(usageData, appliedQuery.command),
    [appliedQuery.command, usageData],
  );

  const updateExpandedRows = useCallback((data) => {
    setExpandedRowKeys(
      data.dailyStats
        .filter((day) => hasDayDetails(day))
        .map((day) => day.statDate),
    );
  }, []);

  const fetchUsages = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startDate: appliedQuery.startDate,
        endDate: appliedQuery.endDate,
      };
      if (appliedQuery.groupId) params.groupId = appliedQuery.groupId;
      if (appliedQuery.groupTitle) params.groupTitle = appliedQuery.groupTitle;
      if (appliedQuery.command) params.command = appliedQuery.command;

      const res = await getAdminTgGroupCommandUsages(params);
      if (!isAdminApiSuccess(res)) {
        message.error(res?.errorMsg || '查询指令用量失败');
        setUsageData(normalizeAdminTgGroupCommandUsages(null));
        setExpandedRowKeys([]);
        return;
      }

      const normalized = normalizeAdminTgGroupCommandUsages(res?.data);
      const displayData = filterUsageDataByCommand(normalized, appliedQuery.command);
      setUsageData(normalized);
      updateExpandedRows(displayData);
      setQueried(true);
    } catch (error) {
      console.error('[AdminCommandUsages] fetch failed:', error);
      message.error(error?.response?.data?.errorMsg || error?.message || '查询指令用量失败');
      setUsageData(normalizeAdminTgGroupCommandUsages(null));
      setExpandedRowKeys([]);
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, updateExpandedRows]);

  useEffect(() => {
    fetchUsages();
  }, [fetchUsages]);

  const handleSearch = () => {
    const rangeError = validateDateRange(dateRange);
    if (rangeError) {
      message.warning(rangeError);
      return;
    }
    setAppliedQuery(
      buildAppliedQuery(dateRange, groupIdInput, groupTitleInput, commandFilter),
    );
  };

  const toggleExpand = (statDate) => {
    setExpandedRowKeys((prev) =>
      prev.includes(statDate) ? prev.filter((key) => key !== statDate) : [...prev, statDate],
    );
  };

  const dailyStats = useMemo(
    () =>
      [...filteredUsageData.dailyStats].sort((a, b) =>
        (b.statDate || '').localeCompare(a.statDate || ''),
      ),
    [filteredUsageData.dailyStats],
  );
  const totalUseCount = useMemo(
    () => dailyStats.reduce((sum, day) => sum + (Number(day.useCount) || 0), 0),
    [dailyStats],
  );

  const dailyColumns = [
    {
      title: '日期',
      dataIndex: 'statDate',
      key: 'statDate',
      render: (v) => v || '-',
    },
    {
      title: '',
      key: 'expandAction',
      width: 160,
      align: 'right',
      render: (_, record) => {
        const hasDetails = hasDayDetails(record);
        const dayUseCount = Number(record.useCount) || 0;
        if (!hasDetails || dayUseCount <= 0) {
          return <span className="pc-admin-usage-day-empty">暂无用量</span>;
        }
        const expanded = expandedRowKeys.includes(record.statDate);
        const Icon = expanded ? DownOutlined : RightOutlined;
        return (
          <div className="pc-admin-usage-day-action">
            {!expanded ? (
              <span className="pc-admin-usage-day-count">用量 {formatCount(dayUseCount)}</span>
            ) : null}
            <button
              type="button"
              className="pc-admin-expand-btn"
              onClick={() => toggleExpand(record.statDate)}
              aria-label={expanded ? '收起' : '展开'}
            >
              <Icon />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="pc-admin-page">
      <div className="pc-admin-toolbar">
        <RangePicker
          value={dateRange}
          onChange={(values) => {
            if (!values?.[0] || !values?.[1]) return;
            const error = validateDateRange(values);
            if (error) {
              message.warning(error);
              return;
            }
            setDateRange(values);
          }}
          allowClear={false}
          style={{ width: 280 }}
        />
        <Select
          placeholder="指令筛选"
          value={commandFilter || undefined}
          onChange={(value) => setCommandFilter(value || '')}
          allowClear
          style={{ width: 140 }}
          options={COMMAND_OPTIONS}
        />
        <Input
          placeholder="群 ID（可选）"
          value={groupIdInput}
          onChange={(e) => setGroupIdInput(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 180 }}
        />
        <Input
          placeholder="群名称（可选）"
          value={groupTitleInput}
          onChange={(e) => setGroupTitleInput(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          style={{ width: 200 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchUsages} loading={loading}>
          刷新
        </Button>
      </div>

      {queried ? (
        <div style={{ marginBottom: 16, color: '#595959', fontSize: 14 }}>
          统计区间：{filteredUsageData.startDate || '-'} ~ {filteredUsageData.endDate || '-'}
          {appliedQuery.command ? (
            <span style={{ marginLeft: 24 }}>指令：{appliedQuery.command}</span>
          ) : null}
          <span style={{ marginLeft: 24 }}>合计用量：{formatCount(totalUseCount)}</span>
        </div>
      ) : null}

      <div className="pc-admin-table-wrap pc-admin-usage-table-wrap">
        <Table
          className="pc-admin-usage-table"
          rowKey="statDate"
          columns={dailyColumns}
          dataSource={dailyStats}
          loading={loading}
          tableLayout="fixed"
          locale={{
            emptyText: queried
              ? appliedQuery.command
                ? `该区间暂无 ${appliedQuery.command} 指令用量数据`
                : '该区间暂无指令用量数据'
              : '请选择日期后查询',
          }}
          expandable={{
            showExpandColumn: false,
            expandedRowKeys,
            expandedRowClassName: () => 'pc-admin-usage-expand-row',
            rowExpandable: (day) => hasDayDetails(day),
            expandedRowRender: (day) => {
              const { rows, commandColumns } = buildDayDetailData(day);
              return <UsageDetailPanel rows={rows} commandColumns={commandColumns} />;
            },
          }}
          pagination={false}
        />
      </div>
    </div>
  );
}
