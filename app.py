from flask import Flask
from sqlalchemy import text

from config import Config
from extensions import db
from models import Role, Permission, User

from routes.destination_routes import destination_bp
from routes.tour_package_routes import tour_package_bp
from routes.booking_routes import booking_bp
from routes.invoice_routes import invoice_bp
from routes.payment_routes import payment_bp
from routes.customer_routes import customer_bp


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

app.register_blueprint(destination_bp)
app.register_blueprint(tour_package_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(invoice_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(customer_bp)


@app.route("/")
def home():
    return "Travel Agency Management System - Flask is running!"


@app.route("/db-test")
def db_test():
    try:
        database_name = db.session.execute(
            text("SELECT DATABASE()")
        ).scalar()

        return f"Database connected successfully: {database_name}"

    except Exception as e:
        return f"Database connection failed: {e}", 500


@app.route("/roles")
def roles():
    roles = Role.query.all()

    return "<br>".join(
        f"{role.role_id} - {role.role_name}"
        for role in roles
    )


if __name__ == "__main__":
    app.run(debug=True)

