import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
async def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    """
    Returns high-level civic metrics aggregated across MongoDB.
    Uses aggregation pipelines.
    """
    db = get_database()
    match_query = {}
    if current_user.get("role") != "ADMIN":
        match_query = {"created_by": current_user["_id"]}

    # Aggregations
    pipeline = [
        {"$match": match_query} if match_query else {"$match": {}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "fire_count": {
                    "$sum": {"$cond": [{"$eq": ["$incident_type", "FIRE"]}, 1, 0]}
                },
                "smoke_count": {
                    "$sum": {"$cond": [{"$eq": ["$incident_type", "SMOKE"]}, 1, 0]}
                },
                "waste_bin_count": {
                    "$sum": {"$cond": [{"$eq": ["$incident_type", "WASTE_BIN_OVERFLOW"]}, 1, 0]}
                },
                "live_camera_count": {
                    "$sum": {"$cond": [{"$eq": ["$source_type", "LIVE_CAMERA"]}, 1, 0]}
                },
                "uploaded_video_count": {
                    "$sum": {"$cond": [{"$eq": ["$source_type", "UPLOADED_VIDEO"]}, 1, 0]}
                },
                "avg_confidence": {"$avg": "$confidence"}
            }
        }
    ]

    res = await db.incidents.aggregate(pipeline).to_list(1)
    if res:
        data = res[0]
        return {
            "total_incidents": data.get("total", 0),
            "fire_incidents": data.get("fire_count", 0),
            "smoke_incidents": data.get("smoke_count", 0),
            "waste_bin_incidents": data.get("waste_bin_count", 0),
            "live_camera_incidents": data.get("live_camera_count", 0),
            "uploaded_video_incidents": data.get("uploaded_video_count", 0),
            "avg_confidence": round(data.get("avg_confidence", 0.0) or 0.0, 3)
        }

    return {
        "total_incidents": 0,
        "fire_incidents": 0,
        "smoke_incidents": 0,
        "waste_bin_incidents": 0,
        "live_camera_incidents": 0,
        "uploaded_video_incidents": 0,
        "avg_confidence": 0.0
    }


@router.get("/incidents-over-time")
async def get_incidents_over_time(
    group_by: str = Query("day", pattern="^(day|week|month)$"),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns time-series incidents aggregated by day, week, or month using MongoDB aggregation.
    """
    db = get_database()
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    match_filter = {"created_at": {"$gte": start_date}}
    if current_user.get("role") != "ADMIN":
        match_filter["created_by"] = current_user["_id"]

    date_format = "%Y-%m-%d"
    if group_by == "month":
        date_format = "%Y-%m"
    elif group_by == "week":
        date_format = "%Y-W%V"

    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": {
                    "date": {"$dateToString": {"format": date_format, "date": "$created_at"}},
                    "type": "$incident_type"
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.date": 1}}
    ]

    cursor = db.incidents.aggregate(pipeline)
    raw_data = await cursor.to_list(1000)

    # Transform into clean chart series format
    date_map = {}
    for item in raw_data:
        d = item["_id"]["date"]
        t = item["_id"]["type"]
        c = item["count"]
        if d not in date_map:
            date_map[d] = {"date": d, "FIRE": 0, "SMOKE": 0, "WASTE_BIN_OVERFLOW": 0, "total": 0}
        date_map[d][t] = date_map[d].get(t, 0) + c
        date_map[d]["total"] += c

    result = list(date_map.values())
    result.sort(key=lambda x: x["date"])
    return result


@router.get("/distribution")
async def get_distribution(current_user: dict = Depends(get_current_user)):
    """Returns incident type and source distribution breakdown."""
    db = get_database()
    match_filter = {}
    if current_user.get("role") != "ADMIN":
        match_filter["created_by"] = current_user["_id"]

    type_pipeline = [
        {"$match": match_filter} if match_filter else {"$match": {}},
        {"$group": {"_id": "$incident_type", "count": {"$sum": 1}}}
    ]
    source_pipeline = [
        {"$match": match_filter} if match_filter else {"$match": {}},
        {"$group": {"_id": "$source_type", "count": {"$sum": 1}}}
    ]

    type_res = await db.incidents.aggregate(type_pipeline).to_list(10)
    source_res = await db.incidents.aggregate(source_pipeline).to_list(10)

    return {
        "by_type": [{"type": item["_id"], "count": item["count"]} for item in type_res if item["_id"]],
        "by_source": [{"source": item["_id"], "count": item["count"]} for item in source_res if item["_id"]]
    }
