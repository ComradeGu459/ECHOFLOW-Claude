"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildFlashcardLibraryItems, buildTodayReviewQueue } from "../lib/flashcards-review";
import { usePlatformStore } from "../platform-store";

const REVIEW_ACTIONS = [
  { id: "forgot", label: "不会", tone: "warning" },
  { id: "fuzzy", label: "模糊", tone: "idle" },
  { id: "known", label: "会了", tone: "learning" },
  { id: "mastered", label: "已掌握", tone: "success" },
];

export default function PracticeScreenV4() {
  const router = useRouter();
  const {
    state,
    currentCard,
    dueCards,
    setCurrentCardId,
    reviewCard,
    selectMaterial,
    selectCue,
  } = usePlatformStore();
  const [reviewedIds, setReviewedIds] = useState([]);

  const queue = useMemo(
    () => buildTodayReviewQueue(buildFlashcardLibraryItems(state.cards, state.materials), new Date().toISOString()),
    [state.cards, state.materials],
  );
  const activeCard = queue.find((card) => card.id === currentCard?.id) || queue[0] || null;
  const sessionTotal = queue.length + reviewedIds.filter((id) => !queue.some((card) => card.id === id)).length;
  const progressCount = reviewedIds.filter((id) => !queue.some((card) => card.id === id)).length;

  useEffect(() => {
    if (!activeCard) return;
    setCurrentCardId(activeCard.id);
  }, [activeCard, setCurrentCardId]);

  function handleFeedback(feedback) {
    if (!activeCard) return;
    reviewCard(activeCard.id, feedback);
    setReviewedIds((current) => (current.includes(activeCard.id) ? current : [...current, activeCard.id]));
  }

  function jumpToSource() {
    if (!activeCard?.sourceMaterialId) return;
    selectMaterial(activeCard.sourceMaterialId);
    if (activeCard.sourceCueId) selectCue(activeCard.sourceCueId);
    router.push("/player");
  }

  return (
    <div className="page-grid review-grid-v4">
      <section className="ios-card section-card review-hero-card">
        <div className="section-top">
          <div>
            <h2>今日复习</h2>
            <p>基于真实到期卡片组织复习，四档反馈会立即更新本地复习调度。</p>
          </div>
          <div className="tag-collection">
            <span className="status-badge" data-tone={queue.length ? "warning" : "success"}>
              今日待复习 {queue.length}
            </span>
            <span className="status-badge" data-tone="info">
              已完成 {progressCount}/{sessionTotal || queue.length}
            </span>
          </div>
        </div>
        {sessionTotal ? (
          <div className="material-progress-track">
            <span style={{ width: `${Math.min(100, Math.round((progressCount / sessionTotal) * 100))}%` }} />
          </div>
        ) : null}
      </section>

      <section className="ios-card section-card review-main-panel">
        {activeCard ? (
          <>
            <div className="review-card interactive">
              <strong>{activeCard.title}</strong>
              <p>{activeCard.meaning || "暂无释义"}</p>
              <p>{activeCard.example || "暂无例句"}</p>
              <div className="tag-collection">
                <span className="pill-tag" data-tone="info">{activeCard.type}</span>
                <span className="pill-tag" data-tone="idle">{activeCard.sourceMaterialTitle || "未绑定来源"}</span>
                <span className="pill-tag" data-tone="warning">下次复习 {new Date(activeCard.nextReviewAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>

            <div className="button-row review-feedback-row">
              {REVIEW_ACTIONS.map((item) => (
                <button
                  key={item.id}
                  className="ios-button ghost"
                  type="button"
                  onClick={() => handleFeedback(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="button-row">
              <button className="ios-button secondary" disabled={!activeCard.sourceMaterialId} type="button" onClick={jumpToSource}>
                回到来源句
              </button>
            </div>
          </>
        ) : (
          <div className="empty-note">当前没有到期卡片。等新卡片进入复习窗口后，这里才会出现真实任务。</div>
        )}
      </section>

      <section className="ios-card section-card review-queue-panel">
        <div className="section-top">
          <div>
            <h2>待复习队列</h2>
            <p>只显示今天真正到期的卡片，不会填充演示队列。</p>
          </div>
        </div>

        {queue.length ? (
          <div className="flashcards-library-grid">
            {queue.map((card) => (
              <button
                key={card.id}
                className={`mini-card selectable${activeCard?.id === card.id ? " active" : ""}`}
                type="button"
                onClick={() => setCurrentCardId(card.id)}
              >
                <strong>{card.title}</strong>
                <p>{card.type} · {card.sourceMaterialTitle || "未绑定来源"}</p>
                <span className="status-badge" data-tone="warning">
                  待复习
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-note">今天的待复习已经处理完了。</div>
        )}
      </section>
    </div>
  );
}
