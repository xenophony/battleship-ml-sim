import React from 'react';
import './BoardDisplay.css';

function BoardDisplay({ agentName, board, turns, hits, isFinished }) {
  const renderCell = (cell) => {
    switch (cell) {
      case '.':
        return '·';
      case 'm':
        return '○';
      case 'h':
        return '✖';
      case 's':
        return '■';
      case '_':
        return '·';
      default:
        return cell;
    }
  };

  const getCellClass = (cell) => {
    switch (cell) {
      case 'm':
        return 'miss';
      case 'h':
        return 'hit';
      case 's':
        return 'sunk';
      default:
        return 'empty';
    }
  };

  const efficiency = turns > 0 ? (hits / turns).toFixed(2) : '0.00';

  return (
    <div className={`board-display ${isFinished ? 'finished' : ''}`}>
      <div className="board-header">
        <div className="agent-name">{agentName}</div>
        <div className="agent-status">
          {isFinished ? '✓ DONE' : `Turn ${turns}`}
        </div>
      </div>
      
      <div className="board-stats">
        <span>Hits: <strong>{hits}</strong></span>
        <span>Efficiency: <strong>{efficiency}</strong></span>
      </div>

      <div className="board-grid-container">
        <div className="column-labels">
          <div className="corner"></div>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(label => (
            <div key={label} className="col-label">{label}</div>
          ))}
        </div>
        
        <div className="board-grid">
          {board.length > 0 ? (
            board.map((row, rowIdx) => (
              <div key={rowIdx} className="board-row">
                <div className="row-label">{rowIdx}</div>
                {row.map((cell, colIdx) => (
                  <div
                    key={colIdx}
                    className={`board-cell ${getCellClass(cell)}`}
                  >
                    {renderCell(cell)}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="no-board">No board data</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoardDisplay;
