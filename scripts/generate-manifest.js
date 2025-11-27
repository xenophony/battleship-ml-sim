const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Find all game board files
const files = fs.readdirSync(assetsDir);
const games = files
  .filter(f => /^game_\d+_boards_.*\.json$/.test(f))
  .sort();

// Find summary file
const summary = files.find(f => f.startsWith('game_summary_') && f.endsWith('.txt')) || null;

// Write manifest
const manifest = { games, summary };
fs.writeFileSync(path.join(assetsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('Generated manifest.json:', { games: games.length, summary });
