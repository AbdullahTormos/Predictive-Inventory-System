# Predictive Inventory System

A full-stack inventory management platform that uses a Random Forest model to forecast stock demand, so reorder decisions are based on data instead of guesswork.

![Screenshot](docs/screenshot.png)
<!-- Add a screenshot of your dashboard here -->

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

Model performance: [add a metric if you have one, e.g. RMSE / R² / accuracy]

## Getting Started

### Prerequisites

- Node.js [version]
- SQL Server
- [Python version, if the model runs in Python]

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/predictive-inventory-system.git
cd predictive-inventory-system

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### Configuration

Create a `.env` file in the server folder (never commit it):

```
DB_SERVER=localhost
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
PORT=5000
```

Run the SQL script in `database/` to create the tables: [adjust path].

### Run

```bash
# Backend
cd server
npm start

# Frontend (new terminal)
cd client
npm start
```

## Project Structure

```
client/     React frontend
server/     Node.js API
database/   SQL scripts
model/      Random Forest training code
```
<!-- Adjust to match your real folders -->

## Author

**Abdullah Tormos**: [LinkedIn link] · [email]
