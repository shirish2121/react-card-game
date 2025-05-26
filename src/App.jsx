import React, { useState, useEffect, useRef } from 'react';
import {
  createDeck,
  shuffleDeck,
  dealInitialHands,
  completeDealing,
  selectTrump,
  aiPlayCard,
  evaluateTrick,
  delay
} from './utils/gameUtils';
import PlayerHand from './components/PlayerHand';
import Card from './Components/Card';
import BotHand from './components/BotHand';
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
const STORAGE_KEY = 'koatpiece-v3';
const persistEnabled = false;

function App() {
    // Load persisted values or defaults
   
    const stored = persistEnabled ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') : {};

    const [players, setPlayers] = useState(stored.players || []);
    const [trump, setTrump] = useState(stored.trump || '');
    const [trumpCallerIndex, setTrumpCallerIndex] = useState(
        stored.trumpCallerIndex != null ? stored.trumpCallerIndex : 1
    );
    const [leadPlayerId, setLeadPlayerId] = useState(
        stored.leadPlayerId != null ? stored.leadPlayerId : 1
    );
    const [gameStarted, setGameStarted] = useState(
        stored.gameStarted || false
    );
    const [gameOver, setGameOver] = useState(
        stored.gameOver || false
    );
    const [winnerMessage, setWinnerMessage] = useState(
        stored.winnerMessage || ''
    );
    const [currentTrick, setCurrentTrick] = useState(
        stored.currentTrick || []
    );
    const [leadSuit, setLeadSuit] = useState(
        stored.leadSuit || null
    );
    const [awaitingTrump, setAwaitingTrump] = useState(
        stored.awaitingTrump || false
    );
    const [partialHands, setPartialHands] = useState(
        stored.partialHands || null
    );
    const [remainingDeck, setRemainingDeck] = useState(
        stored.remainingDeck || []
    );
    const [nextLeadPlayer, setNextLeadPlayer] = useState(
        stored.nextLeadPlayer != null ? stored.nextLeadPlayer : null
    );


    // Persist on any key change
    useEffect(() => {
        if (!persistEnabled) return;
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                players,
                trump,
                trumpCallerIndex,
                leadPlayerId,
                gameStarted,
                gameOver,
                winnerMessage,
                currentTrick,
                leadSuit,
                awaitingTrump,
                partialHands,
                remainingDeck,
                nextLeadPlayer
            })
        );
    }, [
        players,
        trump,
        trumpCallerIndex,
        leadPlayerId,
        gameStarted,
        gameOver,
        winnerMessage,
        currentTrick,
        leadSuit,
        awaitingTrump,
        partialHands,
        remainingDeck,
        nextLeadPlayer
    ]);

  const startGame = () => {
    const deck = shuffleDeck(createDeck());
    const callerIndex = 1;
    setTrumpCallerIndex(callerIndex);
    const { hands, remainingDeck } = dealInitialHands(deck, callerIndex);
    setPartialHands(hands);
    setRemainingDeck(remainingDeck);
    setAwaitingTrump(true);

    if (callerIndex !== 0) {
      const chosenTrump = selectTrump(hands[callerIndex]);
      setTrump(chosenTrump);
      finalizeDeal(hands, remainingDeck, chosenTrump, callerIndex);
    }
  };

  const finalizeDeal = (hands, remaining, chosenTrump, callerIndex) => {
    const fullHands = completeDealing(hands, remaining);

    // Sort player 0's hand by suit, then by value
    const cardOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const suitOrder = { '♠': 1, '♥': 2, '♣': 3, '♦': 4 };

    fullHands[0].sort((a, b) => {
      if (a.suit === b.suit) {
        return cardOrder[a.value] - cardOrder[b.value];
      }
      return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    setPlayers([
      { id: 0, name: "You", hand: fullHands[0], tricksWon: 0 },
      { id: 1, name: "Bot 1", hand: fullHands[1], tricksWon: 0 },
      { id: 2, name: "Bot 2", hand: fullHands[2], tricksWon: 0 },
      { id: 3, name: "Bot 3", hand: fullHands[3], tricksWon: 0 },
    ]);
    setTrump(chosenTrump);
    setLeadPlayerId(callerIndex);
    setLeadSuit(null);
    setCurrentTrick([]);
    setGameStarted(true);
    setGameOver(false);
    setWinnerMessage('');
    setAwaitingTrump(false);
    if (callerIndex !== 0) setNextLeadPlayer(callerIndex);
  };

  useEffect(() => {
    if (nextLeadPlayer !== null && players.length === 4) {
      playBotTurn(nextLeadPlayer);
      setNextLeadPlayer(null);
    }
  }, [nextLeadPlayer, players]);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, orientation=portrait';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const handlePlayerCardClick = async (index) => {
    if (leadPlayerId !== 0 || currentTrick.some(t => t.playerId === 0)) return;
    const updated = [...players];
    const selectedCard = updated[0].hand[index];

    // Enforce suit-following rule if not first play
    if (currentTrick.length > 0) {
      const leadSuit = currentTrick[0].card.suit;
      const hasLeadSuit = updated[0].hand.some(c => c.suit === leadSuit);
      if (hasLeadSuit && selectedCard.suit !== leadSuit) {
        alert(`You must play a ${leadSuit} card.`);
        return;
      }
    }

    const card = updated[0].hand.splice(index, 1)[0];

    const updatedTrick = [...currentTrick, { playerId: 0, card }];
    setPlayers(updated);
    setLeadSuit(card.suit);
    setCurrentTrick(updatedTrick);
    await playBotTurnSequential(updatedTrick, updated);
  };

  //User-led trick: Human plays first → use playBotTurnSequential to finish off bots.
  const playBotTurnSequential = async (trick, updated) => {
    for (let i = 1; i < 4; i++) {
      await delay(2000);
      const playerId = (0 + i) % 4;
      if (trick.some(t => t.playerId === playerId)) continue;
      const botHand = [...updated[playerId].hand];
      const cardIndex = aiPlayCard(botHand, trick[0].card.suit, trump);
      const card = botHand.splice(cardIndex, 1)[0];
      if (!card || botHand.length === 0) continue;
      updated[playerId].hand = botHand;
      trick.push({ playerId, card });
      setPlayers([...updated]);
      setCurrentTrick([...trick]);
    }
    await evaluateTrickAndContinue(trick, updated);
  };

    //Bot-led trick: Bot leads → use playBotTurn to get through until it’s your turn (or all bots have played).
  const playBotTurn = async (startPlayerId) => {
    const updated = [...players];
    const trick = [];
    for (let i = 0; i < 4; i++) {
      await delay(2000);
      const playerId = (startPlayerId + i) % 4;
      if (playerId === 0) {
        setCurrentTrick([...trick]);
        setLeadPlayerId(0);
        return;
      }
      const botHand = [...updated[playerId].hand];
      const cardIndex = aiPlayCard(botHand, trick[0]?.card.suit || null, trump);
      const card = botHand.splice(cardIndex, 1)[0];
      updated[playerId].hand = botHand;
      trick.push({ playerId, card });
      setPlayers([...updated]);
      setCurrentTrick([...trick]);
    }
    await evaluateTrickAndContinue(trick, updated);
  };

    // Resume logic using nextPlayer pattern
  const resumeTrick = async () => {
    const trick=[...currentTrick];
    const updated=[...players];
    const nextPlayer=(leadPlayerId + trick.length)%4;
    if(nextPlayer===0){
      // human's turn
      setPlayers(updated);
      setCurrentTrick(trick);
      setLeadPlayerId(0);
      return;
    }
    // bot lead or mid-trick
    await playBotTurnSequential(trick, updated);
  };

  // Hydrate and resume once
  const hydratedRef = useRef(false);
  useEffect(() => {
    if(hydratedRef.current) return;
    hydratedRef.current=true;
    if(gameStarted && !gameOver) {
      if(currentTrick.length>0 || leadPlayerId!==0) {
        resumeTrick();
      }
    }
  },[gameStarted,gameOver,currentTrick,leadPlayerId]);

  const evaluateTrickAndContinue = async (trick, updated) => {
    if (trick.length !== 4) {
      console.warn("Skipping trick evaluation: trick is not complete", trick);
      debugger;
      return;
    }
    const uniquePlayers = new Set(trick.map(t => t.playerId));
    if (uniquePlayers.size !== 4) {
      console.warn("Skipping trick evaluation: duplicate or missing players", trick);
      debugger;
      return;
    }
    await delay(1000);
    const winnerId = evaluateTrick(trick, trick[0].card.suit, trump);
    updated[winnerId].tricksWon += 1;
    setPlayers([...updated]);
    await delay(2000);
    const isGameOver = updated.every(p => p.hand.length === 0);
    if (isGameOver) {
      setGameOver(true);
      const yourTeam = updated[0].tricksWon + updated[2].tricksWon;
      const opponentTeam = updated[1].tricksWon + updated[3].tricksWon;
      const newCaller = yourTeam === 13 || opponentTeam === 13 ? (trumpCallerIndex + 2) % 4 : updated.reduce((max, p, i) => p.tricksWon > updated[max].tricksWon ? i : max, 0);
      setTrumpCallerIndex(newCaller);
      setWinnerMessage(yourTeam === 13 ? "💥 You made a Kot!" : yourTeam >= 7 ? "✅ You win!" : "❌ You lost. Try again!");
    } else {
      setCurrentTrick([]);
      setLeadSuit(null);
      setLeadPlayerId(winnerId);
      if (winnerId !== 0) setNextLeadPlayer(winnerId);
    }
  };

    const getCardPosition = (playerId) => {
        switch (playerId) {
            case 0: return { bottom: '10%', left: '50%', transform: 'translate(-50%, -30%)' }; // You
            case 1: return { left: '15%', top: '50%', transform: 'translate(50%, -50%)' };    // Bot 1
            case 2: return { top: '15%', left:'50%', transform: 'translate(-50%, 30%)' };    // Bot 2
            case 3: return { top: '50%', right: '15%', transform: 'translate(-50%, -50%)' };   // Bot 3
            default: return {};
        }
    };


   return (
    <div className="game-container">
      {!gameStarted && <h1>KoatPiece Card Game</h1>}
      {!gameStarted ? (
        <button onClick={startGame}>Start Game</button>
      ) : gameOver ? (
        <div>
          <h2>Game Over</h2>
          <p>{winnerMessage}</p>
          <button onClick={startGame}>Play Again</button>
        </div>
      ) : (
        <>
          <div className="status-bar">
            <span className="status trump">{trump}</span>
            <span className="status caller" title="Trump Caller">🎯 {players[trumpCallerIndex]?.name}</span>
            <span className="status lead" title="Lead Player">🕹️ {players[leadPlayerId]?.name}</span>
          </div>

          <div className="table-layout">
            <div className="bot-left">
              <span className="bot-name">{players[1]?.name}</span>
                <BotHand count={players[1]?.hand.length} />
            </div>
            <div className="bot bot-top" style={{ gridArea: 'top' }}>
                <div>{players[2]?.name}</div>
                <BotHand count={players[2]?.hand.length} /></div>
            <div className="bot bot-right" style={{ gridArea: 'right' }}>
                <div>{players[3]?.name}</div>
                <BotHand count={players[3]?.hand.length} />
            </div>

            <div className="trick-area">
              {/* always‐visible panels in the empty cells */}
              <div className="round-score-opponent">
                Opp: {players[1].tricksWon + players[3].tricksWon}
              </div>
              <div className="round-score-myteam">
                You: {players[0].tricksWon + players[2].tricksWon} 
              </div>
              <div className="trump-display" style={{ color: ['♥','♦'].includes(trump) ? 'crimson' : 'black' }}>
                <span>{trump}</span>
              </div>
              <AnimatePresence>
                {currentTrick.map((e, i) => {
                  const pos = getCardPosition(e.playerId);
                  return (
                    <motion.div
                      key={`${e.playerId}-${e.card.value}-${i}`}
                      className={`trick-card player-${e.playerId}`}
                      style={pos}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 15, mass: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 }  }} // ← all four cards will fade out together
                    >
                      <Card value={e.card.value} suit={e.card.suit} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

            </div>

            <div className="player player-bottom">
            {/* <h3>Your Hand:</h3> */}
            <div className="hand-container">
              {players[0]?.hand?.length > 0 && (() => {
                const baseSize = 7;
                const fullHand = [...players[0].hand];

                const topHand = fullHand.slice(0, Math.max(0, fullHand.length - baseSize));
                const baseHand = fullHand.slice(-baseSize);

                return (
                  <>
                    {topHand.length > 0 && (
                      <PlayerHand
                        hand={topHand}
                        onPlayCard={index => handlePlayerCardClick(index)}
                      />
                    )}
                    <PlayerHand
                      hand={baseHand}
                      onPlayCard={index => {
                        const absoluteIndex = topHand.length + index;
                        handlePlayerCardClick(absoluteIndex);
                      }}
                    />
                  </>
                );
              })()}
            </div>
          </div>

          </div>

          <h3>Tricks Won:</h3>
          <ul>
            {players.map(p => (
              <li key={p.id}>{p.name}: {p.tricksWon}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
