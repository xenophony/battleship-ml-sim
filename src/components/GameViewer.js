import React from 'react';
import './GameViewer.css';
import AgentCategory from './AgentCategory';

function GameViewer({ gameData, currentTurn, onBoardClick, llmMode }) { // <-- ADD llmMode prop
  if (!gameData) {
    return (
      <div className="game-viewer">
        <div className="loading">
          {'//'} waiting for game data...
        </div>
      </div>
    );
  }

  // Define LLM Agents for filtering
  const LLM_AGENTS = ['Llama-4-Scout', 'Llama-3.1-Local-Smart', 'Claude-Opus-4.5-Frontier'];

// Helper to format agent display names for UI
const formatAgentName = (name) => {
  const nameMap = {
    'Llama-4-Scout': 'Llama-4-Scout - w/ hints',
    'Llama-3.1-Local-Smart': 'Llama-3.1-8B-Fine-Tuned - w/ hints'
  };
  return nameMap[name] || name;
}; 
  
  // Group agents by category 
  const categories = [
     { title: 'LARGE LANGUAGE MODELS', agents: LLM_AGENTS } ,
    { title: 'TRADITIONAL ML', agents: ['LogisticRegressionAgent', 'HitGradientBoostedAgent', 'LightGBMAgent', 'MLPAgent'] },
    { title: 'ENSEMBLE ML', agents: ['VotingEnsembleAgent', 'StackingEnsembleAgent'] },
    { title: 'REINFORCEMENT LEARNING', agents: ['QLearningAgent', 'SARSAAgent'] },
    { title: 'CLASSIC HEURISTIC', agents: ['RuleBasedAgent', 'HeuristicAgent', 'EnhancedOptimalAgent'] },
   
  ];

  const allAgentNames = Object.keys(gameData);
  const knownAgents = new Set();
  categories.slice(0, -1).forEach(cat => {
    cat.agents.forEach(agent => knownAgents.add(agent));
  });
  categories[4].agents = allAgentNames.filter(name => !knownAgents.has(name));

  let activeCategories = categories.filter(cat => 
    cat.agents.some(agentName => gameData[agentName])
  );
  
  // Filter logic: In LLM Mode, show ONLY the LLM agents
  if (llmMode) {
      activeCategories = activeCategories.filter(cat => cat.title === 'LARGE LANGUAGE MODELS');
  }


  return (
    <div className="game-viewer">
      {activeCategories.map((category, idx) => (
        <AgentCategory
          key={idx}
          title={category.title}
          agents={category.agents}
          gameData={gameData}
          currentTurn={currentTurn}
          onBoardClick={onBoardClick} // Pass it down
          formatAgentName={formatAgentName}
        />
      ))}
    </div>
  );
}

export default GameViewer;