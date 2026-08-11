'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * PlanCard 组件 - VIP充值卡片
 * @param {Object} props
 * @param {string} props.title - 卡片标题
 * @param {string} props.price - 价格
 * @param {string} props.currency - 货币符号，默认 '$'
 * @param {string} props.period - 时间周期，如 'month', 'year'
 * @param {Array<string | { label: string, icon?: string }>} props.features - 功能列表（可带图标）
 * @param {Object} props.highlightFeature - 头部高亮卡片（如 AI CALL），可选
 * @param {string} props.highlightFeature.label - 高亮标题，例如 'AI CALL / 月'
 * @param {string} props.highlightFeature.value - 数值，例如 '120x'
 * @param {string} props.highlightFeature.subtitle - 副文案
 * @param {boolean} props.highlightFeature.locked - 是否锁定（灰色样式）
 * @param {Object} props.tierSelect - Pro 下拉选择面板（选择等级），可选
 * @param {string} props.tierSelect.label - 标题，例如 '选择等级'
 * @param {Array<{id: string, title: string, subtitle?: string}>} props.tierSelect.options - 选项
 * @param {string} props.tierSelect.defaultId - 默认选项 id
 * @param {(option: {id: string, title: string, subtitle?: string}) => void} props.tierSelect.onChange - 选择回调
 * @param {string} props.buttonText - 按钮文本，默认 'Subscribe'
 * @param {(payload: {
 *   title: string;
 *   price: string;
 *   currency: string;
 *   period: string;
 *   tier?: { id: string; title: string; subtitle?: string };
 * }) => void} props.onSubscribe - 订阅按钮点击回调
 * @param {boolean} props.isPopular - 是否为热门方案，默认 false
 * @param {string} props.badge - 徽章文本，如 'Most Popular'
 * @param {string} props.description - 卡片描述
 * @param {boolean} props.disabled - 是否禁用，默认 false
 * @param {'free' | 'lite' | 'pro'} props.planType - 套餐类型，用于图标底色
 */
const PlanCard = ({
  title = 'Basic Plan',
  price = '9.99',
  currency = '$',
  period = 'month',
  features = [],
  highlightFeature = null,
  tierSelect = null,
  accentColor = '#C1C1C1',
  buttonText = 'Subscribe',
  onSubscribe = () => {},
  isPopular = false,
  badge = '',
  description = '',
  disabled = false,
  fullWidth = false,
  compact = false,
}) => {
  const { t } = useTranslation();

  const normalizePeriodKey = (p) => {
    const s = String(p ?? '').toLowerCase();
    if (s.includes('/年') || s.includes('year')) return 'year';
    if (s.includes('/月') || s.includes('month')) return 'month';
    return '';
  };

  const formatPeriod = (periodLike) => {
    const key = normalizePeriodKey(periodLike);
    if (key === 'year') return t('vipRecharge.planCard.period.year');
    if (key === 'month') return t('vipRecharge.planCard.period.month');
    return String(periodLike ?? '');
  };

  const localizeCta = (txt) => {
    const s = String(txt ?? '');
    if (!s) return s;
    if (s === '开始体验') return t('vipRecharge.planCard.cta.try');
    if (s === '立即购买') return t('vipRecharge.planCard.cta.buyNow');
    if (s === '当前订阅') return t('vipRecharge.planCard.cta.current');
    if (s.toLowerCase() === 'subscribe') return t('vipRecharge.planCard.cta.subscribe');
    return s;
  };

  const localizeSave = (desc) => {
    const s = String(desc ?? '').trim();
    if (!s) return s;
    const m = s.match(/save\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return t('vipRecharge.planCard.save', { amount: m[1] });
    return s;
  };

  const localizeHighlightLabel = (label) => {
    const s = String(label ?? '').trim();
    if (!s) return s;
    if (/ai\s*call/i.test(s) && (s.includes('/月') || s.includes('/年') || s.includes('/ mo') || s.includes('/ yr'))) {
      return t('vipRecharge.planCard.aiCallLabel', { period: formatPeriod(s) });
    }
    if (s === 'AI CALL / 月') return t('vipRecharge.planCard.aiCallLabel', { period: t('vipRecharge.planCard.period.month') });
    return s;
  };

  const localizeHighlightSubtitle = (subtitle) => {
    const s = String(subtitle ?? '').trim();
    if (!s) return s;
    if (s === '升级到Lite/Pro可享受') return t('vipRecharge.planCard.highlight.upgradeHint');
    if (s === 'Every 30-Day Cycle') return t('vipRecharge.planCard.highlight.cycle30d');
    return s;
  };

  const localizeFeatureMain = (main, periodLike) => {
    const s = String(main ?? '').trim();
    if (!s) return s;
    if (s === '月度积分' || s === '年度积分') {
      return normalizePeriodKey(periodLike) === 'year'
        ? t('vipRecharge.features.yearlyPoints')
        : t('vipRecharge.features.monthlyPoints');
    }
    const map = {
      基础行情: 'vipRecharge.features.basicMarket',
      APP基础推送: 'vipRecharge.features.basicPush',
      邮件告警: 'vipRecharge.features.emailAlert',
      大单行情: 'vipRecharge.features.bigOrder',
      'AI Call': 'vipRecharge.features.aiCall',
      专属标志: 'vipRecharge.features.exclusiveBadge',
      专属黑金标志: 'vipRecharge.features.exclusiveBlackGoldBadge',
      无广告: 'vipRecharge.features.adFree',
      多主题切换: 'vipRecharge.features.multiTheme',
      客服: 'vipRecharge.features.customerService',
      标准客服: 'vipRecharge.features.standardCustomerService',
      专属客服: 'vipRecharge.features.exclusiveCustomerService',
      Alpha核心群: 'vipRecharge.features.alphaGroup',
    };
    const key = map[s];
    return key ? t(key) : s;
  };

  const localizeFeatureMeta = (meta) => {
    const s = String(meta ?? '').trim();
    if (!s) return s;

    // 20条（5s延迟） / 20档深度（5s延迟）
    const bigOrder = s.match(/^(\d+)\s*(?:条|档深度).*?(\d+)\s*s.*?延迟/i);
    if (bigOrder) return t('vipRecharge.features.bigOrderMeta', { count: bigOrder[1], delay: bigOrder[2] });

    // 20次/月 或 20次/年
    const aiCall = s.match(/^(\d+(?:\s*~\s*\d+)?)\s*次\s*\/\s*(月|年)$/);
    if (aiCall) {
      const periodKey = aiCall[2] === '年' ? 'year' : 'month';
      return t('vipRecharge.features.aiCallMeta', { count: aiCall[1].replace(/\s*/g, ''), period: t(`vipRecharge.planCard.period.${periodKey}`) });
    }

    // 5000/月 或 10000~50000/月（积分）
    const pts = s.match(/^([\d,]+(?:\s*~\s*[\d,]+)?)\s*\/\s*(月|年)$/);
    if (pts) {
      const periodKey = pts[2] === '年' ? 'year' : 'month';
      return t('vipRecharge.features.pointsMeta', { points: pts[1].replace(/\s*/g, ''), period: t(`vipRecharge.planCard.period.${periodKey}`) });
    }

    // 10000积分/月
    const ptsWithWord = s.match(/^([\d,]+)\s*积分\s*\/\s*(月|年)$/);
    if (ptsWithWord) {
      const periodKey = ptsWithWord[2] === '年' ? 'year' : 'month';
      return t('vipRecharge.features.pointsWithUnit', { points: ptsWithWord[1], period: t(`vipRecharge.planCard.period.${periodKey}`) });
    }

    // AI Call 40次
    const aiPlain = s.match(/^AI\s*Call\s*(\d+)\s*次$/i);
    if (aiPlain) return t('vipRecharge.features.aiCallPlain', { count: aiPlain[1] });

    return s;
  };

  const localizeTierLabel = (label) => {
    const s = String(label ?? '').trim();
    if (!s) return t('vipRecharge.planCard.tierSelect.label');
    if (s === '选择等级') return t('vipRecharge.planCard.tierSelect.label');
    return s;
  };

  const localizeTierTitle = (titleLike) => {
    const s = String(titleLike ?? '').trim();
    if (!s) return s;
    // 10000积分/月
    const ptsWithWord = s.match(/^([\d,]+)\s*积分\s*\/\s*(月|年)$/);
    if (ptsWithWord) {
      const periodKey = ptsWithWord[2] === '年' ? 'year' : 'month';
      return t('vipRecharge.features.pointsWithUnit', {
        points: ptsWithWord[1],
        period: t(`vipRecharge.planCard.period.${periodKey}`),
      });
    }
    // 10000 pts /mo (fallback: keep)
    return s;
  };

  const localizeTierSubtitle = (subtitleLike) => {
    const s = String(subtitleLike ?? '').trim();
    if (!s) return s;
    // AI Call 40次
    const aiPlain = s.match(/^AI\s*Call\s*(\d+)\s*次$/i);
    if (aiPlain) return t('vipRecharge.features.aiCallPlain', { count: aiPlain[1] });
    return s;
  };

  const tierOptions = useMemo(() => tierSelect?.options || [], [tierSelect]);
  const [tierOpen, setTierOpen] = useState(false);
  const [tierSelectedId, setTierSelectedId] = useState(
    tierSelect?.defaultId || tierOptions[0]?.id || ''
  );
  const tierWrapRef = useRef(null);

  useEffect(() => {
    // 当外部配置变化时，重置默认选项
    setTierSelectedId(tierSelect?.defaultId || tierOptions[0]?.id || '');
  }, [tierSelect?.defaultId, tierOptions]);

  const tierSelected = useMemo(
    () => tierOptions.find((o) => o.id === tierSelectedId) || tierOptions[0],
    [tierOptions, tierSelectedId]
  );

  const [loading, setLoading] = useState(false);

  const displayPrice = tierSelected?.price ?? price;
  const displayCurrency = tierSelected?.currency ?? currency;
  const displayPeriod = formatPeriod(tierSelected?.period ?? period);

  useEffect(() => {
    if (!tierOpen) return;
    const onDocDown = (e) => {
      if (!tierWrapRef.current) return;
      if (!tierWrapRef.current.contains(e.target)) setTierOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
    };
  }, [tierOpen]);

  const handleTierPick = (opt) => {
    setTierSelectedId(opt.id);
    setTierOpen(false);
    tierSelect?.onChange?.(opt);
  };

  const handleSubscribe = async () => {
    if (disabled || loading) return;

    const payload = {
      title,
      price: displayPrice,
      currency: displayCurrency,
      period: displayPeriod,
      tier: tierSelected,
    };

    const maybePromise = onSubscribe(payload);
    if (maybePromise && typeof maybePromise.then === 'function') {
      try {
        setLoading(true);
        await maybePromise;
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className={`${styles.planCard} ${isPopular ? styles.popular : ''} ${
        styles[`planCard${title}`] || ''
      } ${compact ? styles.planCardCompact : ''}`}
      style={{
        '--accent-color': accentColor,
        ...(fullWidth ? { maxWidth: 'none' } : {}),
      }}
    >
      {/* 背景装饰 */}
      <div className={styles.background} />

      {/* 卡片内容 */}
      <div className={styles.content}>
        {/* 标题上方固定文案 */}
        <p className={styles.topLabel}>{t('vip.planCard.master')}</p>

        {/* 标题 */}
        <h3 className={styles.title}>{title}</h3>

        {/* 价格区域 */}
        <div className={styles.priceSection}>
          <div className={styles.price}>
            {displayCurrency === '⭐' ? (
              <img
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/star-solid.svg"
                alt="Stars"
                className={styles.currencyStarIcon}
              />
            ) : (
              <span className={styles.currency}>{displayCurrency}</span>
            )}
            <span className={styles.amount}>{displayPrice}</span>
            <span className={styles.period}>{displayPeriod}</span>
          </div>
        </div>

        {/* 描述 - 显示在价格区域下方 */}
        {description && (
          <p className={`${styles.description} ${title !== 'Free' ? styles.descriptionBadge : ''}`}>
            {localizeSave(description)}
          </p>
        )}

        {/* 分割线 */}
        <div className={styles.divider} />

        {/* Pro 下拉等级选择 */}
        {tierSelect && tierOptions.length > 0 && (
          <div className={styles.tierSelectWrap} ref={tierWrapRef}>
            <p className={styles.tierSelectLabel}>{localizeTierLabel(tierSelect.label)}</p>

            <button
              type="button"
              className={styles.tierSelectTrigger}
              onClick={() => setTierOpen((v) => !v)}
              aria-expanded={tierOpen}
            >
              <div className={styles.tierSelectTriggerText}>
                <div className={styles.tierSelectTitle}>{localizeTierTitle(tierSelected?.title)}</div>
                {tierSelected?.subtitle && (
                  <div className={styles.tierSelectSubtitle}>{localizeTierSubtitle(tierSelected.subtitle)}</div>
                )}
              </div>
              <img
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/down_arrow.svg"
                alt=""
                className={`${styles.tierChevron} ${tierOpen ? styles.tierChevronOpen : ''}`}
              />
            </button>

            {tierOpen && (
              <div className={styles.tierPanel} role="listbox">
                {tierOptions.map((opt) => {
                  const active = opt.id === tierSelectedId;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      className={`${styles.tierOption} ${active ? styles.tierOptionActive : ''}`}
                      onClick={() => handleTierPick(opt)}
                      role="option"
                      aria-selected={active}
                    >
                      <div className={styles.tierOptionText}>
                        <div className={styles.tierOptionTitle}>
                          {localizeTierTitle(opt.title)}
                          {opt.subtitle ? `，${localizeTierSubtitle(opt.subtitle)}` : ''}
                        </div>
                      </div>
                      {active && (
                        <img
                          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/select.svg"
                          alt=""
                          className={styles.tierOptionSelectIcon}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* 顶部高亮能力块（Free / Lite 用） */}
      {highlightFeature && (
        <div
          className={`${styles.highlightCard} ${
            highlightFeature.locked ? styles.highlightLocked : styles.highlightActive
          }`}
        >
          <div className={styles.highlightHeader}>
            <span className={styles.highlightLabel}>{localizeHighlightLabel(highlightFeature.label)}</span>
          </div>
          <div className={styles.highlightMain}>
            <span
              className={`${styles.highlightValue} ${
                highlightFeature.locked ? styles.highlightValueLocked : ''
              }`}
            >
              {highlightFeature.value}
            </span>
            {highlightFeature.locked && (
              <img
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/lock.svg"
                alt="locked"
                className={styles.highlightLock}
              />
            )}
          </div>
          {highlightFeature.subtitle && (
            <p className={styles.highlightSubtitle}>{localizeHighlightSubtitle(highlightFeature.subtitle)}</p>
          )}
        </div>
      )}

        {/* 功能列表 */}
        <ul className={styles.features}>
          {features.map((feature, index) => {
            const isObject = typeof feature === 'object' && feature !== null;
            const label = isObject ? feature.label : feature;
            const icon = isObject ? feature.icon : null;
            const isFreePlan = title === 'Free';
            const isLitePlan = title === 'Lite';
            // Free 版：前两项可用，其余权益展示为锁定（置灰 + 删除线 + 锁图标）
            // Lite 版：最后一项（Alpha 核心群）展示为锁定
            const isLocked = (isFreePlan && index >= 2) || (isLitePlan && index === features.length - 1);

            const labelText = String(label ?? '');
            // 将“标题 + 额外信息”拆分（例如：`大单行情 20条（5s延迟）`、`AI Call 20次/月`）
            // 规则：按“最后一个空格”拆分，避免把 `AI Call` 中的 `Call` 误判成 meta
            const lastSpaceIdx = labelText.lastIndexOf(' ');
            const hasMeta = lastSpaceIdx > -1 && lastSpaceIdx < labelText.length - 1;
            const mainText = hasMeta ? labelText.slice(0, lastSpaceIdx) : labelText;
            const metaText = hasMeta ? labelText.slice(lastSpaceIdx + 1) : '';
            const featurePeriodLike = tierSelected?.period ?? period;
            return (
              <li key={index} className={styles.featureItem}>
                {icon ? (
                  <span className={styles.featureIcon}>
                    <img src={icon} alt="" className={styles.featureIconImg} />
                  </span>
                ) : (
                  <span className={styles.checkmark}>✓</span>
                )}
                <span className={`${styles.featureText} ${isLocked ? styles.featureTextLocked : ''}`}>
                  <span className={styles.featureMainText}>{localizeFeatureMain(mainText, featurePeriodLike)}</span>
                  {hasMeta && <span className={styles.featureMetaText}> {localizeFeatureMeta(metaText)}</span>}
                </span>
                {isLocked && (
                  <img
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/lock.svg"
                    alt=""
                    className={styles.featureLockIcon}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* 订阅按钮 */}
        <button
          className={`${styles.button} ${disabled ? styles.disabled : ''} ${
            loading ? styles.loading : ''
          }`}
          onClick={handleSubscribe}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className={styles.buttonLoadingInner}>
              <span className={styles.spinner} />
            </span>
          ) : (
            localizeCta(buttonText)
          )}
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
