from app import app
from extensions import db
import models  # noqa: F401 - imports all model classes

with app.app_context():
    db.create_all()
    print("Database tables created successfully.")