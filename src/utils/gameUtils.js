// Create a 52-card deck
export function createDeck() {
  const suits = ['♠', '♥', '♣', '♦'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let deck = [];

  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }

  return deck;
}

// Shuffle the deck
export function shuffleDeck(deck) {
  return deck
    .map(card => ({ ...card, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ suit, value }) => ({ suit, value }));
}

// Deal cards to 4 players (13 each)
export function dealCards(deck) {
  const hands = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands;
}

export function selectTrump(hand) {
  const suitCounts = hand.reduce((acc, card) => {
    acc[card.suit] = (acc[card.suit] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0][0];
}

// Play AI card: follow suit if possible, else random
export function aiPlayCard(aiHand, leadSuit, trump) {
  const cardsInSuit = aiHand.filter(card => card.suit === leadSuit);
  if (cardsInSuit.length > 0) {
    return aiHand.indexOf(cardsInSuit[0]); // play first in-suit card
  }
  return 0; // fallback: play first card
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function dealInitialHands(deck) {
  const hands = [[], [], [], []];

  // Deal 5 cards to each player
  for (let i = 0; i < 20; i++) {
    hands[i % 4].push(deck[i]);
  }

  const remainingDeck = deck.slice(20);
  return { hands, remainingDeck };
}


export function completeDealing(hands, remainingDeck, startIndex = 0) {
  for (let i = 0; i < remainingDeck.length; i++) {
    const playerIndex = (startIndex + i) % 4;
    hands[playerIndex].push(remainingDeck[i]);
  }
  console.log("hands:" + hands[0].length);
  return hands;
}

const cardRankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function evaluateTrick(trick, leadSuit, trumpSuit) {
  const getRank = (card) => cardRankOrder.indexOf(card.value);

  let winningCard = trick[0].card;
  let winnerId = trick[0].playerId;

  for (let i = 1; i < trick.length; i++) {
    const challenger = trick[i].card;

    const challengerIsTrump = challenger.suit === trumpSuit;
    const winningIsTrump = winningCard.suit === trumpSuit;

    const challengerIsLead = challenger.suit === leadSuit;
    const winningIsLead = winningCard.suit === leadSuit;

    const challengerRank = getRank(challenger);
    const winningRank = getRank(winningCard);

    let wins = false;
    if (challengerIsTrump && !winningIsTrump) wins = true;
    else if (challenger.suit === winningCard.suit && challengerRank > winningRank) wins = true;

    if (wins) {
      winningCard = challenger;
      winnerId = trick[i].playerId;
    }
  }

  return winnerId;
}
