from flask import Flask
from flask_jwt_extended import JWTManager
from sqlalchemy import text

from config import Config
from extensions import db
from models import Role, Permission, User

from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.customer_routes import customer_bp
from routes.destination_routes import destination_bp
from routes.tour_package_routes import tour_package_bp
from routes.booking_routes import booking_bp
from routes.invoice_routes import invoice_bp
from routes.payment_routes import payment_bp
from routes.staff_routes import staff_bp
from routes.notice_routes import notice_bp
from routes.customer_notification_routes import customer_notification_bp
from routes.review_routes import review_bp
from routes.favorite_routes import favorite_bp
from routes.audit_log_routes import audit_log_bp
from routes.system_setting_routes import system_setting_bp


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

jwt = JWTManager(app)


# Register all application blueprints
app.register_blueprint(admin_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(customer_bp)
app.register_blueprint(destination_bp)
app.register_blueprint(tour_package_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(invoice_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(staff_bp)
app.register_blueprint(notice_bp)
app.register_blueprint(customer_notification_bp)
app.register_blueprint(review_bp)
app.register_blueprint(favorite_bp)
app.register_blueprint(audit_log_bp)
app.register_blueprint(system_setting_bp)


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
