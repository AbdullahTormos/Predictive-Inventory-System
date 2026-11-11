import sys
import pandas as pd
import pyodbc

sys.stdout.reconfigure(encoding='utf-8')

CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=TURBO\\SQLEXPRESS;"         
    "DATABASE=InvetoryAnalysis;"       
    "Trusted_Connection=yes;"          
)

def get_db_connection():
    conn = pyodbc.connect(CONN_STR)
    conn.autocommit = False
    return conn

def create_tables(cursor):
    cursor.execute("DROP TABLE IF EXISTS purchase_orders;")
    cursor.execute("DROP TABLE IF EXISTS sales_log;")
    cursor.execute("DROP TABLE IF EXISTS products;")
    cursor.execute("DROP TABLE IF EXISTS suppliers;")
    
    cursor.execute("""
        CREATE TABLE suppliers (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name VARCHAR(100) UNIQUE,
            lead_time_days INT
        );
        CREATE TABLE products (
            id INT IDENTITY(1,1) PRIMARY KEY,
            sku VARCHAR(50) UNIQUE,
            category VARCHAR(50),
            current_stock INT,
            safety_stock INT,
            supplier_id INT FOREIGN KEY REFERENCES suppliers(id)
        );
        CREATE TABLE sales_log (
            id INT IDENTITY(1,1) PRIMARY KEY,
            product_id INT FOREIGN KEY REFERENCES products(id),
            quantity_sold INT,
            sale_date DATE
        );
        CREATE TABLE purchase_orders (
            po_id INT IDENTITY(1,1) PRIMARY KEY,
            product_id INT FOREIGN KEY REFERENCES products(id),
            supplier_id INT FOREIGN KEY REFERENCES suppliers(id),
            order_quantity INT NOT NULL,
            status VARCHAR(20) DEFAULT 'PENDING',
            order_date DATETIME DEFAULT GETDATE()
        );
    """)

def run_etl():
    df = pd.read_csv("Retail-Supply-Chain-Sales-Dataset.csv")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.fast_executemany = True

    try:
        create_tables(cursor)

        # 1. Seed Suppliers
        suppliers = [("Supplier A", 5), ("Supplier B", 10), ("Supplier C", 15)]
        cursor.executemany("INSERT INTO suppliers (name, lead_time_days) VALUES (?, ?)", suppliers)
        
        cursor.execute("SELECT id, name FROM suppliers")
        supplier_mapping = {name: s_id for s_id, name in cursor.fetchall()}
        default_supplier_id = next(iter(supplier_mapping.values()))

        # 2. Process Products (Vectorized)
        sales_summary = df.groupby('Product ID')['Quantity'].sum().to_dict()
        unique_products = df[['Product ID', 'Category']].drop_duplicates()

        product_rows = []
        for _, row in unique_products.iterrows():
            sku = row['Product ID']
            category = row['Category']
            total_units_sold = int(sales_summary.get(sku, 0))
            current_stock = max(0, 500 - total_units_sold)
            product_rows.append((sku, category, current_stock, 25, default_supplier_id))

        cursor.executemany(
            "INSERT INTO products (sku, category, current_stock, safety_stock, supplier_id) VALUES (?, ?, ?, ?, ?)",
            product_rows
        )

        # Build SKU to ID lookup map in one single query
        cursor.execute("SELECT sku, id FROM products")
        product_mapping = dict(cursor.fetchall())

        # 3. Process Sales Log (Batch Insert)
        df['product_id'] = df['Product ID'].map(product_mapping)
        df['sale_date'] = pd.to_datetime(df['Order Date']).dt.strftime('%Y-%m-%d')
        
        sales_rows = list(zip(df['product_id'], df['Quantity'].astype(int), df['sale_date']))
        cursor.executemany(
            "INSERT INTO sales_log (product_id, quantity_sold, sale_date) VALUES (?, ?, ?)",
            sales_rows
        )

        # 4. Initial Purchase Orders
        cursor.execute("""
            INSERT INTO purchase_orders (product_id, supplier_id, order_quantity, status, order_date)
            SELECT id, supplier_id, (safety_stock * 2), 'PENDING', GETDATE()
            FROM products
            WHERE current_stock <= (safety_stock * 2);
        """)

        conn.commit()
        print("ETL complete.")

    except Exception as e:
        conn.rollback()
        print(f"ETL failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_etl()