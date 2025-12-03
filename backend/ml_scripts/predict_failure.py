# Motor Maintenance/backend/ml_scripts/predict_failure.py
# REVISED CODE - Uses the final 15 user-specified features

import joblib
import sys
import json
import pandas as pd
import numpy as np
import os # Import os module

# --- FEATURE ENGINEERING FUNCTION (Revised for Final 15 Features) ---
def engineer_features(df):
    """
    Engineers features from the time-series sensor data based on user specs (15 features).

    Args:
        df: pandas DataFrame containing the sensor data with a DatetimeIndex
            and the 'Temperature (°C)' column.

    Returns:
        pandas DataFrame with engineered features.
    """
    print(f"Debug [engineer_features]: Received df with index type: {type(df.index)}", file=sys.stderr)
    if not pd.api.types.is_datetime64_any_dtype(df.index):
        print("ERROR [engineer_features]: Index is NOT DatetimeIndex!", file=sys.stderr)
        raise TypeError("Input DataFrame must have a DatetimeIndex.")

    print("Debug: Starting feature engineering function (Final 15 Features).", file=sys.stderr)

    temp_col = 'Temperature (°C)'
    required_cols = [temp_col]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column for feature engineering: '{col}'. Available columns: {list(df.columns)}")

    # Ensure Temperature column is numeric
    df[temp_col] = pd.to_numeric(df[temp_col], errors='coerce')
    # Basic imputation for base Temperature (needed before diff)
    df[temp_col] = df[temp_col].fillna(method='ffill').fillna(0) # Use ffill() directly

    try:
        # --- Calculate required features ---
        print(f"Debug [engineer_features]: Calculating features for '{temp_col}'", file=sys.stderr)

        # 1. Temp_Change
        df['Temp_Change'] = df[temp_col].diff(periods=1)
        df['Temp_Change'] = df['Temp_Change'].fillna(0) # Impute first NaN

        # 2. Time-based features (NEW)
        df['DayOfWeek'] = df.index.dayofweek
        df['HourOfDay'] = df.index.hour

        # 3. Rolling features for Temperature
        # --- USER MAY NEED TO ADJUST WINDOW SIZE '15T' ---
        rolling_window = '15T'
        print(f"Debug [engineer_features]: Using rolling window: {rolling_window}", file=sys.stderr)
        df['Temperature (°C)_RollingMean'] = df[temp_col].rolling(window=rolling_window).mean()
        df['Temperature (°C)_RollingStd'] = df[temp_col].rolling(window=rolling_window).std()

        # 4. Rolling features for Temp_Change
        df['Temp_Change_RollingMean'] = df['Temp_Change'].rolling(window=rolling_window).mean()
        df['Temp_Change_RollingStd'] = df['Temp_Change'].rolling(window=rolling_window).std()

        # 5. Lag features for Temperature
        df['Temperature (°C)_Lag1'] = df[temp_col].shift(periods=1)
        df['Temperature (°C)_Lag2'] = df[temp_col].shift(periods=2)
        df['Temperature (°C)_Lag3'] = df[temp_col].shift(periods=3)

        # 6. Lag features for Temp_Change
        df['Temp_Change_Lag1'] = df['Temp_Change'].shift(periods=1)
        df['Temp_Change_Lag2'] = df['Temp_Change'].shift(periods=2)
        df['Temp_Change_Lag3'] = df['Temp_Change'].shift(periods=3)

        # 7. Interaction Term
        df['Temp_Change_x_Temp'] = df['Temp_Change'] * df[temp_col]

        # --- Imputation for newly created features ---
        print("Debug [engineer_features]: Imputing NaNs in engineered features", file=sys.stderr)
        # Note: DayOfWeek and HourOfDay derived from index usually don't have NaNs if index is clean
        all_engineered_cols = [
            'Temp_Change', # Already imputed first NaN
            'Temperature (°C)_RollingMean', 'Temperature (°C)_RollingStd',
            'Temp_Change_RollingMean', 'Temp_Change_RollingStd',
            'Temperature (°C)_Lag1', 'Temperature (°C)_Lag2', 'Temperature (°C)_Lag3',
            'Temp_Change_Lag1', 'Temp_Change_Lag2', 'Temp_Change_Lag3',
            'Temp_Change_x_Temp'
            # DayOfWeek, HourOfDay typically don't need imputation here
        ]
        for col in all_engineered_cols:
             if col in df.columns:
                 # Use ffill() directly instead of deprecated method='ffill'
                 df[col] = df[col].ffill()

        # Impute remaining NaNs (likely at the beginning after ffill)
        df['Temperature (°C)_RollingStd'] = df['Temperature (°C)_RollingStd'].fillna(0)
        df['Temp_Change_RollingStd'] = df['Temp_Change_RollingStd'].fillna(0)

        first_temp = df[temp_col].iloc[0] if not df.empty else 0
        first_temp_change = df['Temp_Change'].iloc[0] if not df.empty else 0

        df['Temperature (°C)_RollingMean'] = df['Temperature (°C)_RollingMean'].fillna(first_temp)
        df['Temp_Change_RollingMean'] = df['Temp_Change_RollingMean'].fillna(first_temp_change)
        df['Temperature (°C)_Lag1'] = df['Temperature (°C)_Lag1'].fillna(first_temp)
        df['Temperature (°C)_Lag2'] = df['Temperature (°C)_Lag2'].fillna(first_temp)
        df['Temperature (°C)_Lag3'] = df['Temperature (°C)_Lag3'].fillna(first_temp)
        df['Temp_Change_Lag1'] = df['Temp_Change_Lag1'].fillna(first_temp_change)
        df['Temp_Change_Lag2'] = df['Temp_Change_Lag2'].fillna(first_temp_change)
        df['Temp_Change_Lag3'] = df['Temp_Change_Lag3'].fillna(first_temp_change)
        df['Temp_Change_x_Temp'] = df['Temp_Change_x_Temp'].fillna(0)

        print("Debug: Finished feature engineering (Final 15 Features).", file=sys.stderr)
        print(f"Debug: Columns after engineering: {list(df.columns)}", file=sys.stderr)

        return df

    except KeyError as e:
        print(f"Error during feature engineering: Missing column {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"Error during feature engineering: {e}", file=sys.stderr)
        import traceback
        print(traceback.format_exc(), file=sys.stderr)
        raise
# --- END OF FEATURE ENGINEERING FUNCTION ---


# --- Load the pre-trained model ---
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'trained_rf_model.joblib')
    print(f"Debug: Attempting to load model from: {model_path}", file=sys.stderr)
    model = joblib.load(model_path)
except FileNotFoundError:
    print(f"FATAL Error: Model file not found at '{model_path}'. Place the model file correctly.", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"FATAL Error loading model: {e}", file=sys.stderr)
    sys.exit(1)
# --- End Model Loading ---


# --- Main execution block ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
         print("FATAL Error: No input data provided via command-line argument.", file=sys.stderr)
         sys.exit(1)

    input_data_json_str = sys.argv[1]
    print(f"Debug: Received raw input string (first 200 chars): {input_data_json_str[:200]}...", file=sys.stderr)

    try:
        # 1. Parse input JSON
        history_data = json.loads(input_data_json_str)
        print(f"Debug: Parsed history_data type: {type(history_data)}", file=sys.stderr)
        if not isinstance(history_data, list) or len(history_data) == 0:
             raise ValueError("Input data is not a non-empty list after JSON parsing.")
        print(f"Debug: Number of records received: {len(history_data)}", file=sys.stderr)

        # 2. Convert to DataFrame
        df = pd.DataFrame(history_data)
        print(f"Debug: Created DataFrame with shape {df.shape} and columns {list(df.columns)}", file=sys.stderr)

        # --- Rename 'temperature' to 'Temperature (°C)' ---
        rename_map = {'temperature': 'Temperature (°C)'}
        if 'temperature' not in df.columns:
             raise ValueError("Missing required 'temperature' column from Node.js data.")
        df.rename(columns=rename_map, inplace=True)
        print(f"Debug: Columns after renaming: {list(df.columns)}", file=sys.stderr)
        # --- END Renaming Step ---

        # 3. Preprocess DataFrame Index
        if 'Timestamp' not in df.columns:
             if 'timestamp' in df.columns:
                 df.rename(columns={'timestamp': 'Timestamp'}, inplace=True)
                 print("Debug: Renamed 'timestamp' to 'Timestamp'.", file=sys.stderr)
             else:
                 raise ValueError(f"Missing 'Timestamp' column in input data. Available columns: {list(df.columns)}")

        try:
             df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
             if df['Timestamp'].isnull().any():
                  raise ValueError("Timestamp parsing resulted in NaNs.")
        except Exception as e_parse:
             print(f"FATAL Error: Could not parse Timestamp column: {e_parse}", file=sys.stderr)
             raise ValueError("Timestamp parsing failed.") from e_parse

        df.set_index('Timestamp', inplace=True)
        df.sort_index(inplace=True)
        print(f"Debug: Index type AFTER setting: {type(df.index)}", file=sys.stderr)
        if not pd.api.types.is_datetime64_any_dtype(df.index):
             raise TypeError("Index is not a DatetimeIndex after conversion attempt.")
        print(f"Debug: DataFrame shape before feature engineering: {df.shape}", file=sys.stderr)
        print(f"Debug: Data types before feature engineering:\n{df.dtypes}", file=sys.stderr)

        # 4. Apply Feature Engineering
        df_with_features = engineer_features(df.copy())

        # 5. Extract Features for the latest data point
        if df_with_features.empty:
             raise ValueError("DataFrame is empty after feature engineering.")
        if len(df_with_features) < 4: # Need at least 4 rows for Lag3
             raise ValueError(f"Not enough data rows ({len(df_with_features)}) after processing to generate all required features.")

        last_row = df_with_features.iloc[-1]
        print(f"Debug: Last row for prediction (index {last_row.name}):\n{last_row}", file=sys.stderr)

        # --- ### USE THE CORRECT 15-FEATURE LIST PROVIDED BY USER ### ---
        FINAL_FEATURE_COLUMNS = [
            'Temperature (°C)', 'Temp_Change', 'DayOfWeek', 'HourOfDay',
            'Temperature (°C)_RollingMean', 'Temperature (°C)_RollingStd',
            'Temp_Change_RollingMean', 'Temp_Change_RollingStd',
            'Temperature (°C)_Lag1', 'Temperature (°C)_Lag2', 'Temperature (°C)_Lag3',
            'Temp_Change_Lag1', 'Temp_Change_Lag2', 'Temp_Change_Lag3',
            'Temp_Change_x_Temp'
        ]
        # --- ### END USER LIST ### ---

        # Check if all expected feature columns exist in the last row
        missing_cols = [col for col in FINAL_FEATURE_COLUMNS if col not in last_row.index]
        if missing_cols:
             df_missing = [col for col in FINAL_FEATURE_COLUMNS if col not in df_with_features.columns]
             print(f"Error: Columns missing from df_with_features entirely: {df_missing}", file=sys.stderr)
             print(f"Error: All df_with_features columns: {list(df_with_features.columns)}", file=sys.stderr)
             raise ValueError(f"Missing expected FINAL feature columns in last row after engineering: {missing_cols}.")

        # Select features and handle potential NaNs
        features_for_prediction = last_row[FINAL_FEATURE_COLUMNS].tolist()
        print(f"Debug: Features before final NaN check: {features_for_prediction}", file=sys.stderr)
        features_for_prediction = [0 if pd.isna(f) else f for f in features_for_prediction]
        print(f"Debug: Final features for prediction (count: {len(features_for_prediction)}): {features_for_prediction}", file=sys.stderr)

        # 6. Make Prediction
        # Check number of features against model expectation
        # This check should now pass if the model truly expects 15 features
        if hasattr(model, 'n_features_in_') and len(features_for_prediction) != model.n_features_in_:
             raise ValueError(f"Incorrect number of final features. Model expects {model.n_features_in_}, but script generated {len(features_for_prediction)} features based on FINAL_FEATURE_COLUMNS.")
        elif not hasattr(model, 'n_features_in_'):
             print("Warning: Loaded model object does not have 'n_features_in_' attribute for validation.", file=sys.stderr)


        prediction_probability = model.predict_proba([features_for_prediction])[0][1]
        print(f"Debug: Predicted probability: {prediction_probability}", file=sys.stderr)

        # 7. Output JSON result
        print(json.dumps({"ml_prediction_probability": prediction_probability}))

    # Error handling blocks remain the same...
    except json.JSONDecodeError as e:
         print(f"FATAL Error decoding JSON input: {e}", file=sys.stderr)
         print(f"Received input string snippet: {input_data_json_str[:200]}...", file=sys.stderr)
         sys.exit(1)
    except ValueError as e:
         print(f"FATAL Error during processing: {e}", file=sys.stderr)
         sys.exit(1)
    except Exception as e:
        import traceback
        print(f"FATAL An unexpected error occurred in Python script: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)