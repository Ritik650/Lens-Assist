import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scan import Expense
from app.dependencies import get_current_user_id

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("")
def list_expenses(
    month: str = None,
    category: str = None,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    query = db.query(Expense).filter(Expense.user_id == user_id)
    if month:
        query = query.filter(Expense.date.like(f"{month}%"))
    if category:
        query = query.filter(Expense.category == category)
    expenses = query.order_by(Expense.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "store_name": e.store_name,
            "date": e.date,
            "total": e.total,
            "currency": e.currency,
            "category": e.category,
            "items": json.loads(e.items or "[]"),
            "created_at": e.created_at,
        }
        for e in expenses
    ]


@router.get("/summary")
def expense_summary(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    expenses = db.query(Expense).filter(Expense.user_id == user_id).all()
    totals = {}
    for e in expenses:
        cat = e.category or "other"
        totals[cat] = totals.get(cat, 0) + (e.total or 0)
    return {"by_category": totals, "total": sum(totals.values())}
