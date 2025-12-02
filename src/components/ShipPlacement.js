import React, { useState } from 'react';
import './ShipPlacement.css';

const SHIPS = [
  { name: 'Carrier', size: 5, id: 'carrier' },
  { name: 'Battleship', size: 4, id: 'battleship' },
  { name: 'Cruiser', size: 3, id: 'cruiser' },
  { name: 'Submarine', size: 3, id: 'submarine' },
  { name: 'Destroyer', size: 2, id: 'destroyer' },
];

function ShipPlacement({ onShipsPlaced }) {
  const [board, setBoard] = useState(Array(10).fill(null).map(() => Array(10).fill(null)));
  const [placedShips, setPlacedShips] = useState({}); 
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [orientation, setOrientation] = useState('horizontal'); 

  const canPlaceShip = (r, c, size, orient, currentBoard) => {
    if (orient === 'horizontal') {
      if (c + size > 10) return false;
      for (let i = 0; i < size; i++) if (currentBoard[r][c + i]) return false;
    } else {
      if (r + size > 10) return false;
      for (let i = 0; i < size; i++) if (currentBoard[r + i][c]) return false;
    }
    return true;
  };

  const placeShip = (r, c) => {
    if (!selectedShipId) return;
    const ship = SHIPS.find(s => s.id === selectedShipId);
    
    // Create temp board to validate
    const tempBoard = board.map(row => [...row]);
    
    // Remove existing if moving
    if (placedShips[selectedShipId]) {
      const old = placedShips[selectedShipId];
      if (old.orientation === 'horizontal') {
        for (let i = 0; i < old.size; i++) tempBoard[old.r][old.c + i] = null;
      } else {
        for (let i = 0; i < old.size; i++) tempBoard[old.r + i][old.c] = null;
      }
    }

    if (!canPlaceShip(r, c, ship.size, orientation, tempBoard)) return;

    // Place new
    if (orientation === 'horizontal') {
      for (let i = 0; i < ship.size; i++) tempBoard[r][c + i] = ship.id;
    } else {
      for (let i = 0; i < ship.size; i++) tempBoard[r + i][c] = ship.id;
    }

    setBoard(tempBoard);
    setPlacedShips(prev => ({
      ...prev,
      [ship.id]: { r, c, orientation, size: ship.size, name: ship.name }
    }));
  };

  const handleConfirm = () => {
    const apiFormat = Object.values(placedShips).map(s => {
      const coords = [];
      for (let i=0; i<s.size; i++) {
        coords.push(s.orientation === 'horizontal' ? [s.r, s.c+i] : [s.r+i, s.c]);
      }
      return { name: s.name, size: s.size, coords };
    });
    onShipsPlaced(apiFormat);
  };

  const allPlaced = Object.keys(placedShips).length === SHIPS.length;

  return (
    <div className="placement-container">
      <div className="placement-header">
        <h3>DEPLOY FLEET</h3>
        <p className="instruction">Select ship &gt; Tap grid to place</p>
      </div>

      <div className="placement-controls">
        <button 
          className="rotate-btn"
          onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
        >
          ROTATION: {orientation.toUpperCase()} ⟳
        </button>
      </div>

      {/* TRAY */}
      <div className="ship-tray">
        {SHIPS.map(ship => {
          const isPlaced = !!placedShips[ship.id];
          const isSelected = selectedShipId === ship.id;
          return (
            <button
              key={ship.id}
              className={`tray-ship ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedShipId(ship.id)}
            >
              <div className="ship-name">{ship.name} ({ship.size})</div>
              <div className="ship-preview">
                {Array(ship.size).fill(0).map((_, i) => (
                  <div key={i} className={`preview-cell ship-${ship.id}`}></div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* GRID */}
      <div className="placement-grid">
        <div className="grid-labels-row">
           <span className="label-corner"></span>
           {['A','B','C','D','E','F','G','H','I','J'].map(c => <span key={c}>{c}</span>)}
        </div>
        {board.map((row, r) => (
          <div key={r} className="grid-row">
            <span className="row-label">{r}</span>
            {row.map((cellId, c) => {
              const isOccupied = !!cellId;
              const isCurrentSelection = cellId === selectedShipId;
              const shipClass = isOccupied ? `ship-${cellId}` : '';
              return (
                <div 
                  key={c} 
                  className={`grid-cell ${isOccupied ? 'occupied' : ''} ${shipClass} ${isCurrentSelection ? 'highlight' : ''}`}
                  onClick={() => placeShip(r, c)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="placement-footer">
        <button className="confirm-btn" disabled={!allPlaced} onClick={handleConfirm}>
          {allPlaced ? "ENGAGE ENEMY >>" : "PLACE ALL SHIPS"}
        </button>
      </div>
    </div>
  );
}

export default ShipPlacement;