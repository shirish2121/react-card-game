import React from 'react';
import Card from './Card';
import './BotHand.css';

/**
 * Renders up to 4 face-down cards in a fan.
 * count = number of cards in that bot’s hand (we’ll clamp to 4)
 */
export default function BotHand({ count = 0 }) {
  const displayCount = Math.min(4, count);
  if (displayCount === 0) return null;

  // total spread (max 40deg)
  const maxSpread = 40;
  const spread    = Math.min(maxSpread, displayCount * 8);
  const startAng  = -spread / 2;
  const radius    = 60;

  return (
    <div className="bot-hand-fan" style={{ width: radius*2, height: radius }}>
      {Array.from({ length: displayCount }, (_, i) => {
        const angle = startAng + (spread / (displayCount - 1 || 1)) * i;
        const rad   = (angle * Math.PI) / 180;
        const x     = radius + Math.sin(rad)*radius - 20; // half card ≈20px
        const y     = radius - Math.cos(rad)*radius;
        return (
          <div
            key={i}
            className="bot-hand-card"
            style={{
              top:  y,
              left: x,
              transform: `rotate(${angle}deg)`,
            }}
          >
            <Card back />
          </div>
        );
      })}
    </div>
  );
}
