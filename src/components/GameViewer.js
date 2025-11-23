import React from 'react';
import './GameViewer.css';
import AgentCategory from './AgentCategory';

function GameViewer({ gameData, currentTurn }) {
  if (!gameData) {
    return (
      <div className="game-viewer">
        <div className="loading">
          <p>No game data loaded. Please select a game file.</p>
        </div>
      </div>
    );
  }

  // Group agents by category
  const categories = [
    {
      title: 'CLASSIC HEURISTIC',
      agents: ['RuleBasedAgent', 'HeuristicAgent']
    },
    {
      title: 'TRADITIONAL ML',
      agents: ['LogisticRegressionAgent', 'HitGradientBoostedAgent', 'LightGBMAgent', 'MLPAgent']
    },
    {
      title: 'ENSEMBLE ML',
      agents: ['VotingEnsembleAgent', 'StackingEnsembleAgent']
    },
    {
      title: 'REINFORCEMENT LEARNING',
      agents: ['QLearningAgent', 'SARSAAgent']
    },
    {
      title: 'LARGE LANGUAGE MODELS',
      agents: []  // Will include all agents not in other categories
    }
  ];

  // Identify which agents belong to which category
  const allAgentNames = Object.keys(gameData);
  const knownAgents = new Set();
  categories.slice(0, -1).forEach(cat => {
    cat.agents.forEach(agent => knownAgents.add(agent));
  });

  // Add remaining agents to LLM category
  categories[4].agents = allAgentNames.filter(name => !knownAgents.has(name));

  // Filter out empty categories
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
        />
      ))}
    </div>
  );
}

export default GameViewer;
