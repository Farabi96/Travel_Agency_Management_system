import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
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
from routes.staff_notification_routes import staff_notification_bp
from routes.review_routes import review_bp
from routes.favorite_routes import favorite_bp
from routes.audit_log_routes import audit_log_bp
from routes.system_setting_routes import system_setting_bp
from routes.tour_schedule_routes import tour_schedule_bp
from routes.upload_routes import upload_bp

app = Flask(__name__)
app.config.from_object(Config)
app.config["UPLOAD_FOLDER"] = os.path.join(app.root_path, "uploads")
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    },
)

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
app.register_blueprint(staff_notification_bp)
app.register_blueprint(review_bp)
app.register_blueprint(favorite_bp)
app.register_blueprint(audit_log_bp)
app.register_blueprint(system_setting_bp)
app.register_blueprint(tour_schedule_bp)
app.register_blueprint(upload_bp)


@app.route("/")
def home():
    return "Travel Agency Management System - Flask is running!"


@app.route("/db-test")
def db_test():
    try:
        database_name = db.session.execute(
            text("SELECT current_database()")
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

# Start the scheduled task only in the serving process, not Flask's debug reloader

def run_completion_job(flask_app):
    """Run scheduled booking jobs inside Flask's application context."""
    from tasks.booking_completion import complete_returned_journeys
    from tasks.booking_expiry import expire_unpaid_bookings

    with flask_app.app_context():
        complete_returned_journeys()
        expire_unpaid_bookings()



if __name__ == "__main__":
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    scheduler.add_job(
        func=lambda: run_completion_job(app),
        trigger="interval",
        minutes=1,
        id="complete_returned_journeys",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()

    try:
        app.run(debug=True, use_reloader=False)
    finally:
        scheduler.shutdown(wait=False)
