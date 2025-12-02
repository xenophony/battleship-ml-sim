import React, { useState, useEffect } from 'react';
import './App.css';
import GameViewer from './components/GameViewer';
import SummaryView from './components/SummaryView';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import ReasoningViewer from './components/ReasoningViewer';
import LlmAgentSelector from './components/LlmAgentSelector';
import GameClient from './components/GameClient';
import LandingPage from './components/LandingPage';

// Available LLM agents
const LLM_AGENTS = ['Llama-4-Scout', 'Llama-3.1-Local-Smart', 'Claude-Opus-4.5-Frontier'];

// Helper to format agent display names for UI
const formatAgentName = (name) => {
  const nameMap = {
    'Llama-4-Scout': 'Llama-4-Scout - w/ hints',
    'Llama-3.1-Local-Smart': 'Llama-3.1-8B-Fine-Tuned - w/ hints'
  };
  return nameMap[name] || name;
};

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [allGamesData, setAllGamesData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // --- NEW STATE FOR LLM REASONING TAB ---
  const [llmPlaybackSpeed, setLlmPlaybackSpeed] = useState(50); // ms per chunk step
  const [llmIsPlaying, setLlmIsPlaying] = useState(false);
  const [llmTurnIndex, setLlmTurnIndex] = useState(0); // Index for *which turn's* reasoning to show
  const [llmChunkIndex, setLlmChunkIndex] = useState(0); // Index for *chunking* the current turn's output
  const [llmPhase, setLlmPhase] = useState('prompt'); // 'prompt' | 'typing' | 'linger'
  const [lingerCountdown, setLingerCountdown] = useState(0); // countdown ticks for linger phase
  const [selectedLlmAgent, setSelectedLlmAgent] = useState(null); // Selected LLM agent for reasoning view

  // Load all games on mount
  useEffect(() => {
    loadAllGames();
  }, []);

  const loadAllGames = async () => {
    try {
      // Load manifest (auto-generated at build time)
      const manifestResponse = await fetch(`${process.env.PUBLIC_URL}/assets/manifest.json`);
      if (!manifestResponse.ok) {
        // Fallback for dev environment where manifest might not exist yet
        // Try loading game_data.json directly as a fallback
        fetch('/game_data.json')
          .then(res => res.json())
          .then(data => {
            setAllGamesData(data.games || []);
            setSummaryData(data.summary || null);
          })
          .catch(e => console.error('No manifest and no game_data.json found'));
        return;
      }
      const manifest = await manifestResponse.json();
      
      // Load each game file from manifest
      const gameFiles = [];
      for (let i = 0; i < manifest.games.length; i++) {
        const filename = manifest.games[i];
        try {
          const response = await fetch(`${process.env.PUBLIC_URL}/assets/${filename}`);
          if (response.ok) {
            const data = await response.json();
            // Extract game number from filename (game_001_boards_... -> 1)
            const match = filename.match(/game_(\d+)_boards/);
            const gameNum = match ? parseInt(match[1], 10) : i + 1;
            gameFiles.push({ gameNum, data });
          }
        } catch (e) {
          console.error(`Failed to load ${filename}:`, e);
        }
      }
      
      gameFiles.sort((a, b) => a.gameNum - b.gameNum);
      setAllGamesData(gameFiles);
      
      // Load summary if specified
      if (manifest.summary) {
        try {
          const summaryResponse = await fetch(`${process.env.PUBLIC_URL}/assets/${manifest.summary}`);
          if (summaryResponse.ok) {
            const summary = await summaryResponse.text(); // or .json() if you updated format
            setSummaryData(summary);
          }
        } catch (e) {
          console.error('Failed to load summary');
        }
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const getMaxTurnsForGame = (gameData) => {
    if (!gameData) return 0;
    return Math.max(
      ...Object.values(gameData).map(agent => agent.board_history?.length || 0)
    );
  };

  // Auto-play functionality for OVERVIEW TAB
  useEffect(() => {
    let interval;
    if (isPlaying && activeTab === 'overview' && allGamesData.length > 0) {
      const currentGame = allGamesData[currentGameIndex];
      if (!currentGame) return;
      const maxTurns = getMaxTurnsForGame(currentGame.data);
      
      interval = setInterval(() => {
        setCurrentTurn(prev => {
          if (prev < maxTurns - 1) {
            return prev + 1;
          } else if (currentGameIndex < allGamesData.length - 1) {
            setCurrentGameIndex(idx => {
              setLlmTurnIndex(0); // Reset LLM turn index on game change
              return idx + 1;
            });
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTurn, currentGameIndex, allGamesData, playbackSpeed, activeTab]);

  // --- Auto-play functionality for LLM REASONING TAB ---
  useEffect(() => {
    let interval;
    if (llmIsPlaying && activeTab === 'llm' && allGamesData.length > 0) {
      const currentGame = allGamesData[currentGameIndex];
      if (!currentGame) return;

      // Use selected agent or find first available
      const activeAgent = selectedLlmAgent && currentGame.data[selectedLlmAgent]?.move_metadata?.length > 0
        ? selectedLlmAgent
        : LLM_AGENTS.find(name => currentGame.data[name]?.move_metadata?.length > 0);
      
      const llmAgentData = activeAgent ? currentGame.data[activeAgent] : null;
      const maxLlmTurns = llmAgentData?.move_metadata?.length || 0;
      const currentMove = llmAgentData?.move_metadata?.[llmTurnIndex];
      const reasoning = currentMove?.reasoning || '';
      
      const numChunks = Math.max(1, Math.ceil(reasoning.length / 4));
      const LINGER_TICKS = 60; 

      interval = setInterval(() => {
        if (llmPhase === 'prompt') {
          setLlmChunkIndex(1); 
          setLlmPhase('typing');
        } else if (llmPhase === 'typing') {
          setLlmChunkIndex(prev => {
            const next = prev + 1;
            if (next >= numChunks) {
              setLlmPhase('linger');
              setLingerCountdown(LINGER_TICKS);
              return numChunks; 
            }
            return next;
          });
        } else if (llmPhase === 'linger') {
          setLingerCountdown(prev => {
            if (prev <= 1) {
              if (llmTurnIndex < maxLlmTurns - 1) {
                setLlmTurnIndex(t => t + 1);
                setLlmChunkIndex(0);
                setLlmPhase('prompt');
              } else if (currentGameIndex < allGamesData.length - 1) {
                setCurrentGameIndex(g => g + 1);
                setLlmTurnIndex(0);
                setLlmChunkIndex(0);
                setLlmPhase('prompt');
              } else {
                setLlmIsPlaying(false);
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, llmPlaybackSpeed);
    }
    return () => clearInterval(interval);
  }, [llmIsPlaying, llmTurnIndex, llmChunkIndex, llmPhase, lingerCountdown, currentGameIndex, allGamesData, llmPlaybackSpeed, activeTab, selectedLlmAgent]);


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
  
  const handleSpeedChange = (speed) => setPlaybackSpeed(speed);
  const handleTurnChange = (turn) => setCurrentTurn(turn);

  const handleSkipToNextGame = () => {
    if (currentGameIndex < allGamesData.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setCurrentTurn(0);
    }
  };

  const handleSkipToPrevGame = () => {
    if (currentGameIndex > 0) {
      setCurrentGameIndex(prev => prev - 1);
      setCurrentTurn(0);
    }
  };

  const handleBoardClick = (agentName) => {
    setSelectedAgent(agentName);
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  const handleLlmNextTurn = () => {
    const currentGame = allGamesData[currentGameIndex];
    if (!currentGame) return;

    const llmAgentName = selectedLlmAgent || LLM_AGENTS.find(name => currentGame.data[name]?.move_metadata?.length > 0);
    const llmAgentData = currentGame.data[llmAgentName];
    const maxLlmTurns = llmAgentData?.move_metadata?.length || 0;

    if (llmTurnIndex < maxLlmTurns - 1) {
        setLlmTurnIndex(prevTurn => prevTurn + 1);
        setLlmChunkIndex(0);
        setLlmPhase('prompt');
    } else if (currentGameIndex < allGamesData.length - 1) {
        setCurrentGameIndex(prevGame => prevGame + 1);
        setLlmTurnIndex(0);
        setLlmChunkIndex(0);
        setLlmPhase('prompt');
    } else {
        setLlmIsPlaying(false);
    }
  };

  const handleLlmPrevTurn = () => {
    if (llmTurnIndex > 0) {
        setLlmTurnIndex(prevTurn => prevTurn - 1);
        setLlmChunkIndex(0);
        setLlmPhase('prompt');
    } else if (currentGameIndex > 0) {
        setCurrentGameIndex(prevGame => {
            const prevGameData = allGamesData[prevGame - 1];
            const llmAgentName = selectedLlmAgent || LLM_AGENTS.find(name => prevGameData.data[name]?.move_metadata?.length > 0);
            const llmAgentData = prevGameData.data[llmAgentName];
            const maxLlmTurns = llmAgentData?.move_metadata?.length || 0;

            setLlmTurnIndex(maxLlmTurns > 0 ? maxLlmTurns - 1 : 0);
            setLlmChunkIndex(0);
            setLlmPhase('prompt');
            return prevGame - 1;
        });
    }
  };

  const handleLlmTurnChange = (newTurn) => {
    const currentGame = allGamesData[currentGameIndex];
    const llmAgentName = selectedLlmAgent || LLM_AGENTS.find(name => currentGame?.data[name]?.move_metadata?.length > 0);
    const llmAgentData = currentGame?.data[llmAgentName];
    const newMaxTurns = llmAgentData?.move_metadata?.length || 0;
    const safeNewTurn = Math.min(newTurn, newMaxTurns > 0 ? newMaxTurns - 1 : 0);

    setLlmTurnIndex(safeNewTurn);
    setLlmChunkIndex(0);
    setLlmPhase('prompt');
  };

  // --- DERIVED STATE FOR RENDERING ---
  const currentGame = allGamesData[currentGameIndex];
  const maxTurns = currentGame ? getMaxTurnsForGame(currentGame.data) : 0;
  
  const currentLlmAgentName = selectedLlmAgent || (currentGame ? LLM_AGENTS.find(name => currentGame.data[name]?.move_metadata?.length > 0) : null);
  const currentLlmAgentData = currentLlmAgentName ? currentGame?.data?.[currentLlmAgentName] : null;
  const maxLlmTurns = currentLlmAgentData?.move_metadata?.length || 0;
  
  const currentLlmTurn = (llmTurnIndex < maxLlmTurns) ? currentLlmAgentData.move_metadata[llmTurnIndex] : null;
  const currentTurnForOverview = Math.min(currentTurn, maxTurns > 0 ? maxTurns - 1 : 0);

  return (
    <div className="App">
      <header className="App-header">
        <div className="brand">
          <span className="prompt">root@battleship:~$</span> ./view_logs
        </div>
        <nav className="tab-nav">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
            home
          </button>
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            overview
          </button>
          <button className={activeTab === 'llm' ? 'active' : ''} onClick={() => {
               setActiveTab('llm');
               // Sync logic if needed
            }}>
            llm_reasoning
          </button>
          {/* PLAY TAB */}
          <button 
            className={activeTab === 'play' ? 'active' : ''} 
            onClick={() => setActiveTab('play')}
          >
            play_game
          </button>
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>
            summary_report
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'home' && (
          <LandingPage onNavigate={setActiveTab} />
        )}

        {activeTab === 'overview' && currentGame && (
          <>
            <Controls
              currentTurn={currentTurnForOverview}
              maxTurns={maxTurns}
              currentGameIndex={currentGameIndex}
              totalGames={allGamesData.length}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={() => {
                setIsPlaying(!isPlaying); 
                setLlmIsPlaying(false); 
              }}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onSkipToNextGame={handleSkipToNextGame}
              onSkipToPrevGame={handleSkipToPrevGame}
              onSpeedChange={handleSpeedChange}
              onTurnChange={handleTurnChange}
            />

            <div className="dashboard-layout">
              <div className="dashboard-sidebar">
                <StatsPanel 
                  allGamesData={allGamesData}
                  currentGameIndex={currentGameIndex}
                  selectedAgent={selectedAgent}
                  gameData={currentGame?.data}
                  currentTurn={currentTurnForOverview}
                  onCloseFocus={() => setSelectedAgent(null)}
                />
              </div>

              <div className="dashboard-content">
                <GameViewer
                  gameData={currentGame?.data}
                  currentTurn={currentTurnForOverview}
                  onBoardClick={setSelectedAgent}
                />
              </div>
            </div>
          </>
        )}
        
        {/* --- LLM REASONING TAB --- */}
        {activeTab === 'llm' && currentGame && (
             <div className="llm-reasoning-content">
                 {/* REUSED CONTROLS FOR LLM */}
                 <Controls
                     currentTurn={llmTurnIndex}
                     maxTurns={maxLlmTurns}
                     currentGameIndex={currentGameIndex}
                     totalGames={allGamesData.length}
                     isPlaying={llmIsPlaying}
                     playbackSpeed={llmPlaybackSpeed}
                     onPlayPause={() => {
                         setLlmIsPlaying(!llmIsPlaying);
                         setIsPlaying(false);
                     }}
                     onStepForward={handleLlmNextTurn}
                     onStepBackward={handleLlmPrevTurn}
                     onSkipToNextGame={() => {
                         if (currentGameIndex < allGamesData.length - 1) {
                            setCurrentGameIndex(p => p + 1); setLlmTurnIndex(0); setLlmChunkIndex(0); setLlmIsPlaying(false);
                         }
                     }}
                     onSkipToPrevGame={() => {
                         if (currentGameIndex > 0) {
                            setCurrentGameIndex(p => p - 1); setLlmTurnIndex(0); setLlmChunkIndex(0); setLlmIsPlaying(false);
                         }
                     }}
                     onSpeedChange={setLlmPlaybackSpeed}
                     onTurnChange={handleLlmTurnChange}
                 />
                 
                 <LlmAgentSelector
                     agents={LLM_AGENTS}
                     selectedAgent={selectedLlmAgent || LLM_AGENTS.find(name => currentGame?.data?.[name]?.move_metadata?.length > 0)}
                     onSelectAgent={(agent) => {
                         setSelectedLlmAgent(agent);
                         setLlmChunkIndex(0);
                         setLlmPhase('prompt');
                     }}
                     gameData={currentGame?.data}
                 />
                 
                 <div className="llm-reasoning-view-container">
                     <ReasoningViewer
                        gameData={currentGame?.data}
                        currentTurn={llmTurnIndex}
                        chunkIndex={llmChunkIndex}
                        isPlaying={llmIsPlaying}
                        selectedAgent={selectedLlmAgent}
                        onNextTurn={handleLlmNextTurn}
                        onResetChunk={() => setLlmChunkIndex(0)}
                        onChunkStep={() => setLlmChunkIndex(p => p + 1)}
                     />
                 </div>
             </div>
        )}

        {activeTab === 'summary' && (
          <SummaryView summaryData={summaryData} />
        )}
        
        {/* --- NEW PLAY TAB --- */}
        {activeTab === 'play' && (
          <div className="llm-reasoning-content">
            <GameClient />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;