import { useState, useEffect, useRef } from "react";
import "./App.css";

const STORAGE_KEY = "todo-quest-data";

const SHOP_ITEMS = [
  { id: "crown", icon: "👑", name: "Корона", desc: "Королевская корона", price: 500 },
  { id: "cap", icon: "🧢", name: "Кепка", desc: "Стильная бейсболка", price: 200 },
  { id: "tophat", icon: "🎩", name: "Цилиндр", desc: "Джентльменский цилиндр", price: 350 },
  { id: "wizard", icon: "🧙", name: "Шляпа волшебника", desc: "Магическая шляпа", price: 600 },
  { id: "santa", icon: "🎅", name: "Колпак Санты", desc: "Праздничный колпак", price: 400 },
  { id: "helmet", icon: "⛑️", name: "Каска", desc: "Строительная каска", price: 250 },
  { id: "angel", icon: "😇", name: "Нимб", desc: "Святящийся нимб", price: 750 },
  { id: "party", icon: "🥳", name: "Колпак именинника", desc: "Праздничный колпак", price: 300 },
];

const BASE_XP = 25;
const BASE_GOLD = 10;

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = getToday();
      if (parsed.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        parsed.completedToday = 0;
        parsed.lastDate = today;
        parsed.streak = parsed.lastStreakDate === yStr ? parsed.streak : 0;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return {
    quests: [],
    level: 1,
    xp: 0,
    gold: 0,
    totalCompleted: 0,
    completedToday: 0,
    lastDate: getToday(),
    ownedHats: [],
    equippedHat: null,
    streak: 0,
    lastStreakDate: null,
    strength: 1,
    stamina: 1,
    intellect: 1,
    statPoints: 0,
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function App() {
  const [data, setData] = useState(getInitialData);
  const [page, setPage] = useState("main");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rewardToast, setRewardToast] = useState(null);
  const [levelUp, setLevelUp] = useState(false);
  const rewardTimer = useRef(null);

  // Form state for new quest
  const [questText, setQuestText] = useState("");
  const [questDesc, setQuestDesc] = useState("");

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    if (rewardToast) {
      rewardTimer.current = setTimeout(() => setRewardToast(null), 2500);
      return () => clearTimeout(rewardTimer.current);
    }
  }, [rewardToast]);

  useEffect(() => {
    if (levelUp) {
      const t = setTimeout(() => setLevelUp(false), 3000);
      return () => clearTimeout(t);
    }
  }, [levelUp]);

  // Derived
  const total = data.quests.length;
  const done = data.quests.filter((q) => q.done).length;
  const activeQuests = data.quests.filter((q) => !q.done);
  const xpNeeded = xpForLevel(data.level);
  const xpPercent = Math.min(Math.round((data.xp / xpNeeded) * 100), 100);
  const getHatEmoji = () => {
    if (!data.equippedHat) return null;
    const item = SHOP_ITEMS.find((i) => i.id === data.equippedHat);
    return item ? item.icon : null;
  };
  const playerHat = getHatEmoji();

  // Handlers
  function addQuest() {
    const text = questText.trim();
    if (!text) return;
    const xpReward = BASE_XP + Math.floor(Math.random() * 11);
    const goldReward = BASE_GOLD + Math.floor(Math.random() * 6);
    const newQuest = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      desc: questDesc.trim(),
      done: false,
      xpReward,
      goldReward,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      quests: [newQuest, ...prev.quests],
    }));
    setQuestText("");
    setQuestDesc("");
    setPage("main");
  }

  function completeQuest(id) {
    setData((prev) => {
      const quest = prev.quests.find((q) => q.id === id);
      if (!quest || quest.done) return prev;
      const today = getToday();
      let newXp = prev.xp + quest.xpReward;
      let newGold = prev.gold + quest.goldReward;
      let newLevel = prev.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) {
        newXp -= xpForLevel(newLevel);
        newLevel++;
        leveledUp = true;
      }
      const newStreak = prev.lastStreakDate === today ? prev.streak : prev.streak + 1;
      const newQuests = prev.quests.map((q) => q.id === id ? { ...q, done: true } : q);
      const completedToday = newQuests.filter((q) => q.done).length;

      if (leveledUp) {
        setTimeout(() => setLevelUp(true), 100);
      }
      setRewardToast({
        emoji: "⭐",
        title: "Квест выполнен!",
        desc: `+${quest.xpReward} XP • +${quest.goldReward} 🪙`,
      });

      return {
        ...prev,
        quests: newQuests,
        xp: newXp,
        gold: newGold,
        level: newLevel,
        totalCompleted: prev.totalCompleted + 1,
        completedToday,
        lastDate: today,
        streak: newStreak,
        lastStreakDate: today,
        statPoints: leveledUp ? (prev.statPoints || 0) + 3 : (prev.statPoints || 0),
      };
    });
  }

  function deleteQuest(id) {
    setData((prev) => ({
      ...prev,
      quests: prev.quests.filter((q) => q.id !== id),
      completedToday: prev.quests.filter((q) => q.id !== id && q.done).length,
    }));
  }

  function buyHat(item) {
    if (data.gold < item.price || data.ownedHats.includes(item.id)) return;
    setData((prev) => ({
      ...prev,
      gold: prev.gold - item.price,
      ownedHats: [...prev.ownedHats, item.id],
      equippedHat: item.id,
    }));
    setRewardToast({ emoji: item.icon, title: "Покупка!", desc: `Куплено: ${item.name}` });
  }

  function equipHat(id) {
    setData((prev) => ({
      ...prev,
      equippedHat: prev.equippedHat === id ? null : id,
    }));
  }

  function upgradeStat(stat) {
    if (!data.statPoints) return;
    setData((prev) => ({
      ...prev,
      [stat]: (prev[stat] || 0) + 1,
      statPoints: (prev.statPoints || 0) - 1,
    }));
  }

  return (
    <>
      {/* Lightning bolts - static lines */}
      <div className="lightning">
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
        <div className="lightning-bolt"></div>
      </div>

      {/* Level Up */}
      <div className={`level-up-overlay ${levelUp ? "show" : ""}`}>
        <div className="level-up-content">
          <div className="big-emoji">🎉</div>
          <h2>LEVEL UP!</h2>
          <p>Вы достигли {data.level} уровня! +3 очка характеристик</p>
        </div>
      </div>

      {/* Reward Toast */}
      {rewardToast && (
        <div className="reward-toast show">
          <div className="emoji">{rewardToast.emoji}</div>
          <div className="title">{rewardToast.title}</div>
          <div className="desc">{rewardToast.desc}</div>
        </div>
      )}

      {/* ===== PAGE: MAIN ===== */}
      {page === "main" && (
        <div className="page page-enter" style={{ paddingTop: 12 }}>
          {/* 1. Profile Card */}
          <div className="glass profile-card">
            <div className="profile-row">
              <div className="profile-left">
                <div className="profile-avatar">
                  {playerHat && <span className="hat">{playerHat}</span>}
                  🧑
                </div>
                <div className="profile-name-block">
                  <div className="profile-name">Иван Петров</div>
                  <div className="profile-title">
                    Уровень {data.level} · {data.strength + data.stamina + data.intellect} ур.
                  </div>
                </div>
              </div>
              <button className="settings-btn" onClick={() => setSettingsOpen(true)} title="Настройки">
                ⚙
              </button>
            </div>
            <div className="currency-row" style={{ display: "flex", gap: 10 }}>
              <div className="currency-item" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>
                <span>🪙</span><span style={{ color: "var(--accent)" }}>{data.gold}</span>
              </div>
              <div className="currency-item" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>
                <span>💎</span><span style={{ color: "var(--primary)" }}>{Math.floor(data.totalCompleted / 5)}</span>
              </div>
              <div className="currency-item" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>
                <span>🔥</span><span style={{ color: "var(--danger)" }}>{data.streak}</span>
              </div>
            </div>
          </div>

          {/* 2. Level Card */}
          <div className="glass level-card">
            <div className="level-header">
              <h3>🌟 Уровень</h3>
              <div className="level-number">{data.level}</div>
            </div>
            <div className="level-xp-bar">
              <div className="level-xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <div className="level-xp-text">
              <span>✨ {data.xp} / {xpNeeded} XP</span>
              <span>{xpPercent}%</span>
            </div>
          </div>

          {/* 3. Stats Row */}
          <div className="glass stats-row" style={{ padding: "12px 10px" }}>
            <div className="stat-box strength">
              <div className="stat-icon">💪</div>
              <div className="stat-name">Сила</div>
              <div className="stat-val">{data.strength || 1}</div>
              {data.statPoints > 0 && (
                <button onClick={() => upgradeStat("strength")} style={{ marginTop: 4, background: "rgba(59,130,246,0.2)", border: "none", borderRadius: 4, color: "var(--primary)", fontSize: 10, fontWeight: 700, padding: "2px 8px", cursor: "pointer" }}>+</button>
              )}
            </div>
            <div className="stat-box stamina">
              <div className="stat-icon">❤️</div>
              <div className="stat-name">Выносливость</div>
              <div className="stat-val">{data.stamina || 1}</div>
              {data.statPoints > 0 && (
                <button onClick={() => upgradeStat("stamina")} style={{ marginTop: 4, background: "rgba(59,130,246,0.2)", border: "none", borderRadius: 4, color: "var(--primary)", fontSize: 10, fontWeight: 700, padding: "2px 8px", cursor: "pointer" }}>+</button>
              )}
            </div>
            <div className="stat-box intellect">
              <div className="stat-icon">🧠</div>
              <div className="stat-name">Интеллект</div>
              <div className="stat-val">{data.intellect || 1}</div>
              {data.statPoints > 0 && (
                <button onClick={() => upgradeStat("intellect")} style={{ marginTop: 4, background: "rgba(59,130,246,0.2)", border: "none", borderRadius: 4, color: "var(--primary)", fontSize: 10, fontWeight: 700, padding: "2px 8px", cursor: "pointer" }}>+</button>
              )}
            </div>
          </div>

          {/* Stat points remaining */}
          {data.statPoints > 0 && (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
              ⚡ Доступно очков: {data.statPoints}
            </div>
          )}

          {/* 4. Active Quests */}
          <div className="glass quest-card">
            <div className="quest-card-header">
              <h3>⚔️ Активные квесты</h3>
              <span className="count">{activeQuests.length}</span>
            </div>

            {activeQuests.length === 0 ? (
              <div className="quest-empty">
                {total === 0 ? "Нет квестов. Добавьте новый!" : "Все квесты выполнены! 🎉"}
              </div>
            ) : (
              activeQuests.map((quest) => (
                <div className="quest-item" key={quest.id}>
                  <div className="quest-name">{quest.text}</div>
                  <div className="quest-rewards">
                    <span className="quest-reward xp">✨ {quest.xpReward}</span>
                    <span className="quest-reward gold">🪙 {quest.goldReward}</span>
                  </div>
                  <div className="quest-actions">
                    <button className="quest-btn complete" onClick={() => completeQuest(quest.id)} title="Выполнить">
                      ✓
                    </button>
                    <button className="quest-btn delete" onClick={() => deleteQuest(quest.id)} title="Удалить">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed stats */}
          {total > 0 && (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0 8px" }}>
              Выполнено: {done}/{total} · Сегодня: {data.completedToday}
            </div>
          )}

          {data.totalCompleted > 0 && (
            <div className="cumulative">
              <span className="fire">🔥</span>
              <span>Всего выполнено: {data.totalCompleted} квестов</span>
            </div>
          )}
        </div>
      )}

      {/* ===== PAGE: ADD QUEST ===== */}
      {page === "add" && (
        <div className="add-page page-enter">
          <h2>📋 Новый квест</h2>
          <div className="glass add-form">
            <label>
              Название квеста
              <input
                type="text"
                placeholder="Например: Сделать зарядку"
                value={questText}
                onChange={(e) => setQuestText(e.target.value)}
              />
            </label>
            <label>
              Описание (необязательно)
              <textarea
                placeholder="Опишите задачу..."
                value={questDesc}
                onChange={(e) => setQuestDesc(e.target.value)}
              />
            </label>
            <div className="reward-preview">
              <span>Награда:</span>
              <span className="xp">✨ 25-35 XP</span>
              <span className="gold">🪙 10-15 золота</span>
            </div>
            <button className="submit-btn" onClick={addQuest}>
              ➤ Создать квест
            </button>
          </div>
        </div>
      )}

      {/* ===== PAGE: SHOP ===== */}
      {page === "shop" && (
        <div className="shop-page page-enter">
          <h2>🏪 Магазин шапок</h2>
          <div className="glass shop-balance">
            <span className="gold-icon">🪙</span>
            <span className="gold-amount">{data.gold}</span>
          </div>
          <div className="shop-grid">
            {SHOP_ITEMS.map((item) => {
              const owned = data.ownedHats.includes(item.id);
              const equipped = data.equippedHat === item.id;
              const canBuy = data.gold >= item.price && !owned;
              return (
                <div className="glass shop-item" key={item.id}>
                  <div className="shop-item-img">{item.icon}</div>
                  <div className="shop-item-name">{item.name}</div>
                  <div className="shop-item-desc">{item.desc}</div>
                  <div className="shop-item-price">🪙 {item.price}</div>
                  {owned ? (
                    <button
                      className={`shop-item-btn ${equipped ? "equipped" : "owned"}`}
                      onClick={() => equipHat(item.id)}
                    >
                      {equipped ? "🟢 Надето" : "Надеть"}
                    </button>
                  ) : (
                    <button
                      className="shop-item-btn buy"
                      disabled={!canBuy}
                      onClick={() => buyHat(item)}
                    >
                      Купить
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Settings Modal ===== */}
      <div className={`settings-overlay ${settingsOpen ? "open" : ""}`}>
        <div className="settings-panel">
          <h2>
            ⚙ Информация
            <button onClick={() => setSettingsOpen(false)}>✕</button>
          </h2>
          <div className="settings-info">
            <p><strong>Quest List</strong> — RPG-квестовый todo-трекер</p>
            <br />
            <p><strong>Разработчик:</strong></p>
            <p className="highlight">Студент ВШИТиАС</p>
            <p>Направление: ИВТ</p>
            <p>Курс: 2</p>
            <p>Группа: 151417</p>
            <br />
            <p><strong>О проекте:</strong></p>
            <p>Превращайте свои повседневные задачи в квесты! Выполняйте задания, получайте опыт и золото, повышайте уровень, прокачивайте характеристики (Сила, Выносливость, Интеллект) и покупайте уникальные шапки в магазине.</p>
            <br />
            <p>🔥 Серия дней не сбрасывается, если выполнять хотя бы один квест каждый день.</p>
          </div>
        </div>
      </div>

      {/* ===== Bottom Navigation ===== */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${page === "main" ? "active" : ""}`} onClick={() => setPage("main")}>
          <span className="nav-icon">🏠</span>
          Главная
        </button>
        <button className={`nav-btn ${page === "add" ? "active" : ""}`} onClick={() => setPage("add")}>
          <span className="nav-icon">📋</span>
          Добавить
        </button>
        <button className={`nav-btn ${page === "shop" ? "active" : ""}`} onClick={() => setPage("shop")}>
          <span className="nav-icon">🏪</span>
          Магазин
        </button>
      </nav>
    </>
  );
}