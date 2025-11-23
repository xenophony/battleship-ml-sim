import React from 'react';
import './GameViewer.css';
import AgentCategory from './AgentCategory';

function GameViewer({ gameData, currentTurn, onBoardClick }) {
  if (!gameData) {
    return (
      <div className="game-viewer">
        <div className="loading">
          // waiting for game data...
        </div>
      </div>
    );
  }

  // Group agents by category (Same list as before)
  const categories = [
    { title: 'CLASSIC HEURISTIC', agents: ['RuleBasedAgent', 'HeuristicAgent'] },
    { title: 'TRADITIONAL ML', agents: ['LogisticRegressionAgent', 'HitGradientBoostedAgent', 'LightGBMAgent', 'MLPAgent'] },
    { title: 'ENSEMBLE ML', agents: ['VotingEnsembleAgent', 'StackingEnsembleAgent'] },
    { title: 'REINFORCEMENT LEARNING', agents: ['QLearningAgent', 'SARSAAgent'] },
    { title: 'LARGE LANGUAGE MODELS', agents: [] } 
  ];

  const allAgentNames = Object.keys(gameData);
  const knownAgents = new Set();
  categories.slice(0, -1).forEach(cat => {
    cat.agents.forEach(agent => knownAgents.add(agent));
  });
  categories[4].agents = allAgentNames.filter(name => !knownAgents.has(name));

  const activeCategories = categories.filter(cat => 
    cat.agents.some(agentName => gameData[agentName])
  );

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
        />
      ))}
    </div>
  );
}

export default GameViewer;