import React from 'react';

function Cell({ value, onClick }) {
  return (
    <div className="cell" onClick={onClick}>
      {value !== null ? value : ''}
    </div>
  );
}

export default Cell;