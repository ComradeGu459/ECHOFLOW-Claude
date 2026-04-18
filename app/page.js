import { redirect } from "next/navigation";

export default function Page() {
  redirect("/dashboard");
}

/*
const metrics = [
  { value: "200+", label: "可持续扩展的 YouTube 英语素材库" },
  { value: "4 家", label: "接入 DS / Gemini / 豆包 / 千问多模型接口" },
  { value: "3 端", label: "手机、平板、电脑统一练习体验" }
];

const subtitles = [
  {
    time: "00:06",
    english: "That is where real spoken English starts to feel natural.",
    chinese: "真正自然的英语口语，就是从这里开始成形。"
  },
  {
    time: "00:12",
    english: "When you repeat it enough, the rhythm becomes part of you.",
    chinese: "当你重复得足够多，语感和节奏就会真的进入你自己。",
    active: true
  },
  {
    time: "00:19",
    english: "Click any word to open meanings, examples and flashcards.",
    chinese: "点击任意单词，立刻查看释义、例句与闪卡入口。"
  }
];

const materials = [
  {
    title: "Daily Vlog",
    desc: "围绕日常生活和轻松表达，适合积累高频口语句型。",
    duration: "12 分钟",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    tags: ["日常生活", "初中级"]
  },
  {
    title: "Opinion Talk",
    desc: "适合练观点表达、连接词组织和较完整的输出结构。",
    duration: "8 分钟",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    tags: ["观点表达", "中高级"]
  },
  {
    title: "City Walk",
    desc: "围绕旅行、城市观察和场景描述，提升叙述能力与词汇密度。",
    duration: "15 分钟",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    tags: ["城市旅行", "Vlog"]
  },
  {
    title: "Small Talk Lab",
    desc: "专门练寒暄、转场、接话和更自然的社交型开口。",
    duration: "6 分钟",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    tags: ["Small Talk", "社交表达"]
  }
];

const themes = [
  { title: "时尚穿搭", desc: "OOTD、购物、风格描述与轻社交表达。" },
  { title: "个人成长", desc: "自我管理、思维表达、经验复盘与长句输出。" },
  { title: "文化体验", desc: "旅行见闻、文化差异、城市观察和生活方式。" },
  { title: "观点表达", desc: "适合训练“我怎么看”和“为什么这么看”。" }
];

const features = [
  {
    icon: "字",
    title: "字幕点读",
    desc: "逐句聚焦字幕，点击单词或短语即可查看释义、音标、例句与使用场景，支持中英切换与重点高亮。"
  },
  {
    icon: "跟",
    title: "影子跟读",
    desc: "基于句子循环、停顿、慢放和跟读录音组合出更适合口语模仿的流程，不只是简单倍速播放。"
  },
  {
    icon: "录",
    title: "录音纠音",
    desc: "支持录音回放、发音评分、重音节奏提示和回音法训练，让用户知道自己具体哪里说得不像。"
  },
  {
    icon: "卡",
    title: "英语闪卡",
    desc: "自动生成单词卡、短语卡、表达卡，沉淀来自真实视频的可复用表达，而不是孤立背单词。"
  },
  {
    icon: "循",
    title: "AB 循环与单句暂停",
    desc: "支持整段循环、单句循环、单句暂停、精听模式和听写模式，适合做高密度模仿训练。"
  },
  {
    icon: "端",
    title: "多端同步",
    desc: "电脑上精练、手机上复习、平板上刷卡片，统一学习记录与进度，更符合真实使用节奏。"
  }
];

const apis = [
  {
    title: "DeepSeek",
    desc: "适合做表达重写、句子拆解、闪卡解释和输出建议，成本控制也更灵活。"
  },
  {
    title: "Gemini",
    desc: "用于更强的多模态理解和内容总结，适合视频材料预处理和主题整理。"
  },
  {
    title: "豆包",
    desc: "面向中文用户界面的解释体验更自然，适合做学习提示、词义说明和轻助教问答。"
  },
  {
    title: "千问",
    desc: "用于表达对比、例句生成和学习推荐，在中文语境下更容易补足本地化体验。"
  }
];

const consoleRows = [
  {
    title: "口语点评",
    desc: "识别你跟读中的断句、连读、重音与语速问题，并给出更自然的替代表达。",
    tag: "Pron 91"
  },
  {
    title: "表达升级",
    desc: "把 I think it is good 一类初级表达自动升级成更地道、更像视频原声的说法。",
    tag: "Rewrite"
  },
  {
    title: "学习推荐",
    desc: "根据你最近卡住的句型、词汇和语速，推荐更适合下一步练的 YouTube 素材。",
    tag: "Next Set"
  },
  {
    title: "卡片生成",
    desc: "自动沉淀单词卡、短语卡、表达卡与场景卡，让视频语料持续转化成长期资产。",
    tag: "Cards"
  }
];

const flashcards = [
  {
    title: "单词卡",
    desc: "包含音标、词性、核心义项、视频原句、常见搭配与发音重点。",
    tags: ["音标", "例句", "词频"]
  },
  {
    title: "短语卡",
    desc: "沉淀真实对话里更常用的块状表达，帮助用户减少字字翻译的问题。",
    tags: ["搭配", "替换", "语境"]
  },
  {
    title: "表达卡",
    desc: "提炼整句表达和句型骨架，适合快速迁移到自己的口语输出里。",
    tags: ["整句", "改写", "输出"]
  },
  {
    title: "场景卡",
    desc: "把素材里的表达按购物、旅行、社交、观点输出等场景重新归档。",
    tags: ["场景", "主题", "复习"]
  }
];

function SectionHeader({ title, description }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}
*/


/*
export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div className="shell nav">
          <a className="brand" href="#top">
            <span className="brand-mark" />
            <span>SpeakFlow</span>
          </a>
          <nav className="nav-links">
            <a href="#materials">语料素材</a>
            <a href="#features">练习系统</a>
            <a href="#ai">AI 接口</a>
            <a href="#cards">英语闪卡</a>
          </nav>
          <div className="nav-actions">
            <a className="button secondary" href="#features">查看功能</a>
            <a className="button primary" href="#cta">开始设计</a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">专为口语练习打造，不是文档工具套壳</span>
              <h1>为英语 <span className="headline-accent">口语练习</span> 单独开发的学习网站</h1>
              <p>
                支持导入 YouTube 英语素材，串联字幕点读、逐句跟读、录音纠音、英语闪卡与 AI 助教。
                整体体验更像一款高质感学习产品，而不是 FlowUs / Notion 式的文档页面。
              </p>
              <div className="nav-actions">
                <a className="button primary" href="#materials">看核心体验</a>
                <a className="button secondary" href="#ai">查看 API 能力</a>
              </div>
              <div className="hero-metrics">
                {metrics.map((item) => (
                  <div className="metric" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-stage">
              <div className="desktop-window">
                <div className="window-top">
                  <div className="window-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="window-search">导入 YouTube 链接，开始拆解口语素材</div>
                </div>
                <div className="workspace">
                  <div className="video-panel">
                    <div className="video-frame">
                      <div className="video-pill">Vlog 素材库 · 实景表达</div>
                      <div className="video-caption">
                        <strong>Shadowing Mode</strong>
                        <div className="caption-line">
                          I think it really changes how you <span className="highlight">speak with confidence</span> in daily life.
                        </div>
                      </div>
                    </div>
                    <div className="video-footer">
                      <div className="player-controls">
                        <span className="player-chip active">逐句跟读</span>
                        <span className="player-chip">字幕点读</span>
                        <span className="player-chip">0.8x</span>
                        <span className="player-chip">AB 循环</span>
                      </div>
                      <span className="mini-tag">评分 92 / 100</span>
                    </div>
                  </div>

                  <aside className="subtitle-panel">
                    <div className="panel-head">
                      <strong>智能字幕系统</strong>
                      <span className="mini-tag">中英双语</span>
                    </div>
                    <div className="subtitle-list">
                      {subtitles.map((item) => (
                        <div className={`subtitle-item${item.active ? " active" : ""}`} key={`${item.time}-${item.english}`}>
                          <time>{item.time}</time>
                          <b>{item.english}</b>
                          <p>{item.chinese}</p>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>

              <div className="floating-phone">
                <div className="phone-screen">
                  <div className="phone-notch" />
                  <div className="phone-card">
                    <strong>随身跟读</strong>
                    <div className="tags">
                      <span className="mini-tag">影子跟读</span>
                      <span className="mini-tag">实时打分</span>
                    </div>
                    <div className="mic-row">
                      <span className="mini-tag">08:09</span>
                      <div className="mic-button" />
                      <span className="mini-tag">1x</span>
                    </div>
                  </div>
                  <div className="phone-card">
                    <strong>单词闪卡</strong>
                    <p className="phone-copy">naturally<br />adv. 自然地；不做作地</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="materials">
          <div className="shell">
            <SectionHeader
              title="语料素材库，不做文档堆砌"
              description="首页入口直接围绕可练习的英语内容组织，按视频主题、表达密度、语速难度与使用场景筛选。产品观感更接近成熟内容平台，而不是表格加文本块。"
            />
            <div className="materials-grid">
              <div className="surface-card large">
                <div className="card-title">
                  <div>
                    <strong>YouTube 英语内容库</strong>
                    <span>导入链接后自动抽取字幕、主题、词组与表达卡片</span>
                  </div>
                  <span className="mini-tag">持续更新</span>
                </div>
                <div className="material-list">
                  {materials.map((item) => (
                    <article className="material-item" key={item.title}>
                      <div className="material-cover" style={{ backgroundImage: `url('${item.image}')` }}>
                        <span>{item.duration}</span>
                      </div>
                      <div className="material-body">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                        <div className="tags">
                          {item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="surface-card small">
                <div className="card-title">
                  <div>
                    <strong>学习主题</strong>
                    <span>按使用场景组织内容，而不是只按文件夹分类</span>
                  </div>
                </div>
                <div className="themes">
                  {themes.map((item) => (
                    <div className="theme-card" key={item.title}>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features">
          <div className="shell">
            <SectionHeader
              title="围绕开口练习设计的核心功能"
              description="功能不只是罗列开关，而是围绕听懂、拆句、模仿、纠音、复习、输出形成完整路径。UI 上用更克制的卡片层级和更专业的配色，不做淘宝详情页那种堆叠感。"
            />
            <div className="features-grid">
              {features.map((item) => (
                <article className="feature-card" key={item.title}>
                  <div className="feature-icon">{item.icon}</div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ai">
          <div className="shell">
            <SectionHeader
              title="多模型 API 接入，服务练习链路"
              description="DS、Gemini、豆包、千问不是简单挂名，而是分别参与字幕处理、表达扩写、口语点评、词卡生成和难度分层。"
            />
            <div className="ai-layout">
              <div className="api-stack">
                {apis.map((item) => (
                  <article className="api-card" key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </article>
                ))}
              </div>
              <div className="ai-console">
                {consoleRows.map((item) => (
                  <div className="console-row" key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                    <span className="score-chip">{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="cards">
          <div className="shell">
            <SectionHeader
              title="英语闪卡，不止是背词"
              description="闪卡体系要直接服务口语输出，所以单词卡、短语卡、表达卡和场景卡需要并存。信息结构上强调怎么说、在哪说、替代什么说法，而不是只展示释义。"
            />
            <div className="flash-grid">
              {flashcards.map((item) => (
                <article className="flash-card" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                  <div className="flash-meta">
                    {item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cta">
          <div className="shell">
            <div className="cta-panel">
              <h2>这是你自己的英语训练场，不是公域流量页面</h2>
              <p>
                这版已经升级成可继续扩展的 Next.js 首页骨架，后续可以继续接入真实的素材导入、字幕处理、用户学习记录、AI 接口调度和口语练习工作流。
              </p>
              <div className="cta-actions">
                <a className="button primary" href="#top">返回顶部</a>
                <a className="button secondary" href="#materials">查看展示模块</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-row">
          <div>SpeakFlow · 专为英语口语练习开发的学习网站概念页</div>
          <div>支持手机 / 平板 / 电脑 · 下一步可继续接入真实训练功能</div>
        </div>
      </footer>
    </>
  );
}
*/
