const nodemailer = require('nodemailer');

// Configure the transporter using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your email provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use App Password for Gmail
    },
});

const sendHighTempAlert = (temperature) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: 'High Temperature Alert - Motor Maintenance',
        text: `Alert! Motor temperature reached ${temperature}°C, which is above the threshold of ${process.env.HIGH_TEMP_THRESHOLD}°C. Please check the equipment.`,
        // html: `<p>Alert! Motor temperature reached <b>${temperature}°C</b>...</p>` // Optional HTML version
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Alert Email sent:', info.response);
        }
    });
};

module.exports = { sendHighTempAlert };