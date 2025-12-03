import React, { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register Chart.js components and plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    TimeScale,
    zoomPlugin
);

// --- Configuration ---
const CRITICAL_TEMP_THRESHOLD = 70.0;
const WARNING_TEMP_THRESHOLD = 60.0;

const TEMP_LINE_COLOR = '#E91E63';
const TEMP_GRADIENT_START = 'rgba(233, 30, 99, 0.5)';
const TEMP_GRADIENT_END = 'rgba(233, 30, 99, 0)';
const WARNING_THRESHOLD_COLOR = '#FFCE56';
const CRITICAL_THRESHOLD_COLOR = '#FF6384';
const AXIS_TICK_COLOR = '#a0a3c4';
const AXIS_GRID_COLOR = 'rgba(51, 54, 90, 0.7)';
const LEGEND_TEXT_COLOR = '#e0e0e0';
const TITLE_COLOR = '#e0e0e0';
const POINT_HOVER_BG = '#FFB1C1';

// --- Helper Function for Gradient ---
function createGradient(ctx, area) {
  if (!ctx || !area) {
    return TEMP_GRADIENT_START; // Fallback
  }
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, TEMP_GRADIENT_END);
  gradient.addColorStop(1, TEMP_GRADIENT_START);
  return gradient;
}

// --- Component ---
const LiveChart = ({ historyData }) => {
    const chartRef = useRef(null);
    const validHistoryData = Array.isArray(historyData) ? historyData : [];
    const timestamps = validHistoryData.map(d => new Date(d.timestamp));

    // --- Dynamic Y-Axis Calculation ---
    let yMin = 0;
    let yMax = 100;
    let yPadding = 10;

    if (validHistoryData.length > 0) {
        const temps = validHistoryData.map(d => d.temperature);
        const dataMin = Math.min(...temps, WARNING_TEMP_THRESHOLD, CRITICAL_TEMP_THRESHOLD);
        const dataMax = Math.max(...temps, WARNING_TEMP_THRESHOLD, CRITICAL_TEMP_THRESHOLD);
        const range = dataMax - dataMin;
        yPadding = Math.max(10, range * 0.15);
        yMin = Math.max(0, Math.floor(dataMin - yPadding));
        yMax = Math.ceil(dataMax + yPadding);
    }

    // --- Chart Data Configuration ---
    const chartData = {
        datasets: [
            {
                label: 'Temperature',
                data: validHistoryData.map(d => ({ x: new Date(d.timestamp), y: d.temperature })),
                borderColor: TEMP_LINE_COLOR,
                borderWidth: 2.5,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: POINT_HOVER_BG,
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    return createGradient(ctx, chartArea);
                },
            },
             {
                label: 'Warning Threshold',
                data: timestamps.map(t => ({ x: t, y: WARNING_TEMP_THRESHOLD })),
                borderColor: WARNING_THRESHOLD_COLOR,
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false,
                stepped: 'before',
            },
            {
                label: 'Critical Threshold',
                data: timestamps.map(t => ({ x: t, y: CRITICAL_TEMP_THRESHOLD })),
                borderColor: CRITICAL_THRESHOLD_COLOR,
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false,
                stepped: 'before',
            }
        ],
    };

    // --- Chart Options Configuration ---
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
             mode: 'index',
             intersect: false,
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    tooltipFormat: 'PPpp',
                    displayFormats: {
                       second: 'HH:mm:ss',
                       minute: 'HH:mm',
                       hour: 'HH:mm',
                    }
                },
                title: { // X-axis Title Configuration
                    display: true, // Set to true to show title
                    text: 'Time',  // The text for the title
                    color: AXIS_TICK_COLOR, // Use the same color as ticks
                    font: {
                       size: 12,
                       // weight: 'bold', // Optional: make it bold
                    },
                    padding: { top: 10, left: 0, right: 0, bottom: 0 } // Add padding if needed
                },
                ticks: {
                    color: AXIS_TICK_COLOR,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10
                },
                grid: {
                    color: AXIS_GRID_COLOR,
                    display: true
                }
            },
            y: {
                title: { // Y-axis Title Configuration
                    display: true, // Set to true to show title
                    text: 'Temperature (°C)', // The text for the title
                    color: AXIS_TICK_COLOR, // Use the same color as ticks
                     font: {
                       size: 12,
                       // weight: 'bold', // Optional: make it bold
                    },
                    padding: { top: 0, left: 0, right: 0, bottom: 10 } // Add padding if needed
                },
                ticks: { color: AXIS_TICK_COLOR },
                grid: { color: AXIS_GRID_COLOR },
                min: yMin,
                max: yMax,
            },
        },
        plugins: {
            title: {
                 display: true,
                 text: 'Live Temperature Trend (°C)',
                 color: TITLE_COLOR,
                 font: { size: 16, weight: 'bold' },
                 padding: { top: 10, bottom: 20 }
            },
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                     color: LEGEND_TEXT_COLOR,
                     boxWidth: 12,
                     padding: 15,
                     usePointStyle: false,
                     filter: (item) => item.text !== undefined && item.text !== null,
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                padding: 10,
                cornerRadius: 4,
                displayColors: false,
                callbacks: {
                    title: function(tooltipItems) {
                        const date = tooltipItems[0]?.parsed?.x;
                        return date ? new Date(date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium'}) : '';
                    },
                    label: function(tooltipItem) {
                        if (tooltipItem.datasetIndex === 0) {
                             let label = tooltipItem.dataset.label || '';
                             if (label) { label += ': '; }
                             if (tooltipItem.parsed.y !== null) {
                                 label += `${tooltipItem.parsed.y.toFixed(1)} °C`;
                             }
                             return label;
                        }
                        return null;
                    }
                }
            },
            zoom: {
                pan: { enabled: true, mode: 'x' },
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
            }
        }
    };

    return (
        <div className="card grid-span-2">
            <div className="chart-container">
                {validHistoryData.length > 0 ? (
                    <Line ref={chartRef} options={options} data={chartData} />
                ) : (
                    <p style={{ textAlign: 'center', color: '#a0a3c4', paddingTop: '50px' }}>
                        Waiting for data...
                    </p>
                )}
            </div>
        </div>
    );
};

export default LiveChart;