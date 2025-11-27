import React from 'react';
import './LlmAgentSelector.css';

function LlmAgentSelector({ agents, selectedAgent, onSelectAgent, gameData }) {
    // Filter to only agents that exist in game data
    const availableAgents = agents.filter(name => gameData?.[name]?.move_metadata?.length > 0);
    
    if (availableAgents.length === 0) {
        return (
            <div className="llm-agent-selector">
                <span className="no-agents">No LLM agents available</span>
            </div>
        );
    }

    return (
        <div className="llm-agent-selector">
            <span className="selector-label">{'//'} SELECT MODEL:</span>
            <div className="agent-tabs">
                {availableAgents.map(agentName => {
                    const isActive = selectedAgent === agentName;
                    const agentData = gameData[agentName];
                    const cost = agentData?.cost_usd || 0;
                    
                    return (
                        <button
                            key={agentName}
                            className={`agent-tab ${isActive ? 'active' : ''}`}
                            onClick={() => onSelectAgent(agentName)}
                        >
                            <span className="agent-tab-name">{agentName}</span>
                            {cost > 0 && (
                                <span className="agent-tab-cost">${cost.toFixed(4)}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default LlmAgentSelector;
