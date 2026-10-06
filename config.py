import os

from dotenv import load_dotenv
from sqlalchemy import URL


load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env"
    )
)


class Config:
    SQLALCHEMY_DATABASE_URI = URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME"),
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
