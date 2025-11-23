import React, { useState, useEffect } from 'react';
import './App.css';
import GameViewer from './components/GameViewer';
import SummaryView from './components/SummaryView';
import Controls from './components/Controls';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allGamesData, setAllGamesData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);

  // Load all games on mount
  useEffect(() => {
    loadAllGames();
  }, []);

  const loadAllGames = async () => {
    try {
      // Load all available game files
      const timestamp = '20251122_195519'; // Get this from directory or checkpoint
      const gameFiles = [];
      
      for (let i = 1; i <= 10; i++) {
        const gameNum = String(i).padStart(3, '0');
        try {
          const response = await fetch(`/assets/game_${gameNum}_boards_${timestamp}.json`);
          if (response.ok) {
            const data = await response.json();
            gameFiles.push({ gameNum: i, data });
          } else {
            break; // No more games
          }
        } catch (e) {
          break; // No more games
        }
      }
      
      setAllGamesData(gameFiles);
      
      // Load summary
      try {
        const summaryResponse = await fetch(`/assets/game_summary_${timestamp}.txt`);
        if (summaryResponse.ok) {
          const summary = await summaryResponse.text();
          setSummaryData(summary);
        }
      } catch (e) {
        console.error('No summary file found');
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  // Auto-play functionality for all games
  useEffect(() => {
    let interval;
    if (isPlaying && allGamesData.length > 0) {
      const currentGame = allGamesData[currentGameIndex];
      if (!currentGame) return;
      
      const maxTurns = getMaxTurnsForGame(currentGame.data);
      
      interval = setInterval(() => {
        setCurrentTurn(prev => {
          if (prev < maxTurns - 1) {
            return prev + 1;
          } else if (currentGameIndex < allGamesData.length - 1) {
            // Move to next game
            setCurrentGameIndex(idx => idx + 1);
            return 0;
          } else {
            // End of all games
            setIsPlaying(false);
            return prev;
          }
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTurn, currentGameIndex, allGamesData, playbackSpeed]);

  const getMaxTurnsForGame = (gameData) => {
    if (!gameData) return 0;
    return Math.max(
      ...Object.values(gameData).map(agent => agent.board_history?.length || 0)
    );
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipToNextGame = () => {
    if (currentGameIndex < allGamesData.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setCurrentTurn(0);
      setIsPlaying(false);
    }
  };

  const handleSkipToPrevGame = () => {
    if (currentGameIndex > 0) {
      setCurrentGameIndex(prev => prev - 1);
      setCurrentTurn(0);
      setIsPlaying(false);
    }
  };

  const handleStepForward = () => {
    const currentGame = allGamesData[currentGameIndex];
    if (!currentGame) return;
    
    const maxTurns = getMaxTurnsForGame(currentGame.data);
    if (currentTurn < maxTurns - 1) {
      setCurrentTurn(prev => prev + 1);
    } else if (currentGameIndex < allGamesData.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setCurrentTurn(0);
    }
  };

  const handleStepBackward = () => {
    if (currentTurn > 0) {
      setCurrentTurn(prev => prev - 1);
    } else if (currentGameIndex > 0) {
      setCurrentGameIndex(prev => prev - 1);
      const prevGame = allGamesData[currentGameIndex - 1];
      setCurrentTurn(getMaxTurnsForGame(prevGame.data) - 1);
    }
  };

  const currentGame = allGamesData[currentGameIndex];
  const maxTurns = currentGame ? getMaxTurnsForGame(currentGame.data) : 0;

  return (
    <div className="App">
      <header className="App-header">
        <h1>BATTLESHIP_AI_VIEWER</h1>
        <nav className="tab-nav">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            [ GAME_OVERVIEW ]
          </button>
          <button
            className={activeTab === 'summary' ? 'active' : ''}
            onClick={() => setActiveTab('summary')}
          >
            [ SUMMARY_RESULTS ]
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'overview' && (
          <>
            <Controls
              currentTurn={currentTurn}
              maxTurns={maxTurns}
              currentGameIndex={currentGameIndex}
              totalGames={allGamesData.length}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={handlePlayPause}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onSkipToNextGame={handleSkipToNextGame}
              onSkipToPrevGame={handleSkipToPrevGame}
              onSpeedChange={setPlaybackSpeed}
              onTurnChange={setCurrentTurn}
            />
            <GameViewer
              gameData={currentGame?.data}
              currentTurn={currentTurn}
              gameNumber={currentGame?.gameNum}
            />
          </>
        )}
        {activeTab === 'summary' && (
          <SummaryView summaryData={summaryData} />
        )}
      </main>

      <footer className="App-footer">
        BATTLESHIP_AI_COMPARISON_FRAMEWORK_v1.0
      </footer>
    </div>
  );
}

export default App;
