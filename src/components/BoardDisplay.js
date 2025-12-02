import React from 'react';
import './BoardDisplay.css';

function BoardDisplay({ agentName, board, turns, hits, isFinished, onClick, isZoomed, formatAgentName }) {
  const displayName = formatAgentName ? formatAgentName(agentName) : agentName;
  
  const renderCell = (cell) => {
    switch (cell) {
      case '.': return '·';
      case '_': return '·';
      case 'm': return 'm'; 
      case 'h': return 'h';
      case 's': return 's';
      default: return '?';
    }
  };

  const getCellClass = (cell) => {
    switch (cell) {
      case 'm': return 'char-miss';
      case 'h': return 'char-hit';
      case 's': return 'char-sunk';
      default: return 'char-empty';
    }
  };

  const efficiency = turns > 0 ? (hits / turns).toFixed(3) : '0.000';

  // If zoomed, apply a class that scales the font
  const containerClass = `text-board ${isFinished ? 'finished' : ''} ${isZoomed ? 'zoomed-view' : 'clickable'}`;

  return (
    <div className={containerClass} onClick={onClick}>
      
      {/* HEADER */}
      <div className="board-header">
        <div className="agent-name">&lt; {displayName} &gt;</div>
        
        <div className="meta-row">
           <span className="label">Status:</span> 
           <span className={isFinished ? "val-done" : "val-active"}>
             {isFinished ? 'DONE' : 'ACTIVE'}
           </span>
           <span className="sep"> | </span>
           <span className="label">Move #:</span> 
           <span className="val-num">{String(turns).padEnd(3)}</span>
        </div>

        <div className="meta-row">
           <span className="label">Hits:</span> 
           <span className="val-hit">{String(hits).padEnd(2)}</span>
           <span className="sep">   | </span>
           <span className="label">Eff:</span> 
           <span className="val-eff">{efficiency}</span>
        </div>
      </div>

      {/* GRID */}
      <div className="text-grid">
        <div className="grid-line header-line">
          <span className="gutter"> </span>
          <span className="row-content">A B C D E F G H I J</span>
        </div>

        {board.length > 0 ? (
          board.map((row, rIdx) => (
            <div key={rIdx} className="grid-line">
              <span className="gutter">{rIdx}</span>
              <span className="row-content">
                {row.map((cell, cIdx) => (
                  <span key={cIdx} className={getCellClass(cell)}>
                    {renderCell(cell) + (cIdx < 9 ? ' ' : '')}
                  </span>
                ))}
              </span>
            </div>
          ))
        ) : (
          <div className="no-data">NO DATA</div>
        )}
      </div>
    </div>
  );
}

export default BoardDisplay;