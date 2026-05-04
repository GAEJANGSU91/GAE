import os
import re
import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

THEME_OVERRIDE_PATH = os.path.join(BASE_DIR, "theme_override.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "theme_rules.csv")


# 너무 광범위해서 여러 테마에 자주 끼는 대형 복합주/플랫폼/지주 후보
COMMON_EXCLUDE_KEYWORDS = [
    "삼성물산",
    "삼성전자",
    "SK하이닉스",
    "현대차",
    "기아",
    "현대모비스",
    "NAVER",
    "카카오",
    "포스코홀딩스",
    "LG화학",
    "LG",
    "SK",
    "CJ",
    "롯데지주",
    "한화",
    "두산",
]


# 테마명에 특정 단어가 있으면 자동으로 넣어줄 핵심 키워드
THEME_PRESET_KEYWORDS = {
    "태양광": [
        "태양광", "에너지솔루션", "OCI", "SDN", "신성이엔지",
        "에스에너지", "대명에너지", "이터닉스", "윌링스", "파루"
    ],
    "신재생": [
        "신재생", "에너지", "에너지솔루션", "대명에너지", "이터닉스",
        "SDN", "신성이엔지", "에스에너지", "풍력", "태양광"
    ],
    "수소": [
        "수소", "연료전지", "퓨얼셀", "하이솔루스", "비나텍",
        "효성", "제이엔케이", "두산퓨얼셀", "에스퓨얼셀"
    ],
    "2차전지": [
        "2차전지", "배터리", "에너지솔루션", "SDI", "에코프로",
        "퓨처엠", "엘앤에프", "엔켐", "천보", "전자재료", "소재"
    ],
    "배터리": [
        "배터리", "에너지솔루션", "SDI", "에코프로", "퓨처엠",
        "엘앤에프", "엔켐", "천보", "소재"
    ],
    "반도체": [
        "반도체", "하이닉스", "전자", "하이텍", "테크", "공업",
        "IPS", "ISC", "HPSP", "이오테크닉스", "리노공업"
    ],
    "HBM": [
        "HBM", "하이닉스", "삼성전자", "한미반도체", "ISC",
        "리노공업", "이오테크닉스", "테크"
    ],
    "바이오": [
        "바이오", "제약", "신약", "메디", "팜", "켐",
        "셀트리온", "알테오젠", "리가켐"
    ],
    "제약": [
        "제약", "바이오", "신약", "메디", "팜", "켐",
        "유한양행", "한미약품", "종근당", "대웅제약", "보령"
    ],
    "건설": [
        "건설", "E&A", "이앤씨", "산업개발", "엔지니어링",
        "시멘트", "레미콘", "건자재"
    ],
    "전력": [
        "전력", "전기", "일렉트릭", "ELECTRIC", "변압기", "전선",
        "LS", "효성중공업", "제룡", "일진전기"
    ],
    "전선": [
        "전선", "케이블", "대한전선", "LS", "가온전선", "일진전기"
    ],
    "변압기": [
        "변압기", "전력", "전기", "일렉트릭", "효성중공업",
        "HD현대일렉트릭", "제룡전기", "일진전기"
    ],
    "원전": [
        "원전", "원자력", "두산에너빌리티", "한전기술", "한전KPS",
        "비에이치아이", "우리기술"
    ],
    "조선": [
        "조선", "중공업", "HD현대", "한화오션", "삼성중공업",
        "미포", "엔진", "기자재"
    ],
    "방산": [
        "방산", "방위산업", "한화에어로", "현대로템", "LIG넥스원",
        "한국항공우주", "풍산", "빅텍"
    ],
    "로봇": [
        "로봇", "로보", "레인보우", "두산로보틱스", "뉴로메카",
        "티로보틱스", "유일로보틱스"
    ],
    "AI": [
        "AI", "인공지능", "데이터", "소프트웨어", "솔루션",
        "클라우드", "반도체"
    ],
    "냉각": [
        "냉각", "칠러", "쿨링", "GST", "워트", "유니셈",
        "케이엔솔", "데이터센터"
    ],
    "ESS": [
        "ESS", "에너지저장", "배터리", "전력", "PCS",
        "인버터", "LS ELECTRIC"
    ],
}


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def split_name_tokens(name):
    """
    종목명에서 너무 짧거나 의미 없는 단어를 제외하고 키워드 후보를 만든다.
    """
    name = clean_text(name)

    # 괄호, 특수문자 분리
    parts = re.split(r"[\s\(\)\[\]\/·,\.\-_&]+", name)

    tokens = []
    for part in parts:
        part = clean_text(part)
        if len(part) < 2:
            continue
        if part in ["홀딩스", "지주", "우", "우B", "1우", "2우B", "스팩", "리츠"]:
            continue
        tokens.append(part)

    # 종목명 자체도 너무 길지 않으면 포함
    if 2 <= len(name) <= 12:
        tokens.append(name)

    return tokens


def make_keywords_for_theme(theme, names):
    theme = clean_text(theme)

    keywords = []

    # 1. 테마명 자체에서 핵심 단어 추출
    theme_parts = re.split(r"[\s\(\)\/·,\.\-_&]+", theme)
    for part in theme_parts:
        part = clean_text(part)
        if len(part) >= 2:
            keywords.append(part)

    # 2. 프리셋 키워드 추가
    for trigger, preset_words in THEME_PRESET_KEYWORDS.items():
        if trigger in theme:
            keywords.extend(preset_words)

    # 3. 테마 종목명에서 반복되는 단어 후보 추출
    token_count = {}
    for name in names:
        for token in split_name_tokens(name):
            token_count[token] = token_count.get(token, 0) + 1

    repeated_tokens = [
        token
        for token, count in token_count.items()
        if count >= 2
    ]

    # 반복 토큰이 없으면 상위 종목명 일부라도 사용
    keywords.extend(repeated_tokens[:20])

    # 4. 중복 제거
    result = []
    for word in keywords:
        word = clean_text(word)
        if not word:
            continue
        if word not in result:
            result.append(word)

    return result[:40]


def make_exclude_keywords(theme):
    theme = clean_text(theme)
    excludes = list(COMMON_EXCLUDE_KEYWORDS)

    # 단, 수소 테마에서는 현대차가 핵심일 수 있으니 제외에서 제거
    if "수소" in theme:
        excludes = [x for x in excludes if x not in ["현대차", "기아", "현대모비스", "두산"]]

    # 전력/전선/변압기에서는 LS, 효성, SK 같은 대기업명이 핵심일 수 있으므로 일부 제거
    if any(x in theme for x in ["전력", "전선", "변압기", "전기"]):
        excludes = [x for x in excludes if x not in ["LS", "효성중공업", "SK"]]

    # 방산/조선에서는 한화, HD현대, 두산 같은 대기업명이 핵심일 수 있음
    if any(x in theme for x in ["방산", "조선", "원전"]):
        excludes = [x for x in excludes if x not in ["한화", "두산", "SK"]]

    # 반도체에서는 삼성전자/SK하이닉스가 핵심이라 제외하면 안 됨
    if any(x in theme for x in ["반도체", "HBM", "AI반도체"]):
        excludes = [x for x in excludes if x not in ["삼성전자", "SK하이닉스"]]

    # 2차전지에서는 LG화학, 포스코홀딩스가 관련 있을 수 있음
    if any(x in theme for x in ["2차전지", "배터리"]):
        excludes = [x for x in excludes if x not in ["LG화학", "포스코홀딩스"]]

    return excludes


def generate_rules():
    if not os.path.exists(THEME_OVERRIDE_PATH):
        raise FileNotFoundError(f"theme_override.csv가 없습니다: {THEME_OVERRIDE_PATH}")

    df = pd.read_csv(THEME_OVERRIDE_PATH, dtype={"code": str})
    df["code"] = df["code"].astype(str).str.zfill(6)
    df["name"] = df["name"].astype(str).str.strip()
    df["theme"] = df["theme"].astype(str).str.strip()

    rows = []

    for theme, group in df.groupby("theme"):
        names = group["name"].dropna().astype(str).tolist()
        codes = group["code"].dropna().astype(str).tolist()

        core_keywords = make_keywords_for_theme(theme, names)
        exclude_keywords = make_exclude_keywords(theme)

        # 시총 정보가 없으므로 여기서는 bonusCodes를 비워둔다.
        # 나중에 특정 테마에서 꼭 우선시할 종목만 수동으로 추가하면 됨.
        rows.append({
            "themeKeyword": theme,
            "coreKeywords": "|".join(core_keywords),
            "excludeKeywords": "|".join(exclude_keywords),
            "bonusCodes": "",
            "excludeCodes": "",
        })

    rules_df = pd.DataFrame(rows)
    rules_df = rules_df.sort_values("themeKeyword").reset_index(drop=True)
    rules_df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print(f"[done] saved: {OUTPUT_PATH}")
    print(f"[done] rows: {len(rules_df)}")
    print(rules_df.head(30))


if __name__ == "__main__":
    generate_rules()