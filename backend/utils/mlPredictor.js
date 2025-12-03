// Motor Maintenance/backend/utils/mlPredictor.js
// REVISED CODE - Fetches only Temperature data

const { spawn } = require('child_process');
const path = require('path'); // To help construct paths
const Temperature = require('../models/Temperature'); // Make sure the path is correct

async function getMlPrediction() {
    console.log('ML Prediction Service: Fetching data (Temperature Only)...');
    // Fetch enough historical data needed for your Python feature engineering
    // Adjust this number based on the maximum window/lag used in your features
    const historyLimit = 100; // Example: Adjust this number as required by your features

    let history;
    try {
        // --- MODIFIED: Select only Timestamp and temperature ---
        history = await Temperature.find()
            .sort({ timestamp: -1 }) // Get latest first
            .limit(historyLimit)
            .select('timestamp temperature') // <-- Selects only necessary fields
            .lean(); // Use .lean() for plain JS objects

        if (!history) {
            throw new Error("Database query returned null or undefined.");
        }
    } catch (dbError) {
        console.error("ML Prediction Service: Error fetching data from database:", dbError);
        // Reject the promise or return an error state
        return Promise.reject(new Error(`Database error: ${dbError.message}`));
    }

    // Reverse history so oldest is first, as Python might expect for time-series features
    const sortedHistory = history.reverse();

    // --- ADDED DEBUGGING LOGS ---
    console.log(`ML Prediction Service: Fetched ${sortedHistory?.length || 0} records.`);
    // Log the first record to check its structure
    if (sortedHistory && sortedHistory.length > 0) {
        console.log('ML Prediction Service: First record structure:', JSON.stringify(sortedHistory[0], null, 2));
    } else {
        console.log('ML Prediction Service: No records fetched or array is empty.');
    }
    // --- END DEBUGGING LOGS ---

    // --- Check for sufficient data - Adjust threshold if needed ---
    // Consider the minimum number of points required by your feature engineering
    const minRequiredPoints = 15; // Example: Adjust based on feature engineering needs
    if (!sortedHistory || sortedHistory.length < minRequiredPoints) {
         console.warn(`Warning: Not enough historical data for ML prediction. Found ${sortedHistory?.length || 0}, needed at least ${minRequiredPoints}`);
         // Return a specific structure indicating lack of data or error
         return { ml_prediction_probability: null, error: `Not enough data (at least ${minRequiredPoints} required)` };
    }
    // --- End Data Sufficiency Check ---

    // Prepare data for Python script (stringify the array of objects)
    let dataForPython;
    try {
        dataForPython = JSON.stringify(sortedHistory);
    } catch (stringifyError) {
         console.error("ML Prediction Service: Error stringifying history data:", stringifyError);
         return Promise.reject(new Error(`Failed to stringify data: ${stringifyError.message}`));
    }

    // --- ADDED DEBUGGING LOGS ---
    console.log(`ML Prediction Service: Sending JSON string (first 200 chars): ${dataForPython.substring(0, 200)}...`);
    // --- END DEBUGGING LOGS ---

    // Call the Python script
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ml_scripts', 'predict_failure.py');
        const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python'; // Use env var or default

        console.log(`ML Prediction Service: Spawning ${pythonExecutable} ${scriptPath}`);
        const scriptDir = path.dirname(scriptPath);
        console.log(`ML Prediction Service: Setting CWD to ${scriptDir}`);

        const pythonProcess = spawn(pythonExecutable, [scriptPath, dataForPython], { cwd: scriptDir });

        let resultJson = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            resultJson += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`Python stderr: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`ML Prediction Service: Python script closed with code ${code}.`);
            if (code !== 0) {
                console.error(`ML Prediction Service: Python script error output:\n ${errorOutput}`);
                reject(new Error(`ML script failed with code ${code}. Check backend logs.`));
            } else {
                try {
                    const trimmedResultJson = resultJson.trim();
                    if (!trimmedResultJson) {
                        console.error('ML Prediction Service: Python script exited cleanly but produced no output.');
                        reject(new Error('ML script produced no output.'));
                        return;
                    }
                    const result = JSON.parse(trimmedResultJson);
                    console.log('ML Prediction Service: Received result:', result);
                    resolve(result); // Should be { ml_prediction_probability: ... }
                } catch (parseError) {
                    console.error('ML Prediction Service: Error parsing Python output:', parseError);
                    console.error('ML Prediction Service: Raw Python output:', resultJson);
                    console.error('ML Prediction Service: Raw Python error output:', errorOutput);
                    reject(new Error('Failed to parse ML prediction result. Check backend logs for Python script output/errors.'));
                }
            }
        });

         pythonProcess.on('error', (err) => {
             console.error('ML Prediction Service: Failed to start Python script:', err);
             reject(new Error(`Failed to start Python script: ${err.message}`));
         });
    });
}

module.exports = { getMlPrediction };