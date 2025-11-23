import React, { useState, useEffect } from 'react';
import './App.css';
import GameViewer from './components/GameViewer';
import SummaryView from './components/SummaryView';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';

// !!! UPDATE THIS TO MATCH YOUR GENERATED FILENAMES !!!
const TIMESTAMP = '20251122_195519'; 

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [allGamesData, setAllGamesData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Load all games on mount
  useEffect(() => {
    loadAllGames();
  }, []);

  const loadAllGames = async () => {
    try {
      const gameFiles = [];
      for (let i = 1; i <= 20; i++) {
        const gameNum = String(i).padStart(3, '0');
        try {
          const response = await fetch(`${process.env.PUBLIC_URL}/assets/game_${gameNum}_boards_${TIMESTAMP}.json`);
          if (response.ok) {
            const data = await response.json();
            gameFiles.push({ gameNum: i, data });
          } else {
            break; 
          }
        } catch (e) {
          break; 
        }
      }
      setAllGamesData(gameFiles);
      
      try {
        const summaryResponse = await fetch(`${process.env.PUBLIC_URL}/assets/game_summary_${TIMESTAMP}.txt`);
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

  // Auto-play functionality
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
            setCurrentGameIndex(idx => idx + 1);
            return 0;
          } else {
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
        <div className="brand">
          <span className="prompt">root@battleship:~$</span> ./view_logs
        </div>
        <nav className="tab-nav">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            overview
          </button>
          <button
            className={activeTab === 'summary' ? 'active' : ''}
            onClick={() => setActiveTab('summary')}
          >
            summary_report
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'overview' && (
          <>
            {/* CONTROLS (Full Width, Top of Flow) */}
            <Controls
              currentTurn={currentTurn}
              maxTurns={maxTurns}
              currentGameIndex={currentGameIndex}
              totalGames={allGamesData.length}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onSkipToNextGame={() => {
                 if (currentGameIndex < allGamesData.length - 1) {
                   setCurrentGameIndex(p => p + 1); setCurrentTurn(0); setIsPlaying(false);
                 }
              }}
              onSkipToPrevGame={() => {
                 if (currentGameIndex > 0) {
                   setCurrentGameIndex(p => p - 1); setCurrentTurn(0); setIsPlaying(false);
                 }
              }}
              onSpeedChange={setPlaybackSpeed}
              onTurnChange={setCurrentTurn}
            />

            <div className="dashboard-layout">
              {/* RIGHT SIDEBAR (Summary/Zoom) */}
              <div className="dashboard-sidebar">
                <StatsPanel 
                  allGamesData={allGamesData}
                  currentGameIndex={currentGameIndex}
                  selectedAgent={selectedAgent}
                  gameData={currentGame?.data}
                  currentTurn={currentTurn}
                  onCloseFocus={() => setSelectedAgent(null)}
                />
              </div>

              {/* MAIN CONTENT (Boards) */}
              <div className="dashboard-content">
                <GameViewer
                  gameData={currentGame?.data}
                  currentTurn={currentTurn}
                  onBoardClick={setSelectedAgent}
                />
              </div>
            </div>
          </>
        )}
        {activeTab === 'summary' && (
          <SummaryView summaryData={summaryData} />
        )}
      </main>
    </div>
  );
}

export default App;