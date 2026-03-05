/**
 * 代理配置文件 - 代理用户只需修改此文件中的内容
 * Agent Configuration File - Agents only need to modify this file
 */

export const AGENT_CONFIG = {
  // 1. AI应用名称
  appName: "ViVa AI助手",

  // 2. BASE_URL 地址 (使用日志和查询进度是此地址的子页面)
  baseUrl: "https://www.vivaapi.cn",

  // 3. 微信客服号码
  wechatContact: "viva-api",

  // 4. 汇率设置 (默认 0.7)
  // 价格计算公式: 显示价格 = (当前汇率 * 默认价格) / 0.7
  exchangeRate: 0.7,
};

/**
 * 默认价格配置 (基准价格，基于 0.7 汇率)
 * 这些是系统默认价格，代理通常不需要修改这里，除非他们想改变基础定价
 */
export const DEFAULT_PRICES = {
  basic: 9.9,    // 基础版
  pro: 29.9,     // 专业版
  premium: 99.9, // 旗舰版
};
