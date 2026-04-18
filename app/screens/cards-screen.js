"use client";

import { usePlatformStore } from "../platform-store";

const REVIEW_LABELS = [
  { level: 1, label: "不会" },
  { level: 2, label: "模糊" },
  { level: 3, label: "记住了" },
  { level: 4, label: "完全掌握" }
];

export default function CardsScreen() {
  const { state, currentCard, dueCards, setCurrentCardId, reviewCard, nextDueCard } = usePlatformStore();

  return (
    <div className="page-grid cards-grid-v2">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>今日复习</h2>
            <p>支持按记忆程度记录，形成简单间隔复习节奏。</p>
          </div>
          <button className="ios-button secondary" onClick={nextDueCard}>跳到到期卡</button>
        </div>
        {currentCard ? (
          <div className="review-card interactive">
            <strong>{currentCard.title}</strong>
            <p>{currentCard.meaning}</p>
            <p>{currentCard.example}</p>
            <div className="tag-collection">
              <span className="pill-tag">{currentCard.type}</span>
              <span className="pill-tag">{currentCard.difficultyTag}</span>
              <span className="pill-tag">{currentCard.status}</span>
            </div>
          </div>
        ) : <div className="empty-note">还没有可复习的卡片。</div>}
        <div className="button-row">
          {REVIEW_LABELS.map((item) => (
            <button key={item.level} className="ios-button ghost" onClick={() => currentCard && reviewCard(currentCard.id, item.level)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>卡组与分类</h2>
            <p>按素材、卡片类型、学习状态组织复习队列。</p>
          </div>
          <div className="stat-pills">
            <span>{state.cards.length} 张卡片</span>
            <span>{dueCards.length} 张待复习</span>
          </div>
        </div>
        <div className="card-grid">
          {state.cards.map((card) => (
            <button className={`mini-card selectable${card.id === currentCard?.id ? " active" : ""}`} key={card.id} onClick={() => setCurrentCardId(card.id)}>
              <strong>{card.title}</strong>
              <p>{card.type} · {card.sourceType}</p>
              <span>{card.status}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
