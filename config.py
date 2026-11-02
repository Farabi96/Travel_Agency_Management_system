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
    # Render can provide DATABASE_URL; local development uses DB_* variables.
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        # Render PostgreSQL URLs may use postgres://; SQLAlchemy needs postgresql+psycopg.
        if database_url.startswith("postgres://"):
            database_url = database_url.replace(
                "postgres://",
                "postgresql+psycopg://",
                1
            )
        elif database_url.startswith("postgresql://"):
            database_url = database_url.replace(
                "postgresql://",
                "postgresql+psycopg://",
                1
            )

        SQLALCHEMY_DATABASE_URI = database_url
    else:
        SQLALCHEMY_DATABASE_URI = URL.create(
            "postgresql+psycopg",
            username=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME"),
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key")
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "change-this-secret-key"
    )

    JWT_TOKEN_LOCATION = ["headers"]