import React from 'react';
import Card from './Card';

const PlayerHand = ({ hand, onPlayCard }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', // ✅ ensure left to right
                  justifyContent: 'center', gap: '4px' }}>
      {hand.map((card, index) => (
        <Card
          key={index}
          value={card.value}
          suit={card.suit}
          onClick={() => onPlayCard(index)}
        />
      ))}
    </div>
  );
};

export default PlayerHand;
