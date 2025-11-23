import React from 'react';
import './Controls.css';

function Controls({
  currentTurn,
  maxTurns,
  currentGameIndex,
  totalGames,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onSkipToNextGame,
  onSkipToPrevGame,
  onSpeedChange,
  onTurnChange
}) {
  return (
    <div className="console-controls">
      {/* Top Info Line (Lowercase) */}
      <div className="status-line">
        game: {String(currentGameIndex + 1).padStart(3, '0')}/{totalGames} | 
        turn: {String(currentTurn + 1).padStart(3, '0')}/{maxTurns} | 
        speed: {playbackSpeed}ms
      </div>
      
      {/* Command Line Controls (Lowercase) */}
      <div className="command-line">
        <span className="prompt">root@battleship:~$</span>
        
        <button onClick={onSkipToPrevGame} disabled={currentGameIndex === 0}>
          [ |&lt; prev ]
        </button>
        <button onClick={onStepBackward} disabled={currentTurn === 0}>
          [ &lt; back ]
        </button>
        <button 
          onClick={onPlayPause} 
          className={`play-btn ${isPlaying ? 'active' : ''}`}
        >
          {isPlaying ? '[ || pause ]' : '[ > play ]'}
        </button>
        <button onClick={onStepForward} disabled={currentTurn >= maxTurns - 1}>
          [ next &gt; ]
        </button>
        <button onClick={onSkipToNextGame} disabled={currentGameIndex >= totalGames - 1}>
          [ game &gt;| ]
        </button>
        
        <select 
          value={playbackSpeed} 
          onChange={(e) => onSpeedChange(parseInt(e.target.value))}
          className="speed-select"
        >
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
          <option value={100}>max</option>
        </select>
      </div>

      {/* Scrubber */}
      <div className="scrubber-row">
         <input 
           type="range" 
           min="0" 
           max={maxTurns - 1} 
           value={currentTurn} 
           onChange={(e) => onTurnChange(parseInt(e.target.value))}
           className="console-slider"
         />
      </div>
      
      <div className="divider-line">
        {"-".repeat(120)}
      </div>
    </div>
  );
}

export default Controls;