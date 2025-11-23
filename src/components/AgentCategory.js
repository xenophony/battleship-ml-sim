import React from 'react';
import './AgentCategory.css';
import BoardDisplay from './BoardDisplay';

function AgentCategory({ title, agents, gameData, currentTurn }) {
  // Filter agents that exist in game data
  const activeAgents = agents.filter(agentName => gameData[agentName]);

  if (activeAgents.length === 0) {
    return null;
  }

  return (
    <div className="agent-category">
      <div className="category-header">
        <h2>{title}</h2>
        <div className="separator"></div>
      </div>
      
      <div className="boards-row">
        {activeAgents.map(agentName => {
          const agentData = gameData[agentName];
          const boardHistory = agentData.board_history || [];
          const currentBoard = boardHistory[Math.min(currentTurn, boardHistory.length - 1)] || [];
          const turns = agentData.turns || 0;
          
          // Calculate current hits by counting 'h' cells in the current board
          const currentHits = currentBoard.reduce((total, row) => 
            total + row.filter(cell => cell === 'h').length, 0
          );
          
          const isFinished = currentTurn >= boardHistory.length - 1 && boardHistory.length > 0;

          return (
            <BoardDisplay
              key={agentName}
              agentName={agentName}
              board={currentBoard}
              turns={Math.min(currentTurn + 1, turns)}
              hits={currentHits}
              isFinished={isFinished}
            />
          );
        })}
      </div>
    </div>
  );
}

export default AgentCategory;
