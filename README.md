# SpeakFlow

一个给自己使用的英语学习网站原型，重点服务听、说、读、写四个方向，首页当前聚焦：

- YouTube 英语素材导入
- 字幕点读与逐句跟读
- 录音纠音与影子跟读
- 单词卡、短语卡、表达卡、场景卡
- DeepSeek、Gemini、豆包、千问等模型接入展示

## 本地启动

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 当前技术栈

- Next.js App Router
- React 19
- 纯 CSS 全局样式

## 下一步建议

- 加入 YouTube 链接导入与素材解析流程
- 增加视频播放页与字幕交互页
- 接入用户学习记录、复习队列和闪卡系统
- 把 AI 接口配置抽成服务层
