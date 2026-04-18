"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import MaterialPreview from "../components/material-preview";
import {
  buildLearningSpaceFilters,
  buildLearningSpaceSummary,
  filterLearningSpaceMaterials,
  rankRecentMaterials,
} from "../lib/learning-space";
import { formatDateTime } from "../lib/platform-model";
import { getTone } from "../lib/ui-tone";
import { usePlatformStore } from "../platform-store";

const TABS = [
  { id: "all", label: "全部素材" },
  { id: "learning", label: "学习中" },
  { id: "review", label: "待复习" },
  { id: "favorites", label: "已收藏" },
  { id: "completed", label: "已完成" },
];

function buildStats(materials) {
  return {
    total: materials.length,
    favorites: materials.filter((material) => material.favorite).length,
    learning: materials.filter((material) => material.status === "学习中").length,
    dueReview: materials.filter((material) => material.dueReviewCount > 0).length,
  };
}

export default function LibraryScreenV5() {
  const router = useRouter();
  const { state, selectMaterial, updateMaterialMeta } = usePlatformStore();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [learningGoal, setLearningGoal] = useState("all");

  const summaries = useMemo(
    () =>
      buildLearningSpaceSummary({
        materials: state.materials,
        cards: state.cards,
        now: new Date().toISOString(),
      }),
    [state.cards, state.materials],
  );
  const filters = useMemo(() => buildLearningSpaceFilters(summaries), [summaries]);
  const filteredMaterials = useMemo(
    () =>
      filterLearningSpaceMaterials(summaries, {
        tab,
        search,
        topic,
        learningGoal,
      }),
    [learningGoal, search, summaries, tab, topic],
  );
  const recentMaterials = useMemo(() => rankRecentMaterials(summaries).slice(0, 1), [summaries]);
  const stats = useMemo(() => buildStats(summaries), [summaries]);

  function openMaterial(materialId) {
    selectMaterial(materialId);
    router.push("/player");
  }

  return (
    <div className="page-grid workspace-reference-grid">
      <section className="workspace-reference-hero">
        <div>
          <h2>你的英语语料工作台</h2>
          <p>
            共收录 {stats.total} 个素材 · 学习中 {stats.learning} 个 · 待复习 {stats.dueReview} 个 · 已收藏 {stats.favorites} 个
          </p>
        </div>
        <div className="workspace-searchbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索标题、主题、标签、来源，或直接粘贴链接快速导入..."
          />
          <Link className="ios-button primary button-link" href="/import">
            + 导入新素材
          </Link>
        </div>
      </section>

      <section className="workspace-reference-toolbar">
        <div className="workspace-tab-row">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`workspace-tab${tab === item.id ? " active" : ""}`}
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="workspace-filter-row">
          <label className="compact-select">
            <span>主题分类</span>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="all">全部</option>
              {filters.topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-select">
            <span>学习目标</span>
            <select value={learningGoal} onChange={(event) => setLearningGoal(event.target.value)}>
              <option value="all">全部</option>
              {filters.goals.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {recentMaterials.length ? (
        <section className="workspace-recent-banner">
          <div>
            <strong>最近学习素材</strong>
            <p>
              {recentMaterials[0].title} · 最近学习于 {formatDateTime(recentMaterials[0].lastStudiedAt)}
            </p>
          </div>
          <button className="ios-button ghost" type="button" onClick={() => openMaterial(recentMaterials[0].id)}>
            继续学习
          </button>
        </section>
      ) : null}

      <section className="workspace-card-grid">
        {filteredMaterials.length ? (
          filteredMaterials.map((material) => (
            <article className="workspace-material-card" key={material.id}>
              <div className="workspace-card-media">
                <MaterialPreview material={material} />
                <div className="workspace-card-floating">
                  <span className="workspace-card-pill source">
                    {material.sourceMediaKind === "youtube" ? "YouTube" : "本地视频"}
                  </span>
                  <span className="workspace-card-pill difficulty">{material.difficulty}</span>
                </div>
                <button
                  className={`material-favorite-button${material.favorite ? " active" : ""}`}
                  type="button"
                  onClick={() => updateMaterialMeta(material.id, "favorite", !material.favorite)}
                >
                  {material.favorite ? "★" : "☆"}
                </button>
              </div>

              <div className="workspace-card-body">
                <strong>{material.title}</strong>
                <div className="workspace-card-tags">
                  <span className="cards-mini-chip">{material.topic || "未设置主题"}</span>
                  <span className="cards-mini-chip">{material.learningGoal}</span>
                </div>
                <div className="workspace-card-meta">
                  <span>CC</span>
                  <span>{material.cueCount} 句</span>
                  <span>表达</span>
                  <span>闪卡</span>
                </div>

                <div className="workspace-card-status">
                  <div>
                    <span className="status-badge" data-tone={getTone(material.status)}>
                      {material.status}
                    </span>
                    <p>{material.lastStudiedAt ? `最近学习：${formatDateTime(material.lastStudiedAt)}` : "尚未开始学习"}</p>
                  </div>
                  <button className="ios-button secondary" type="button" onClick={() => openMaterial(material.id)}>
                    开始学习
                  </button>
                </div>

                <div className="material-progress-track">
                  <span style={{ width: `${Math.max(material.progressPercent, material.status === "学习中" ? 12 : 0)}%` }} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-note">当前筛选条件下没有素材。</div>
        )}
      </section>
    </div>
  );
}
