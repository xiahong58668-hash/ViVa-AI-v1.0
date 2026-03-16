/**
 * 应用配置文件 - 代理用户只需修改此文件中的内容
 * Application Configuration File - Agents only need to modify this file
 */

export const APP_CONFIG = {
  // 1. 应用名称（APP_NAME）：默认值="AI 助手"，代理替换为自己的应用名称（同步生效于HTML文件界面名称）
  APP_NAME: "ViVa AI助手",

  // 2. 基础地址（BASE_URL）：默认值="https://www.vivaapi.cn"，代理替换为专属域名
  BASE_URL: "https://www.vivaapi.cn",

  // 3. 价格倍率（PRICE_RATIO）：默认值=0.7，对应“在线充值价格=0.7元/1美元额度”，代理修改此数值调整价格
  PRICE_RATIO: 0.7,

  // 4. 微信客服（WECHAT_SERVICE）：默认值="wx123456789"，代理替换为自己的微信客服号
  WECHAT_SERVICE: "viva-api",

  // 5. 客服查询更多详情链接（SUPPORT_DETAIL_URL）：默认值="https://www.xxxx.cn/support"，代理替换为专属链接
  SUPPORT_DETAIL_URL: "https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink",

  // 6. 代理界面立即加入代理计划链接（AGENT_JOIN_URL）：默认值="https://www.xxxx.cn/join"，代理替换为专属链接
  AGENT_JOIN_URL: "https://ai.feishu.cn/wiki/O6Q9wrxxci898Wkj6ndcFnlknJd?from=from_copylink",

  // 7. 案例链接（CASE_URL）：默认值="https://www.xxxx.cn/case"，代理替换为专属链接
  CASE_URL: "https://my.feishu.cn/wiki/LIEvwzn0jipQ4PkF0dkc57I2njh?from=from_copylink",

  // 8. 保存到桌面的链接（DESKTOP_SAVE_URL）：默认值="p.xxxx.cn"，代理替换为部署到Vercel的自定义域名
  DESKTOP_SAVE_URL: "p.vivaapi.cn",

  // 9. 顶部公告内容（ANNOUNCEMENT）：代理可自定义修改
  ANNOUNCEMENT: "公告：1、本应用不储存用户资产，请及时下载；2、生成失败请重新生成，扣费自动返还；3、OpenClaw一键安装包见主站API文档。",
};
