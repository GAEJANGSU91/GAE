import json
import os
import FinanceDataReader as fdr


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(BASE_DIR, "stock_universe.json")


def safe_int(value):
    try:
        if value is None:
            return 0
        return int(float(value))
    except Exception:
        return 0


def get_market_cap_from_row(row):
    for col in ["Marcap", "MarketCap", "Market Cap", "marketCap", "시가총액", "시총"]:
        if col in row:
            value = safe_int(row.get(col))
            if value > 0:
                return value
    return 0


def classify_theme_by_name(name):
    name = str(name or "")

    if any(x in name for x in ["삼성전자", "SK하이닉스", "한미반도체", "리노공업", "HPSP", "이오테크닉스", "원익IPS", "DB하이텍"]):
        return ["반도체"]

    if any(x in name for x in ["한화솔루션", "OCI", "대명에너지", "HD현대에너지솔루션", "SDN", "신성이엔지", "에스에너지"]):
        return ["태양광"]

    if any(x in name for x in ["현대차", "기아", "현대모비스", "HL만도", "성우하이텍", "화신", "에스엘"]):
        return ["자동차 / 부품"]

    if any(x in name for x in ["에코프로", "엘앤에프", "대주전자재료", "포스코퓨처엠", "LG에너지솔루션", "삼성SDI", "엔켐"]):
        return ["2차전지 / 실리콘 음극재"]

    if any(x in name for x in ["셀트리온", "퓨쳐켐", "삼천당제약", "알테오젠", "리가켐바이오", "유한양행", "한미약품", "보령"]):
        return ["바이오 / 제약"]

    if any(x in name for x in ["KB금융", "신한지주", "하나금융지주", "우리금융지주", "기업은행"]):
        return ["은행 / 금융"]

    return ["미분류"]


def main():
    df = fdr.StockListing("KRX")
    result = []

    for _, row in df.iterrows():
        code = str(row.get("Code", "")).zfill(6)
        name = str(row.get("Name", "")).strip()
        market = str(row.get("Market", "KRX")).strip() or "KRX"

        if not code or not name or code == "000000":
            continue

        themes = classify_theme_by_name(name)
        market_cap = get_market_cap_from_row(row)

        result.append({
            "code": code,
            "name": name,
            "market": market,
            "theme": themes[0],
            "themes": themes,
            "selectedThemes": themes,
            "marketCap": market_cap,
        })

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"saved: {OUT_PATH}")
    print(f"count: {len(result)}")


if __name__ == "__main__":
    main()