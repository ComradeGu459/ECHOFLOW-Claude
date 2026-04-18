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

export default function LibraryScreenV4() {
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
  const recentMaterials = useMemo(() => rankRecentMaterials(summaries).slice(0, 3), [summaries]);
  const stats = useMemo(() => buildStats(summaries), [summaries]);

  function openMaterial(materialId) {
    selectMaterial(materialId);
    router.push("/player");
  }

  return (
    <div className="page-grid learning-space-grid">
      <section className="ios-card section-card learning-space-hero">
        <div className="learning-space-hero-copy">
          <div>
            <h2>你的英语语料工作台</h2>
            <p>围绕真实导入素材管理精听、跟读、收藏、待复习和最近学习轨迹。</p>
          </div>
          <div className="learning-space-metrics">
            <span>{stats.total} 个素材</span>
            <span>{stats.learning} 个学习中</span>
            <span>{stats.dueReview} 个待复习</span>
            <span>{stats.favorites} 个已收藏</span>
          </div>
        </div>

        <div className="learning-space-searchbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索标题、主题、标签或学习目标"
          />
          <Link className="ios-button primary button-link" href="/import">
            + 导入新素材
          </Link>
        </div>
      </section>

      <section className="ios-card section-card learning-space-toolbar">
        <div className="learning-space-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`pill-tab${tab === item.id ? " active" : ""}`}
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="learning-space-filters">
          <label className="compact-select">
            <span>主题</span>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="all">全部主题</option>
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
              <option value="all">全部目标</option>
              {filters.goals.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="ios-card section-card learning-space-section">
        <div className="section-top">
          <div>
            <h2>最近学习</h2>
            <p>只展示存在真实学习时间的素材，不会用导入时间冒充最近学习。</p>
          </div>
        </div>
        {recentMaterials.length ? (
          <div className="recent-material-list">
            {recentMaterials.map((material) => (
              <button
                key={material.id}
                className="recent-material-card"
                type="button"
                onClick={() => openMaterial(material.id)}
              >
                <div>
                  <strong>{material.title}</strong>
                  <p>{material.topic || "未设置主题"}</p>
                </div>
                <span>{formatDateTime(material.lastStudiedAt)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-note">开始学习后，最近学习记录才会出现在这里。</div>
        )}
      </section>

      <section className="ios-card section-card learning-space-section">
        <div className="section-top">
          <div>
            <h2>素材库</h2>
            <p>卡片只来自你真实导入的素材，收藏和待复习状态会实时联动本地数据。</p>
          </div>
          <span className="status-badge" data-tone={filteredMaterials.length ? "info" : "idle"}>
            {filteredMaterials.length} 个结果
          </span>
        </div>

        {filteredMaterials.length ? (
          <div className="material-card-grid">
            {filteredMaterials.map((material) => (
              <article className="material-card-shell" key={material.id}>
                <div className="material-card-media">
                  <MaterialPreview material={material} />
                  <div className="material-card-badges">
                    <span className="status-badge" data-tone="info">
                      {material.sourceMediaKind === "youtube" ? "YouTube" : "本地视频"}
                    </span>
                    <span className="status-badge" data-tone={getTone(material.difficulty)}>
                      {material.difficulty}
                    </span>
                  </div>
                  <button
                    className={`material-favorite-button${material.favorite ? " active" : ""}`}
                    type="button"
                    onClick={() => updateMaterialMeta(material.id, "favorite", !material.favorite)}
                  >
                    {material.favorite ? "★" : "☆"}
                  </button>
                </div>

                <div className="material-card-body">
                  <div className="material-card-heading">
                    <strong>{material.title}</strong>
                    <p>{material.topic || "未设置主题"}</p>
                  </div>

                  <div className="tag-collection">
                    <span className="pill-tag" data-tone={getTone(material.learningGoal)}>
                      {material.learningGoal}
                    </span>
                    <span className="pill-tag" data-tone="idle">
                      {material.cueCount} 句字幕
                    </span>
                    <span className="pill-tag" data-tone={material.dueReviewCount > 0 ? "warning" : "idle"}>
                      待复习 {material.dueReviewCount}
                    </span>
                  </div>

                  {material.tags.length ? (
                    <div className="material-tag-row">
                      {material.tags.map((tag) => (
                        <span className="pill-tag" data-tone="info" key={`${material.id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="material-card-footer">
                    <div>
                      <span className="status-badge" data-tone={getTone(material.status)}>
                        {material.status}
                      </span>
                      <p>{material.lastStudiedAt ? `最近学习：${formatDateTime(material.lastStudiedAt)}` : `导入于 ${formatDateTime(material.importedAt)}`}</p>
                    </div>
                    <button className="ios-button secondary" type="button" onClick={() => openMaterial(material.id)}>
                      开始学习
                    </button>
                  </div>

                  {material.progressPercent > 0 ? (
                    <div className="material-progress-track">
                      <span style={{ width: `${material.progressPercent}%` }} />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-note">
            当前筛选条件下没有素材。你可以调整筛选，或者先去
            <Link href="/import"> 导入页 </Link>
            增加新的学习素材。
          </div>
        )}
      </section>
    </div>
  );
}
