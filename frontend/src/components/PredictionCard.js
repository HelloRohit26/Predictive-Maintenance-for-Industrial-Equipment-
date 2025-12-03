import React from 'react';

const PredictionCard = ({ riskLevel, probability }) => {
    const displayProbability = (probability === null || probability === undefined || isNaN(probability))
        ? 'NaN%'
        : `${probability.toFixed(0)}%`;

    let riskClass = 'low'; // Default
    if (riskLevel === 'Medium') riskClass = 'medium';
    if (riskLevel === 'High') riskClass = 'high';
    if (riskLevel === 'Unknown') riskClass = 'nan';

    const barWidth = (probability === null || isNaN(probability)) ? 0 : probability;

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">⚡ Failure Prediction</span>
            </div>
            <div>Risk Level</div>
            <div className={`risk-level card-value ${riskClass}`}>{riskLevel || 'Unknown'}</div>
            <div>Failure Probability</div>
            <div className="probability-bar-container">
                <div
                    className="probability-bar-fill"
                    style={{ width: `${barWidth}%` }}
                ></div>
                 <span className="probability-text">{displayProbability}</span>
            </div>
        </div>
    );
};

export default PredictionCard;