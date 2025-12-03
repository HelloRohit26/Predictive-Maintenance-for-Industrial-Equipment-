import React from 'react';

const SummaryCard = ({ title, value, subtext, icon, progressBarValue, barType }) => {
     const displayValue = (value === null || value === undefined || (typeof value === 'number' && isNaN(value)))
        ? 'NaN%'
        : typeof value === 'number' ? `${value.toFixed(0)}%` : value;

     let valueClass = '';
     // Example logic for coloring based on risk/value (adjust as needed)
     if (title === 'System Health' || title === 'Operating Efficiency') {
        if (value > 80) valueClass = 'low'; // Assuming higher % is better (low risk)
        else if (value > 50) valueClass = 'medium';
        else if (value !== null) valueClass = 'high';
        else valueClass = 'nan';
     }


    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{title}</span>
                 {/* Render icon later */}
                {/* {icon && <i className={`icon-${icon}`}></i>} */}
            </div>
             <div className={`card-value ${valueClass}`}>
                {displayValue}
            </div>
            {subtext && <div className="card-subtext">{subtext}</div>}
            {progressBarValue !== undefined && (
                 <div className="progress-bar-bg">
                    <div
                        className={`progress-bar-fill ${barType || ''}`}
                        style={{ width: `${progressBarValue}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default SummaryCard;