const mongoose = require('mongoose');

const temperatureSchema = new mongoose.Schema({
    temperature: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
    // Add other fields if needed later (e.g., motorId)
});

module.exports = mongoose.model('Temperature', temperatureSchema);