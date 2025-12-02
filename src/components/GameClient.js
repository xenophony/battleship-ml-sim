import React, { useState, useEffect, useRef } from 'react';
import './GameClient.css';
import ShipPlacement from './ShipPlacement';

const API_URL = process.env.REACT_APP_GAME_SERVER_URL || "http://localhost:8000";

// Heuristic: detect whether an opponent is an LLM agent by name
const isLlmAgent = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('llm') || n.includes('llama') || n.includes('gpt') || n.includes('claude') || n.includes('openai') || n.includes('chatgpt');
};

// Helper to format agent display names for UI
const formatAgentName = (name) => {
  const nameMap = {
    'llm-local': 'Llama-3.1-8B-Fine-Tuned - w/ hints',
    'llm-openrouter': 'Llama-4-Scout - w/ hints'
  };
  return nameMap[name] || name;
};

// --- HELPER: Generate the "Abstract" Progress Board for Race Mode ---
const generateProgressBoard = (aiHits, aiMisses) => {
  // Create a 10x10 grid
  const board = Array(10).fill(null).map(() => Array(10).fill('.'));
  
  // 1. Place "Fake" Ships at bottom rows (Rows 5-9) to represent health
  // Total ship cells = 17. Let's visualize them as a block at the bottom.
  // This is a simple visual metaphor.
  const shipCells = [];
  for (let r = 9; r >= 6; r--) {
      for (let c = 0; c < 10; c++) {
          if (shipCells.length < 17) shipCells.push([r, c]);
      }
  }
  
  // Mark ships as "Hit" (X) based on aiHits count, else "Safe" (_)
  shipCells.forEach((coords, index) => {
      const [r, c] = coords;
      if (index < aiHits) board[r][c] = 'X'; // Hit!
      else board[r][c] = '_'; // Still standing
  });

  // 2. Fill "Misses" from top-left (Row 0) to represent time wasted
  // This gives a visual of the AI "filling up the board" with attempts.
  let missesToDraw = aiMisses;
  for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
          if (missesToDraw > 0) {
              board[r][c] = 'O';
              missesToDraw--;
          }
      }
  }
  
  return board;
};

function InteractiveGrid({ board, onCellClick, disabled, title, isReadOnly, pendingCell, enemyReasoning }) {
  return (
    <div className="game-grid-container">
      {/* enemyReasoning bubble overlay (rendered above the grid) */}
      {enemyReasoning && (
        <div className="enemy-reasoning-overlay">
          <div className="enemy-reasoning-bubble">
            <div className="bubble-prefix">ENEMY:</div>
            <div className="bubble-text">{enemyReasoning}</div>
          </div>
        </div>
      )}
      <div className="grid-title">{title}</div>
      <div className="game-grid">
        <div className="grid-row header">
          <span className="cell-label"> </span>
          {['A','B','C','D','E','F','G','H','I','J'].map(c => <span key={c} className="cell-label">{c}</span>)}
        </div>
        {board.map((row, r) => (
          <div key={r} className="grid-row">
            <span className="cell-label">{r}</span>
            {row.map((cell, c) => {
              let cellClass = "cell-unknown";
              let content = "·";
              let shipClass = "";
              const isPending = pendingCell && pendingCell.r === r && pendingCell.c === c;
              if (cell === 'X') { cellClass = "cell-hit"; content = "X"; }
              else if (cell === 'O') { cellClass = "cell-miss"; content = "O"; }
              else if (cell === '_') { cellClass = "cell-ship"; content = "■"; } // For Abstract View
              else if (typeof cell === 'string' && cell !== '.') { cellClass = "cell-ship"; content = "■"; shipClass = `ship-${cell}`; }
              
              return (
                <button
                  key={c}
                  className={`grid-cell ${cellClass} ${shipClass} ${isPending ? 'cell-pending' : ''} ${isReadOnly ? 'readonly' : ''}`}
                  onClick={() => !disabled && !isReadOnly && onCellClick(r, c)}
                  disabled={disabled || isReadOnly || (cell !== '.' && cell !== '_')}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function GameClient() {
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("smart-prob");
  const [gameMode, setGameMode] = useState("classic");
  const [isPlacingShips, setIsPlacingShips] = useState(false);
  
  // Track AI progress locally for the visualizer
  const [aiStats, setAiStats] = useState({ hits: 0, misses: 0 });
  
  // Track player's board with their ships and AI shots (Classic mode)
  const [playerBoard, setPlayerBoard] = useState(null);
//   const [playerShipCells, setPlayerShipCells] = useState(new Set());
  
  // Track player's ships status (for battle log)
  const [playerShips, setPlayerShips] = useState([]);
  const [pendingShot, setPendingShot] = useState(null);
  const [agentLastReasoning, setAgentLastReasoning] = useState(null);
  const agentReasoningTimer = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("game_id");
    if (urlId) fetchGameState(urlId, true); // isInitialLoad=true for resume
  }, []);

  const fetchGameState = async (id, isInitialLoad = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/game_state/${id}`);
      if (!res.ok) throw new Error("Game not found");
      const data = await res.json();
      
      // DEBUG: Log game state to see ai_ships_remaining
      console.log('Game state from server:', data);
      console.log('ai_ships_remaining:', data.ai_ships_remaining);
      
      setGameId(id);
      setGameState(data);
      // Capture any last reasoning provided by the server (head-to-head mode)
      if (data.agent_last_reasoning) {
        setAgentLastReasoning(data.agent_last_reasoning);
        if (agentReasoningTimer.current) clearTimeout(agentReasoningTimer.current);
        agentReasoningTimer.current = setTimeout(() => setAgentLastReasoning(null), 4000);
      } else {
        setAgentLastReasoning(null);
      }
      
      // Only sync AI stats on initial load/resume, not after every turn
      // (handleShot updates aiStats locally to preserve miss count)
      if (isInitialLoad && data.race_stats) {
          // For resume: we can infer misses from turn count if server provides it
          // Otherwise just use hits and estimate misses as 0 (or parse logs)
          const aiTurns = data.race_stats.ai_turns || 0;
          const aiHits = data.race_stats.ai_hits || 0;
          setAiStats({ hits: aiHits, misses: Math.max(0, aiTurns - aiHits) }); 
      }
    } catch (err) {
      console.error(err);
      window.history.pushState({}, "", window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const initiateGameStart = () => {
    if (gameMode === 'classic') setIsPlacingShips(true);
    else handleStartGame([]); 
  };

  const handleStartGame = async (placedShips = []) => {
    setLoading(true);
    try {
      // DEBUG: Log what we're sending to the server
      console.log('Starting game with:', { difficulty, mode: gameMode, player_ships: placedShips });
      
      const res = await fetch(`${API_URL}/start_game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          difficulty, 
          mode: gameMode,
          player_ships: placedShips 
        })
      });
      const data = await res.json();
      
      // DEBUG: Log server response
      console.log('Server response:', data);
      
      setGameId(data.game_id);
      setIsPlacingShips(false);
      setAiStats({ hits: 0, misses: 0 }); // Reset stats
      
      // Initialize player board for Classic mode
      if (gameMode === 'classic' && placedShips.length > 0) {
        const board = Array(10).fill(null).map(() => Array(10).fill('.'));
        const shipCells = new Set();
        const shipsWithStatus = [];
        
        // Mark ship positions on the board and initialize ship tracking
        // Ships come as { name, size, coords: [[row, col], ...] }
        placedShips.forEach(ship => {
          const cellKeys = [];
          // derive a simple id from the ship name, e.g., 'Carrier' -> 'carrier'
          const id = ship.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          ship.coords.forEach(([row, col]) => {
            board[row][col] = id; // store ship id string for per-ship coloring
            const cellKey = `${String.fromCharCode(65 + col)}${row}`; // e.g., "A0", "B3"
            shipCells.add(cellKey);
            cellKeys.push(cellKey);
          });
          shipsWithStatus.push({
            name: ship.name,
            id,
            size: ship.size,
            cells: cellKeys,
            hits: 0,
            sunk: false
          });
        });
        
        setPlayerBoard(board);
        // setPlayerShipCells(shipCells);
        setPlayerShips(shipsWithStatus);
      } else {
        setPlayerBoard(null);
        // setPlayerShipCells(new Set());
        setPlayerShips([]);
      }
      
      const newUrl = `${window.location.pathname}?game_id=${data.game_id}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
      
      fetchGameState(data.game_id, true); // isInitialLoad=true for new game
    } catch (err) {
      alert("Failed to start: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShot = async (r, c) => {
    if (!gameId || loading || gameState.game_over) return;
    setPendingShot({ r, c });
    setLoading(true);
    try {
      const colChar = "ABCDEFGHIJ"[c];
      const shotStr = `${colChar}${r}`;
      
      const res = await fetch(`${API_URL}/play_turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_shot: shotStr,
          player_ships_remaining: [5,4,3,3,2], 
          ai_last_shot_result: null 
        })
      });
      const result = await res.json();

      // If the server returns the agent's last reasoning (for head-to-head), show it briefly
      if (result.agent_last_reasoning) {
        setAgentLastReasoning(result.agent_last_reasoning);
        if (agentReasoningTimer.current) clearTimeout(agentReasoningTimer.current);
        agentReasoningTimer.current = setTimeout(() => setAgentLastReasoning(null), 4000);
      }
      
      // Update Local AI Stats for visualizer (Race mode only)
      if (gameState.mode === 'race') {
          setAiStats(prev => ({
              hits: prev.hits + (result.ai_shot_result === 'HIT' || result.ai_shot_result === 'SUNK' ? 1 : 0),
              misses: prev.misses + (result.ai_shot_result === 'MISS' ? 1 : 0)
          }));
      }
      
      // Update player board with AI's shot (Classic mode)
      if (gameState.mode === 'classic' && result.ai_move && playerBoard) {
        const aiMove = result.ai_move;
        const col = aiMove.charCodeAt(0) - 65; // A=0, B=1, etc.
        const row = parseInt(aiMove.slice(1), 10);
        setPlayerBoard(prev => {
          const newBoard = prev.map(r => [...r]);
          if (result.ai_shot_result === 'HIT' || result.ai_shot_result === 'SUNK') {
            newBoard[row][col] = 'X'; // Hit
          } else {
            newBoard[row][col] = 'O'; // Miss
          }
          return newBoard;
        });
        
        // Update player ship status if hit
        if (result.ai_shot_result === 'HIT' || result.ai_shot_result === 'SUNK') {
          setPlayerShips(prev => prev.map(ship => {
            if (ship.cells.includes(aiMove)) {
              const newHits = ship.hits + 1;
              return {
                ...ship,
                hits: newHits,
                sunk: newHits >= ship.size
              };
            }
            return ship;
          }));
        }
      }
      
      fetchGameState(gameId); // isInitialLoad=false (default), won't reset aiStats
      
      if (result.game_over && result.winner === "Player") {
         submitScore(gameId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setPendingShot(null);
    }
  };

  const submitScore = async (gid) => {
    const name = prompt("VICTORY! Enter name for Leaderboard:");
    if (!name) return;
    await fetch(`${API_URL}/submit_score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gid, player_name: name })
    });
    alert("Score submitted!");
  };

  const handleResetGame = () => {
    if (window.confirm('Are you sure you want to abandon this game?')) {
      setGameId(null);
      setGameState(null);
      setPlayerBoard(null);
      setPlayerShipCells(new Set());
      setPlayerShips([]);
      setAiStats({ hits: 0, misses: 0 });
      // clear any displayed reasoning bubble
      setAgentLastReasoning(null);
      if (agentReasoningTimer.current) { clearTimeout(agentReasoningTimer.current); agentReasoningTimer.current = null; }
      window.history.pushState({}, "", window.location.pathname);
    }
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (agentReasoningTimer.current) { clearTimeout(agentReasoningTimer.current); agentReasoningTimer.current = null; }
    };
  }, []);

  if (isPlacingShips) return <ShipPlacement onShipsPlaced={handleStartGame} />;

  if (!gameId) {
    return (
      <div className="new-game-menu">
        <h2>Start New Game</h2>
        <div className="control-group">
          <label>Mode:</label>
          <select value={gameMode} onChange={e => setGameMode(e.target.value)}>
            <option value="classic">Classic (Head-to-Head)</option>
            <option value="race">Race (Speed Solve)</option>
          </select>
        </div>
        <div className="control-group">
          <label>Opponent:</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <optgroup label="Traditional AI">
              <option value="smart-prob">Smart Probability Algorithm</option>
              <option value="rule-based">Rule-Based Agent</option>
              <option value="heuristic">Heuristic Agent</option>
            </optgroup>
            <optgroup label="Machine Learning">
              <option value="ml-lgbm">LightGBM</option>
              <option value="ml-logistic">Logistic Regression</option>
              <option value="dl-mlp">MLP Neural Network</option>
              <option value="ml-hgb">Histogram Gradient Boosting</option>
            </optgroup>
            <optgroup label="Reinforcement Learning">
              <option value="rl-qlearning">Q-Learning Agent</option>
              <option value="rl-sarsa">SARSA Agent</option>
            </optgroup>
            <optgroup label="LLM Agents">
              <option value="llm-local">Llama-3.1-8B-Fine-Tuned - w/ hints</option>
              <option value="llm-openrouter">Llama-4-Scout - w/ hints</option>
            </optgroup>
          </select>
        </div>
        <button className="start-btn" onClick={initiateGameStart} disabled={loading}>
          {loading ? "Initializing..." : "NEXT >>"}
        </button>
      </div>
    );
  }

  if (!gameState) return <div>Loading Game State...</div>;

  // DETERMINE SECOND BOARD TO SHOW
  let secondBoard = null;
  let secondTitle = "";

  if (gameState.mode === 'race') {
      // RACE MODE: Show the "Abstract" Progress Board
      secondBoard = generateProgressBoard(aiStats.hits, aiStats.misses);
      secondTitle = "AI PROGRESS (ABSTRACT)";
  } else if (gameState.mode === 'classic' && playerBoard) {
      // CLASSIC MODE: Show player's board with AI shots
      secondBoard = playerBoard;
      secondTitle = "YOUR FLEET (AI ATTACKS)";
  }

  return (
    <div className="game-interface">
      <div className="game-hud">
        <div className="hud-item"><span className="label">VS:</span> <span className="val">{formatAgentName(gameState.agent_name)}</span></div>
        <div className="hud-item"><span className="label">MODE:</span> <span className="val">{gameState.mode.toUpperCase()}</span></div>
        
        {gameState.race_stats ? (
           <>
             <div className="hud-item"><span className="label">YOU:</span> <span className="val-score">{gameState.race_stats.player_hits}</span></div>
             <div className="hud-item"><span className="label">AI:</span> <span className="val-score ai">{gameState.race_stats.ai_hits}</span></div>
           </>
        ) : (
           <div className="hud-item"><span className="label">AI SHIPS:</span> <span className="val">{gameState.ai_ships_remaining?.length || 0}</span></div>
        )}
        
        {gameState.game_over && (
           <div className="game-over-banner">
             GAME OVER - WINNER: {gameState.race_stats ? (gameState.race_stats.player_hits >= 17 ? "PLAYER" : "AI") : "Unknown"}
             <button onClick={() => setGameId(null)}>Main Menu</button>
           </div>
        )}
        
        {/* Reset/Abandon game button - always visible during active game */}
        {!gameState.game_over && (
          <button className="reset-btn" onClick={handleResetGame}>
            ✕ Abandon
          </button>
        )}

        {/* HUD loader: show when server is loading agent or waiting on agent turn */}
        {loading && (
          <div className="hud-loader">
            <span className="spinner" />
            <span className="hud-loader-text">{gameState ? 'Waiting on agent...' : 'Loading agent...'}</span>
          </div>
        )}
      </div>

      <div className="game-boards-layout">
        {/* 1. BOARD YOU SHOOT AT */}
        <InteractiveGrid 
          title={gameState.mode === 'race' ? "YOUR TARGET" : "ENEMY WATERS"}
          board={gameState.masked_board}
          onCellClick={handleShot}
          disabled={loading || gameState.game_over}
          pendingCell={pendingShot}
        />

        {/* 2. AI PROGRESS BOARD (RACE MODE ONLY) */}
        {secondBoard && (
            <InteractiveGrid 
              title={secondTitle}
              board={secondBoard}
              isReadOnly={true}
              enemyReasoning={
                gameState.mode === 'classic' && isLlmAgent(gameState.agent_name) && agentLastReasoning
                  ? agentLastReasoning
                  : null
              }
            />
        )}
        
        {/* BATTLE LOG - Ship Status */}
        <div className="game-logs">
          <div className="log-header">FLEET STATUS</div>
          <div className="log-content">
            {/* AI Fleet Status */}
            <div className="fleet-section">
              <div className="fleet-title">🎯 ENEMY FLEET</div>
              {gameState.ai_ships_remaining ? (
                <div className="ship-list">
                  {(() => {
                    // Count remaining ships by size to handle duplicates (two size-3 ships)
                    const remaining = [...(gameState.ai_ships_remaining || [])];
                    const ships = [
                      { name: 'Carrier', size: 5 },
                      { name: 'Battleship', size: 4 },
                      { name: 'Cruiser', size: 3 },
                      { name: 'Submarine', size: 3 },
                      { name: 'Destroyer', size: 2 }
                    ];
                    return ships.map((ship, i) => {
                      // Check if this ship size is in remaining, and remove one instance if found
                      const idx = remaining.indexOf(ship.size);
                      const isAfloat = idx !== -1;
                      if (isAfloat) remaining.splice(idx, 1); // Remove one instance
                      return (
                        <div key={i} className={`ship-status ${isAfloat ? 'afloat' : 'sunk'}`}>
                          {isAfloat ? '🚢' : '💥'} {ship.name} ({ship.size}) {isAfloat ? '' : '- SUNK'}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="ship-status">No data</div>
              )}
            </div>
            
            {/* Player Fleet Status (Classic mode) */}
            {gameState.mode === 'classic' && playerShips.length > 0 && (
              <div className="fleet-section">
                <div className="fleet-title">⚓ YOUR FLEET</div>
                <div className="ship-list">
                  {playerShips.map((ship, i) => (
                    <div key={i} className={`ship-status ${ship.sunk ? 'sunk' : 'afloat'}`}>
                      {ship.sunk ? '💥' : '🚢'} {ship.name} ({ship.size}) {ship.sunk ? '- SUNK' : `[${ship.hits}/${ship.size}]`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Actions Log */}
            <div className="fleet-section">
              <div className="fleet-title">📜 RECENT ACTIONS</div>
              <div className="action-log">
                {gameState.logs && gameState.logs.slice(-5).reverse().map((l, i) => (
                  <div key={i} className="log-entry">{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameClient;