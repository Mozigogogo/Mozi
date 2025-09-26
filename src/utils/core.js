// 页面跳转函数

// 跳转到详情页
export const jump2Detail = (symbol) => {
  window.location.href = `/detail?symbol=${symbol}`;
};

// 跳转到市场页
export const jump2Market = (symbol) => {
  window.location.href = `/market?symbol=${symbol}`;
};

// 跳转到列表页
export const jump2List = (type, params = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('type', type);
  
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  
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