import React, { useState, useEffect } from 'react';
import './App.css';
import GameViewer from './components/GameViewer';
import SummaryView from './components/SummaryView';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import ReasoningViewer from './components/ReasoningViewer';
import LlmAgentSelector from './components/LlmAgentSelector';

// Available LLM agents
const LLM_AGENTS = ['Llama-4-Scout', 'Llama 3.1 8B- FINE-TUNED'];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
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
        console.error('No manifest.json found - run build to generate it');
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
            const summary = await summaryResponse.text();
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

  // --- NEW: Auto-play functionality for LLM REASONING TAB ---
  // Phased approach: prompt (fade in) -> typing (chunk response) -> linger (pause to read) -> next turn
  useEffect(() => {
    let interval;
    if (llmIsPlaying && activeTab === 'llm_reasoning' && allGamesData.length > 0) {
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
      
      // Calculate reasonable number of chunks (not per-character, but word-ish chunks)
      // Roughly 1 chunk per 3-6 characters gives a nice flow
      const numChunks = Math.max(1, Math.ceil(reasoning.length / 4));
      const LINGER_TICKS = 60; // ~3 seconds at 50ms interval

      interval = setInterval(() => {
        if (llmPhase === 'prompt') {
          // Prompt phase: show prompt, then move to typing after a brief moment
          setLlmChunkIndex(1); // Start showing response
          setLlmPhase('typing');
        } else if (llmPhase === 'typing') {
          // Typing phase: increment chunks with variable speed feel
          setLlmChunkIndex(prev => {
            const next = prev + 1;
            if (next >= numChunks) {
              // Done typing, start linger phase
              setLlmPhase('linger');
              setLingerCountdown(LINGER_TICKS);
              return numChunks; // Stay at max
            }
            return next;
          });
        } else if (llmPhase === 'linger') {
          // Linger phase: wait for reader to absorb content
          setLingerCountdown(prev => {
            if (prev <= 1) {
              // Done lingering, advance to next turn
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
  // --- END NEW LLM PLAYBACK ---


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

  const handleLlmNextTurn = () => {
    const currentGame = allGamesData[currentGameIndex];
    if (!currentGame) return;

    const llmAgent = currentGame.data['Llama-4-Scout'] || currentGame.data['Llama 3.1 8B- FINE-TUNED'];
    const maxLlmTurns = llmAgent?.move_metadata?.length || 0;

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

// ... (inside App.js)

  // ... (inside App.js's handleLlmPrevTurn)
  const handleLlmPrevTurn = () => {
    if (llmTurnIndex > 0) {
        setLlmTurnIndex(prevTurn => prevTurn - 1);
        setLlmChunkIndex(0);
        setLlmPhase('prompt');
    } else if (currentGameIndex > 0) {
        setCurrentGameIndex(prevGame => {
            const prevGameData = allGamesData[prevGame - 1];
            // Find an LLM agent that exists in the previous game
            const llmAgent = prevGameData.data['Llama-4-Scout'] || prevGameData.data['Llama 3.1 8B- FINE-TUNED'];
            const maxLlmTurns = llmAgent?.move_metadata?.length || 0;

            // Set to the *last* turn of the previous game for LLM mode
            setLlmTurnIndex(maxLlmTurns > 0 ? maxLlmTurns - 1 : 0);
            setLlmChunkIndex(0);
            setLlmPhase('prompt');
            return prevGame - 1;
        });
    }
  };

  const handleLlmTurnChange = (newTurn) => {
    // Ensure newTurn is within bounds (prevents crashing if manually set too high)
    const newMaxTurns = llmAgent?.move_metadata?.length || 0;
    const safeNewTurn = Math.min(newTurn, newMaxTurns > 0 ? newMaxTurns - 1 : 0);

    setLlmTurnIndex(safeNewTurn);
    setLlmChunkIndex(0);
    setLlmPhase('prompt');
  };
  
// 1. Define currentGame - This MUST come first among the derived constants.
  const currentGame = allGamesData[currentGameIndex];

  // 2. Define maxTurns (for Overview tab)
  const maxTurns = currentGame ? getMaxTurnsForGame(currentGame.data) : 0;
  
  // 3. Define LLM related variables (Now correctly accessing currentGame)
  const llmAgent = currentGame?.data['Llama-4-Scout'] || currentGame?.data['Llama 3.1 8B- FINE-TUNED'];
  const maxLlmTurns = llmAgent?.move_metadata?.length || 0;
  
  // 4. Safely check bounds for both turns
  const currentLlmTurn = Math.min(llmTurnIndex, maxLlmTurns > 0 ? maxLlmTurns - 1 : 0);
  const currentTurnForOverview = Math.min(currentTurn, maxTurns > 0 ? maxTurns - 1 : 0);

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
            className={activeTab === 'llm_reasoning' ? 'active' : ''}
            onClick={() => {
                setActiveTab('llm_reasoning');
                // Sync turns if possible, otherwise reset to 0
                setLlmTurnIndex(currentTurnForOverview > 0 ? currentTurnForOverview : 0);
                setLlmChunkIndex(0);
            }}
          >
            llm_reasoning
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
              currentTurn={currentTurnForOverview}
              maxTurns={maxTurns}
              currentGameIndex={currentGameIndex}
              totalGames={allGamesData.length}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={() => {
                setIsPlaying(!isPlaying); 
                setLlmIsPlaying(false); // Pause LLM playback
              }}
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
                   const prevGame = allGamesData[currentGameIndex - 1];
                   setCurrentTurn(getMaxTurnsForGame(prevGame.data) - 1);
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
                  currentTurn={currentTurnForOverview}
                  onCloseFocus={() => setSelectedAgent(null)}
                />
              </div>

              {/* MAIN CONTENT (Boards) */}
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
        

{/* --- NEW LLM REASONING TAB RENDER --- */}
        {activeTab === 'llm_reasoning' && (
             <>
                 <Controls
                     currentTurn={currentLlmTurn}
                     maxTurns={maxLlmTurns}
                     currentGameIndex={currentGameIndex}
                     totalGames={allGamesData.length}
                     isPlaying={llmIsPlaying}
                     playbackSpeed={llmPlaybackSpeed}
                     onPlayPause={() => {
                        setLlmIsPlaying(!llmIsPlaying);
                        setIsPlaying(false); // Pause Overview playback
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
                 
                 {/* LLM Agent Selector Tabs */}
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
                 
                 {/* Full-width Reasoning Viewer with floating board */}
                 <div className="llm-reasoning-content">
                     <ReasoningViewer
                        gameData={currentGame?.data}
                        currentTurn={currentLlmTurn}
                        chunkIndex={llmChunkIndex}
                        isPlaying={llmIsPlaying}
                        selectedAgent={selectedLlmAgent}
                        onNextTurn={handleLlmNextTurn}
                        onResetChunk={() => setLlmChunkIndex(0)}
                        onChunkStep={() => setLlmChunkIndex(p => p + 1)}
                     />
                 </div>
             </>
        )}
        {/* --- END LLM REASONING TAB RENDER --- */}

        {activeTab === 'summary' && (
          <SummaryView summaryData={summaryData} />
        )}
      </main>
    </div>
  );
}

export default App;