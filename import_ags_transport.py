"""
Import AGS_Transport_To_Do Excel data into the PackageReport database.
Creates a new table under the workspace owned by valonhalili74@gmail.com.
"""

import openpyxl
import json
import uuid
import psycopg2
import sys
from datetime import datetime

# --- Configuration ---
DATABASE_URL = "postgresql://postgres.gxzvlsukjodbarlcjyys:Kukupermu1234@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
USER_EMAIL = "valonhalili74@gmail.com"
EXCEL_FILE = "AGS_Transport_To_Do_1774278327.xlsx"
TABLE_NAME = "AGS Transport"

# --- Column definitions matching the Excel columns ---
# Excel header row is at index 2 (0-based), data starts at index 3
# Columns (from the excel):
# 0: KLIENTI (client)        -> Text
# 1: (empty)                 -> skip
# 2: STATUSI                 -> Status
# 3: (empty)                 -> skip
# 4: EKSPORTUESI             -> Text
# 5: IMPORTUESI              -> Text
# 6: TRANSPORTUESI           -> Text
# 7: SHTETI                  -> Country
# 8: SASIA / PESHA           -> Text
# 9: LLOJI I NGARKIMIT (T/P) -> Dropdown
# 10: DIMENSIONET e PALETAVE -> Text
# 11: CMIMI I KAMIONIT/       -> Text (actually empty for most rows)
# 12: TERHEQJA E DERGESES     -> Status (pickup)
# 13: DOREZIMI I DERGESES     -> Status (delivery)
# 14: Q (price/quote)        -> Text
# 15: Data (date)            -> Date
# 16: SHENIME                -> Text
# 17: Item ID                -> Text

# Connect to DB
print(f"Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Find user ID for the given email
cur.execute("SELECT id FROM users WHERE email = %s", (USER_EMAIL,))
user_row = cur.fetchone()
if not user_row:
    print(f"ERROR: No user found with email {USER_EMAIL}")
    conn.close()
    sys.exit(1)
user_id = user_row[0]
print(f"Found user: {user_id}")

# 2. Find that user's workspace (first one)
cur.execute("SELECT id, name FROM workspaces WHERE owner_id = %s ORDER BY id LIMIT 1", (user_id,))
ws_row = cur.fetchone()
if not ws_row:
    print(f"ERROR: No workspace found for user {USER_EMAIL}")
    conn.close()
    sys.exit(1)
workspace_id, workspace_name = ws_row
print(f"Using workspace: {workspace_name} ({workspace_id})")

# 3. Parse the Excel file
wb = openpyxl.load_workbook(EXCEL_FILE)
ws_sheet = wb.active
all_rows = list(ws_sheet.iter_rows(values_only=True))
print(f"Total rows in Excel: {len(all_rows)}")

# Find header row - it's the row that contains column names we know
header_row_idx = None
for i, row in enumerate(all_rows):
    if row and any(cell is not None and 'KLIENTI' in str(cell).upper() for cell in row):
        header_row_idx = i
        break

if header_row_idx is None:
    # Try to find it another way - look for the row with 'STATUSI'
    for i, row in enumerate(all_rows):
        if row and any(cell is not None and 'STATUSI' in str(cell).upper() for cell in row):
            header_row_idx = i
            break

print(f"Header row index: {header_row_idx}")
if header_row_idx is not None:
    print(f"Header row: {all_rows[header_row_idx]}")

# 4. Define the columns for the new table
col_klienti_id = str(uuid.uuid4())
col_statusi_id = str(uuid.uuid4())
col_eksportuesi_id = str(uuid.uuid4())
col_importuesi_id = str(uuid.uuid4())
col_transportuesi_id = str(uuid.uuid4())
col_shteti_id = str(uuid.uuid4())
col_sasia_id = str(uuid.uuid4())
col_lloji_id = str(uuid.uuid4())
col_dimensionet_id = str(uuid.uuid4())
col_terheqja_id = str(uuid.uuid4())
col_dorezimi_id = str(uuid.uuid4())
col_q_id = str(uuid.uuid4())
col_data_id = str(uuid.uuid4())
col_shenime_id = str(uuid.uuid4())
col_item_id_id = str(uuid.uuid4())

columns = [
    {"id": col_klienti_id, "name": "KLIENTI", "type": "Text", "order": 0},
    {
        "id": col_statusi_id,
        "name": "STATUSI",
        "type": "Status",
        "order": 1,
        "options": [
            {"value": "E PERFUNDUAR", "color": "#00c875"},
            {"value": "NE DOGAN KS", "color": "#fdab3d"},
            {"value": "E ORGANIZUAR", "color": "#1976d2"},
            {"value": "NE PRITJE", "color": "#e2445c"},
            {"value": "E ANULUAR", "color": "#808080"},
            {"value": "NE ORGANIZIM", "color": "#9c27b0"},
        ]
    },
    {"id": col_eksportuesi_id, "name": "EKSPORTUESI", "type": "Text", "order": 2},
    {"id": col_importuesi_id, "name": "IMPORTUESI", "type": "Text", "order": 3},
    {"id": col_transportuesi_id, "name": "TRANSPORTUESI", "type": "Text", "order": 4},
    {"id": col_shteti_id, "name": "SHTETI", "type": "Country", "order": 5},
    {"id": col_sasia_id, "name": "SASIA / PESHA", "type": "Text", "order": 6},
    {
        "id": col_lloji_id,
        "name": "LLOJI I NGARKIMIT",
        "type": "Dropdown",
        "order": 7,
        "options": [
            {"value": "PARCIALE"},
            {"value": "E PLOTE"},
        ]
    },
    {"id": col_dimensionet_id, "name": "DIMENSIONET E PALETAVE", "type": "Text", "order": 8},
    {
        "id": col_terheqja_id,
        "name": "TERHEQJA E DERGESES NGA EKSPORTUESI",
        "type": "Status",
        "order": 9,
        "options": [
            {"value": "TERHEQJA E DERGESES ESHTE PERFUNDUAR ME SUKSES", "color": "#00c875"},
            {"value": "TERHEQJA E DERGESES ESHTE ANULUAR", "color": "#e2445c"},
            {"value": "NE PRITJE", "color": "#fdab3d"},
        ]
    },
    {
        "id": col_dorezimi_id,
        "name": "DOREZIMI I DERGESES TEK KLIENTI",
        "type": "Status",
        "order": 10,
        "options": [
            {"value": "DOREZIMI I DERGESES TEK KLIENTI ESHTE PERFUNDUAR ME SUKSES", "color": "#00c875"},
            {"value": "NE PRITJE", "color": "#fdab3d"},
        ]
    },
    {"id": col_q_id, "name": "Q", "type": "Text", "order": 11},
    {"id": col_data_id, "name": "Data", "type": "Date", "order": 12},
    {"id": col_shenime_id, "name": "SHENIME ME RENDESI", "type": "Text", "order": 13},
    {"id": col_item_id_id, "name": "Item ID", "type": "Text", "order": 14},
]

# 5. Create the table
table_id = str(uuid.uuid4())
created_at = int(datetime.now().timestamp() * 1000)

print(f"\nCreating table '{TABLE_NAME}' with ID: {table_id}")
cur.execute(
    "INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES (%s, %s, %s, %s, %s)",
    (table_id, TABLE_NAME, workspace_id, json.dumps(columns), created_at)
)

# 6. Insert rows from Excel
# Data rows start after the header row
if header_row_idx is None:
    print("ERROR: Could not find header row in Excel")
    conn.rollback()
    conn.close()
    sys.exit(1)

data_rows = all_rows[header_row_idx + 1:]
inserted_count = 0

for row in data_rows:
    # Skip completely empty rows or summary/total rows
    if not row or all(cell is None for cell in row):
        continue
    
    # Skip rows that look like summaries (col 0 is None and col 3 has a number)
    if row[0] is None and row[3] is not None and str(row[3]).strip().lstrip('-').isdigit():
        print(f"Skipping summary row: {row[3]}")
        continue

    # Extract values
    def safe_str(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return val.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        return str(val).strip() if str(val).strip() else None

    klienti = safe_str(row[0])
    statusi = safe_str(row[2])
    eksportuesi = safe_str(row[4])
    importuesi = safe_str(row[5])
    transportuesi = safe_str(row[6])
    shteti = safe_str(row[7])
    sasia = safe_str(row[8])
    lloji = safe_str(row[9])
    dimensionet = safe_str(row[10])
    # col 11 appears empty/merged
    terheqja = safe_str(row[12])
    dorezimi = safe_str(row[13])
    q = safe_str(row[14])
    data = safe_str(row[15])
    shenime = safe_str(row[16])
    item_id = safe_str(row[17])

    # Skip if all key fields are null (metadata rows)
    if not klienti and not statusi and not eksportuesi and not item_id:
        continue

    values = {
        col_klienti_id: klienti,
        col_statusi_id: statusi,
        col_eksportuesi_id: eksportuesi,
        col_importuesi_id: importuesi,
        col_transportuesi_id: transportuesi,
        col_shteti_id: shteti,
        col_sasia_id: sasia,
        col_lloji_id: lloji,
        col_dimensionet_id: dimensionet,
        col_terheqja_id: terheqja,
        col_dorezimi_id: dorezimi,
        col_q_id: q,
        col_data_id: data,
        col_shenime_id: shenime,
        col_item_id_id: item_id,
    }

    row_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO rows (id, table_id, values) VALUES (%s, %s, %s)",
        (row_id, table_id, json.dumps(values, ensure_ascii=False))
    )
    inserted_count += 1
    print(f"  Inserted row: {klienti} | {statusi} | {item_id}")

conn.commit()
print(f"\n✅ Done! Created table '{TABLE_NAME}' (ID: {table_id}) with {inserted_count} rows.")
cur.close()
conn.close()
