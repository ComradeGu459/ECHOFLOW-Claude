export { default } from "../screens/cards-screen-v5";
/*

import { useLearningStore } from "../learning-store";

export default function CardsPage() {
  const { cards, currentCard, cardIndex, cardFlipped, setCardFlipped, previousCard, nextCard, regenerateCards } =
    useLearningStore();

  return (
    <div className="page-grid cards-grid">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>闪卡复习</h2>
            <p>点击卡片翻面，左右切换。所有卡片来自当前字幕。</p>
          </div>
          <div className="stat-pills">
            <span>{cards.length} 张卡</span>
          </div>
        </div>

        {currentCard ? (
          <button className={`review-card${cardFlipped ? " flipped" : ""}`} onClick={() => setCardFlipped((prev) => !prev)}>
            <strong>{cardFlipped ? currentCard.back : currentCard.front}</strong>
            <p>{cardFlipped ? currentCard.note : `出现 ${currentCard.count} 次，点击翻面`}</p>
          </button>
        ) : (
          <div className="empty-note">先去素材库解析字幕。</div>
        )}

        <div className="button-row">
          <button className="ios-button secondary" onClick={previousCard}>上一张</button>
          <button className="ios-button secondary" onClick={nextCard}>下一张</button>
          <button className="ios-button ghost" onClick={regenerateCards}>重新生成</button>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>全部卡片</h2>
            <p>浏览当前素材中的高频词与表达。</p>
          </div>
          <span>{cards.length ? `${cardIndex + 1}/${cards.length}` : "0/0"}</span>
        </div>

        <div className="card-grid">
          {cards.map((card) => (
            <div className="mini-card" key={card.id}>
              <strong>{card.front}</strong>
              <p>{card.back}</p>
              <span>{card.count} 次</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
*/
