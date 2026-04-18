"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLearningStore } from "./learning-store";

const NAV_ITEMS = [
  { href: "/library", label: "素材库", desc: "导入视频与字幕" },
  { href: "/player", label: "播放器", desc: "点读、跟读、录音" },
  { href: "/cards", label: "闪卡", desc: "复习词卡与表达卡" },
  { href: "/coach", label: "练习", desc: "听写与 AI 助教" },
  { href: "/settings", label: "设置", desc: "接口与工作区数据" }
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { activeCue, cards, cues, status } = useLearningStore();

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="brand-block">
          <div className="brand-symbol">S</div>
          <div>
            <strong>SpeakFlow</strong>
            <p>English practice</p>
          </div>
        </div>

        <nav className="side-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link className={`nav-item${active ? " active" : ""}`} href={item.href} key={item.href}>
                <span>{item.label}</span>
                <small>{item.desc}</small>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span className="sidebar-label">当前学习状态</span>
          <strong>{activeCue?.english || "先导入一段素材"}</strong>
          <p>{status}</p>
        </div>

        <div className="sidebar-stats">
          <div><strong>{cues.length}</strong><span>字幕</span></div>
          <div><strong>{cards.length}</strong><span>卡片</span></div>
        </div>
      </aside>

      <div className="platform-main">
        <header className="platform-header">
          <div>
            <h1>{NAV_ITEMS.find((item) => item.href === pathname)?.label || "SpeakFlow"}</h1>
            <p>{NAV_ITEMS.find((item) => item.href === pathname)?.desc || "英语学习平台"}</p>
          </div>
          <div className="header-badge">{activeCue ? "已选中练习句" : "等待导入素材"}</div>
        </header>

        <main className="page-frame">{children}</main>
      </div>
    </div>
  );
}
