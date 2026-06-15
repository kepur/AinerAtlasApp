from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models import Report, UserBlock, utc_now
from app.schemas import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=201)
def create_report(
    payload: ReportCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> Report:
    report = Report(
        reporter_id=current_user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        description=payload.description,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/mine", response_model=list[ReportRead])
def my_reports(current_user: CurrentUser, db: DBSession) -> list[Report]:
    return list(
        db.scalars(
            select(Report)
            .where(Report.reporter_id == current_user.id)
            .order_by(Report.created_at.desc())
        )
    )


@router.post("/block/{user_id}")
def block_user(user_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    existing = db.scalar(
        select(UserBlock).where(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == user_id,
        )
    )
    if not existing:
        db.add(UserBlock(blocker_id=current_user.id, blocked_id=user_id))
        db.commit()
    return {"message": "用户已拉黑", "blocked_id": user_id}


@router.delete("/block/{user_id}")
def unblock_user(user_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    block = db.scalar(
        select(UserBlock).where(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == user_id,
        )
    )
    if block:
        db.delete(block)
        db.commit()
    return {"message": "已取消拉黑", "blocked_id": user_id}


@router.get("/admin/queue", response_model=list[ReportRead])
def admin_report_queue(_: AdminUser, db: DBSession) -> list[Report]:
    return list(
        db.scalars(
            select(Report)
            .where(Report.status == "pending")
            .order_by(Report.created_at.desc())
            .limit(100)
        )
    )


@router.put("/admin/{report_id}/resolve")
def resolve_report(report_id: str, _: AdminUser, db: DBSession) -> dict:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "resolved"
    db.commit()
    return {"message": "举报已处理", "report_id": report_id}
