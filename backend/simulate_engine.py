import sys
import json
import pyodbc
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor

sys.stdout.reconfigure(encoding='utf-8')

def main():
    sku = sys.argv[1] if len(sys.argv) > 1 else 'SKU0'
    lead_time_delay = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    demand_surge_pct = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0

    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=TURBO\\SQLEXPRESS;"
        "DATABASE=InvetoryAnalysis;"
        "Trusted_Connection=yes;"
    )

    try:
        conn = pyodbc.connect(conn_str)
        
        prod_query = "SELECT current_stock, safety_stock FROM products WHERE sku = ?"
        prod_df = pd.read_sql(prod_query, conn, params=[sku])
        
        current_stock = int(prod_df.iloc[0]['current_stock']) if not prod_df.empty else 100
        safety_stock = int(prod_df.iloc[0]['safety_stock']) if not prod_df.empty else 20

        sales_query = """
            SELECT CAST(s.sale_date AS DATE) as date, SUM(s.quantity_sold) as actual
            FROM sales_log s
            JOIN products p ON s.product_id = p.id
            WHERE p.sku = ?
            GROUP BY CAST(s.sale_date AS DATE)
            ORDER BY date ASC
        """
        df = pd.read_sql(sales_query, conn, params=[sku])
        conn.close()

    except Exception as e:
        current_stock = 100
        safety_stock = 20
        df = pd.DataFrame()

    if df.empty or len(df) < 3:
        dates = [datetime.today() - timedelta(days=i) for i in range(14, 0, -1)]
        df = pd.DataFrame({'date': dates, 'actual': [10 + (i % 4) for i in range(14)]})

    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.dayofweek
    df['lag_1'] = df['actual'].shift(1)
    
    train_df = df.dropna().copy()
    
    if len(train_df) < 2:
        train_df = df.bfill().ffill()

    X = train_df[['day_of_week', 'lag_1']]
    y = train_df['actual']

    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)

    chart_data = []
    total_stressed_demand = 0
    last_actual = train_df.iloc[-1]['actual']
    today = datetime.today()

    for i in range(1, 8):
        future_date = today + timedelta(days=i)
        dow = future_date.weekday()
        
        baseline_pred = float(model.predict([[dow, last_actual]])[0])
        surge_multiplier = 1.0 + (demand_surge_pct / 100.0)
        stressed_pred = baseline_pred * surge_multiplier

        chart_data.append({
            "day": f"Day {i}",
            "Baseline": int(round(max(0, baseline_pred))),
            "StressedDemand": int(round(max(0, stressed_pred)))
        })

        total_stressed_demand += stressed_pred
        last_actual = baseline_pred

    avg_stressed_demand = total_stressed_demand / 7.0
    
    daily_depletion = avg_stressed_demand
    days_stock_will_last = current_stock / daily_depletion if daily_depletion > 0 else 30
    projected_stockout_days = max(0, int(round((lead_time_delay + 7) - days_stock_will_last)))

    recommended_reorder = max(0, int(round((avg_stressed_demand * (7 + lead_time_delay)) - current_stock + safety_stock)))

    output = {
        "simulatedDemand": int(round(avg_stressed_demand)),
        "projectedStockoutDays": projected_stockout_days,
        "recommendedReorderQty": recommended_reorder,
        "chartData": chart_data
    }

    print(json.dumps(output))

if __name__ == '__main__':
    main()