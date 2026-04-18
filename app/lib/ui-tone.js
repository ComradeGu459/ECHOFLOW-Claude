const WARNING_TOKENS = ["失败", "无效", "错误", "缺少", "停用", "删除", "录音中"];
const SUCCESS_TOKENS = ["已完成", "已掌握", "可用", "配置完整", "活跃", "完全掌握"];
const LEARNING_TOKENS = [
  "学习中",
  "精读模式",
  "跟读模式",
  "听写模式",
  "复习模式",
  "跟读",
  "听写",
  "精读",
  "分析",
  "准备就绪"
];
const IDLE_TOKENS = ["未开始", "新建", "待复习", "待测试", "未选择", "暂无", "空"];
const INFO_TOKENS = ["基础", "四级", "六级", "考研", "更高阶", "本地分析", "中英双语"];

export function getTone(value) {
  const label = String(value || "").trim();

  if (!label) return "neutral";
  if (WARNING_TOKENS.some((token) => label.includes(token))) return "warning";
  if (SUCCESS_TOKENS.some((token) => label.includes(token))) return "success";
  if (LEARNING_TOKENS.some((token) => label.includes(token))) return "learning";
  if (IDLE_TOKENS.some((token) => label.includes(token))) return "idle";
  if (INFO_TOKENS.some((token) => label.includes(token))) return "info";

  return "neutral";
}

export function getScoreTone(score) {
  if (score >= 90) return "success";
  if (score >= 70) return "learning";
  if (score >= 40) return "warning";
  return "idle";
}
