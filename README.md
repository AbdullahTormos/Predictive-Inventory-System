# Predictive Inventory System

A full-stack inventory management platform that uses a Random Forest model to forecast stock demand, so reorder decisions are based on data instead of guesswork.

![Screenshot](docs/screenshot.png)

## Features

- Track products, stock levels, and movements in one place
- Demand forecasting with a Random Forest model trained on historical data
- [Reorder alerts / low-stock warnings: keep or delete]
- [Dashboard with sales and stock charts: keep or delete]
- [Add or remove features so this matches what you built]

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React |
| Backend | Node.js |
| Database | SQL Server |
| Machine learning | Random Forest [add library, e.g. scikit-learn] |

## How the Prediction Works

1. Historical data is pulled from SQL Server: [list features, e.g. past sales, date, product category].
2. A Random Forest model is trained to predict [what it predicts, e.g. demand for the next period].
3. Predictions are served to the app and shown in [where they appear].
