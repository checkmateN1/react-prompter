import React, { createContext, useState } from 'react';
import { createPortal } from 'react-dom';
import './playerTypes.css';

// Selected appearance when the temporary switcher is commented out.
export const PlayerTypeStyleContext = createContext(2);
const storageKey = 'player-type-style-preview';
const variants = ['Контур', 'Полоса слева', 'Линия снизу', 'Точка', 'Лёгкий фон',
  'Фон и полоса', 'Плашка ника', 'Подчёркнутый ник', 'Тёмный', 'Скобки'];

// Temporary visual selector: changes appearance only, never player types or their timers.
export default function PlayerTypeStylePreview({ children }) {
  const [variant, setVariant] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return Number.isInteger(saved) && saved >= 1 && saved <= variants.length ? saved : 1;
    } catch (_) { return 1; }
  });
  const step = direction => {
    const next = (variant - 1 + direction + variants.length) % variants.length + 1;
    setVariant(next);
    try { localStorage.setItem(storageKey, String(next)); } catch (_) { /* Optional persistence. */ }
  };
  return <PlayerTypeStyleContext.Provider value={variant}>
    {children}
    {createPortal(<div className="player-type-style-preview" role="group" aria-label="Варианты подсветки"
      onDoubleClick={event => event.stopPropagation()}>
      <span className="player-type-style-preview__label">Вид метки</span>
      <button type="button" aria-label="Предыдущий стиль" onClick={() => step(-1)}>‹</button>
      <span className="player-type-style-preview__current" aria-live="polite">
        <b>{variant}/10</b> {variants[variant - 1]}
      </span>
      <button type="button" aria-label="Следующий стиль" onClick={() => step(1)}>›</button>
    </div>, document.body)}
  </PlayerTypeStyleContext.Provider>;
}
