import { APP_CONFIG } from "./src/app_config";

/**
 * 获取汇率转换因子
 * 公式: 因子 = 代理设置的汇率 / 0.7
 */
export const getPriceFactor = () => {
  return (APP_CONFIG.PRICE_RATIO || 0.7) / 0.7;
};

/**
 * 格式化价格字符串，自动应用汇率转换
 * @param priceStr 包含价格数字的字符串
 */
export const formatPriceString = (priceStr: string, forceDecimals?: number): string => {
  const factor = getPriceFactor();
  
  // 只匹配带有小数点的数字，或者后面紧跟着“元”的数字
  return priceStr.replace(/(\d+\.\d+|\d+(?=\s*元))/g, (match) => {
    const originalPrice = parseFloat(match);
    const newPrice = originalPrice * factor;
    
    if (forceDecimals !== undefined) {
      return newPrice.toFixed(forceDecimals);
    }
    
    // 如果原始数字很小（比如 0.063），保留 3 位小数，否则保留 2 位
    if (originalPrice < 1 && originalPrice > 0) {
      return newPrice.toFixed(3);
    }
    return newPrice.toFixed(2);
  });
};
