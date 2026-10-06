from extensions import db


class Permission(db.Model):
    __tablename__ = "permissions"

    permission_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    permission_name = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.String(255),
        nullable=True
    )
