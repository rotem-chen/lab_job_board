import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ─── 1. RESOLVE PASSWORD (Hierarchy: File -> Env Var -> Local Default) ───
db_password = 'jobboard123'
secret_path = os.getenv('DB_PASSWORD_FILE', '/run/secrets/db_password')

if os.path.exists(secret_path):
    try:
        with open(secret_path, 'r') as file:
            db_password = file.read().strip()
        print("[db] Using password from secret file")
    except Exception as e:
        print(f"[db] Could not read secret file: {e}")
elif os.getenv('DB_PASSWORD'):
    db_password = os.getenv('DB_PASSWORD')
    print("[db] Using password from environment variable")
else:
    print("[db] Using fallback local password")

# URL encode the password to safely handle any special characters
safe_password = urllib.parse.quote_plus(db_password)

# ─── 2. RESOLVE CONNECTION SETTINGS ──────────────────────────────────────
db_host = os.getenv('DB_HOST', 'localhost')
db_user = os.getenv('DB_USER', 'postgres')
db_name = os.getenv('DB_NAME', 'jobboard')
db_port = os.getenv('DB_PORT', '5432')

# ─── 3. CONSTRUCT DATABASE URL ───────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{safe_password}@{db_host}:{db_port}/{db_name}"

# ─── 4. INITIALIZE SQLALCHEMY ────────────────────────────────────────────
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()