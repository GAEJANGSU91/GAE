from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pykrx import stock
from datetime import datetime, timedelta
import pandas as pd
import FinanceDataReader as fdr
import os
import json
import requests
from io import StringIO


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

THEME_OVERRIDE_PATH = os.path.join(BASE_DIR, "theme_override.csv")
THEME_MOMENTUM_PATH = os.path.join(BASE_DIR, "theme_momentum.csv")
MANUAL_THEME_PATH = os.path.join(BASE_DIR, "theme_override_manual.csv")
THEME_RULES_PATH = os.path.join(BASE_DIR, "theme_rules.csv")
STOCK_UNIVERSE_PATH = os.path.join(BASE_DIR, "stock_universe.json")
CACHE_DIR = os.path.join(BASE_DIR, "cache")

UPDATE_TOKEN = os.environ.get("UPDATE_TOKEN", "")

TICKER_CACHE = {"data": []}

THEME_CACHE = {
    "overrides": None,
    "momentum": None,
    "rules": None,
}


PERIOD_DAYS = {
    "1주": 5,
    "1개월": 20,
    "3개월": 60,
    "6개월": 120,
    "1년": 240,
    "2년": 480,
}

NAVER_LONG_TERM_PAGES = 55


# =========================
# 공통 유틸
# =========================

def to_yyyymmdd(dt):
    return dt.strftime("%Y%m%d")


def safe_int(value):
    try:
        if pd.isna(value):
            return 0
        return int(float(value))
    except Exception:
        return 0


def safe_float(value):
    try:
        if pd.isna(value):
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def split_pipe(value):
    text = str(value or "").strip()
    if not text:
        return []
    return [x.strip() for x in text.split("|") if x.strip()]


def format_won(value):
    try:
        value = int(round(float(value)))
        return f"{value:,}원"
    except Exception:
        return "-"


def clamp_number(value, low=0, high=100):
    try:
        value = float(value)
        return max(low, min(high, value))
    except Exception:
        return low


def clean_number(value):
    try:
        text = str(value).strip()
        if text in ["", "nan", "NaN", "N/A", "-"]:
            return 0
        text = text.replace(",", "")
        text = text.replace("+", "")
        text = text.replace("%", "")
        return float(text)
    except Exception:
        return 0


def make_headers(code):
    return {
        "User-Agent": "Mozilla/5.0",
        "Referer": f"https://finance.naver.com/item/main.naver?code={code}",
    }


# =========================
# 테마 / 종목 데이터
# =========================

def get_market_cap_from_row(row):
    candidates = [
        "Marcap",
        "MarketCap",
        "Market Cap",
        "marketCap",
        "시가총액",
        "시총",
    ]

    for col in candidates:
        if col in row:
            value = safe_float(row.get(col))
            if value > 0:
                return int(value)

    return 0


def classify_theme_by_name_and_market(name: str, market: str = ""):
    name = str(name or "")
    market = str(market or "")
    text = name + " " + market

    if any(x in text for x in [
        "반도체", "하이닉스", "삼성전자", "한미반도체", "리노공업",
        "ISC", "원익IPS", "DB하이텍", "HPSP", "이오테크닉스",
        "주성엔지니어링", "테스", "유진테크", "SK하이닉스"
    ]):
        return "반도체"

    if any(x in text for x in [
        "건설", "E&A", "엔지니어링", "현대산업개발", "DL이앤씨",
        "GS건설", "대우건설", "현대건설", "삼성엔지니어링",
        "금호건설", "계룡건설", "코오롱글로벌", "시멘트", "레미콘"
    ]):
        return "건설 / 해외수주"

    if any(x in text for x in [
        "제약", "바이오", "셀트리온", "퓨쳐켐", "삼천당", "알테오젠",
        "리가켐", "신약", "메디", "팜", "켐", "유한양행", "한미약품",
        "종근당", "대웅제약", "보령"
    ]):
        return "바이오 / 제약"

    if any(x in text for x in [
        "2차전지", "배터리", "에코프로", "엘앤에프", "대주전자재료",
        "포스코퓨처엠", "LG에너지솔루션", "삼성SDI", "엔켐",
        "후성", "천보", "나노신소재", "양극재", "음극재"
    ]):
        return "2차전지 / 실리콘 음극재"

    if any(x in text for x in [
        "자동차", "현대차", "기아", "모비스", "만도", "성우하이텍",
        "화신", "에스엘", "모트렉스", "코리아에프티", "구영테크"
    ]):
        return "자동차 / 부품"

    if any(x in text for x in [
        "은행", "금융", "지주", "증권", "보험", "KB금융", "신한지주",
        "하나금융", "우리금융"
    ]):
        return "은행 / 금융"

    if any(x in text for x in [
        "NAVER", "카카오", "인터넷", "플랫폼"
    ]):
        return "인터넷 / 플랫폼"

    if any(x in text for x in [
        "게임", "크래프톤", "엔씨소프트", "넷마블", "펄어비스",
        "위메이드", "컴투스", "카카오게임즈", "네오위즈"
    ]):
        return "게임 / 엔터"

    if any(x in text for x in [
        "태양광", "신재생", "에너지솔루션", "한화솔루션", "OCI",
        "이터닉스", "대명에너지", "HD현대에너지솔루션", "SDN",
        "신성이엔지", "에스에너지"
    ]):
        return "태양광"

    return "미분류"


def load_theme_momentum():
    if THEME_CACHE["momentum"] is not None:
        return THEME_CACHE["momentum"]

    momentum = {}

    if os.path.exists(THEME_MOMENTUM_PATH):
        try:
            df = pd.read_csv(THEME_MOMENTUM_PATH)

            for _, row in df.iterrows():
                theme = str(row.get("theme", "")).strip()
                change_rate = safe_float(row.get("changeRate", 0))

                if theme:
                    momentum[theme] = change_rate

        except Exception as e:
            print("theme_momentum.csv read error:", e)

    THEME_CACHE["momentum"] = momentum
    return momentum


def load_theme_rules():
    if THEME_CACHE["rules"] is not None:
        return THEME_CACHE["rules"]

    rules = []

    if os.path.exists(THEME_RULES_PATH):
        try:
            df = pd.read_csv(THEME_RULES_PATH, dtype=str).fillna("")

            for _, row in df.iterrows():
                theme_keyword = str(row.get("themeKeyword", "")).strip()

                if not theme_keyword:
                    continue

                rules.append({
                    "themeKeyword": theme_keyword,
                    "coreKeywords": split_pipe(row.get("coreKeywords", "")),
                    "excludeKeywords": split_pipe(row.get("excludeKeywords", "")),
                    "bonusCodes": split_pipe(row.get("bonusCodes", "")),
                    "excludeCodes": split_pipe(row.get("excludeCodes", "")),
                })

        except Exception as e:
            print("theme_rules.csv read error:", e)

    THEME_CACHE["rules"] = rules
    return rules


def find_theme_rule(theme):
    theme = str(theme or "").strip()
    rules = load_theme_rules()

    if not theme:
        return None

    exact = [rule for rule in rules if rule["themeKeyword"] == theme]

    if exact:
        return exact[0]

    contained = [
        rule for rule in rules
        if rule["themeKeyword"] in theme or theme in rule["themeKeyword"]
    ]

    if contained:
        contained = sorted(
            contained,
            key=lambda rule: len(rule["themeKeyword"]),
            reverse=True
        )
        return contained[0]

    return None


def calculate_relevance_score(item, theme):
    name = str(item.get("name", "") or "")
    code = str(item.get("code", "") or "").zfill(6)
    theme = str(theme or "")

    score = 50
    rule = find_theme_rule(theme)

    if rule is None:
        simple_words = [
            x.strip()
            for x in theme.replace("(", " ").replace(")", " ").replace("/", " ").replace("·", " ").split()
            if len(x.strip()) >= 2
        ]

        for word in simple_words:
            if word in name:
                score += 10

        return max(0, min(100, score))

    if code in rule["bonusCodes"]:
        score += 45

    if code in rule["excludeCodes"]:
        score -= 60

    for keyword in rule["coreKeywords"]:
        if keyword and keyword in name:
            score += 18

    for keyword in rule["excludeKeywords"]:
        if keyword and keyword in name:
            score -= 28

    return max(0, min(100, score))


def load_theme_overrides():
    if THEME_CACHE["overrides"] is not None:
        return THEME_CACHE["overrides"]

    overrides = {}

    def add_theme(code, theme):
        code = str(code).zfill(6)
        theme = str(theme or "").strip()

        if not code or not theme or code == "000000":
            return

        if code not in overrides:
            overrides[code] = []

        if theme not in overrides[code]:
            overrides[code].append(theme)

    if os.path.exists(THEME_OVERRIDE_PATH):
        try:
            df = pd.read_csv(THEME_OVERRIDE_PATH, dtype={"code": str})

            for _, row in df.iterrows():
                add_theme(row.get("code", ""), row.get("theme", ""))

        except Exception as e:
            print("theme_override.csv read error:", e)

    if os.path.exists(MANUAL_THEME_PATH):
        try:
            manual_df = pd.read_csv(MANUAL_THEME_PATH, dtype={"code": str})

            for _, row in manual_df.iterrows():
                add_theme(row.get("code", ""), row.get("theme", ""))

        except Exception as e:
            print("theme_override_manual.csv read error:", e)

    THEME_CACHE["overrides"] = overrides
    return overrides


def get_themes_for_stock(code: str, name: str = "", market: str = ""):
    code = str(code).zfill(6)
    overrides = load_theme_overrides()
    fallback_theme = classify_theme_by_name_and_market(name, market)

    themes = []

    if code in overrides and len(overrides[code]) > 0:
        themes.extend(overrides[code])

    if fallback_theme and fallback_theme != "미분류" and fallback_theme not in themes:
        themes.append(fallback_theme)

    if themes:
        cleaned = []
        for theme in themes:
            theme = str(theme or "").strip()
            if theme and theme not in cleaned:
                cleaned.append(theme)
        return cleaned

    return ["미분류"]


def calculate_theme_market_caps(stock_list):
    theme_caps = {}
    theme_counts = {}

    for item in stock_list:
        market_cap = safe_int(item.get("marketCap", 0))
        themes = item.get("themes", [])

        for theme in themes:
            theme = str(theme or "").strip()
            if not theme:
                continue

            theme_caps[theme] = theme_caps.get(theme, 0) + market_cap
            theme_counts[theme] = theme_counts.get(theme, 0) + 1

    return theme_caps, theme_counts


def select_top_themes_by_market_cap(themes, stock_list, limit=5):
    if not themes:
        return ["미분류"]

    unique_themes = []

    for theme in themes:
        theme = str(theme or "").strip()
        if theme and theme not in unique_themes:
            unique_themes.append(theme)

    if not unique_themes:
        return ["미분류"]

    theme_caps, theme_counts = calculate_theme_market_caps(stock_list)
    momentum = load_theme_momentum()

    sorted_themes = sorted(
        unique_themes,
        key=lambda theme: (
            theme_caps.get(theme, 0),
            theme_counts.get(theme, 0),
            momentum.get(theme, -9999),
        ),
        reverse=True
    )

    return sorted_themes[:limit]


def slim_stock(item, active_theme=None):
    return {
        "name": item.get("name"),
        "code": item.get("code"),
        "market": item.get("market"),
        "theme": active_theme or item.get("theme"),
        "marketCap": item.get("marketCap", 0)
    }


def build_core_market_cap_top(peers, theme, limit=5):
    scored = []

    for item in peers:
        market_cap = safe_int(item.get("marketCap", 0))

        if market_cap <= 0:
            continue

        relevance_score = calculate_relevance_score(item, theme)

        scored.append({
            **item,
            "relevanceScore": relevance_score,
        })

    core = [item for item in scored if item.get("relevanceScore", 0) >= 70]
    pool = core if len(core) >= limit else scored

    pool = sorted(
        pool,
        key=lambda item: (
            item.get("relevanceScore", 0),
            item.get("marketCap", 0),
        ),
        reverse=True
    )

    return pool[:limit]


def load_stock_universe_from_json():
    if not os.path.exists(STOCK_UNIVERSE_PATH):
        return []

    try:
        with open(STOCK_UNIVERSE_PATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        if not isinstance(raw_data, list):
            return []

        result = []

        for row in raw_data:
            code = str(row.get("code", "")).zfill(6)
            name = str(row.get("name", "")).strip()
            market = str(row.get("market", "KRX")).strip() or "KRX"
            market_cap = safe_int(row.get("marketCap", 0))

            if not code or not name or code == "000000":
                continue

            themes = get_themes_for_stock(code, name, market)

            result.append({
                "name": name,
                "code": code,
                "market": market,
                "theme": themes[0] if themes else "미분류",
                "themes": themes,
                "selectedThemes": [],
                "marketCap": market_cap,
            })

        for item in result:
            selected_themes = select_top_themes_by_market_cap(
                item.get("themes", []),
                result,
                limit=5
            )
            item["selectedThemes"] = selected_themes
            item["theme"] = selected_themes[0] if selected_themes else item.get("theme", "미분류")

        return result

    except Exception as e:
        print("stock_universe.json read error:", e)
        return []


def get_stock_list():
    if TICKER_CACHE["data"]:
        return TICKER_CACHE["data"]

    static_list = load_stock_universe_from_json()

    if static_list:
        TICKER_CACHE["data"] = static_list
        return static_list

    df = fdr.StockListing("KRX")

    result = []

    for _, row in df.iterrows():
        code = str(row.get("Code", "")).zfill(6)
        name = str(row.get("Name", "")).strip()
        market = str(row.get("Market", "KRX")).strip()

        if not code or not name or code == "000000":
            continue

        final_market = market if market else "KRX"
        themes = get_themes_for_stock(code, name, final_market)
        market_cap = get_market_cap_from_row(row)

        result.append({
            "name": name,
            "code": code,
            "market": final_market,
            "theme": themes[0] if themes else "미분류",
            "themes": themes,
            "selectedThemes": [],
            "marketCap": market_cap
        })

    for item in result:
        selected_themes = select_top_themes_by_market_cap(
            item.get("themes", []),
            result,
            limit=5
        )
        item["selectedThemes"] = selected_themes
        item["theme"] = selected_themes[0] if selected_themes else item.get("theme", "미분류")

    TICKER_CACHE["data"] = result
    return result


def get_stock_market_cap(code: str):
    code = str(code).zfill(6)
    stock_list = get_stock_list()

    for item in stock_list:
        if str(item.get("code", "")).zfill(6) == code:
            return safe_int(item.get("marketCap", 0))

    return 0


# =========================
# 네이버 수급 데이터
# =========================

def fetch_naver_investor_data(code, pages=NAVER_LONG_TERM_PAGES):
    code = str(code).zfill(6)
    rows = []

    headers = make_headers(code)

    for page in range(1, pages + 1):
        url = f"https://finance.naver.com/item/frgn.naver?code={code}&page={page}"

        try:
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 404:
                break

            response.raise_for_status()
            response.encoding = "euc-kr"

            tables = pd.read_html(StringIO(response.text))

            target = None

            for table in tables:
                cols = [str(c) for c in table.columns]
                joined = " ".join(cols)

                if "날짜" in joined and "종가" in joined and "기관" in joined and "외국인" in joined:
                    target = table
                    break

            if target is None:
                continue

            df = target.copy()

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [
                    " ".join([str(x) for x in col if str(x) != "nan"]).strip()
                    for col in df.columns
                ]
            else:
                df.columns = [str(c).strip() for c in df.columns]

            for _, row in df.iterrows():
                row_dict = row.to_dict()
                keys = list(row_dict.keys())

                date_key = None
                close_key = None
                volume_key = None
                inst_key = None
                foreign_key = None
                foreign_hold_key = None

                for key in keys:
                    key_text = str(key)

                    if "날짜" in key_text:
                        date_key = key
                    elif "종가" in key_text:
                        close_key = key
                    elif "거래량" in key_text:
                        volume_key = key
                    elif "기관" in key_text and "순매매" in key_text:
                        inst_key = key
                    elif "외국인" in key_text and "순매매" in key_text:
                        foreign_key = key
                    elif "외국인" in key_text and ("보유" in key_text or "비율" in key_text):
                        foreign_hold_key = key

                if date_key is None or close_key is None:
                    continue

                date_text = str(row_dict.get(date_key, "")).strip()

                if "." not in date_text:
                    continue

                try:
                    date_dt = pd.to_datetime(date_text, format="%Y.%m.%d")
                except Exception:
                    continue

                close = int(clean_number(row_dict.get(close_key, 0)))
                volume = int(clean_number(row_dict.get(volume_key, 0))) if volume_key is not None else 0
                inst_qty = int(clean_number(row_dict.get(inst_key, 0))) if inst_key is not None else 0
                foreign_qty = int(clean_number(row_dict.get(foreign_key, 0))) if foreign_key is not None else 0
                foreign_hold_rate = safe_float(clean_number(row_dict.get(foreign_hold_key, 0))) if foreign_hold_key is not None else 0.0

                if close <= 0:
                    continue

                foreign_amount = foreign_qty * close
                institution_amount = inst_qty * close

                retail_qty = -(foreign_qty + inst_qty)
                retail_amount = -(foreign_amount + institution_amount)

                rows.append({
                    "date": date_dt,
                    "dateText": date_dt.strftime("%Y%m%d"),
                    "close": close,
                    "volume": volume,
                    "retailQty": retail_qty,
                    "foreignQty": foreign_qty,
                    "institutionQty": inst_qty,
                    "foreignHoldRate": foreign_hold_rate,
                    "retail": retail_amount,
                    "foreign": foreign_amount,
                    "institution": institution_amount,
                })

        except Exception as e:
            print(f"[naver investor fetch error] code={code}, page={page}, error={e}")
            continue

    if not rows:
        return pd.DataFrame()

    result = pd.DataFrame(rows)
    result = result.drop_duplicates(subset=["dateText"])
    result = result.sort_values("date").reset_index(drop=True)

    return result


def sum_naver_investor_period(df, days):
    tail = df.tail(days)

    return {
        "retail": int(tail["retail"].sum()) if "retail" in tail.columns else 0,
        "foreign": int(tail["foreign"].sum()) if "foreign" in tail.columns else 0,
        "institution": int(tail["institution"].sum()) if "institution" in tail.columns else 0,
    }


def supply_strength_from_amounts(amounts, market_cap):
    market_cap = safe_float(market_cap)

    if market_cap <= 0:
        return {
            "retail": 0.0,
            "foreign": 0.0,
            "institution": 0.0,
        }

    return {
        "retail": round((safe_float(amounts.get("retail", 0)) / market_cap) * 100, 4),
        "foreign": round((safe_float(amounts.get("foreign", 0)) / market_cap) * 100, 4),
        "institution": round((safe_float(amounts.get("institution", 0)) / market_cap) * 100, 4),
    }


def build_supply_strength_summary(period_summary, market_cap):
    return {
        label: supply_strength_from_amounts(amounts, market_cap)
        for label, amounts in period_summary.items()
    }


def calculate_foreign_hold_change(df, days):
    if df is None or df.empty or "foreignHoldRate" not in df.columns:
        return 0.0

    clean_df = df.copy()
    clean_df["foreignHoldRate"] = pd.to_numeric(clean_df["foreignHoldRate"], errors="coerce").fillna(0)
    clean_df = clean_df[clean_df["foreignHoldRate"] > 0].reset_index(drop=True)

    if len(clean_df) < 2:
        return 0.0

    last_value = safe_float(clean_df.iloc[-1]["foreignHoldRate"])

    if len(clean_df) > days:
        base_value = safe_float(clean_df.iloc[-days - 1]["foreignHoldRate"])
    else:
        base_value = safe_float(clean_df.iloc[0]["foreignHoldRate"])

    return round(last_value - base_value, 4)


def avg_cost_from_naver_period(df, days):
    tail = df.tail(days)

    def calc(amount_col, qty_col):
        amount = int(tail[amount_col].sum()) if amount_col in tail.columns else 0
        quantity = int(tail[qty_col].sum()) if qty_col in tail.columns else 0

        if abs(quantity) < 1:
            return {
                "price": "-",
                "side": "flat",
                "amount": amount,
                "quantity": quantity,
            }

        avg_price = amount / quantity

        if avg_price <= 0:
            return {
                "price": "-",
                "side": "mixed",
                "amount": amount,
                "quantity": quantity,
            }

        return {
            "price": format_won(avg_price),
            "side": "buy" if quantity > 0 else "sell",
            "amount": amount,
            "quantity": quantity,
        }

    return {
        "retail": calc("retail", "retailQty"),
        "foreign": calc("foreign", "foreignQty"),
        "institution": calc("institution", "institutionQty"),
    }


def calculate_supply_score(sum1, sum5, sum20, strength20=None, foreign_hold_change20=0):
    retail20 = float(sum20.get("retail", 0))
    foreign20 = float(sum20.get("foreign", 0))
    institution20 = float(sum20.get("institution", 0))

    smart20 = foreign20 + institution20
    denom20 = abs(retail20) + abs(foreign20) + abs(institution20) + 1

    smart_ratio = smart20 / denom20

    score = 50
    score += smart_ratio * 35

    if smart20 > 0 and retail20 < 0:
        score += 8

    if smart20 < 0 and retail20 > 0:
        score -= 8

    smart1 = float(sum1.get("foreign", 0)) + float(sum1.get("institution", 0))
    smart5 = float(sum5.get("foreign", 0)) + float(sum5.get("institution", 0))

    if smart1 > 0:
        score += 3
    elif smart1 < 0:
        score -= 3

    if smart5 > 0:
        score += 5
    elif smart5 < 0:
        score -= 5

    if strength20:
        smart_strength20 = safe_float(strength20.get("foreign", 0)) + safe_float(strength20.get("institution", 0))

        if smart_strength20 >= 1:
            score += 10
        elif smart_strength20 >= 0.5:
            score += 6
        elif smart_strength20 >= 0.2:
            score += 3
        elif smart_strength20 <= -1:
            score -= 10
        elif smart_strength20 <= -0.5:
            score -= 6
        elif smart_strength20 <= -0.2:
            score -= 3

    if foreign_hold_change20 >= 0.5:
        score += 5
    elif foreign_hold_change20 >= 0.2:
        score += 3
    elif foreign_hold_change20 <= -0.5:
        score -= 5
    elif foreign_hold_change20 <= -0.2:
        score -= 3

    score = int(round(clamp_number(score, 0, 100)))

    if score >= 75:
        signal = "외국인·기관 수급 강세"
    elif score >= 60:
        signal = "외국인·기관 순매수 우위"
    elif score >= 45:
        signal = "수급 중립"
    elif score >= 30:
        signal = "외국인·기관 매도 우위"
    else:
        signal = "수급 약세"

    return score, signal


# =========================
# 네이버 프로그램 매매
# =========================

def fetch_naver_program_data(code, pages=NAVER_LONG_TERM_PAGES):
    code = str(code).zfill(6)
    rows = []

    headers = make_headers(code)

    for page in range(1, pages + 1):
        url = f"https://finance.naver.com/item/program.naver?code={code}&page={page}"

        try:
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code == 404:
                break

            response.raise_for_status()
            response.encoding = "euc-kr"

            tables = pd.read_html(StringIO(response.text))

            target = None

            for table in tables:
                cols = [str(c) for c in table.columns]
                joined = " ".join(cols)

                if "날짜" in joined and "종가" in joined and ("프로그램" in joined or "순매수" in joined or "순매매" in joined):
                    target = table
                    break

            if target is None:
                continue

            df = target.copy()

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [
                    " ".join([str(x) for x in col if str(x) != "nan"]).strip()
                    for col in df.columns
                ]
            else:
                df.columns = [str(c).strip() for c in df.columns]

            for _, row in df.iterrows():
                row_dict = row.to_dict()
                keys = list(row_dict.keys())

                date_key = None
                close_key = None
                qty_key = None

                for key in keys:
                    key_text = str(key)

                    if "날짜" in key_text:
                        date_key = key
                    elif "종가" in key_text:
                        close_key = key
                    elif "프로그램" in key_text or "순매수" in key_text or "순매매" in key_text:
                        if "차익" not in key_text and "비차익" not in key_text:
                            qty_key = key

                if date_key is None or close_key is None or qty_key is None:
                    continue

                date_text = str(row_dict.get(date_key, "")).strip()

                if "." not in date_text:
                    continue

                try:
                    date_dt = pd.to_datetime(date_text, format="%Y.%m.%d")
                except Exception:
                    continue

                close = int(clean_number(row_dict.get(close_key, 0)))
                quantity = int(clean_number(row_dict.get(qty_key, 0)))

                if close <= 0:
                    continue

                amount = close * quantity

                rows.append({
                    "date": date_dt,
                    "dateText": date_dt.strftime("%Y%m%d"),
                    "close": close,
                    "quantity": quantity,
                    "amount": amount,
                })

        except Exception as e:
            print(f"[naver program fetch error] code={code}, page={page}, error={e}")
            continue

    if not rows:
        return pd.DataFrame()

    result = pd.DataFrame(rows)
    result = result.drop_duplicates(subset=["dateText"])
    result = result.sort_values("date").reset_index(drop=True)

    return result


def sum_program_period(df, days):
    tail = df.tail(days)

    return {
        "quantity": int(tail["quantity"].sum()) if "quantity" in tail.columns else 0,
        "amount": int(tail["amount"].sum()) if "amount" in tail.columns else 0,
    }


def calculate_program_score(sum1, sum5, sum20):
    amount20 = float(sum20.get("amount", 0))
    amount5 = float(sum5.get("amount", 0))
    amount1 = float(sum1.get("amount", 0))

    denom = abs(amount20) + abs(amount5) + abs(amount1) + 1

    score = 50
    score += (amount20 / denom) * 35

    if amount5 > 0:
        score += 7
    elif amount5 < 0:
        score -= 7

    if amount1 > 0:
        score += 3
    elif amount1 < 0:
        score -= 3

    score = int(round(clamp_number(score, 0, 100)))

    if score >= 70:
        signal = "프로그램 순매수 우위"
    elif score >= 55:
        signal = "프로그램 매수세 일부 유입"
    elif score >= 45:
        signal = "프로그램 중립"
    elif score >= 30:
        signal = "프로그램 매도 우위"
    else:
        signal = "프로그램 매도세 강함"

    return score, signal


# =========================
# API
# =========================

@app.get("/")
def root():
    return {"message": "stock api server is running"}


@app.get("/api/daily/{code}")
def get_daily(code: str):
    code = str(code).zfill(6)

    end = datetime.today()
    start = end - timedelta(days=900)

    df = stock.get_market_ohlcv_by_date(
        to_yyyymmdd(start),
        to_yyyymmdd(end),
        code
    )

    if df is None or df.empty:
        return {"code": code, "count": 0, "data": []}

    df = df.reset_index()

    if "날짜" in df.columns:
        df = df.sort_values("날짜").reset_index(drop=True)

    if "거래대금" not in df.columns:
        df["거래대금"] = df["종가"] * df["거래량"]

    for col in ["시가", "고가", "저가", "종가", "거래량", "거래대금"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    if len(df) >= 30:
        last = df.iloc[-1]
        prev_window = df.iloc[-21:-1]

        last_volume = safe_int(last.get("거래량", 0))
        last_value = safe_int(last.get("거래대금", 0))

        median_volume = safe_float(prev_window["거래량"].median())
        median_value = safe_float(prev_window["거래대금"].median())

        is_abnormally_low_volume = (
            median_volume >= 10000
            and last_volume <= max(1000, median_volume * 0.01)
        )

        is_abnormally_low_value = (
            median_value >= 100000000
            and last_value <= max(50000000, median_value * 0.01)
        )

        if is_abnormally_low_volume and is_abnormally_low_value:
            print(
                f"[drop abnormal latest daily] code={code}, "
                f"date={last.get('날짜')}, "
                f"volume={last_volume}, median_volume={median_volume}, "
                f"value={last_value}, median_value={median_value}"
            )
            df = df.iloc[:-1].reset_index(drop=True)

    data = []

    for _, row in df.iterrows():
        data.append({
            "date": row["날짜"].strftime("%Y%m%d") if hasattr(row["날짜"], "strftime") else str(row["날짜"]),
            "open": safe_int(row["시가"]),
            "high": safe_int(row["고가"]),
            "low": safe_int(row["저가"]),
            "close": safe_int(row["종가"]),
            "volume": safe_int(row["거래량"]),
            "value": safe_int(row["거래대금"]),
        })

    return {"code": code, "count": len(data), "data": data}


@app.get("/api/search")
def search_stock(q: str):
    try:
        q = str(q or "").strip()
        q_lower = q.lower()
        stock_list = get_stock_list()

        result = []

        for item in stock_list:
            name = str(item.get("name", "")).strip()
            code = str(item.get("code", "")).strip()

            name_lower = name.lower()
            code_lower = code.lower()

            matched = False
            rank = 999

            if q_lower and q_lower == code_lower:
                matched = True
                rank = 0
            elif q_lower and q_lower == name_lower:
                matched = True
                rank = 1
            elif q_lower and name_lower.startswith(q_lower):
                matched = True
                rank = 2
            elif q_lower and q_lower in name_lower:
                matched = True
                rank = 3
            elif q_lower and q_lower in code_lower:
                matched = True
                rank = 4

            if matched:
                result.append({**item, "searchRank": rank})

        result = sorted(
            result,
            key=lambda item: (
                item.get("searchRank", 999),
                len(str(item.get("name", ""))),
                item.get("name", "")
            )
        )

        return {
            "query": q,
            "total_count": len(stock_list),
            "count": len(result),
            "data": result[:30]
        }

    except Exception as e:
        return {"query": q, "count": 0, "data": [], "error": str(e)}


@app.get("/api/theme/{code}")
def get_theme(code: str):
    try:
        stock_list = get_stock_list()
        momentum = load_theme_momentum()
        theme_caps, theme_counts = calculate_theme_market_caps(stock_list)

        code = str(code).zfill(6)

        found = None

        for item in stock_list:
            if item["code"] == code:
                found = item
                break

        if found is None:
            return {
                "code": code,
                "theme": "미분류",
                "themes": ["미분류"],
                "allThemesCount": 0,
                "selectedThemes": ["미분류"],
                "themeGroups": [],
                "peers": []
            }

        all_themes = found.get("themes", [])
        selected_themes = select_top_themes_by_market_cap(
            all_themes,
            stock_list,
            limit=5
        )

        theme_groups = []

        for theme in selected_themes:
            peers = []

            for item in stock_list:
                if item.get("code") == code:
                    continue

                item_themes = item.get("themes", [])

                if theme in item_themes:
                    peer = slim_stock(item, active_theme=theme)
                    peer["relevanceScore"] = calculate_relevance_score(peer, theme)
                    peers.append(peer)

            peers = sorted(
                peers,
                key=lambda item: item.get("marketCap", 0),
                reverse=True
            )

            core_market_cap_top = build_core_market_cap_top(peers, theme, limit=5)

            theme_groups.append({
                "theme": theme,
                "changeRate": momentum.get(theme, 0),
                "themeMarketCap": theme_caps.get(theme, 0),
                "stockCount": theme_counts.get(theme, 0),
                "peers": peers[:50],
                "coreMarketCapTop": core_market_cap_top
            })

        first_group = theme_groups[0] if theme_groups else {
            "theme": "미분류",
            "changeRate": 0,
            "themeMarketCap": 0,
            "stockCount": 0,
            "peers": [],
            "coreMarketCapTop": []
        }

        return {
            "code": code,
            "name": found.get("name"),
            "market": found.get("market"),
            "theme": first_group.get("theme"),
            "themes": selected_themes,
            "allThemesCount": len(all_themes),
            "selectedThemes": selected_themes,
            "marketCap": found.get("marketCap", 0),
            "themeGroups": theme_groups,
            "peers": first_group.get("peers", []),
            "coreMarketCapTop": first_group.get("coreMarketCapTop", [])
        }

    except Exception as e:
        return {
            "code": code,
            "theme": "미분류",
            "themes": ["미분류"],
            "allThemesCount": 0,
            "selectedThemes": ["미분류"],
            "themeGroups": [],
            "peers": [],
            "error": str(e)
        }


@app.get("/api/investor/{code}")
def get_investor(code: str):
    try:
        code = str(code).zfill(6)
        df = fetch_naver_investor_data(code, pages=NAVER_LONG_TERM_PAGES)
        market_cap = get_stock_market_cap(code)

        if df.empty:
            return {
                "code": code,
                "summary": None,
                "error": "네이버 수급 데이터를 찾지 못했습니다.",
                "debug": {
                    "source": "naver_frgn",
                    "url": f"https://finance.naver.com/item/frgn.naver?code={code}",
                    "message": "네이버 외국인·기관 매매동향 표를 읽지 못했습니다."
                }
            }

        sum1 = sum_naver_investor_period(df, 1)
        sum5 = sum_naver_investor_period(df, 5)
        sum20 = sum_naver_investor_period(df, 20)

        period_summary = {
            label: sum_naver_investor_period(df, days)
            for label, days in PERIOD_DAYS.items()
        }

        supply_strength = build_supply_strength_summary(period_summary, market_cap)
        strength20 = supply_strength.get("1개월", {})

        foreign_hold_change5 = calculate_foreign_hold_change(df, 5)
        foreign_hold_change20 = calculate_foreign_hold_change(df, 20)

        supply_score, signal = calculate_supply_score(
            sum1,
            sum5,
            sum20,
            strength20=strength20,
            foreign_hold_change20=foreign_hold_change20
        )

        avg_cost = {
            label: avg_cost_from_naver_period(df, days)
            for label, days in PERIOD_DAYS.items()
        }

        last_row = df.iloc[-1]
        last_date = str(last_row.get("dateText", ""))
        foreign_hold_rate = safe_float(last_row.get("foreignHoldRate", 0))

        recent_rows = []

        for _, row in df.tail(20).iterrows():
            recent_rows.append({
                "date": str(row.get("dateText", "")),
                "retail": int(row.get("retail", 0)),
                "foreign": int(row.get("foreign", 0)),
                "institution": int(row.get("institution", 0)),
                "retailQty": int(row.get("retailQty", 0)),
                "foreignQty": int(row.get("foreignQty", 0)),
                "institutionQty": int(row.get("institutionQty", 0)),
                "foreignHoldRate": safe_float(row.get("foreignHoldRate", 0)),
                "close": int(row.get("close", 0)),
            })

        return {
            "code": code,
            "summary": {
                "date": last_date,
                "marketCap": market_cap,
                "sum1": sum1,
                "sum5": sum5,
                "sum20": sum20,
                "periodSummary": period_summary,
                "supplyStrength": supply_strength,
                "foreignHoldRate": foreign_hold_rate,
                "foreignHoldRateChange5": foreign_hold_change5,
                "foreignHoldRateChange20": foreign_hold_change20,
                "supplyScore": supply_score,
                "signal": signal,
                "avgCost": avg_cost,
            },
            "recent": recent_rows,
            "source": "naver_frgn_estimated",
            "debug": {
                "rows": len(df),
                "firstDate": str(df.iloc[0].get("dateText", "")),
                "lastDate": last_date,
                "marketCap": market_cap,
                "foreignHoldRate": foreign_hold_rate,
                "foreignHoldRateChange5": foreign_hold_change5,
                "foreignHoldRateChange20": foreign_hold_change20,
                "note": "외국인·기관 순매수 금액은 네이버 순매매량 × 종가로 추정. 수급강도는 순매수 추정금액 / 시가총액 × 100. 외국인 보유율 변화는 %p 기준."
            }
        }

    except Exception as e:
        return {"code": code, "summary": None, "error": str(e)}


@app.get("/api/program/{code}")
def get_program(code: str):
    try:
        code = str(code).zfill(6)
        df = fetch_naver_program_data(code, pages=NAVER_LONG_TERM_PAGES)

        if df.empty:
            return {
                "code": code,
                "summary": None,
                "error": "네이버 프로그램 매매 데이터를 찾지 못했습니다.",
                "debug": {
                    "source": "naver_program",
                    "url": f"https://finance.naver.com/item/program.naver?code={code}",
                    "message": "네이버 프로그램 매매동향 표를 읽지 못했습니다."
                }
            }

        sum1 = sum_program_period(df, 1)
        sum5 = sum_program_period(df, 5)
        sum20 = sum_program_period(df, 20)

        period_summary = {
            label: sum_program_period(df, days)
            for label, days in PERIOD_DAYS.items()
        }

        program_score, signal = calculate_program_score(sum1, sum5, sum20)

        last_row = df.iloc[-1]
        last_date = str(last_row.get("dateText", ""))

        recent_rows = []

        for _, row in df.tail(20).iterrows():
            recent_rows.append({
                "date": str(row.get("dateText", "")),
                "close": int(row.get("close", 0)),
                "quantity": int(row.get("quantity", 0)),
                "amount": int(row.get("amount", 0)),
            })

        return {
            "code": code,
            "summary": {
                "date": last_date,
                "sum1": sum1,
                "sum5": sum5,
                "sum20": sum20,
                "periodSummary": period_summary,
                "programScore": program_score,
                "signal": signal,
            },
            "recent": recent_rows,
            "source": "naver_program_estimated",
            "debug": {
                "rows": len(df),
                "firstDate": str(df.iloc[0].get("dateText", "")),
                "lastDate": last_date,
                "note": "프로그램 금액은 네이버 프로그램 순매매량 × 종가 기준 추정."
            }
        }

    except Exception as e:
        return {"code": code, "summary": None, "error": str(e)}


@app.get("/api/tickers-test")
def tickers_test():
    try:
        stock_list = get_stock_list()
        return {"total_count": len(stock_list), "sample": stock_list[:20]}
    except Exception as e:
        return {"total_count": 0, "sample": [], "error": str(e)}


@app.get("/api/cache-clear")
def cache_clear():
    TICKER_CACHE["data"] = []
    THEME_CACHE["overrides"] = None
    THEME_CACHE["momentum"] = None
    THEME_CACHE["rules"] = None

    return {"message": "ticker, theme, momentum and rules cache cleared"}


def read_cache_json(filename):
    path = os.path.join(CACHE_DIR, filename)

    if not os.path.exists(path):
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/cache/status")
def cache_status():
    status = read_cache_json("last_update.json")

    if not status:
        return {
            "lastUpdate": None,
            "timezone": "Asia/Seoul",
            "message": "아직 캐시 업데이트가 없습니다."
        }

    return status


@app.post("/api/update-all")
def update_all_api(request: Request):
    token = request.headers.get("X-UPDATE-TOKEN", "")

    if UPDATE_TOKEN and token != UPDATE_TOKEN:
        raise HTTPException(status_code=401, detail="invalid update token")

    from update_cache import update_all

    return update_all()