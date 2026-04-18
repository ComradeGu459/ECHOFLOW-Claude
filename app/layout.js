import "./globals.css";
import "./platform-visual-rebuild.css";
import PlatformShell from "./platform-shell";
import Providers from "./providers";

export const metadata = {
  title: "EchoFlow Pro | 英语口语学习空间",
  description: "一个围绕真实视频语料、字幕精听、跟读、闪卡复习与学习反馈构建的英语口语学习平台。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <PlatformShell>{children}</PlatformShell>
        </Providers>
      </body>
    </html>
  );
}
