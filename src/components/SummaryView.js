import React from 'react';
import './SummaryView.css';

function SummaryView({ summaryData }) {
  if (!summaryData) {
    return (
      <div className="summary-view">
        <div className="no-summary">
          <p>No summary data available.</p>
          <p>Summary files are generated when running multiple games with the --games option.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-view">
      <div className="summary-content">
        <pre>{summaryData}</pre>
      </div>
    </div>
  );
}

export default SummaryView;
