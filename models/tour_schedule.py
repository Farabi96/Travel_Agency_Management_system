
from extensions import db


class TourSchedule(db.Model):
    __tablename__ = "tour_schedules"

    schedule_id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    package_id = db.Column(
        db.BigInteger,
        db.ForeignKey("tour_packages.package_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    departure_datetime = db.Column(
        db.DateTime,
        nullable=False
    )

    return_datetime = db.Column(
        db.DateTime,
        nullable=False
    )

    max_capacity = db.Column(
        db.Integer,
        nullable=False
    )

    schedule_status = db.Column(
        db.String(20),
        nullable=False,
        default="SCHEDULED",
        server_default="SCHEDULED"
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    package = db.relationship(
        "TourPackage",
        backref="schedules"
    )
