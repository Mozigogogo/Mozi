import { Toast } from 'antd-mobile';

/**
 * Telegram 环境检测

 * 即使加载了 Telegram 脚本，也要检查是否真的在 Telegram 环境中运行
 */
export const isTelegramEnv = () => {
  if (typeof window === 'undefined') return false;
  
  const telegramWebApp = window.Telegram?.WebApp;
  if (!telegramWebApp) {
    // 兜底：某些 Telegram WebView 场景下 SDK 未及时注入，
    // 但 URL hash 仍携带 tgWebAppData / tgWebAppPlatform。
    const hash = window.location?.hash || '';
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const hashParams = new URLSearchParams(raw);
    return hashParams.has('tgWebAppData') || hashParams.has('tgWebAppPlatform');
  }
  
  // 检查是否有真实的 Telegram 数据
  const hasInitData = telegramWebApp.initData && telegramWebApp.initData.length > 0;
  const hasInitDataUnsafe = telegramWebApp.initDataUnsafe && Object.keys(telegramWebApp.initDataUnsafe).length > 0;
  const hasPlatform = telegramWebApp.platform && telegramWebApp.platform !== 'unknown';
  
  return hasInitData || hasInitDataUnsafe || hasPlatform;
};

/**
 * 获取当前应用运行的渠道（channel）
 * @returns {string} 'tg' 表示 Telegram 环境，'pc' 表示 PC/Web 环境
 */
export const getAppChannel = () => {
  if (typeof window === 'undefined') return 'pc';

  const debugLog = (message, payload = {}) => {
    // eslint-disable-next-line no-console
    console.warn(`[AppChannel][getAppChannel] ${message}`, {
      ts: Date.now(),
      href: window.location.href,
      ...payload,
    });
  };
  
  // 优先从 localStorage 读取（由 EnvironmentDetector 组件在应用启动时设置）
  const savedChannel = localStorage.getItem('appChannel');
  debugLog('read saved appChannel', { savedChannel });
  if (savedChannel) {
    return savedChannel;
  }
  
  // 如果 localStorage 中没有，则实时检测（兜底逻辑）
  const telegramWebApp = window.Telegram?.WebApp;
  if (!telegramWebApp) {
    const hash = window.location?.hash || '';
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const hashParams = new URLSearchParams(raw);
    const hasTgWebAppData = hashParams.has('tgWebAppData');
    const hasTgWebAppPlatform = hashParams.has('tgWebAppPlatform');
    const fallbackIsTelegram = hasTgWebAppData || hasTgWebAppPlatform;
    const fallbackChannel = fallbackIsTelegram ? 'tg' : 'pc';
    localStorage.setItem('appChannel', fallbackChannel);
    debugLog('fallback write appChannel via URL hash', {
      hasTelegramObject: !!window.Telegram,
      hasWebApp: false,
      hasTgWebAppData,
      hasTgWebAppPlatform,
      fallbackChannel,
    });
    return fallbackChannel;
  }
  
  // 检查是否有真实的 Telegram 数据
  const hasInitData = telegramWebApp.initData && telegramWebApp.initData.length > 0;
  const hasInitDataUnsafe = telegramWebApp.initDataUnsafe && Object.keys(telegramWebApp.initDataUnsafe).length > 0;
  const hasPlatform = telegramWebApp.platform && telegramWebApp.platform !== 'unknown';
  
  const isTelegram = hasInitData || hasInitDataUnsafe || hasPlatform;
  const channel = isTelegram ? 'tg' : 'pc';
  
  // 保存到 localStorage 供下次使用
  localStorage.setItem('appChannel', channel);
  debugLog('realtime detect and write appChannel', {
    channel,
    hasInitData,
    hasInitDataUnsafe,
    hasPlatform,
    platform: telegramWebApp.platform || null,
    initDataLength: telegramWebApp.initData?.length || 0,
  });
  
  console.log('[getAppChannel] 实时检测环境:', { 
    channel, 
    hasInitData, 
    hasInitDataUnsafe, 
    hasPlatform 
  });
  
  return channel;
};

/**
 * 调起 Telegram Stars 支付
 * @param {string} invoiceUrl - 从后端获取的支付链接
 * @returns {Promise<string>} - 返回支付状态 'paid' | 'failed' | 'cancelled'
 */
export const requestTelegramPayment = (invoiceUrl) => {
  return new Promise((resolve, reject) => {
    if (!isTelegramEnv()) {
      reject(new Error('Not in Telegram environment'));
      return;
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      reject(new Error('Telegram WebApp not initialized'));
      return;
    }

    // 定义一次性回调处理
    const handleInvoiceClosed = (params) => {
      const { status } = params;
      console.log('[TG Payment Utils] Invoice closed:', params);
      
      // 移除监听，防止内存泄漏
      tg.offEvent('invoiceClosed', handleInvoiceClosed);
      
      if (status === 'paid') {
        resolve('paid');
      } else if (status === 'failed') {
        reject(new Error('Payment failed'));
      } else {
        resolve('cancelled');
      }
    };

    // 绑定事件
    tg.onEvent('invoiceClosed', handleInvoiceClosed);

    // 调起支付
    try {
      tg.openInvoice(invoiceUrl);
    } catch (e) {
      tg.offEvent('invoiceClosed', handleInvoiceClosed);
      reject(e);
    }
  });
};

/**
 * 处理 VIP 购买流程
 * @param {string} planId - 选择的套餐 ID
 * @param {Function} t - i18n 翻译函数
 */
export const handleVipPurchase = async (planId, t) => {
  // 1. 环境检测
  if (isTelegramEnv()) {
    Toast.show({
      icon: 'loading',
      content: t('vipRecharge.result.processing.title'),
      duration: 0,
    });

    try {
      // 2. 模拟调用后端创建订单 (TODO: 替换为真实 API)
      console.log(`[TG Payment] Creating invoice for plan: ${planId}`);
      await new Promise(resolve => setTimeout(resolve, 800)); // 模拟网络请求

      // 临时 Mock：因为没有后端，这里留空或抛出提示
      const invoiceUrl = ""; 

      Toast.clear();

      if (invoiceUrl) {
        // 3. 调起支付
        const status = await requestTelegramPayment(invoiceUrl);
        
        if (status === 'paid') {
          Toast.show({
            icon: 'success',
            content: t('vipRecharge.result.success.title'),
          });
          // TODO: 刷新用户状态，检查后端是否已确认到账
        } else if (status === 'cancelled') {
          // 用户取消，无需提示错误
          console.log('[TG Payment] User cancelled');
        }
      } else {
        // 提示开发者/用户
        Toast.show({
          content: 'Stars Payment Backend Not Ready',
        });
        console.warn('[TG Payment] Missing invoiceUrl. Backend integration required to generate link via Bot API.');
      }

    } catch (error) {
      console.error('[TG Payment] Error:', error);
      Toast.clear();
      Toast.show({
        icon: 'fail',
        content: t('vipRecharge.result.fail.title'),
      });
    }
  } else {
    // 非 Telegram 环境
    Toast.show({
      content: t('vipRecharge.purchaseSuccess'),
    });
  }
};

// 页面跳转函数

// 跳转到详情页
export const jump2Detail = (symbol, fromFavorite = false) => {
  const url = fromFavorite 
    ? `/detail?symbol=${symbol}&fromFavorite=1`
    : `/detail?symbol=${symbol}`;
  window.location.href = url;
};

// 跳转到市场页
export const jump2Market = (symbol) => {
  window.location.href = `/market?symbol=${symbol}`;
};

// 跳转到列表页
export const jump2List = (config) => {
  // 兼容旧版调用方式
  if (typeof config === 'string') {
    const type = config;
    const params = arguments[1] || {};
    const queryParams = new URLSearchParams();
    queryParams.append('type', type);
    
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    
    window.location.href = `/list?${queryParams.toString()}`;
    return;
  }
  
  // 新版配置对象方式（支持搜索页等复杂场景）
  const {
    showHeader,
    rankTitle,
    interFace,
    requestData,
    gridTitle,
    gridCon,
    rankName,
    selectArr,
    reponseData,
    fromPlatform,
    searchCoin,
    showRanking,
    columnWidths
  } = config;
  
  const queryParams = new URLSearchParams();
  
  if (showHeader !== undefined) queryParams.append('showHeader', showHeader);
  if (rankTitle) queryParams.append('rankTitle', rankTitle);
  if (interFace) queryParams.append('interFace', interFace);
  if (requestData) queryParams.append('requestData', JSON.stringify(requestData));
  if (gridTitle) queryParams.append('gridTitle', JSON.stringify(gridTitle));
  if (gridCon) queryParams.append('gridCon', JSON.stringify(gridCon));
  if (rankName) queryParams.append('rankName', rankName);
  if (selectArr) queryParams.append('selectArr', JSON.stringify(selectArr));
  if (reponseData) queryParams.append('reponseData', JSON.stringify(reponseData));
  if (fromPlatform !== undefined) queryParams.append('fromPlatform', fromPlatform);
  if (searchCoin) queryParams.append('searchCoin', searchCoin);
  if (showRanking !== undefined) queryParams.append('showRanking', showRanking);
  if (columnWidths) queryParams.append('columnWidths', JSON.stringify(columnWidths));
  
  window.location.href = `/list?${queryParams.toString()}`;
};

// 跳转到无Tab页面
export const jump2NoTab = (pageName, params = {}) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
  const queryString = queryParams.toString();
  window.location.href = `/${pageName}${queryString ? `?${queryString}` : ''}`;
};

// 跳转到数据页面（如横屏图表）
export const jump2DataPage = (pageName, dataKey, data) => {
  // 将数据存储到 sessionStorage
  if (data) {
    sessionStorage.setItem(dataKey, JSON.stringify(data));
  }
  
  // 跳转到指定页面
  window.location.href = `/${pageName}`;
};

// 格式化数字
export const formatNumber = (num, digits = 2) => {
  if (num === undefined || num === null) return '--';
  
  // 处理科学计数法
  if (Math.abs(num) < 0.000001 && num !== 0) {
    return num.toExponential(digits);
  }
  
  // 处理普通数字
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

// 格式化百分比
export const formatPercent = (num, digits = 2) => {
  if (num === undefined || num === null) return '--';
  return `${(num * 100).toFixed(digits)}%`;
};

// 格式化时间
export const formatDate = (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!timestamp) return '--';
  
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 获取URL参数
export const getUrlParam = (name) => {
  const url = window.location.href;
  const params = new URL(url).searchParams;
  return params.get(name);
};

// 防抖函数
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// 节流函数
export const throttle = (fn, delay = 300) => {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
};