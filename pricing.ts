import { AGENT_CONFIG } from "./agent.config";

/**
 * 获取汇率转换因子
 * 公式: 因子 = 代理设置的汇率 / 0.7
 */
export const getPriceFactor = () => {
  return (AGENT_CONFIG.exchangeRate || 0.7) / 0.7;
};

/**
 * 格式化价格字符串，自动应用汇率转换
 * @param priceStr 包含价格数字的字符串
 */
export const formatPriceString = (priceStr: string): string => {
  const factor = getPriceFactor();
  
  // 正则匹配数字（包括小数）
  return priceStr.replace(/(\d+(\.\d+)?)/g, (match) => {
    const originalPrice = parseFloat(match);
    const newPrice = originalPrice * factor;
    
    // 如果原始数字很小（比如 0.063），保留 3 位小数，否则保留 2 位
    if (originalPrice < 1 && originalPrice > 0) {
      return newPrice.toFixed(3);
    }
    return newPrice.toFixed(2);
  });
};
