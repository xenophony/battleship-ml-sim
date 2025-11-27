import React from 'react';
import './FloatingBoardPanel.css';
import BoardDisplay from './BoardDisplay';

function FloatingBoardPanel({ agentName, gameData, currentTurn }) {
    if (!agentName || !gameData || !gameData[agentName]) {
        return null;
    }
    
    const agentData = gameData[agentName];
    const boardHistory = agentData.board_history || [];
    const currentBoard = boardHistory[Math.min(currentTurn, boardHistory.length - 1)] || [];
    const turns = agentData.turns || 0;
    
    // Count hits for current state
    const currentHits = currentBoard.reduce((total, row) => 
        total + row.filter(cell => cell === 'h' || cell === 's').length, 0
    );
    
    const isFinished = currentTurn >= boardHistory.length - 1 && boardHistory.length > 0;
    
    // Get current move info if available
    const moveMetadata = agentData.move_metadata?.[currentTurn];
    const currentMove = moveMetadata?.move || null;
    const moveResult = moveMetadata?.result || null;

    return (
        <div className="floating-board-panel">
            <div className="floating-panel-header">
                <span className="panel-title">{'//'} BOARD STATE</span>
                <span className="turn-indicator">T{currentTurn + 1}</span>
            </div>
            
            <div className="floating-board-content">
                <BoardDisplay
                    agentName={agentName}
                    board={currentBoard}
                    turns={Math.min(currentTurn + 1, turns)}
                    hits={currentHits}
                    isFinished={isFinished}
                    isZoomed={false}
                />
            </div>
            
            {currentMove && (
                <div className="floating-move-info">
                    <span className="move-arrow">→</span>
                    <span className="move-target">{currentMove}</span>
                    {moveResult && (
                        <span className={`move-result-badge ${moveResult.toLowerCase()}`}>
                            {moveResult}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default FloatingBoardPanel;
