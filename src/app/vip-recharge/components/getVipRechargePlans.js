function buildIconMapFromPlans(plansByTab) {
  const iconMap = {};
  Object.values(plansByTab || {}).forEach((plans) => {
    (plans || []).forEach((plan) => {
      (plan.features || []).forEach((f) => {
        if (f && typeof f === 'object' && f.label && f.icon && !iconMap[f.label]) {
          iconMap[f.label] = f.icon;
        }
      });
    });
  });
  return iconMap;
}

// 检测是否在 Telegram 环境中（与 BenefitCodeModal 的逻辑保持一致）
function isTelegramEnv() {
  if (typeof window === 'undefined') return false;
  try {
    const channel = window.localStorage?.getItem('appChannel');
    // 仅当渠道为 tg 且当前运行在 Telegram WebApp 容器内，才视为 TG 端
    // 避免本地残留 appChannel=tg 导致 PC/H5 误用 Stars 价格
    const inTelegramWebApp = Boolean(window.Telegram?.WebApp);
    return channel === 'tg' && inTelegramWebApp;
  } catch (e) {
    return false;
  }
}

function normalizeBenefits(benefits) {
  if (!benefits) return null;
  // common patterns: { data: ... } or direct payload
  const payload = benefits?.data ?? benefits;
  return payload ?? null;
}

function normalizePricing(pricing) {
  if (!pricing) return null;
  const payload = pricing?.data ?? pricing;
  return payload ?? null;
}

function billingCycleToTabKey(billingCycle) {
  if (!billingCycle) return null;
  const s = String(billingCycle).toLowerCase();
  if (s === 'month' || s === 'monthly') return 'monthly';
  if (s === 'year' || s === 'yearly') return 'yearly';
  return null;
}

function formatPoints(points, tabKey) {
  if (points == null || points === '') return '';
  const suffix = tabKey === 'yearly' ? '/年' : '/月';
  return `${points}积分${suffix}`;
}

function formatAiCallQuota(aiCallQuota, tabKey) {
  if (aiCallQuota == null || aiCallQuota === '') return '';
  const suffix = '/月';
  return `AI Call ${aiCallQuota}次${suffix}`;
}

function coerceFeatureList(rawList, iconMap) {
  if (!Array.isArray(rawList)) return null;
  return rawList
    .map((it) => {
      if (!it) return null;
      if (typeof it === 'string') return { label: it, icon: iconMap[it] || null };
      if (typeof it === 'object') {
        const label = it.label || it.name || it.title;
        if (!label) return null;
        return { label, icon: it.icon || iconMap[label] || null };
      }
      return null;
    })
    .filter(Boolean);
}

function resolveTelegramStarsDisplay(tier) {
  if (!tier || typeof tier !== 'object') return null;
  const starsPrice =
    tier.tgStarsAmount ??
    tier.starsPrice ??
    tier.starPrice ??
    tier.tgStarsPrice ??
    tier.telegramStarsPrice ??
    tier.starsAmount ??
    tier.starAmount ??
    tier.telegramStars ??
    tier.tgStars;
  if (starsPrice == null || starsPrice === '') return null;
  return {
    price: String(starsPrice),
    currency: '⭐',
  };
}

function mergeRemoteIntoPlans(plansByTab, benefitsRes, pricingRes) {
  const benefits = normalizeBenefits(benefitsRes);
  const pricing = normalizePricing(pricingRes);

  // keep existing if remote is not usable
  if (!benefits && !pricing) return plansByTab;

  const iconMap = buildIconMapFromPlans(plansByTab);

  // -------- Benefits v2 (/subscription/benefits) --------
  // Shape: [{ planCode, planLevel, planName, badge, basicMarket, basicPush, bigOrderFeed, bigOrderDelay, emailAlert, adFree, multiTheme, exclusiveCs, alphaGroup }]
  // Requirement: 返回几条就展示几个方案（按 planLevel 排序）
  let allowedPlanNames = null;
  const benefitByName = new Map();
  if (Array.isArray(benefits)) {
    allowedPlanNames = benefits
      .slice()
      .sort((a, b) => (a?.planLevel ?? 0) - (b?.planLevel ?? 0))
      .map((b) => b?.planName)
      .filter(Boolean);

    benefits.forEach((b) => {
      if (b?.planName) benefitByName.set(b.planName, b);
    });
  }

  const applyBenefitsToPlan = (plan, benefit) => {
    if (!benefit) return plan;
    const next = { ...plan };

    // badge 同步
    if (benefit.badge) next.badge = benefit.badge;

    // 大单延迟：替换已有括号内容为接口 delay
    const delay = benefit.bigOrderDelay;
    if (delay != null && Array.isArray(next.features)) {
      next.features = next.features.map((f) => {
        if (!f || typeof f !== 'object') return f;
        if (typeof f.label !== 'string') return f;
        if (!f.label.startsWith('大单行情')) return f;
        const delayText = `${delay}s延迟`;
        const replaced = f.label.includes('（')
          ? f.label.replace(/（[^）]*）/g, `（${delayText}）`)
          : `${f.label}（${delayText}）`;
        return { ...f, label: replaced };
      });
    }

    // 基础权益开关：0 则删除对应项（保留其它静态项，例如 AI Call/月度积分）
    const keepByFlag = (mainLabel) => {
      switch (mainLabel) {
        case '基础行情':
          return benefit.basicMarket === 1;
        case 'APP基础推送':
          return benefit.basicPush === 1;
        case '邮件告警':
          return benefit.emailAlert === 1;
        case '无广告':
          return benefit.adFree === 1;
        case '多主题切换':
          return benefit.multiTheme === 1;
        case 'Alpha核心群':
          return benefit.alphaGroup === 1;
        default:
          return true;
      }
    };

    if (Array.isArray(next.features)) {
      next.features = next.features.filter((f) => {
        if (!f || typeof f !== 'object') return true;
        const l = f.label;
        if (typeof l !== 'string') return true;
        const main = l.split(' ')[0];
        return keepByFlag(main);
      });
    }

    // Pro：如果有 badge，强化为“专属黑金标志”
    if (benefit.planName === 'Pro' && Array.isArray(next.features) && benefit.badge) {
      next.features = next.features.map((f) => {
        if (!f || typeof f !== 'object') return f;
        if (f.label === '专属标志') return { ...f, label: '专属黑金标志' };
        return f;
      });
    }

    return next;
  };

  // Benefits: support shapes like { monthly: { Free: [...] } } or array with plan identifiers
  const getBenefitsFor = (tabKey, planTitle) => {
    if (!benefits) return null;

    // Shape A: { monthly: { Free: [...] } } or { monthly: [{title, benefits:[...]}] }
    const tab = benefits[tabKey];
    if (tab) {
      if (Array.isArray(tab)) {
        const hit = tab.find((x) => x?.title === planTitle || x?.name === planTitle || x?.plan === planTitle);
        return hit?.benefits || hit?.features || hit?.items || hit?.list || null;
      }
      if (typeof tab === 'object') {
        const direct = tab[planTitle] || tab[planTitle?.toLowerCase?.()] || null;
        return direct?.benefits || direct?.features || direct?.items || direct?.list || direct;
      }
    }

    // Shape B: flat array
    if (Array.isArray(benefits)) {
      const hit = benefits.find((x) => x?.title === planTitle || x?.name === planTitle || x?.plan === planTitle);
      return hit?.benefits || hit?.features || hit?.items || hit?.list || null;
    }

    return null;
  };

  // Pricing: support shapes like { monthly: { Free: {price,...}} } or array of tiers
  const getPricingFor = (tabKey, planTitle) => {
    if (!pricing) return null;
    const tab = pricing[tabKey];
    if (tab) {
      if (Array.isArray(tab)) {
        return tab.find((x) => x?.title === planTitle || x?.name === planTitle || x?.plan === planTitle) || null;
      }
      if (typeof tab === 'object') {
        return tab[planTitle] || tab[planTitle?.toLowerCase?.()] || null;
      }
    }
    if (Array.isArray(pricing)) {
      return pricing.find((x) => x?.title === planTitle || x?.name === planTitle || x?.plan === planTitle) || null;
    }
    return null;
  };

  // -------- Pricing v2 (/subscription/pricing) --------
  // Shape: [{ planCode, tierCode, billingCycle, price, aiCallQuota, monthlyPoints, ... }]
  const hasPricingV2 = Array.isArray(pricing) && pricing.some((x) => x && x.billingCycle && x.tierCode);
  const pricingV2Grouped = { monthly: {}, yearly: {} };
  if (hasPricingV2) {
    pricing
      .filter((x) => x && x.status !== 0)
      .forEach((x) => {
        const tabKey = billingCycleToTabKey(x.billingCycle);
        if (!tabKey) return;
        const planCode = x.planCode;
        if (!planCode) return;
        if (!pricingV2Grouped[tabKey][planCode]) pricingV2Grouped[tabKey][planCode] = [];
        pricingV2Grouped[tabKey][planCode].push(x);
      });

    // stable ordering: by aiCallQuota then monthlyPoints
    Object.values(pricingV2Grouped).forEach((byPlan) => {
      Object.keys(byPlan).forEach((planCode) => {
        byPlan[planCode] = byPlan[planCode].slice().sort((a, b) => {
          const aq = (a.aiCallQuota ?? 0) - (b.aiCallQuota ?? 0);
          if (aq !== 0) return aq;
          return (a.monthlyPoints ?? 0) - (b.monthlyPoints ?? 0);
        });
      });
    });
  }

  const merged = {};
  const isTgEnv = isTelegramEnv();
  Object.entries(plansByTab).forEach(([tabKey, plans]) => {
    let working = plans || [];

    // benefits 返回几条就展示几个（按 planName 过滤）
    if (allowedPlanNames && allowedPlanNames.length) {
      working = working.filter((p) => allowedPlanNames.includes(p.title));
    }

    merged[tabKey] = working.map((p) => {
      let next = { ...p };

      // benefits v2 应用（如果匹配到 planName）
      if (benefitByName.size) {
        next = applyBenefitsToPlan(next, benefitByName.get(next.title));
      }

      const remoteBenefits = getBenefitsFor(tabKey, p.title);
      const coercedFeatures = coerceFeatureList(remoteBenefits, iconMap);
      if (coercedFeatures && coercedFeatures.length) next.features = coercedFeatures;

      // pricing v2 优先：用 billingCycle 判断月/年，用 tierCode 作为 Pro 下拉选项 id
      if (hasPricingV2 && (tabKey === 'monthly' || tabKey === 'yearly')) {
        const planCode = (p.title || '').toUpperCase(); // Free/Lite/Pro -> FREE/LITE/PRO
        const tiers = pricingV2Grouped?.[tabKey]?.[planCode] || [];

        const tgStarsDisplayForTier = (tier) => (isTgEnv ? resolveTelegramStarsDisplay(tier) : null);

        // Telegram 环境下优先展示星星字段（无星星字段时再回退美元）
        if (p.title === 'Free' && isTgEnv) {
          next.currency = '⭐';
          next.period = tabKey === 'yearly' ? '/年' : '/月';
        }

        if (p.title === 'Lite' && tiers[0]) {
          const liteTier = tiers[0];
          const starsDisplay = tgStarsDisplayForTier(liteTier);
          next.price = starsDisplay?.price || String(liteTier.price);
          next.currency = starsDisplay?.currency || '$';
          next.period = tabKey === 'yearly' ? '/年' : '/月';
          // 为 Lite 方案挂上 pricingId，供 Telegram Stars 支付使用
          next.pricingId = liteTier.pricingId || liteTier.id;
        }

        if (p.title === 'Pro' && tiers.length) {
          // card 顶部展示用最低档价格
          const lowest = tiers[0];
          const starsDisplay = tgStarsDisplayForTier(lowest);
          next.price = starsDisplay?.price || String(lowest.price);
          next.currency = starsDisplay?.currency || '$';
          next.period = tabKey === 'yearly' ? '/年' : '/月';

          next.tierSelect = {
            ...(next.tierSelect || { label: '选择等级' }),
            defaultId: String(tiers[0].tierCode),
            options: tiers.map((t) => ({
              ...(tgStarsDisplayForTier(t) || {}),
              id: String(t.tierCode),
              title: formatPoints(t.monthlyPoints, tabKey),
              subtitle: `AI Call ${t.aiCallQuota}次`,
              pricingId: t.pricingId || t.id,
              price: tgStarsDisplayForTier(t)?.price || String(t.price),
              currency: tgStarsDisplayForTier(t)?.currency || '$',
              period: tabKey === 'yearly' ? '/年' : '/月',
            })),
            onChange: (opt) => console.log('Pro level:', opt),
          };

          // 同步权益区间（AI Call / 积分）
          const minCall = tiers[0].aiCallQuota;
          const maxCall = tiers[tiers.length - 1].aiCallQuota;
          const minPts = tiers[0].monthlyPoints;
          const maxPts = tiers[tiers.length - 1].monthlyPoints;
          const callSuffix = '/月';
          const ptsSuffix = tabKey === 'yearly' ? '/年' : '/月';
          const pointsLabel = tabKey === 'yearly' ? '年度积分' : '月度积分';

          if (Array.isArray(next.features)) {
            next.features = next.features.map((f) => {
              if (!f || typeof f !== 'object' || typeof f.label !== 'string') return f;
              if (f.label.startsWith('AI Call')) {
                return { ...f, label: `AI Call ${minCall}~${maxCall}次${callSuffix}` };
              }
              if (f.label.startsWith('月度积分') || f.label.startsWith('年度积分')) {
                return { ...f, label: `${pointsLabel} ${minPts}~${maxPts}${ptsSuffix}` };
              }
              return f;
            });
          }
        }

        if (p.title === 'Lite' && tiers[0] && Array.isArray(next.features)) {
          // Lite：同步 AI Call / 积分具体值
          const t0 = tiers[0];
          const pointsLabel = tabKey === 'yearly' ? '年度积分' : '月度积分';
          next.features = next.features.map((f) => {
            if (!f || typeof f !== 'object' || typeof f.label !== 'string') return f;
            if (f.label.startsWith('AI Call')) {
              return { ...f, label: formatAiCallQuota(t0.aiCallQuota, tabKey) };
            }
            if (f.label.startsWith('月度积分') || f.label.startsWith('年度积分')) {
              return { ...f, label: `${pointsLabel} ${formatPoints(t0.monthlyPoints, tabKey)}` };
            }
            return f;
          });
        }
      } else {
        // 旧结构兼容
        const remotePricing = getPricingFor(tabKey, p.title);
        if (remotePricing) {
          const price = remotePricing.price ?? remotePricing.amount ?? remotePricing.value;
          const currency = remotePricing.currency ?? remotePricing.symbol;
          const period = remotePricing.period ?? remotePricing.unit;
          if (price != null) next.price = String(price);
          if (currency) next.currency = String(currency);
          if (period) next.period = String(period);
        }
      }

      return next;
    });
  });

  return merged;
}

export function getVipRechargePlans({ benefitsRes = null, pricingRes = null } = {}) {
  const base = {
    monthly: [
      {
        id: 1,
        title: 'Free',
        price: '0',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#C1C1C1',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '20x',
          subtitle: '升级到Lite/Pro可享受',
          locked: true,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情', icon: '/point/Order_situation.svg' },
          { label: 'AI Call', icon: '/icons/ai-call.gray.svg' },
          { label: '月度积分', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '开始体验',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Free'),
      },
      {
        id: 2,
        title: 'Lite',
        price: '24.99',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#22C55E',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '20x',
          subtitle: 'Every 30-Day Cycle',
          locked: false,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 20档深度（5s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 20次/月', icon: '/icons/ai-call.gray.svg' },
          { label: '月度积分 5000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '标准客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: true,
        badge: 'MASTER',
        onSubscribe: () => console.log('Subscribe to Lite'),
      },
      {
        id: 3,
        title: 'Pro',
        price: '49.9',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40档深度（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/icons/ai-call.gray.svg' },
          { label: '月度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Pro'),
      },
    ],
    yearly: [
      {
        id: 1,
        title: 'Free',
        price: '0',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#C1C1C1',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '20x',
          subtitle: '升级到Lite/Pro可享受',
          locked: true,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情', icon: '/point/Order_situation.svg' },
          { label: 'AI Call', icon: '/icons/ai-call.gray.svg' },
          { label: '年度积分', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '开始体验',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Free Yearly'),
      },
      {
        id: 2,
        title: 'Lite',
        price: '249.99',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#22C55E',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '20x',
          subtitle: 'Every 30-Day Cycle',
          locked: false,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 20档深度（5s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 20次/月', icon: '/icons/ai-call.gray.svg' },
          { label: '年度积分 5000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '标准客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: true,
        badge: 'MASTER',
        onSubscribe: () => console.log('Subscribe to Lite Yearly'),
      },
      {
        id: 3,
        title: 'Pro',
        price: '499.9',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro yearly level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40档深度（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/icons/ai-call.gray.svg' },
          { label: '年度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Pro Yearly'),
      },
    ],
    lifetime: [
      {
        id: 1,
        title: 'Pro',
        price: '499.9',
        currency: '$',
        period: '/lifetime',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro lifetime level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market.svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40档深度（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/icons/ai-call.gray.svg' },
          { label: '月度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: true,
        badge: 'BEST VALUE',
        onSubscribe: () => console.log('Subscribe to Pro Lifetime'),
      },
    ],
  };

  return mergeRemoteIntoPlans(base, benefitsRes, pricingRes);
}

