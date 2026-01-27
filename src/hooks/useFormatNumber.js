/**
 * 数字格式化 Hook
 * 用于格式化数字，去掉无效的小数位
 */
export const useFormatNumber = () => {
  /**
   * 格式化数值，去掉无效的小数位
   * @param {string|number} val - 要格式化的值
   * @param {number} maxDecimals - 最大保留小数位数，默认为2
   * @returns {string} 格式化后的值
   * 
   * @example
   * formatValue('2400.0%') // '2400%'
   * formatValue('970.00%') // '970%'
   * formatValue('957.08%') // '957.08%'
   * formatValue('-5.50%') // '-5.5%'
   * formatValue('123.456', 2) // '123.46'
   */
  const formatValue = (val, maxDecimals = 2) => {
    if (!val && val !== 0) return val;
    
    const strVal = String(val);
    
    // 检查是否包含百分号
    const hasPercent = strVal.includes('%');
    const hasNegative = strVal.includes('-');
    
    // 提取数字部分
    let numStr = strVal.replace('%', '').replace('-', '').trim();
    
    // 尝试转换为数字
    const num = parseFloat(numStr);
    
    // 如果不是有效数字，返回原值
    if (isNaN(num)) return val;
    
    // 格式化数字：去掉无效的小数位
    // 如果是整数或小数部分全是0，显示整数
    // 否则保留有效小数位（最多 maxDecimals 位）
    let formatted;
    if (hasPercent && num >= 1000) {
      formatted = Math.floor(num).toString();
    } else if (num === Math.floor(num)) {
      // 整数
      formatted = num.toString();
    } else {
      // 小数：去掉末尾的0
      formatted = num.toFixed(maxDecimals).replace(/\.?0+$/, '');
    }
    
    // 重新组合符号和百分号
    return `${hasNegative ? '-' : ''}${formatted}${hasPercent ? '%' : ''}`;
  };

  /**
   * 格式化百分比
   * @param {string|number} val - 要格式化的值
   * @param {number} maxDecimals - 最大保留小数位数，默认为2
   * @returns {string} 格式化后的百分比
   */
  const formatPercent = (val, maxDecimals = 2) => {
    if (!val && val !== 0) return val;
    
    const strVal = String(val);
    const hasPercent = strVal.includes('%');
    
    // 如果已经有百分号，直接格式化
    if (hasPercent) {
      return formatValue(val, maxDecimals);
    }
    
    // 如果没有百分号，添加后格式化
    return formatValue(`${val}%`, maxDecimals);
  };

  /**
   * 格式化价格
   * @param {string|number} val - 要格式化的值
   * @param {number} maxDecimals - 最大保留小数位数，默认为2
   * @returns {string} 格式化后的价格
   */
  const formatPrice = (val, maxDecimals = 2) => {
    if (!val && val !== 0) return val;
    
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    
    if (isNaN(num)) return val;
    
    // 如果价格超过10000，只保留1位小数
    const decimals = num >= 10000 ? 1 : maxDecimals;
    
    // 格式化并去掉末尾的0
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const formatSmallDecimal = (val, maxDecimals = 2) => {
    if (!val && val !== 0) return val;

    const strVal = String(val);
    if (/^-?0\.0\{\d+\}\d+%?$/.test(strVal.trim())) return val;
    const hasPercent = strVal.includes('%');
    const hasNegative = strVal.includes('-');

    if (hasNegative) return formatValue(val, maxDecimals);

    let numStr = strVal.replace('%', '').replace('-', '').trim().replace(/,/g, '');
    if (!numStr) return val;

    const normalizeScientific = (s) => {
      const trimmed = String(s).trim();
      if (!/[eE]/.test(trimmed)) return trimmed;

      const match = trimmed.match(/^([+-]?)(\d*\.?\d+)[eE]([+-]?\d+)$/);
      if (!match) return trimmed;

      const sign = match[1] || '';
      const mantissa = match[2];
      const exp = parseInt(match[3], 10);
      if (Number.isNaN(exp)) return trimmed;

      const [intPartRaw, fracPartRaw = ''] = mantissa.split('.');
      const intPart = intPartRaw || '0';
      const digits = `${intPart}${fracPartRaw}`.replace(/^0+(?=\d)/, '');
      const baseIndex = intPart.length;
      const newIndex = baseIndex + exp;

      if (!digits) return '0';

      if (newIndex <= 0) {
        return `${sign}0.${'0'.repeat(-newIndex)}${digits}`;
      }

      if (newIndex >= digits.length) {
        return `${sign}${digits}${'0'.repeat(newIndex - digits.length)}`;
      }

      return `${sign}${digits.slice(0, newIndex)}.${digits.slice(newIndex)}`;
    };

    numStr = normalizeScientific(numStr);

    const num = Number(numStr);
    if (!Number.isFinite(num)) return val;
    if (num <= 0) return formatValue(val, maxDecimals);
    
    // 如果价格 >= 10000，使用 formatPrice 逻辑（只保留1位小数）
    if (num >= 10000) {
      const decimals = 1;
      return num.toFixed(decimals).replace(/\.?0+$/, '');
    }
    
    // 如果价格 >= 1，使用 formatValue
    if (num >= 1) return formatValue(val, maxDecimals);

    const absStr = String(numStr).replace('-', '');
    const parts = absStr.split('.');
    const fracPart = parts[1] || '';
    if (!fracPart) return formatValue(val, maxDecimals);

    const fracTrimmed = fracPart.replace(/0+$/, '');
    if (!fracTrimmed) return `${hasNegative ? '-' : ''}0${hasPercent ? '%' : ''}`;

    const leadingZerosMatch = fracTrimmed.match(/^0+/);
    const leadingZerosCount = leadingZerosMatch ? leadingZerosMatch[0].length : 0;
    if (leadingZerosCount <= 0) return formatValue(val, maxDecimals);

    const rest = fracTrimmed.slice(leadingZerosCount);
    if (!rest) return `${hasNegative ? '-' : ''}0${hasPercent ? '%' : ''}`;

    // {n} 中的 n 应该是 leadingZerosCount - 1
    // 因为 0.0 是固定的，{n} 表示第一个0之后额外的0
    // 例如：0.00223 有2个前导0，格式应该是 0.0{1}223
    // 但是 0.01 只有1个前导0，extraZeros = 0，不需要特殊格式
    const extraZeros = leadingZerosCount - 1;
    
    // 只有 extraZeros >= 1 时才使用 0.0{n}xx 格式
    if (extraZeros < 1) return formatValue(val, maxDecimals);
    
    return `${hasNegative ? '-' : ''}0.0{${extraZeros}}${rest}${hasPercent ? '%' : ''}`;
  };

  return {
    formatValue,
    formatPercent,
    formatPrice,
    formatSmallDecimal
  };
};
