import json
import os
from datetime import datetime, timezone, timedelta

from main import get_daily, get_investor, get_theme, get_program

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "cache")
WATCHLIST_PATH = os.path.join(BASE_DIR, "watchlist.json")

KST = timezone(timedelta(hours=9))


def ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def load_watchlist():
    if not os.path.exists(WATCHLIST_PATH):
        return []

    with open(WATCHLIST_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    return [str(code).zfill(6) for code in data]


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def update_one(code):
    code = str(code).zfill(6)

    daily = get_daily(code, refresh=1)
    investor = get_investor(code, refresh=1)
    theme = get_theme(code, refresh=1)
    program = get_program(code, refresh=1)

    save_json(os.path.join(CACHE_DIR, f"daily_{code}.json"), daily)
    save_json(os.path.join(CACHE_DIR, f"investor_{code}.json"), investor)
    save_json(os.path.join(CACHE_DIR, f"theme_{code}.json"), theme)
    save_json(os.path.join(CACHE_DIR, f"program_{code}.json"), program)

    return {
        "code": code,
        "dailyCount": daily.get("count", 0) if isinstance(daily, dict) else 0,
        "investorOk": bool(isinstance(investor, dict) and investor.get("summary")),
        "themeOk": bool(isinstance(theme, dict) and theme.get("themeGroups")),
        "programOk": bool(isinstance(program, dict) and program.get("summary")),
    }


def update_all():
    ensure_cache_dir()
    codes = load_watchlist()
    results = []

    for code in codes:
        try:
            results.append(update_one(code))
        except Exception as e:
            results.append({
                "code": code,
                "error": str(e),
            })

    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")

    status = {
        "lastUpdate": now,
        "timezone": "Asia/Seoul",
        "count": len(results),
        "results": results,
    }

    save_json(os.path.join(CACHE_DIR, "last_update.json"), status)

    return status


if __name__ == "__main__":
    print(json.dumps(update_all(), ensure_ascii=False, indent=2))