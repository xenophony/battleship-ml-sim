# Battleship AI Game Viewer

A React-based web application for viewing and analyzing Battleship AI agent games.

## Features

- **Live Playback**: Watch games turn-by-turn with playback controls
- **Agent Categories**: Agents grouped by type (Classic, ML, Ensemble, RL, LLM)
- **Dark Theme**: Console-inspired dark theme matching the Python implementation
- **Summary View**: View multi-game statistics and rankings
- **Speed Control**: Adjust playback speed from 0.5x to 10x

## Installation

```bash
cd react_display
npm install
```
Updating
## Running the App

```bash
npm start
```

The app will open at http://localhost:3000

## Loading Game Data

The app loads game files from the `public/` folder. To use it:

1. Run games using the Python runner:
   ```bash
   python runner_comparison.py --games 5 --no-llm
   ```

2. Copy the game files to the React app's public folder:
   ```bash
   cd react_display
   python copy_game_files.py
   ```

3. Start the React app:
   ```bash
   npm start
   ```

The app will automatically detect and load the game files from the public folder.

## File Structure

```
react_display/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AgentCategory.js/css    # Groups agents by category
│   │   ├── BoardDisplay.js/css     # Individual board display
│   │   ├── Controls.js/css         # Playback controls
│   │   ├── GameViewer.js/css       # Main game viewer
│   │   └── SummaryView.js/css      # Summary statistics view
│   ├── App.js/css                  # Main app component
│   ├── index.js
│   └── index.css
└── package.json
```

## Cell Symbols

- `·` - Unknown/Empty cell
- `○` - Miss
- `✖` - Hit (before ship is sunk)
- `■` - Sunk ship
