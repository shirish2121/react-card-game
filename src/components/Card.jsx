import './Card.css';

function Card({ value, suit, back, onClick }) {
  const isRed = suit === '♥' || suit === '♦';
  const cardClass = back ? 'card back' : `card ${isRed ? 'red' : 'black'}`;
  
  return <div className={cardClass} onClick={onClick}>{!back && `${value} ${suit}`}</div>;
}


export default Card;
