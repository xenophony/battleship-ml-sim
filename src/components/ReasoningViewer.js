import React, { useMemo } from 'react';
import './ReasoningViewer.css';
import FloatingBoardPanel from './FloatingBoardPanel';

// Generate chunk boundaries with variable sizes for natural LLM-like streaming
// Uses deterministic pseudo-random based on text to ensure stable boundaries
const generateChunkBoundaries = (text) => {
    if (!text) return [0];
    const boundaries = [0];
    let pos = 0;
    
    // Deterministic seed based on text length for consistency across renders
    let seed = text.length * 31;
    const pseudoRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return (seed / 0x7fffffff);
    };
    
    while (pos < text.length) {
        // Variable chunk: 3-10 chars, occasionally burst to 15-20
        let chunkSize = Math.floor(pseudoRandom() * 8) + 3;
        if (pseudoRandom() < 0.2) {
            chunkSize += Math.floor(pseudoRandom() * 10) + 5; // Occasional burst
        }
        
        // Try to break at word/sentence boundaries
        let nextPos = Math.min(pos + chunkSize, text.length);
        const lookAhead = Math.min(nextPos + 5, text.length);
        
        for (let i = nextPos; i <= lookAhead; i++) {
            const char = text[i];
            if (i >= text.length || char === ' ' || char === '.' || char === ',' || char === '\n' || char === ':') {
                nextPos = Math.min(i + 1, text.length);
                break;
            }
        }
        
        pos = nextPos;
        boundaries.push(pos);
    }
    
    return boundaries;
};

function ResponseDisplay({ fullText, chunkIndex }) {
    // Memoize boundaries so they're stable for the same text
    const boundaries = useMemo(() => generateChunkBoundaries(fullText), [fullText]);
    
    // Map chunkIndex to actual character position
    const boundaryIndex = Math.min(chunkIndex, boundaries.length - 1);
    const charPos = boundaries[boundaryIndex] || 0;
    const displayText = fullText.substring(0, charPos);
    
    const isComplete = chunkIndex >= boundaries.length - 1;
    
    return (
        <div className="typing-display">
            {displayText}
            {!isComplete && <span className="typing-cursor">|</span>}
        </div>
    );
}

function ReasoningViewer({ gameData, currentTurn, chunkIndex, isPlaying, selectedAgent, onNextTurn, onResetChunk, onChunkStep }) {
    if (!gameData) {
        return <div className="reasoning-viewer loading">{'//'} Waiting for game data...</div>;
    }

    // Use selected agent or fall back to first available
    const LLM_AGENTS = ['Llama-4-Scout', 'Llama 3.1 8B- FINE-TUNED'];
    const activeAgentName = selectedAgent && gameData[selectedAgent]?.move_metadata?.length > currentTurn
        ? selectedAgent
        : LLM_AGENTS.find(name => gameData[name]?.move_metadata?.length > currentTurn);
    
    if (!activeAgentName) {
        return (
            <div className="reasoning-viewer-container">
                <div className="reasoning-viewer chat-window">
                    <div className="chat-header">
                        <span className="comment">{'//'} No LLM data available for turn {currentTurn + 1}</span>
                    </div>
                </div>
            </div>
        );
    }
    
    const agent = gameData[activeAgentName];
    const currentMove = agent.move_metadata[currentTurn];
    const prompt = currentMove?.prompt || '(No prompt available)';
    const reasoning = currentMove?.reasoning || '';

    return (
        <div className="reasoning-viewer-container">
            {/* Floating board panel - shows on desktop, inline on mobile */}
            <div className="floating-board-wrapper mobile-only">
                <FloatingBoardPanel
                    agentName={activeAgentName}
                    gameData={gameData}
                    currentTurn={currentTurn}
                />
            </div>
            
            <div className="reasoning-viewer chat-window">
                {/* Desktop floating board */}
                <div className="floating-board-wrapper desktop-only">
                    <FloatingBoardPanel
                        agentName={activeAgentName}
                        gameData={gameData}
                        currentTurn={currentTurn}
                    />
                </div>
                
                <div className="chat-header">
                    <span className="comment">{'//'} LLM Reasoning Chain (Turn {currentTurn + 1})</span>
                </div>
                
                <div className="agent-chat-section">
                    <div className="agent-name-tag">{activeAgentName}</div>
                    
                    {/* Prompt bubble - always visible, re-renders on turn change via key */}
                    <div key={`prompt-${currentTurn}-${activeAgentName}`} className="chat-bubble prompt-bubble animate-fade-up">
                        <span className="bubble-prefix">USER:</span>
                        <pre className="prompt-content">{prompt}</pre>
                    </div>
                    
                    {/* Response bubble - appears after chunkIndex > 0 */}
                    {chunkIndex > 0 && reasoning && (
                        <div className="chat-bubble response-bubble">
                            <span className="bubble-prefix">LLM:</span>
                            <ResponseDisplay 
                                fullText={reasoning}
                                chunkIndex={chunkIndex - 1}
                            />
                        </div>
                    )}
                    
                    {/* Move result - shown after response is fully typed */}
                    {reasoning && chunkIndex > generateChunkBoundaries(reasoning).length && currentMove?.move && (
                        <div className="move-result animate-fade-up">
                            <span className="move-label">→ MOVE:</span> 
                            <span className="move-coord">{currentMove.move}</span>
                            {currentMove.result && (
                                <span className={`result-badge result-${currentMove.result.toLowerCase()}`}>
                                    {currentMove.result}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReasoningViewer;