from flask import request
from flask_jwt_extended import get_jwt_identity
from extensions import db
from models.audit_log import AuditLog


def log_activity(
    action,
    table_name,
    record_id=None,
    old_values=None,
    new_values=None,
):
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None

    log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.remote_addr,
    )

    print(
    f"[AUDIT] user_id={user_id}, action={action}, "
    f"table={table_name}, record_id={record_id}",
    flush=True
)


    db.session.add(log)
    db.session.flush()

    return log