import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import StatCard from './StatCard'; // Reusing StatCard for ML prediction display
import SummaryCard from './SummaryCard';
import LiveChart from './LiveChart';
import PredictionCard from './PredictionCard';
import AlertHistory from './AlertHistory'; // Assuming you created this component
import '../styles/Dashboard.css';

// Define backend URL and chart history limit
const BACKEND_URL = 'http://localhost:5000'; // Your backend server URL
const MAX_HISTORY_POINTS = 50; // Max points to show on the graph

const Dashboard = () => {
    // State variables for dashboard data
    const [stats, setStats] = useState({ current: null, average: null, highest: null, lowest: null });
    const [history, setHistory] = useState([]);
    const [prediction, setPrediction] = useState({ riskLevel: 'Unknown', failureProbability: null }); // Threshold-based prediction
    const [isConnected, setIsConnected] = useState(false);
    const [alertHistory, setAlertHistory] = useState([]);
    const [mlPrediction, setMlPrediction] = useState({ ml_prediction_probability: null }); // State for ML prediction

    // useRef to hold the socket instance
    const socketRef = useRef(null);

    // Function to fetch initial stats, history, and threshold-prediction data
    const fetchInitialCoreData = async () => {
        console.log("Fetching initial core data...");
        try {
            const [statsRes, historyRes, predictionRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/temperature/stats`),
                fetch(`${BACKEND_URL}/api/temperature/history?limit=${MAX_HISTORY_POINTS}`),
                fetch(`${BACKEND_URL}/api/temperature/predict`) // Threshold-based prediction endpoint
            ]);
            // Process responses (condensed for brevity)
            if (statsRes.ok) setStats(await statsRes.json()); else console.error("Stats fetch failed");
            if (historyRes.ok) setHistory(await historyRes.json()); else console.error("History fetch failed");
            if (predictionRes.ok) setPrediction(await predictionRes.json()); else console.error("Prediction fetch failed");
        } catch (error) {
            console.error("Error fetching initial core data:", error);
        }
    };

    // Function to fetch alert history
    const fetchAlertHistory = async () => {
        console.log("Fetching alert history...");
        try {
            const res = await fetch(`${BACKEND_URL}/api/temperature/alerts/history?limit=20`);
            if (res.ok) setAlertHistory(await res.json()); else setAlertHistory([]);
        } catch (error) {
            console.error("Error fetching alert history:", error); setAlertHistory([]);
        }
    };

    // Function to fetch ML prediction
    const fetchMlPrediction = async () => {
        console.log("Fetching ML prediction...");
        try {
            // Calls the new endpoint created in Phase 2, Step 4
            const res = await fetch(`${BACKEND_URL}/api/temperature/ml-predict`);
            if (res.ok) {
                const data = await res.json();
                console.log("ML Prediction Data:", data);
                // Ensure data has the expected key, default to null if not found or on error
                setMlPrediction({ ml_prediction_probability: data?.ml_prediction_probability ?? null });
            } else {
                console.error("ML prediction fetch failed:", res.status);
                setMlPrediction({ ml_prediction_probability: null });
            }
        } catch (error) {
            console.error("Error fetching ML prediction:", error);
            setMlPrediction({ ml_prediction_probability: null });
        }
    };


    // useEffect hook for setup
    useEffect(() => {
        // Fetch all data types on initial mount
        fetchInitialCoreData();
        fetchAlertHistory();
        fetchMlPrediction(); // <-- Fetch ML prediction on mount

        // --- Setup Socket.IO Connection ---
        if (!socketRef.current) {
            console.log('Attempting to connect socket...');
            socketRef.current = io(BACKEND_URL, {
                reconnectionAttempts: 5, reconnectionDelay: 3000, transports: ['websocket']
            });

            socketRef.current.on('connect', () => {
                console.log('Socket connected:', socketRef.current.id);
                setIsConnected(true);
                // Re-fetch all data on connect/reconnect
                fetchInitialCoreData();
                fetchAlertHistory();
                fetchMlPrediction(); // <-- Re-fetch ML prediction on connect
            });
            socketRef.current.on('disconnect', () => { setIsConnected(false); });
            socketRef.current.on('connect_error', () => { setIsConnected(false); });

            socketRef.current.on('new-temperature', (newTempData) => {
                console.log('---- Received new temperature event ----', newTempData);
                // Update history chart data
                setHistory(prev => [...prev, newTempData].slice(-MAX_HISTORY_POINTS));
                // Fetch updated stats and threshold-based prediction
                fetch(`${BACKEND_URL}/api/temperature/stats`).then(r => r.ok ? r.json() : null).then(d => d && setStats({ ...d, current: newTempData.temperature }));
                fetch(`${BACKEND_URL}/api/temperature/predict`).then(r => r.ok ? r.json() : null).then(d => d && setPrediction(d));
                // Optionally fetch ML prediction on new temp data (might be too frequent)
                fetchMlPrediction(); // Fetch ML prediction whenever new temp data arrives
            });

            // Optional: Listener for real-time 'new-alert' events
            /*
            socketRef.current.on('new-alert', (newAlert) => {
                 console.log('Received new alert via socket:', newAlert);
                 setAlertHistory(prev => [newAlert, ...prev].slice(0, 20));
            });
            */

            socketRef.current.on('error', (errorMsg) => { console.error('Backend Socket Error:', errorMsg); });
        }

        // --- Cleanup Logic ---
        return () => {
            if (socketRef.current?.connected) { socketRef.current.disconnect(); }
            socketRef.current = null; setIsConnected(false);
        };
    }, []); // Empty dependency array


    // --- Derived State for UI Calculation ---
    let systemHealth = null; let operatingEfficiency = null;
    if (prediction.riskLevel === 'High') { systemHealth = 20; operatingEfficiency = 40; }
    else if (prediction.riskLevel === 'Medium') { systemHealth = 60; operatingEfficiency = 75; }
    else if (prediction.riskLevel === 'Low') { systemHealth = 95; operatingEfficiency = 98; }

    // --- Render Dashboard ---
    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <h1>Motor Maintenance Dashboard</h1>
                <div className="header-info">
                    <span style={{ color: isConnected ? '#4caf50' : '#f44336', fontWeight: 'bold', marginRight: '10px' }}>
                        {isConnected ? '● Connected' : '● Disconnected'}
                    </span>
                     {/* Add dynamic uptime calculation if needed */}
                    <span className="uptime">Uptime: ...</span>
                    <span className="alerts-enabled">Alerts Enabled</span>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="dashboard-grid">
                {/* Row 1: Summary */}
                <SummaryCard title="System Health" value={systemHealth} progressBarValue={systemHealth} />
                <SummaryCard title="Operating Efficiency" value={operatingEfficiency} subtext="Last 7 days:" progressBarValue={operatingEfficiency} barType="efficiency" />
                <SummaryCard title="Next Maintenance" value="Routine Inspection" subtext="Scheduled: Feb 18" />

                {/* Row 2: Stats (Combined Rule & ML Predictions) */}
                <StatCard title="Current Temp" value={stats.current} unit="°C" />
                <StatCard title="Avg Temp" value={stats.average} unit="°C" />
                <StatCard title="Highest Temp" value={stats.highest} unit="°C" />
                <StatCard title="Lowest Temp" value={stats.lowest} unit="°C" />
                <PredictionCard title="Rule-Based Risk" riskLevel={prediction.riskLevel} probability={prediction.failureProbability} />

                {/* --- Modified ML Prediction Stat Card (added className) --- */}
                <StatCard
                    className="ml-prediction-stat-card" // Added class for custom styling
                    title="Predicted Motor Failure Risk"
                    value={mlPrediction.ml_prediction_probability != null ? (mlPrediction.ml_prediction_probability * 100) : null}
                    unit="%"
                    tooltip="Predicted probability of failure based on ML model"
                />
                {/* --- End Modified Card --- */}


                {/* Row 3: Chart and Alert History */}
                <LiveChart historyData={history} />
                <AlertHistory alerts={alertHistory} /> {/* Assuming you created this component */}


            </div>
        </div>
    );
};

export default Dashboard;