"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ImportDialog from "./components/import-dialog";
import { UI_TEXT } from "./lib/platform-data";
import { getTone } from "./lib/ui-tone";
import { usePlatformStore } from "./platform-store";

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: "概" },
  { href: "/library", key: "library", icon: "库" },
  { href: "/player", key: "player", icon: "学" },
  { href: "/practice", key: "practice", icon: "练" },
  { href: "/cards", key: "cards", icon: "卡" },
  { href: "/progress", key: "progress", icon: "记" },
  { href: "/settings", key: "settings", icon: "设" }
];

export default function PlatformShell({ children }) {
  const pathname = usePathname();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { state, currentCue, currentMaterial, dashboardStats, dueCards, toggleSidebar } = usePlatformStore();

  const labels = {
    ...(UI_TEXT[state.ui.language] || UI_TEXT.zh),
    nav: {
      ...(UI_TEXT[state.ui.language] || UI_TEXT.zh).nav,
      cards: state.ui.language === "en" ? "Flashcards" : "闪卡库",
      practice: state.ui.language === "en" ? "Review" : "今日复习"
    }
  };
  const isFocusPage = pathname === "/player" || pathname === "/practice";
  const isPlayerPage = pathname === "/player";
  const isLibraryPage = pathname === "/library";
  const isCardsPage = pathname === "/cards";
  const isProgressPage = pathname === "/progress";
  const collapsed = state.ui.sidebarCollapsed;
  const currentNavItem = NAV_ITEMS.find((item) => item.href === pathname) || NAV_ITEMS[0];
  const isImportPage = pathname === "/import";
  const materialTone = getTone(currentMaterial?.status);
  const headerTone = getTone(state.status);
  const headerStats = [
    { label: "今日时长", value: `${dashboardStats.studyMinutes}m` },
    { label: "待复习", value: dueCards.length },
    { label: "素材库", value: state.materials.length }
  ];

  return (
    <div
      className={`platform-shell${collapsed ? " sidebar-collapsed" : " sidebar-expanded"}${isFocusPage ? " focus-page" : ""}${isPlayerPage ? " player-page" : ""}${isLibraryPage ? " library-page" : ""}${isCardsPage ? " cards-page" : ""}${isProgressPage ? " progress-page" : ""}`}
    >
      <aside className={`platform-sidebar${collapsed ? " collapsed" : " expanded"}`}>
        <div className="sidebar-top">
          <div className="brand-block">
            <div className="brand-symbol">E</div>
            <div className="brand-copy">
              <strong>EchoFlow Pro</strong>
              <p>English speaking workspace</p>
            </div>
          </div>
          <button className="sidebar-toggle" type="button" aria-label="Toggle sidebar" onClick={() => toggleSidebar()}>
            {collapsed ? ">" : "<"}
          </button>
        </div>

        <button
          className={`ios-button primary sidebar-import-button${collapsed ? " compact" : ""}`}
          type="button"
          onClick={() => setImportDialogOpen(true)}
        >
          {collapsed ? "+" : "+ 导入学习素材"}
        </button>

        <nav className="side-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`nav-item${active ? " active" : ""}${collapsed ? " compact" : ""}`}
                href={item.href}
                key={item.href}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-copy">
                  <span>{labels.nav[item.key]}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {!collapsed ? (
          <>
            <div className="sidebar-card">
              <span className="sidebar-label">当前学习焦点</span>
              <strong>{currentCue?.english || "先导入一段学习素材"}</strong>
              <p>{currentMaterial?.title || "尚未选择素材"}</p>
              {currentMaterial ? (
                <div className="sidebar-pills">
                  <span className="status-badge" data-tone={materialTone}>
                    {currentMaterial.status}
                  </span>
                  <span className="status-badge soft-badge" data-tone={getTone(currentMaterial.learningGoal)}>
                    {currentMaterial.learningGoal}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="sidebar-footer-card">
              <div className="sidebar-metric">
                <strong>{state.materials.length}</strong>
                <span>素材</span>
              </div>
              <div className="sidebar-metric">
                <strong>{state.cards.length}</strong>
                <span>卡片</span>
              </div>
            </div>
          </>
        ) : (
          <div className="sidebar-mini-state">
            <span className="mini-indicator active" />
          </div>
        )}
      </aside>

      <div className="platform-main">
        <header className="platform-header">
          <div className="header-copy">
            <div className="header-kicker">
              <span className="header-kicker-chip">{isImportPage ? "Import workspace" : "Learning workspace"}</span>
              {currentMaterial && !isImportPage ? (
                <span className="status-badge" data-tone={materialTone}>
                  {currentMaterial.status}
                </span>
              ) : null}
            </div>
            <div className="header-title-row">
              <h1>{isImportPage ? "导入素材" : labels.nav[currentNavItem.key]}</h1>
              {currentMaterial && !isImportPage ? (
                <div className="header-meta">
                  <span className="meta-chip" data-tone={getTone(currentMaterial.learningGoal)}>
                    {currentMaterial.learningGoal}
                  </span>
                  <span className="meta-chip" data-tone={getTone(currentMaterial.difficulty)}>
                    {currentMaterial.difficulty}
                  </span>
                </div>
              ) : null}
            </div>
            <p>
              {isImportPage
                ? "优先保证视频可播放、字幕可解析和后续学习链路可用。"
                : currentMaterial
                ? `当前素材：${currentMaterial.title}`
                : "导入素材后即可开始完整的学习流程。"}
            </p>
            <div className="header-summary">
              {headerStats.map((item) => (
                <div className="header-stat" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="header-actions">
            {isFocusPage ? (
              <button className="ios-button ghost" type="button" onClick={() => toggleSidebar(true)}>
                进入专注模式
              </button>
            ) : null}
            <div className="header-badge" data-tone={headerTone}>
              {state.status}
            </div>
          </div>
        </header>
        <main className="page-frame">{children}</main>
      </div>
      <ImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
    </div>
  );
}
