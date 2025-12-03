# Predictive Maintenance for Industrial Equipment

Comprehensive project that monitors motor temperature, stores readings in MongoDB, emits live data via Socket.IO, and predicts failure probability using a trained ML model.

## Overview

- Backend: Express.js API with Socket.IO, MongoDB storage, email alerts, and an ML bridge to a Python predictor.
- Frontend: React app (Create React App) that shows live charts, stats, and predictions.
- ML: Python script `backend/ml_scripts/predict_failure.py` loads a trained model (`trained_rf_model.joblib`) and returns prediction probability.

## Repository structure

- `backend/` — Node/Express backend, routes, models, ML bridge, and scripts.
  - `server.js` — entry point
  - `routes/temperature.js` — API endpoints for temperature data and predictions
  - `ml_scripts/` — Python predictor and trained model
- `frontend/` — React app (Create React App)

## Prerequisites

- Node.js (recommended v16 or v18+) and npm
- Python 3.8+ (for ML script)
- MongoDB instance (Atlas or local)
- (Optional) Gmail account or SMTP server for email alerts

## Environment variables

Create a `.env` file inside the `backend/` folder with the following variables:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/dbname
PORT=5000
HIGH_TEMP_THRESHOLD=60
EMAIL_USER=you@example.com
EMAIL_PASS=your-email-password-or-app-password
EMAIL_TO=notify@example.com
PYTHON_EXECUTABLE=python
```

- `MONGODB_URI`: required to connect to MongoDB.
- `HIGH_TEMP_THRESHOLD`: temperature threshold (°C) for alerts.
- Email variables needed if you want alert emails sent.
- `PYTHON_EXECUTABLE` can override the `python` command (e.g., `python3`, path to venv python).

## Backend — Install and run

1. Open a PowerShell terminal and go to the backend folder:

```powershell
cd "d:\Project Work\My_Project\MotorMonitor\backend"
```

2. Install dependencies:

```powershell
npm install
```

3. Create `.env` (see environment variables above) and make sure `MONGODB_URI` is valid.

4. Start in development (auto-restarts on changes):

```powershell
npm run dev
```

5. Start in production:

```powershell
npm start
```

The backend listens on `PORT` (defaults to `5000`). API root: `http://localhost:5000/`.

### Important backend notes

- Socket.IO CORS is configured to allow `http://localhost:3000` (the frontend dev server). Change `server.js` if your front-end runs elsewhere.
- The ML bridge (`backend/utils/mlPredictor.js`) collects recent temperature documents and spawns the Python script `backend/ml_scripts/predict_failure.py`. The Python script expects a `trained_rf_model.joblib` file in `backend/ml_scripts/`.
- If there is not enough historical data, the ML endpoint will respond with an error indicating insufficient data.

## Python (ML) setup

1. Create and activate a Python virtual environment inside `backend/ml_scripts` (recommended):

```powershell
cd "d:\Project Work\My_Project\MotorMonitor\backend\ml_scripts"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install required packages:

```powershell
pip install pandas numpy scikit-learn joblib
```

3. Ensure `trained_rf_model.joblib` is placed inside `backend/ml_scripts/`.

4. You can test the python predictor independently (example uses a short JSON array string):

```powershell
python predict_failure.py "[{\"timestamp\": \"2025-01-01T00:00:00Z\", \"temperature\": 45}, {\"timestamp\": \"2025-01-01T00:01:00Z\", \"temperature\": 47}, ...]"
```

The script prints JSON with `ml_prediction_probability` on success.

## Frontend — Install and run

1. From repo root or directly:

```powershell
cd "d:\Project Work\My_Project\MotorMonitor\frontend"
npm install
npm start
```

2. Open `http://localhost:3000` in your browser.

To build for production:

```powershell
npm run build
```

## API Endpoints (summary)

- `GET /` — Basic health-check message
- `POST /api/temperature` — Save a temperature reading. Body: `{ "temperature": 42.5 }` (JSON)
- `GET /api/temperature/latest` — Latest reading
- `GET /api/temperature/stats` — Average, min, max for last 24h
- `GET /api/temperature/history?limit=50` — Recent readings (limit optional)
- `GET /api/temperature/predict` — Simple rule-based prediction (no ML)
- `GET /api/temperature/ml-predict` — ML-based prediction (runs Python script)
- `GET /api/temperature/alerts/history?limit=20` — Recent alert documents

## Run full stack locally

1. Start the backend (ensure `.env` configured):

```powershell
cd backend
npm run dev
```

2. Start the frontend in another terminal:

```powershell
cd frontend
npm start
```

3. Open `http://localhost:3000`.

## Troubleshooting

- If `ml-predict` returns errors about the model file, verify `backend/ml_scripts/trained_rf_model.joblib` exists and is compatible with the code.
- If the ML bridge fails with `Not enough data` increase the number of temperature samples stored or adjust `minRequiredPoints` in `backend/utils/mlPredictor.js`.
- Email sending requires valid SMTP credentials. For Gmail, use an App Password and set `EMAIL_PASS` accordingly.
- If MongoDB connection fails, verify connection string, network access, and that the database user has appropriate permissions.

## Deployment topics (quick notes)

- For production, host the backend on a server (with PM2 or systemd), serve frontend build as static files or from a CDN, and secure environment variables.
- Consider renaming default branch to `main` and updating GitHub branch settings.

## What I pushed

- I added this `README.md` and pushed it to `origin/master`.

## Contributing

PRs are welcome. Open an issue first to discuss larger changes.

---

If you want, I can:
- add a root `README` badge and short CI workflow,
- add a `requirements.txt` for the ML script,
- or add a PowerShell script to run both services together.
