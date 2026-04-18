"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildFlashcardLibraryItems,
  filterFlashcards,
} from "../lib/flashcards-review";
import { usePlatformStore } from "../platform-store";

const CARD_TYPES = ["all", "单词卡", "短语卡", "表达卡", "句型卡"];
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

export default function CardsScreenV4() {
  const router = useRouter();
  const {
    state,
    currentCard,
    dueCards,
    setCurrentCardId,
    toggleCardFavorite,
    addCard,
    selectMaterial,
    selectCue,
  } = usePlatformStore();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const libraryItems = useMemo(
    () => buildFlashcardLibraryItems(state.cards, state.materials),
    [state.cards, state.materials],
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

  return (
    <div className="page-grid flashcards-grid-v4">
      <section className="ios-card section-card flashcards-hero-card">
        <div className="section-top">
          <div>
            <h2>闪卡库</h2>
            <p>按真实字幕、收藏表达和学习来源管理你的词汇、短语、表达和句型资产。</p>
          </div>
          <div className="tag-collection">
            <span className="status-badge" data-tone="info">
              {state.cards.length} 张卡片
            </span>
            <span className="status-badge" data-tone={dueCards.length ? "warning" : "idle"}>
              待复习 {dueCards.length}
            </span>
          </div>
        </div>

        <div className="learning-space-searchbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索卡片内容、释义或来源素材"
          />
          <button
            className={`ios-button ghost${favoriteOnly ? " active-ghost" : ""}`}
            type="button"
            onClick={() => setFavoriteOnly((current) => !current)}
          >
            {favoriteOnly ? "仅看收藏中" : "显示全部"}
          </button>
        </div>

        <div className="flashcards-filter-row">
          <div className="learning-space-tabs">
            {CARD_TYPES.map((item) => (
              <button
                key={item}
                className={`pill-tab${type === item ? " active" : ""}`}
                type="button"
                onClick={() => setType(item)}
              >
                {item === "all" ? "全部类型" : item}
              </button>
            ))}
          </div>
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
      </section>

      <section className="ios-card section-card flashcards-library-panel">
        <div className="section-top">
          <div>
            <h2>卡片列表</h2>
            <p>来源、状态和收藏都基于真实本地数据，不会自动填满示例卡。</p>
          </div>
          <span className="status-badge" data-tone={visibleCards.length ? "info" : "idle"}>
            {visibleCards.length} 个结果
          </span>
        </div>

        {visibleCards.length ? (
          <div className="flashcards-library-grid">
            {visibleCards.map((card) => (
              <button
                key={card.id}
                className={`mini-card selectable${selectedCard?.id === card.id ? " active" : ""}`}
                type="button"
                onClick={() => setCurrentCardId(card.id)}
              >
                <strong>{card.title}</strong>
                <p>{card.type} · {card.sourceMaterialTitle || "未绑定素材"}</p>
                <div className="tag-collection compact">
                  <span className="status-badge" data-tone="info">
                    {card.sourceType}
                  </span>
                  <span className="status-badge" data-tone={card.status === "已掌握" ? "success" : card.status === "待复习" ? "warning" : "learning"}>
                    {card.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-note">当前筛选条件下没有卡片。去播放器或收藏句子生成新的闪卡。</div>
        )}
      </section>

      <aside className="flashcards-side-column">
        <section className="ios-card section-card">
          <div className="section-top">
            <div>
              <h2>卡片详情</h2>
              <p>查看释义、来源和来源回跳。</p>
            </div>
          </div>

          {selectedCard ? (
            <div className="detail-card">
              <strong>{selectedCard.title}</strong>
              <p>{selectedCard.meaning || "暂无释义"}</p>
              <p>{selectedCard.example || "暂无例句"}</p>
              <div className="tag-collection">
                <span className="pill-tag" data-tone="info">{selectedCard.type}</span>
                <span className="pill-tag" data-tone="idle">{selectedCard.sourceMaterialTitle || "未绑定来源"}</span>
              </div>
              <div className="button-row">
                <button className="ios-button ghost" type="button" onClick={() => toggleCardFavorite(selectedCard.id)}>
                  {selectedCard.favorite ? "取消收藏" : "收藏卡片"}
                </button>
                <button
                  className="ios-button secondary"
                  disabled={!selectedCard.sourceMaterialId}
                  type="button"
                  onClick={() => jumpToSource(selectedCard)}
                >
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
              <h2>收藏表达</h2>
              <p>从你收藏的真实字幕句子里生成表达卡、句型卡、短语卡和单词卡。</p>
            </div>
          </div>

          {favoriteCues.length ? (
            <div className="favorite-cue-stack">
              {favoriteCues.map((cue) => (
                <div className="detail-card soft" key={`${cue.materialId}-${cue.id}`}>
                  <strong>{cue.english}</strong>
                  <p>{cue.chinese || "暂无中文"}</p>
                  <p>{cue.materialTitle}</p>
                  <div className="button-row">
                    <button className="ios-button secondary" type="button" onClick={() => createCueCard(cue, "表达卡")}>
                      生成表达卡
                    </button>
                    <button className="ios-button ghost" type="button" onClick={() => createCueCard(cue, "句型卡")}>
                      生成句型卡
                    </button>
                  </div>
                  {cue.analysis?.highlights?.length ? (
                    <div className="tag-collection">
                      {cue.analysis.highlights.map((item, index) => (
                        <button
                          key={`${cue.id}-${item.value}-${index}`}
                          className="pill-tag action"
                          data-tone="info"
                          type="button"
                          onClick={() =>
                            createCueCard(
                              cue,
                              item.type === "phrase" ? "短语卡" : "单词卡",
                              item.value,
                            )
                          }
                        >
                          {item.value}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">先在学习播放页收藏句子，这里才会出现可生成的表达资产。</div>
          )}
        </section>
      </aside>
    </div>
  );
}
