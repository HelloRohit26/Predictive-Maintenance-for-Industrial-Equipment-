import React from 'react';
// Consider adding icons later with a library like react-icons
// import { FaThermometerHalf, FaCheckCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const StatCard = ({ title, value, unit, icon }) => {
    const displayValue = (value === null || value === undefined || isNaN(value))
        ? 'NaN'
        : value.toFixed(1); // Format to one decimal place

    const valueClass = (value === null || value === undefined || isNaN(value)) ? 'nan' : '';

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">{title}</span>
                {/* Render icon later */}
                 {/* {icon && <i className={`icon-${icon}`}></i>} */}
            </div>
            <div className={`card-value ${valueClass}`}>
                {displayValue}{unit}
            </div>
            {/* Optional subtext can be added here */}
        </div>
    );
};

export default StatCard;