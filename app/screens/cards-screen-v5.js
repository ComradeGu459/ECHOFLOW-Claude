"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildFlashcardLibraryItems,
  buildFlashcardOverview,
  filterFlashcards,
} from "../lib/flashcards-review";
import { usePlatformStore } from "../platform-store";

const CARD_TYPES = ["all", "表达卡", "句型卡", "短语卡", "单词卡"];
const CARD_STATUSES = ["all", "新建", "待复习", "学习中", "已掌握"];

function collectFavoriteCues(materials) {
  return materials.flatMap((material) =>
    (material.cues || [])
      .filter((cue) => cue.favorite)
      .map((cue) => ({
        ...cue,
        materialId: material.id,
        materialTitle: material.title,
      })),
  );
}

function cardTone(type) {
  if (type === "表达卡") return "expression";
  if (type === "句型卡") return "pattern";
  if (type === "短语卡") return "phrase";
  return "word";
}

export default function CardsScreenV5() {
  const router = useRouter();
  const {
    state,
    currentCard,
    setCurrentCardId,
    toggleCardFavorite,
    addCard,
    selectMaterial,
    selectCue,
    resolvedAiRoutes,
  } = usePlatformStore();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const libraryItems = useMemo(
    () => buildFlashcardLibraryItems(state.cards, state.materials),
    [state.cards, state.materials],
  );
  const overview = useMemo(
    () => buildFlashcardOverview(state.cards, new Date().toISOString()),
    [state.cards],
  );
  const visibleCards = useMemo(
    () =>
      filterFlashcards(libraryItems, {
        type,
        favoriteOnly,
        status,
        search,
      }),
    [favoriteOnly, libraryItems, search, status, type],
  );
  const favoriteCues = useMemo(() => collectFavoriteCues(state.materials), [state.materials]);
  const selectedCard =
    visibleCards.find((card) => card.id === currentCard?.id) ||
    currentCard ||
    visibleCards[0] ||
    null;

  function jumpToSource(card) {
    if (!card.sourceMaterialId) return;
    selectMaterial(card.sourceMaterialId);
    if (card.sourceCueId) selectCue(card.sourceCueId);
    router.push("/player");
  }

  function createCueCard(cue, cardType, value = cue.english) {
    addCard({
      title: value,
      type: cardType,
      sourceMaterialId: cue.materialId,
      sourceCueId: cue.id,
      meaning: cue.chinese || "",
      example: cue.english,
      note: `${cue.materialTitle} · 从收藏句子生成`,
      difficultyTag: cue.difficultyTag || "四级",
      sourceType: "收藏句子生成",
    });
  }

  const latestInsight = state.analytics.lastGeneratedItems?.length
    ? `最近一次学习分析提取了 ${state.analytics.lastGeneratedItems.length} 个重点表达。`
    : "当前仅在真实分析生成后展示洞察，不预填示例或伪数据。";

  return (
    <div className="page-grid cards-reference-grid">
      <section className="cards-reference-head">
        <div>
          <h2>口语表达资产库</h2>
          <p>管理和沉淀从真实语料中提取的高价值表达。</p>
        </div>
      </section>

      <section className="cards-reference-summary">
        <article className="cards-summary-card emphasis">
          <span className="cards-summary-icon">∿</span>
          <strong>今日待复习</strong>
          <p>包含 {overview.dueCount} 张待复习卡片</p>
          <button className="ios-button primary" type="button" onClick={() => router.push("/practice")}>
            开始复习 ({overview.dueCount})
          </button>
        </article>

        <article className="cards-summary-card">
          <strong>今日新增资产</strong>
          <h3>{overview.newTodayCount}</h3>
          <p>来自真实导入和收藏句子生成</p>
        </article>

        <article className="cards-summary-card">
          <strong>已掌握表达</strong>
          <h3>{overview.masteredCount}</h3>
          <p>仅统计真实已掌握卡片</p>
        </article>

        <article className="cards-summary-card insight">
          <strong>AI 语料洞察</strong>
          <p>{resolvedAiRoutes.study_analysis ? latestInsight : "未配置 study_analysis provider。"}</p>
        </article>
      </section>

      <section className="cards-reference-toolbar">
        <div className="cards-search-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索单词、短语、表达、来源视频或主题标签..."
          />
          <div className="cards-toolbar-actions">
            <label className="compact-select">
              <span>来源语料</span>
              <select
                value={favoriteOnly ? "favorites" : "all"}
                onChange={(event) => setFavoriteOnly(event.target.value === "favorites")}
              >
                <option value="all">全部</option>
                <option value="favorites">仅收藏来源</option>
              </select>
            </label>
            <label className="compact-select">
              <span>学习状态</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {CARD_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "全部状态" : item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="cards-type-row">
          <span>资产类型:</span>
          {CARD_TYPES.map((item) => (
            <button
              key={item}
              className={`cards-type-pill${type === item ? " active" : ""}`}
              type="button"
              onClick={() => setType(item)}
            >
              {item === "all" ? "全部" : item}
            </button>
          ))}
        </div>
      </section>

      <section className="cards-reference-body">
        <div className="cards-reference-gridlist">
        {visibleCards.length ? (
          visibleCards.map((card) => (
            <article className={`cards-asset-card ${cardTone(card.type)}`} key={card.id}>
              <div className="cards-asset-top">
                <span className={`cards-asset-tag ${cardTone(card.type)}`}>{card.type}</span>
                  <button
                    className={`cards-bookmark${card.favorite ? " active" : ""}`}
                    type="button"
                    onClick={() => toggleCardFavorite(card.id)}
                  >
                    {card.favorite ? "★" : "☆"}
                  </button>
                </div>

                <div className="cards-asset-main" onClick={() => setCurrentCardId(card.id)}>
                  <strong>{card.title}</strong>
                  <p>{card.meaning || "暂无释义"}</p>
                </div>

                <div className="cards-asset-meta">
                  {(card.example ? [card.example] : []).slice(0, 1).map((example) => (
                    <span className="cards-mini-chip" key={`${card.id}-example`}>
                      {example.length > 14 ? `${example.slice(0, 14)}...` : example}
                    </span>
                  ))}
                  {(card.sourceMaterialTitle ? [card.sourceMaterialTitle] : []).slice(0, 1).map((source) => (
                    <span className="cards-mini-chip" key={`${card.id}-source`}>
                      {source.length > 18 ? `${source.slice(0, 18)}...` : source}
                    </span>
                  ))}
                </div>

                <div className="cards-asset-footer">
                  <span className="cards-source-link">{card.sourceMaterialTitle || "未绑定来源"}</span>
                  <button className={`cards-status-chip ${card.status === "已掌握" ? "done" : card.status === "待复习" ? "todo" : "learning"}`} type="button" onClick={() => jumpToSource(card)}>
                    {card.status}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-note">当前筛选条件下没有卡片。</div>
          )}
        </div>

        <aside className="cards-reference-sidepanel">
          <section className="ios-card section-card">
            <div className="section-top">
              <div>
                <h2>当前卡片</h2>
                <p>查看来源和快速回跳。</p>
              </div>
            </div>
            {selectedCard ? (
              <div className="detail-card">
                <strong>{selectedCard.title}</strong>
                <p>{selectedCard.meaning || "暂无释义"}</p>
                <p>{selectedCard.example || "暂无例句"}</p>
                <div className="button-row">
                  <button className="ios-button ghost" type="button" onClick={() => toggleCardFavorite(selectedCard.id)}>
                    {selectedCard.favorite ? "取消收藏" : "收藏卡片"}
                  </button>
                  <button className="ios-button secondary" type="button" onClick={() => jumpToSource(selectedCard)}>
                    回到来源
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-note">还没有可查看的卡片。</div>
            )}
          </section>

          <section className="ios-card section-card">
            <div className="section-top">
              <div>
                <h2>收藏句生成</h2>
                <p>从真实收藏句子生成表达、句型、短语和单词卡。</p>
              </div>
            </div>
            {favoriteCues.length ? (
              <div className="favorite-cue-stack">
                {favoriteCues.slice(0, 4).map((cue) => (
                  <div className="detail-card soft" key={`${cue.materialId}-${cue.id}`}>
                    <strong>{cue.english}</strong>
                    <p>{cue.chinese || "暂无中文"}</p>
                    <div className="button-row">
                      <button className="ios-button secondary" type="button" onClick={() => createCueCard(cue, "表达卡")}>
                        表达卡
                      </button>
                      <button className="ios-button ghost" type="button" onClick={() => createCueCard(cue, "句型卡")}>
                        句型卡
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-note">先在学习播放页收藏句子，这里才会出现可生成资产。</div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
