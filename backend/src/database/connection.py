import os
from sqlmodel import create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://postgres:solji@localhost:5432/caguayo_inventario"
)
print("+++++++++ " + DATABASE_URL + " ++++++++")
engine = create_engine(DATABASE_URL)


def get_session():
    with Session(engine) as session:
        yield session
