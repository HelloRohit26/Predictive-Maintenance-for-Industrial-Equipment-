import React from 'react';
import { format } from 'date-fns'; // For formatting timestamps

// --- Define Thresholds for Styling ---
// These should ideally match or relate to the thresholds used
// for triggering alerts in the backend and for the LiveChart annotations.
// Adjust these values as needed.
const CRITICAL_THRESHOLD = 80.0; // Example: Temp >= 80 is High priority
const WARNING_THRESHOLD = 75.0;  // Example: Temp >= 75 (but < 80) is Medium priority

// Helper function to determine CSS class based on priority (inferred from temp)
const getPriorityClass = (alert) => {
  if (alert?.temperature == null) {
    return 'priority-unknown'; // Default if temperature is missing
  }
  if (alert.temperature >= CRITICAL_THRESHOLD) {
    return 'priority-high';
  }
  if (alert.temperature >= WARNING_THRESHOLD) {
    return 'priority-medium';
  }
  // You could add a 'priority-low' class here if needed for other alerts
  return 'priority-normal'; // Default class for non-critical/warning
};

const AlertHistory = ({ alerts }) => {
  // Sort alerts newest first (optional, if backend doesn't sort)
  const sortedAlerts = alerts ? [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];

  return (
    // Ensure this outer div has 'card' and 'alert-history-card' classes
    // The grid span for this card is set in Dashboard.css
    <div className="card alert-history-card">
      <div className="card-header">
        <span className="card-title">ⓘ Alert History</span>
      </div>
      <div className="alert-list-container"> {/* Added container for scrolling */}
        {(!sortedAlerts || sortedAlerts.length === 0) ? (
          <p className="no-alerts-message">No recent alerts.</p>
        ) : (
          <ul className="alert-list">
            {sortedAlerts.map((alert) => {
              // Determine the priority class for styling
              const priorityClass = getPriorityClass(alert);
              // Format the timestamp
              const formattedTimestamp = alert.timestamp
                ? format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm') // Example format
                : 'Invalid Date';

              return (
                <li key={alert._id} className={`alert-item ${priorityClass}`}>
                  {/* Display alert details - adjust structure as needed */}
                  <div className="alert-main-line">
                    <span className="alert-message">
                      {/* Example: Construct message - adapt based on alert.message content */}
                      {`Motor M-05: ${alert.message || 'High Temperature'} (${formattedTimestamp})`}
                    </span>
                  </div>
                  <div className="alert-sub-line">
                     {/* Example: Show temperature details */}
                     {alert.temperature != null && (
                        `Temp: ${alert.temperature.toFixed(1)}°C `
                     )}
                     {/* You might add threshold info or explicit priority text here too */}
                     {/* (Threshold: XX°C) Priority: {priorityClass.split('-')[1]} */}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlertHistory;
