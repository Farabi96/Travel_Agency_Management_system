from extensions import db


class RolePermission(db.Model):
    __tablename__ = "role_permissions"

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.role_id"),
        primary_key=True
    )

    permission_id = db.Column(
        db.Integer,
        db.ForeignKey("permissions.permission_id"),
        primary_key=True
    )
