import React from 'react';
import './StatsPanel.css';
import BoardDisplay from './BoardDisplay';

function StatsPanel({ 
  allGamesData, 
  currentGameIndex, 
  selectedAgent, 
  gameData, 
  currentTurn,
  onCloseFocus 
}) {
  
  // --- LOGIC: CALCULATE RUNNING SUMMARY ---
  const calculateStats = () => {
    // Only consider games played so far (inclusive of current)
    const gamesSoFar = allGamesData.slice(0, currentGameIndex + 1);
    const agentStats = {};

    gamesSoFar.forEach(game => {
      const { data } = game;
      Object.keys(data).forEach(agentName => {
        if (!agentStats[agentName]) {
          agentStats[agentName] = { turns: 0, hits: 0, games: 0, effSum: 0 };
        }
        
        const agentGameData = data[agentName];
        const turns = agentGameData.turns;
        const hits = agentGameData.hits;
        // Calculate efficiency for this specific game
        const eff = turns > 0 ? hits / turns : 0;

        agentStats[agentName].turns += turns;
        agentStats[agentName].hits += hits;
        agentStats[agentName].effSum += eff;
        agentStats[agentName].games += 1;
      });
    });

    // Average them out
    return Object.keys(agentStats).map(name => {
      const s = agentStats[name];
      return {
        name,
        avgTurns: (s.turns / s.games).toFixed(1),
        avgHits: (s.hits / s.games).toFixed(1),
        avgEff: (s.effSum / s.games).toFixed(3),
        games: s.games
      };
    }).sort((a, b) => b.avgEff - a.avgEff); // Rank by Efficiency
  };

  const summary = calculateStats();

  // --- RENDER: ZOOMED BOARD MODE ---
  if (selectedAgent && gameData && gameData[selectedAgent]) {
    const agentData = gameData[selectedAgent];
    const boardHistory = agentData.board_history || [];
    const currentBoard = boardHistory[Math.min(currentTurn, boardHistory.length - 1)] || [];
    const turns = agentData.turns || 0;
    
    // Count hits for current state
    const currentHits = currentBoard.reduce((total, row) => 
      total + row.filter(cell => cell === 'h' || cell === 's').length, 0
    );
    
    const isFinished = currentTurn >= boardHistory.length - 1 && boardHistory.length > 0;

    return (
      <div className="stats-panel focus-mode">
        <div className="panel-header">
          <span className="panel-title">>> TARGET_FOCUS</span>
          <button onClick={onCloseFocus} className="close-btn">[X]</button>
        </div>
        <div className="focus-content">
          <BoardDisplay
            agentName={selectedAgent}
            board={currentBoard}
            turns={Math.min(currentTurn + 1, turns)}
            hits={currentHits}
            isFinished={isFinished}
            isZoomed={true} // New prop for larger styling
          />
        </div>
        <div className="focus-hint">
          [CLICK X TO RETURN TO SUMMARY]
        </div>
      </div>
    );
  }

  // --- RENDER: RUNNING SUMMARY MODE ---
  return (
    <div className="stats-panel">
      <div className="panel-header">
        <span className="panel-title">>> RUNNING_SUMMARY</span>
        <span className="panel-subtitle">GAMES: {currentGameIndex + 1}</span>
      </div>
      
      <div className="stats-table">
        <div className="t-row t-head">
          <span className="col-name">AGENT</span>
          <span className="col-stat">TRN</span>
          <span className="col-stat">HIT</span>
          <span className="col-stat">EFF</span>
        </div>
        <div className="divider-line">{"-".repeat(40)}</div>
        
        {summary.map(agent => (
          <div key={agent.name} className="t-row">
            <span className="col-name">{agent.name}</span>
            <span className="col-stat">{agent.avgTurns}</span>
            <span className="col-stat">{agent.avgHits}</span>
            <span className="col-stat highlight">{agent.avgEff}</span>
          </div>
        ))}
      </div>
      <div className="focus-hint">
        [CLICK ANY BOARD TO INSPECT]
      </div>
    </div>
  );
}

export default StatsPanel;