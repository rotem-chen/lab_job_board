import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# DATABASE_URL = os.getenv(
#     "DATABASE_URL",
#     "postgresql://postgres:jobboard123@localhost:5432/jobboard"
# )

secret_path = "/run/secrets/db_password"

# Read the password from the secret file
if os.path.exists(secret_path):
    with open(secret_path, "r") as file:
        db_password = file.read().strip()
else:
    db_password = "jobboard123" # Fallback for local execution

# Dynamically construct the database URL with the retrieved password
DATABASE_URL = f"postgresql://postgres:{urllib.parse.quote_plus(db_password)}@postgres:5432/jobboard"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
