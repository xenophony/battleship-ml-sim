import React, { useEffect, useState } from 'react';
import BoardDisplay from './BoardDisplay';

function StatsPanel({ gameData, selectedAgent, currentTurn, onCloseFocus, allGamesData, currentGameIndex }) {
  const [descriptions, setDescriptions] = useState(null);

  useEffect(() => {
    let mounted = true;
    // Try the `assets/` path first (if descriptions were placed there), fall back to root `public/`.
    const base = (process.env.PUBLIC_URL || '');
    const candidates = [base + '/assets/agent_descriptions.json', base + '/agent_descriptions.json', '/agent_descriptions.json'];
    const tryFetch = async () => {
      for (const u of candidates) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const d = await r.json();
          if (!mounted) return;
          const map = {};
          if (d && Array.isArray(d.agents)) d.agents.forEach(a => { map[a.name] = a; });
          setDescriptions(map);
          return;
        } catch (e) {
          // try next
        }
      }
      if (mounted) setDescriptions({});
    };
    tryFetch();
    
    return () => { mounted = false; };
  }, []);

  if (!gameData) return null;

  // Calculate generic stats
  const agents = Object.keys(gameData);
  const totalHits = agents.reduce((sum, name) => sum + (gameData[name].hits || 0), 0);
  const avgTurns = agents.length ? (agents.reduce((sum, name) => sum + (gameData[name].turns || 0), 0) / agents.length).toFixed(1) : 0;
  
  // Find leader
  let leader = null;
  let minTurns = 999;
  agents.forEach(name => {
    if (gameData[name].turns < minTurns && gameData[name].turns > 0) {
      minTurns = gameData[name].turns;
      leader = name;
    }
  });

  const formatAgentName = (name) => {
    const map = {
      'Llama-4-Scout': 'Llama-4-Scout - w/ hints',
      'Llama-3.1-Local-Smart': 'Llama-3.1-8B-Fine-Tuned - w/ hints'
    };
    return map[name] || name;
  };


  const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const findDescriptionFor = (agentName) => {
    if (!descriptions) return null;
    if (descriptions[agentName]) return descriptions[agentName];
    const norm = normalize(agentName);
    for (const k of Object.keys(descriptions)) {
      if (normalize(k) === norm) return descriptions[k];
    }
    const rawAliases = {
      'llama4scout': 'Llama-4-Scout-V2',
      'llama4scoutv2': 'Llama-4-Scout-V2',
      'llama-4-scout': 'Llama-4-Scout-V2',
      'llm-openrouter': 'Llama-4-Scout-V2',
      'llama31localsmart': 'Llama-3.1-FineTuned',
      'llama3.1localsmart': 'Llama-3.1-FineTuned',
      'llama31local': 'Llama-3.1-FineTuned',
      'llm-local': 'Llama-3.1-FineTuned',
      'smart-prob-algorithm': 'Smart-Prob-Algorithm',
      'smartprobabilityagent': 'Smart-Prob-Algorithm'
    };
    const aliasMap = {};
    Object.keys(rawAliases).forEach(k => { aliasMap[normalize(k)] = rawAliases[k]; });
    if (aliasMap[norm] && descriptions[aliasMap[norm]]) return descriptions[aliasMap[norm]];

    // Fallbacks: direct substring match (either direction)
    for (const k of Object.keys(descriptions)) {
      const kn = normalize(k);
      if (norm.includes(kn) || kn.includes(norm)) return descriptions[k];
    }

    // Final fallback: longest-common-substring heuristic to pick the best candidate
    const lcsLen = (a, b) => {
      let max = 0;
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
          let k = 0;
          while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
          if (k > max) max = k;
        }
      }
      return max;
    };

    let best = null;
    let bestScore = 0;
    for (const k of Object.keys(descriptions)) {
      const kn = normalize(k);
      const score = lcsLen(norm, kn);
      if (score > bestScore) { bestScore = score; best = k; }
    }
    if (best && bestScore > Math.max(3, Math.floor(Math.min(norm.length, normalize(best).length) * 0.5))) {
      return descriptions[best];
    }

    return null;
  };

  return (
    <div className="stats-panel" style={{ background: '#19181A', padding: '1rem', border: '1px solid #333', borderRadius: '4px', fontFamily: 'Consolas' }}>
      <div style={{ color: '#FC9867', borderBottom: '1px dashed #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        SESSION STATS
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ color: '#727072' }}>Active Agents:</span> <span style={{ color: '#A9DC76' }}>{agents.length}</span>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ color: '#727072' }}>Total Hits:</span> <span style={{ color: '#FF6188' }}>{totalHits}</span>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ color: '#727072' }}>Avg Turns:</span> <span style={{ color: '#78DCE8' }}>{avgTurns}</span>
      </div>
      
      {leader && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #333' }}>
          <div style={{ color: '#FFD866', fontSize: '0.8rem' }}>CURRENT LEADER</div>
          <div style={{ color: '#FCFCFA', fontWeight: 'bold' }}>{leader}</div>
          <div style={{ color: '#78DCE8', fontSize: '0.9rem' }}>{minTurns} Turns</div>
        </div>
      )}

      {/* Agent focus area */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #333' }}>
        <div style={{ color: '#FFD866', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{selectedAgent ? 'FOCUSED AGENT' : 'AGENTS'}</div>
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {selectedAgent && gameData[selectedAgent] ? (
            (() => {
              const agentInfo = gameData[selectedAgent];
              const boardHistory = agentInfo.board_history || [];
              const board = boardHistory[Math.min(currentTurn, boardHistory.length - 1)] || [];
              const turns = agentInfo.turns || 0;
              const hits = board.reduce((total, row) => total + row.filter(cell => cell === 'h' || cell === 's').length, 0);
              const isFinished = currentTurn >= boardHistory.length - 1 && boardHistory.length > 0;
              const desc = findDescriptionFor(selectedAgent);
              return (
                <div>
                  <BoardDisplay
                    agentName={formatAgentName(selectedAgent)}
                    board={board}
                    turns={Math.min(currentTurn + 1, turns)}
                    hits={hits}
                    isFinished={isFinished}
                    isZoomed={true}
                  />
                  <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: '#0f0f10', border: '1px solid #222', borderRadius: '4px' }}>
                    {descriptions === null ? (
                      <div style={{ color: '#727072' }}>Loading description...</div>
                    ) : desc ? (
                      <div>
                        <div style={{ color: '#FFD866', fontWeight: 'bold', marginBottom: '0.25rem' }}>{desc.name}</div>
                        <div style={{ color: '#FCFCFA', marginBottom: '0.5rem' }}>{desc.description}</div>
                        <div style={{ color: '#78DCE8', fontSize: '0.85rem' }}>Source: {desc.model_source || desc.type || 'Unknown'}</div>
                      </div>
                    ) : (
                      <div style={{ color: '#727072' }}>No description available for this agent.</div>
                    )}
                  </div>
                  {onCloseFocus && (
                    <div style={{ marginTop: '0.6rem' }}>
                      <button onClick={onCloseFocus} style={{ background: 'transparent', border: '1px solid #333', color: '#FCFCFA', padding: '0.25rem 0.5rem', borderRadius: '3px' }}>Close Focus</button>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div style={{ display: 'grid', gap: '6px' }}>
              {agents.map((name) => {
                const agentInfo = gameData[name] || {};
                const turns = agentInfo.turns || 0;
                const hits = agentInfo.hits || 0;
                return (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.35rem', borderRadius: '3px' }}>
                    <div style={{ color: '#FCFCFA' }}>{name}</div>
                    <div style={{ color: '#78DCE8' }}>{hits} / {turns}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;