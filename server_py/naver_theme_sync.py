import os
import re
import time
import shutil
from datetime import datetime

import pandas as pd
import requests
from bs4 import BeautifulSoup


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

THEME_OVERRIDE_PATH = os.path.join(BASE_DIR, "theme_override.csv")
THEME_MOMENTUM_PATH = os.path.join(BASE_DIR, "theme_momentum.csv")
MANUAL_PATH = os.path.join(BASE_DIR, "theme_override_manual.csv")

BASE_URL = "https://finance.naver.com"
THEME_LIST_URL = "https://finance.naver.com/sise/theme.naver"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://finance.naver.com/",
}


def fetch_soup(url: str) -> BeautifulSoup:
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()

    # 네이버 금융은 보통 euc-kr/cp949 계열
    response.encoding = "euc-kr"

    return BeautifulSoup(response.text, "lxml")


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def parse_number(text: str) -> float:
    """
    '+3.21%', '-1.05%', '3.21%' 같은 문자열을 숫자로 변환.
    """
    text = clean_text(text)
    text = text.replace("%", "").replace(",", "").replace("+", "")
    text = re.sub(r"[^0-9\.\-]", "", text)

    try:
        return float(text)
    except Exception:
        return 0.0


def get_theme_links(max_pages: int = 30):
    """
    네이버 테마 목록 페이지에서:
    - 테마명
    - 상세 링크
    - 테마 당일 등락률
    을 가져온다.
    """
    themes = []
    seen = set()

    for page in range(1, max_pages + 1):
        url = f"{THEME_LIST_URL}?&page={page}"
        soup = fetch_soup(url)

        rows = soup.select("table.type_1.theme tr")

        # 혹시 선택자가 안 맞을 경우 전체 링크 기반 fallback을 위해 유지
        page_count = 0

        for row in rows:
            link = row.select_one("a[href*='sise_group_detail.naver']")
            if not link:
                continue

            theme_name = clean_text(link.get_text())
            href = link.get("href", "")

            if not theme_name or not href:
                continue

            detail_url = BASE_URL + href if href.startswith("/") else href

            cols = row.select("td")
            change_rate = 0.0

            # 네이버 테마 목록의 전일대비 등락률은 보통 테마명 다음 열 근처에 있음.
            # 정확한 위치가 변할 수 있어 행 전체에서 %가 들어간 텍스트를 찾아 첫 번째 값을 사용.
            for td in cols:
                td_text = clean_text(td.get_text())
                if "%" in td_text:
                    change_rate = parse_number(td_text)
                    break

            key = (theme_name, detail_url)
            if key in seen:
                continue

            seen.add(key)

            themes.append({
                "theme": theme_name,
                "url": detail_url,
                "changeRate": change_rate,
            })

            page_count += 1

        print(f"[theme list] page={page}, found={page_count}")

        if page_count == 0:
            break

        time.sleep(0.2)

    return themes


def get_stocks_from_theme(theme_name: str, detail_url: str):
    """
    테마 상세 페이지에서 종목코드와 종목명을 가져온다.
    네이버 종목 링크:
    /item/main.naver?code=005930
    """
    soup = fetch_soup(detail_url)

    stocks = []
    seen_codes = set()

    links = soup.select("a[href*='/item/main.naver?code=']")

    for link in links:
        href = link.get("href", "")
        match = re.search(r"code=(\d{6})", href)

        if not match:
            continue

        code = match.group(1)
        name = clean_text(link.get_text())

        if not name or code in seen_codes:
            continue

        seen_codes.add(code)

        stocks.append({
            "code": code,
            "name": name,
            "theme": theme_name,
        })

    return stocks


def load_manual_overrides():
    """
    수동 보정 파일.
    같은 종목에 여러 테마를 넣을 수 있음.
    예:
    009830,한화솔루션,태양광
    009830,한화솔루션,신재생에너지
    """
    if not os.path.exists(MANUAL_PATH):
        return pd.DataFrame(columns=["code", "name", "theme"])

    try:
        df = pd.read_csv(MANUAL_PATH, dtype={"code": str})
        df["code"] = df["code"].astype(str).str.zfill(6)
        df["name"] = df["name"].astype(str).str.strip()
        df["theme"] = df["theme"].astype(str).str.strip()

        df = df[["code", "name", "theme"]]
        df = df[df["code"].str.len() == 6]
        df = df[df["theme"] != ""]

        # 같은 종목 + 같은 테마 중복만 제거
        return df.drop_duplicates(subset=["code", "theme"], keep="first")

    except Exception as e:
        print("[manual read error]", e)
        return pd.DataFrame(columns=["code", "name", "theme"])


def backup_existing_file(path: str):
    if not os.path.exists(path):
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = os.path.basename(path).replace(".csv", "")
    backup_path = os.path.join(BASE_DIR, f"{base_name}_backup_{timestamp}.csv")

    shutil.copy2(path, backup_path)
    print(f"[backup] {backup_path}")


def sync_naver_themes():
    themes = get_theme_links(max_pages=30)

    print(f"[theme total] {len(themes)}")

    rows = []

    for idx, item in enumerate(themes, start=1):
        theme_name = item["theme"]
        detail_url = item["url"]

        try:
            stocks = get_stocks_from_theme(theme_name, detail_url)
            rows.extend(stocks)
            print(f"[{idx}/{len(themes)}] {theme_name}: {len(stocks)} stocks / changeRate={item['changeRate']}")

        except Exception as e:
            print(f"[theme error] {theme_name}: {e}")

        time.sleep(0.25)

    if not rows:
        raise RuntimeError("네이버 테마 종목을 하나도 가져오지 못했습니다.")

    # 1) 종목-테마 매핑 저장
    naver_df = pd.DataFrame(rows)
    naver_df["code"] = naver_df["code"].astype(str).str.zfill(6)
    naver_df["name"] = naver_df["name"].astype(str).str.strip()
    naver_df["theme"] = naver_df["theme"].astype(str).str.strip()

    # 중요:
    # 한 종목이 여러 테마에 들어가면 모두 유지한다.
    # 같은 종목 + 같은 테마 중복만 제거한다.
    naver_df = naver_df.drop_duplicates(subset=["code", "theme"], keep="first")

    manual_df = load_manual_overrides()

    if not manual_df.empty:
        # manual에 있는 code+theme 조합은 유지하고,
        # 네이버 자동 수집분과 합친 뒤 중복 제거
        final_df = pd.concat([manual_df, naver_df], ignore_index=True)
        final_df = final_df.drop_duplicates(subset=["code", "theme"], keep="first")
    else:
        final_df = naver_df

    final_df = final_df[["code", "name", "theme"]]
    final_df = final_df.sort_values(["code", "theme"]).reset_index(drop=True)

    backup_existing_file(THEME_OVERRIDE_PATH)
    final_df.to_csv(THEME_OVERRIDE_PATH, index=False, encoding="utf-8-sig")

    # 2) 테마별 상승률 저장
    momentum_df = pd.DataFrame([
        {
            "theme": item["theme"],
            "changeRate": item.get("changeRate", 0.0)
        }
        for item in themes
    ])

    momentum_df = momentum_df.drop_duplicates(subset=["theme"], keep="first")
    momentum_df = momentum_df.sort_values("changeRate", ascending=False).reset_index(drop=True)

    backup_existing_file(THEME_MOMENTUM_PATH)
    momentum_df.to_csv(THEME_MOMENTUM_PATH, index=False, encoding="utf-8-sig")

    print(f"[done] saved: {THEME_OVERRIDE_PATH}")
    print(f"[done] theme rows: {len(final_df)}")

    print(f"[done] saved: {THEME_MOMENTUM_PATH}")
    print(f"[done] momentum rows: {len(momentum_df)}")

    print("\n[theme_override sample]")
    print(final_df.head(20))

    print("\n[theme_momentum top 20]")
    print(momentum_df.head(20))


if __name__ == "__main__":
    sync_naver_themes()