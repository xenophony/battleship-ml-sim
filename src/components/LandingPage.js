import React from 'react';
import './LandingPage.css';

function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="landing-title">
          Battleship AI: <span className="highlight">Teaching Language Models to Play Strategy Games</span>
        </h1>
        <p className="landing-subtitle">Can a fine-tuned LLM outsmart traditional game AI?</p>
      </header>

      <section className="landing-intro">
        <p>
          This project explores whether large language models can learn to play Battleship at a competitive level 
          through supervised fine-tuning, comparing their performance against heuristic-based agents, machine 
          learning models, and frontier LLMs like GPT-4o and Claude.
        </p>
      </section>

      <section className="landing-section">
        <h2><span className="section-icon" aria-hidden="true"></span> What I Built</h2>
        <ul className="feature-list">
          <li><span className="bullet">▸</span> Fine-tuned <strong>Llama 3.1 8B</strong> on 3,500+ expert Battleship games using LoRA/QLoRA</li>
          <li><span className="bullet">▸</span> <strong>Smart probabilistic agent</strong> with tactical deduction and ship-tracking logic</li>
          <li><span className="bullet">▸</span> <strong>Machine learning agents</strong> using Random Forest and gradient boosting for move prediction</li>
          <li><span className="bullet">▸</span> <strong>LLM agents</strong> including fine-tuned Llama 3.1 8B, Llama-4-Scout, and Claude 4.5 Opus</li>
          <li><span className="bullet">▸</span> <strong>Interactive web interface</strong> for human vs. AI gameplay</li>
          <li><span className="bullet">▸</span> <strong>Self-play training pipeline</strong> for generating high-quality game data</li>
        </ul>
      </section>

      <section className="landing-section">
        <h2><span className="section-icon" aria-hidden="true"></span> The Challenge</h2>
        <p>
          Battleship requires spatial reasoning, probabilistic thinking, and multi-step planning—skills that 
          language models traditionally struggle with. By training on strategic gameplay patterns, I investigated 
          whether LLMs could:
        </p>
        <ul className="challenge-list">
          <li>Maintain accurate mental models of a 10×10 game board</li>
          <li>Prioritize high-probability targets using contextual reasoning</li>
          <li>Adapt tactics between search mode and hunt mode</li>
          <li>Avoid repeating moves and track partial ship detections</li>
        </ul>
      </section>

      <section className="landing-section">
        <h2><span className="section-icon" aria-hidden="true"></span> Agent Architecture</h2>
        <p>The project compares multiple approaches to game-playing AI:</p>
        
        <div className="agent-cards">
          <div className="agent-card">
            <h3>Heuristic Agents</h3>
            <p>Rule-based systems using probability density functions and tactical heuristics for ship hunting</p>
          </div>
          
          <div className="agent-card">
            <h3>Machine Learning Agents</h3>
            <p>Random Forest and gradient boosting models trained on board features, coverage maps, and historical game patterns</p>
          </div>
          
          <div className="agent-card highlight-card">
            <h3>Fine-tuned LLM (Assisted)</h3>
            <p>Llama 3.1 8B trained via instruction-tuning to output move coordinates with natural language reasoning. Receives tactical hints from probabilistic and heuristic functions including priority targets and high-probability zones.</p>
          </div>
          
          <div className="agent-card">
            <h3>Llama-4-Scout (Assisted)</h3>
            <p>Frontier model receiving the same probabilistic and heuristic hints as the fine-tuned model for fair comparison.</p>
          </div>
          
          <div className="agent-card">
            <h3>Claude 4.5 Opus (Minimal Assistance)</h3>
            <p>Receives only the probability map and battleship board with sunk ship detection, without tactical hints—testing pure reasoning capability.</p>
          </div>
          
          <div className="agent-card">
            <h3>Other Frontier Models</h3>
            <p>GPT-4o and Gemini 3 Pro evaluated as zero-shot players</p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2><span className="section-icon" aria-hidden="true"></span> Training Details</h2>
        <div className="training-details">
          <div className="detail-row"><span className="label">Model:</span> Meta Llama 3.1 8B Instruct (4-bit quantized)</div>
          <div className="detail-row"><span className="label">Method:</span> LoRA fine-tuning on NVIDIA RTX 3060</div>
          <div className="detail-row"><span className="label">Dataset:</span> 3,502 games filtered to less than 55 moves, excluding games with reasoning errors</div>
          <div className="detail-row"><span className="label">Format:</span> Instruction-tuning with board state → move selection → reasoning</div>
          <div className="detail-row"><span className="label">Best Checkpoint:</span> Epoch 4 (validation loss: 0.1248)</div>
        </div>
      </section>

      <section className="landing-section cta-section">
        <h2><span className="section-icon" aria-hidden="true"></span> Try It Yourself</h2>
        <p>
          Play against the AI, watch agents compete, or explore the training data. The model learns to:
        </p>
        <ul className="try-list">
          <li>Systematically search unexplored areas using probability heatmaps</li>
          <li>Finish off damaged ships with adjacent targeting</li>
          <li>Recognize sunk ships and update remaining targets</li>
          <li>Provide natural language reasoning for each move</li>
        </ul>
        <div className="cta-buttons">
          <button className="cta-btn primary" onClick={() => onNavigate('play')}>
            Play Against AI
          </button>
          <button className="cta-btn secondary" onClick={() => onNavigate('overview')}>
            Watch Agents Compete
          </button>
          <button className="cta-btn secondary" onClick={() => onNavigate('llm')}>
            Explore LLM Reasoning
          </button>
        </div>
      </section>

      <section className="landing-section">
        <h2><span className="section-icon" aria-hidden="true"></span> Technical Stack</h2>
        <div className="tech-stack">
          <div className="tech-category">
            <span className="tech-label">Training:</span>
            <span className="tech-items">Unsloth, PEFT, PyTorch</span>
          </div>
          <div className="tech-category">
            <span className="tech-label">ML Models:</span>
            <span className="tech-items">scikit-learn (Random Forest, Gradient Boosting)</span>
          </div>
          <div className="tech-category">
            <span className="tech-label">Inference:</span>
            <span className="tech-items">Together AI, OpenRouter, Anthropic API, and local deployment</span>
          </div>
          <div className="tech-category">
            <span className="tech-label">Frontend:</span>
            <span className="tech-items">React, JavaScript</span>
          </div>
          <div className="tech-category">
            <span className="tech-label">Evaluation:</span>
            <span className="tech-items">Win rate, average moves-to-victory, tactical accuracy</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
