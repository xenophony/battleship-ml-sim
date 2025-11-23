import React from 'react';
import './AgentCategory.css';
import BoardDisplay from './BoardDisplay';

function AgentCategory({ title, agents, gameData, currentTurn, onBoardClick }) {
  const activeAgents = agents.filter(agentName => gameData[agentName]);
  if (activeAgents.length === 0) return null;

  return (
    <div className="category-block">
      <div className="category-header">
        <span className="comment">// {title}</span>
      </div>
      
      <div className="boards-container">
        {activeAgents.map((agentName, idx) => {
          const agentData = gameData[agentName];
          const boardHistory = agentData.board_history || [];
          const currentBoard = boardHistory[Math.min(currentTurn, boardHistory.length - 1)] || [];
          const turns = agentData.turns || 0;
          
          const currentHits = currentBoard.reduce((total, row) => 
            total + row.filter(cell => cell === 'h' || cell === 's').length, 0
          );
          
          const isFinished = currentTurn >= boardHistory.length - 1 && boardHistory.length > 0;

          return (
            <React.Fragment key={agentName}>
              <BoardDisplay
                agentName={agentName}
                board={currentBoard}
                turns={Math.min(currentTurn + 1, turns)}
                hits={currentHits}
                isFinished={isFinished}
                onClick={() => onBoardClick(agentName)} // Click Event
              />
              
              {idx < activeAgents.length - 1 && (
                <div className="board-divider">
                  {Array(18).fill('|').map((char, i) => <div key={i}>{char}</div>)}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default AgentCategory;