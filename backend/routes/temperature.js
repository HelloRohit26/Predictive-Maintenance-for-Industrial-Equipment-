const express = require('express');
const Temperature = require('../models/Temperature');
const Alert = require('../models/Alert'); // Import the new Alert model
const { sendHighTempAlert } = require('../utils/mailer');
const mlPredictor = require('../utils/mlPredictor');
const router = express.Router();

// Threshold from environment variable
const HIGH_TEMP_THRESHOLD = parseFloat(process.env.HIGH_TEMP_THRESHOLD || '60'); // Default to 70 if not set

let lastAlertSentTime = 0;
const alertCooldown = 1 * 60 * 1000; // Cooldown period in milliseconds (e.g., 10 minutes)

// POST /api/temperature - Receive data from ESP32
router.post('/', async (req, res) => { // Added async
    const { temperature } = req.body;
    const io = req.app.get('socketio'); // Get socket.io instance

    if (temperature === undefined || isNaN(temperature)) {
        return res.status(400).json({ message: 'Invalid temperature data' });
    }

    try {
        const newTemp = new Temperature({ temperature });
        const savedTemp = await newTemp.save();

        // Emit the new temperature reading via Socket.IO
        io.emit('new-temperature', savedTemp); // Send the full saved object

        // Check for high temperature alert
        const now = Date.now();
        if (temperature > HIGH_TEMP_THRESHOLD && (now - lastAlertSentTime > alertCooldown)) {
            console.log(`High temperature detected (${temperature}°C). Sending alert.`);
            sendHighTempAlert(temperature);
            lastAlertSentTime = now; // Update last alert time

            // --- Added: Save the alert to the database ---
            try {
                const newAlert = new Alert({
                    temperature: temperature,
                    message: `Temperature ${temperature.toFixed(1)}°C exceeded threshold ${HIGH_TEMP_THRESHOLD}°C` // Example message
                });
                await newAlert.save();
                console.log('Alert saved to database.');
                // Optional: Emit the new alert to connected clients
                // io.emit('new-alert', newAlert);
            } catch (alertSaveError) {
                console.error('Error saving alert to database:', alertSaveError);
            }
            // --- End Added Section ---

        } else if (temperature > HIGH_TEMP_THRESHOLD) {
            console.log(`High temperature detected (${temperature}°C), but within cooldown period.`);
        }

        res.status(201).json(savedTemp);
    } catch (error) {
        console.error("Error processing temperature:", error); // Changed log message slightly
        io.emit('error', { message: 'Error saving temperature data on server.' }); // Notify clients of error
        res.status(500).json({ message: 'Error saving temperature data', error: error.message });
    }
});

// GET /api/temperature/latest - Get the most recent reading
router.get('/latest', async (req, res) => {
    try {
        const latestTemp = await Temperature.findOne().sort({ timestamp: -1 });
        res.json(latestTemp || {}); // Return empty object if no data
    } catch (error) {
        res.status(500).json({ message: 'Error fetching latest temperature', error: error.message });
    }
});

// GET /api/temperature/stats - Get basic stats (avg, min, max)
router.get('/stats', async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const stats = await Temperature.aggregate([
            { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
            {
                $group: {
                    _id: null,
                    average: { $avg: '$temperature' },
                    highest: { $max: '$temperature' },
                    lowest: { $min: '$temperature' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const latestTemp = await Temperature.findOne().sort({ timestamp: -1 });

        const result = {
            current: latestTemp ? latestTemp.temperature : null,
            average: stats[0]?.average || null,
            highest: stats[0]?.highest || null,
            lowest: stats[0]?.lowest || null,
        };

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching temperature stats', error: error.message });
    }
});

// GET /api/temperature/history - Get data for the graph
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50');
        const history = await Temperature.find()
                                       .sort({ timestamp: -1 })
                                       .limit(limit)
                                       .sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching temperature history', error: error.message });
    }
});

// GET /api/temperature/predict - Simple prediction based on latest temp
router.get('/predict', async (req, res) => {
    try {
        const latestTemp = await Temperature.findOne().sort({ timestamp: -1 });
        let riskLevel = 'Low';
        let probability = 0;

        const temp = latestTemp ? latestTemp.temperature : null;
        const mediumThreshold = 50;
        const highThreshold = HIGH_TEMP_THRESHOLD;

        if (temp === null) {
             riskLevel = 'Unknown';
             probability = null;
        } else if (temp >= highThreshold) {
            riskLevel = 'High';
            probability = Math.min(100, ((temp - highThreshold) / 20) * 100);
        } else if (temp >= mediumThreshold) {
            riskLevel = 'Medium';
            probability = Math.max(0, ((temp - mediumThreshold) / (highThreshold - mediumThreshold)) * 100);
        } else {
            riskLevel = 'Low';
             probability = Math.max(0, (temp / mediumThreshold) * 100);
        }

         if (probability !== null) {
            probability = Math.max(0, Math.min(100, Math.round(probability)));
         }

        res.json({
            riskLevel: riskLevel,
            failureProbability: probability
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching prediction', error: error.message });
    }
});

// --- Added: GET /api/temperature/alerts/history - Get alert history ---
router.get('/alerts/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '20'); // Limit to recent alerts, e.g., 20
        const alerts = await Alert.find()
                                  .sort({ timestamp: -1 }) // Get newest first
                                  .limit(limit);
        res.json(alerts);
    } catch (error) {
        console.error("Error fetching alert history:", error);
        res.status(500).json({ message: 'Error fetching alert history', error: error.message });
    }
});
// GET /api/temperature/ml-predict - Get ML-based prediction
router.get('/ml-predict', async (req, res) => {
    try {
        console.log("API: Received request for /ml-predict");
        const predictionResult = await mlPredictor.getMlPrediction();
        console.log("API: Sending ML prediction result:", predictionResult);
        // Check if the result indicates an error (like not enough data)
        if (predictionResult.error) {
             // Send a specific status code or message for handled errors
             res.status(400).json({ message: predictionResult.error });
        } else {
            res.json(predictionResult); // Send { ml_prediction_probability: ... }
        }
    } catch (error) {
        // Catch errors from getMlPrediction promise rejection
        console.error("API Error in /ml-predict:", error);
        res.status(500).json({ message: error.message || 'Error getting ML prediction' });
    }
});
// --- End Added Section ---

module.exports = router;