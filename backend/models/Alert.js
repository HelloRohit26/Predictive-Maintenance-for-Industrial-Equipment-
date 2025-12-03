const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    temperature: { // The temperature that triggered the alert
        type: Number,
        required: true
    },
    message: { // Optional: A specific message for the alert
        type: String,
        default: 'High Temperature Threshold Exceeded'
    },
    timestamp: { // When the alert occurred
        type: Date,
        default: Date.now
    }
    // You could add other fields like 'thresholdValue' if needed
});

module.exports = mongoose.model('Alert', alertSchema);