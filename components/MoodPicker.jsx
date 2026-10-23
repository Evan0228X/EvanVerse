'use client';

// 心情狀態清單。選擇後會放進 Supabase Realtime Presence 的 track payload，
// 房間內其他成員透過 presence sync 事件即時看到變化。
export const MOODS = [
  '📖 專注中',
  '🔥 衝刺中',
  '😭 讀不完',
  '😴 與周公拔河中',
  '💧 喝水續命',
  '🧠 大腦已超載',
  '💀 讀到懷疑人生',
  '📱 偷偷滑手機',
  '🐟 正在摸魚',
  '🙏 臨時抱佛腳',
  '🧋 吸珍奶回血',
];

// 每個心情對應的色調 token，實際顏色定義在 globals.css 的 [data-tone="..."]。
const MOOD_TONES = {
  '📖 專注中': 'focus',
  '🔥 衝刺中': 'sprint',
  '😭 讀不完': 'blue',
  '😴 與周公拔河中': 'sleepy',
  '💧 喝水續命': 'water',
  '🧠 大腦已超載': 'overload',
  '💀 讀到懷疑人生': 'danger',
  '📱 偷偷滑手機': 'sneaky',
  '🐟 正在摸魚': 'fish',
  '🙏 臨時抱佛腳': 'panic',
  '🧋 吸珍奶回血': 'boba',
};

export function moodTone(mood) {
  return MOOD_TONES[mood] || 'focus';
}

// 把「📖 專注中」拆成 emoji 與文字，方便貼紙分開排版
export function moodParts(mood) {
  const s = String(mood || MOODS[0]);
  const i = s.indexOf(' ');
  if (i === -1) return { emoji: '', text: s };
  return { emoji: s.slice(0, i), text: s.slice(i + 1) };
}

export default function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker">
      <label className="muted small" htmlFor="mood-select">心情狀態</label>
      <select
        id="mood-select"
        className="input mood-select"
        data-tone={moodTone(value)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {MOODS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
