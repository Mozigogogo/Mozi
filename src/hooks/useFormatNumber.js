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
    if (num === Math.floor(num)) {
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
    
    // 格式化并去掉末尾的0
    return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
  };

  return {
    formatValue,
    formatPercent,
    formatPrice
  };
};
