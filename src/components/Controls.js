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
    <div className="controls-container">
      <div className="game-info">
        <span className="label">GAME:</span>
        <span className="value">{currentGameIndex + 1} / {totalGames}</span>
        <span className="label">TURN:</span>
        <span className="value">{currentTurn + 1} / {maxTurns}</span>
        <span className="label">SPEED:</span>
        <select value={playbackSpeed} onChange={(e) => onSpeedChange(parseInt(e.target.value))}>
          <option value={2000}>0.5x</option>
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
          <option value={250}>4x</option>
          <option value={100}>10x</option>
        </select>
      </div>

      <div className="playback-controls">
        <button onClick={onSkipToPrevGame} disabled={currentGameIndex === 0} title="Previous game">
          {'<< PREV_GAME'}
        </button>
        <button onClick={onStepBackward} disabled={currentTurn === 0 && currentGameIndex === 0} title="Step backward">
          {'< STEP_BACK'}
        </button>
        <button onClick={onPlayPause} className="play-pause" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '|| PAUSE' : '> PLAY'}
        </button>
        <button onClick={onStepForward} disabled={currentTurn >= maxTurns - 1 && currentGameIndex >= totalGames - 1} title="Step forward">
          {'STEP_NEXT >'}
        </button>
        <button onClick={onSkipToNextGame} disabled={currentGameIndex >= totalGames - 1} title="Next game">
          {'NEXT_GAME >>'}
        </button>
      </div>

      <div className="turn-slider-container">
        <input
          type="range"
          min="0"
          max={maxTurns - 1}
          value={currentTurn}
          onChange={(e) => onTurnChange(parseInt(e.target.value))}
          className="turn-slider"
        />
      </div>
    </div>
  );
}

export default Controls;
