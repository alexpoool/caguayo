import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:1234@localhost:5432/inventario_db"
)
print("+++++++++ " + DATABASE_URL + " ++++++++")
engine = create_engine(DATABASE_URL)


def get_session():
    with Session(engine) as session:
        yield session
