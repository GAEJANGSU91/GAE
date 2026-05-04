import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Activity,
  Users,
  Globe2,
  Building2,
  LineChart,
  Landmark,
  RadioTower,
} from "lucide-react";

const STOCKS = {
  "한화솔루션": {
    name: "한화솔루션",
    code: "009830",
    market: "KOSPI",
    theme: "태양광 / 신재생",
    risk: "높음",
    scores: {
      priceAction: 42,
      trend: 38,
      volume: 46,
      momentum: 41,
      volatility: 35,
      supply: 32,
      theme: 44,
      volumeProfile: 39,
      candle: 37,
    },
    avgCost: {
      "1주": { retail: "35,200원", foreign: "34,900원", institution: "36,100원" },
      "1개월": { retail: "35,600원", foreign: "34,800원", institution: "37,200원" },
      "3개월": { retail: "34,700원", foreign: "35,400원", institution: "36,800원" },
      "6개월": { retail: "33,900원", foreign: "34,200원", institution: "35,600원" },
    },
    fallbackCandles: [
      [37800, 38600, 37200, 38200], [38200, 38400, 37100, 37400], [37400, 37700, 36300, 36600], [36600, 37100, 35800, 36900], [36900, 37200, 36000, 36200],
      [36200, 36500, 35200, 35600], [35600, 36100, 34900, 35100], [35100, 35900, 34800, 35700], [35700, 36400, 35400, 36100], [36100, 36700, 35600, 35800],
      [35800, 36200, 34900, 35200], [35200, 35600, 34400, 34700], [34700, 35400, 34300, 35100], [35100, 35900, 35000, 35600], [35600, 36200, 35200, 35900],
      [35900, 36500, 35500, 36300], [36300, 36800, 35700, 36100], [36100, 36600, 35300, 35400], [35400, 35800, 34600, 34900], [34900, 35600, 34400, 35250],
    ],
  },
  "대주전자재료": {
    name: "대주전자재료",
    code: "078600",
    market: "KOSDAQ",
    theme: "2차전지 / 실리콘 음극재",
    risk: "중간",
    scores: {
      priceAction: 78,
      trend: 74,
      volume: 82,
      momentum: 69,
      volatility: 63,
      supply: 81,
      theme: 76,
      volumeProfile: 58,
      candle: 72,
    },
    avgCost: {
      "1주": { retail: "71,100원", foreign: "70,400원", institution: "70,900원" },
      "1개월": { retail: "67,200원", foreign: "68,800원", institution: "69,500원" },
      "3개월": { retail: "64,800원", foreign: "66,300원", institution: "67,900원" },
      "6개월": { retail: "62,500원", foreign: "64,200원", institution: "65,700원" },
    },
    fallbackCandles: [
      [65000, 66100, 64200, 64800], [64800, 65600, 64100, 65300], [65300, 66400, 64900, 66100], [66100, 66800, 65500, 65800], [65800, 67100, 65400, 66600],
      [66600, 67600, 66200, 67200], [67200, 68100, 66800, 67600], [67600, 68400, 66900, 68100], [68100, 68900, 67700, 68600], [68600, 69300, 67900, 68800],
      [68800, 69700, 68200, 69400], [69400, 70500, 69000, 70100], [70100, 71300, 69600, 70600], [70600, 71200, 69400, 69900], [69900, 70900, 69200, 70400],
      [70400, 71600, 70100, 71100], [71100, 71900, 70500, 71300], [71300, 71800, 69100, 69100], [69100, 70600, 68800, 69800], [69800, 72200, 69600, 71500],
    ],
  },
};

const formatPrice = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
const formatNumber = (n) => Number(n || 0).toLocaleString("ko-KR");

function formatVolumeCompact(n) {
  const value = Number(n || 0);
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억주`;
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString("ko-KR")}만주`;
  return `${value.toLocaleString("ko-KR")}주`;
}

function formatTradingValueCompact(n) {
  const value = Number(n || 0);
  if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(1)}조`;
  if (value >= 100000000) return `${Math.round(value / 100000000).toLocaleString("ko-KR")}억`;
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
}

function formatMarketCap(n) {
  const value = Number(n || 0);
  if (!value) return "-";
  if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(1)}조`;
  if (value >= 100000000) return `${Math.round(value / 100000000).toLocaleString("ko-KR")}억`;
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`;
}


function formatSignedMoney(n) {
  const value = Number(n || 0);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000000000000) return `${sign}${(abs / 1000000000000).toFixed(1)}조`;
  if (abs >= 100000000) return `${sign}${Math.round(abs / 100000000).toLocaleString("ko-KR")}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(n, digits = 2) {
  const value = Number(n || 0);
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatSignedPoint(n, digits = 2) {
  const value = Number(n || 0);
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(digits)}%p`;
}

function formatAvgCostCell(avgCostObj, fallback) {
  if (!avgCostObj || typeof avgCostObj !== "object") return fallback || "-";
  const price = avgCostObj.price || "-";
  const side = avgCostObj.side === "buy" ? "순매수" : avgCostObj.side === "sell" ? "순매도" : "산출불가";
  return `${price} · ${side}`;
}

function formatMoneyWithStrength(amount, strength) {
  const strengthNumber = Number(strength || 0);
  const strengthText = Number.isFinite(strengthNumber) && Math.abs(strengthNumber) > 0
    ? ` · 강도 ${formatSignedPercent(strengthNumber, 2)}`
    : "";
  return `${formatSignedMoney(amount)}${strengthText}`;
}

function calculateAtrPercentByDays(data, days) {
  const rows = Array.isArray(data) ? data.slice(-days) : [];
  if (rows.length < 2) return null;
  const trueRanges = [];
  for (let i = 1; i < rows.length; i += 1) {
    const current = rows[i];
    const prev = rows[i - 1];
    const high = Number(current.high || 0);
    const low = Number(current.low || 0);
    const prevClose = Number(prev.close || 0);
    if (!high || !low || !prevClose) continue;
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  if (!trueRanges.length) return null;
  const atr = trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
  const latestClose = Number(rows[rows.length - 1]?.close || 0);
  if (!latestClose) return null;
  return (atr / latestClose) * 100;
}

function getAtrStatus(atrPercent) {
  if (atrPercent == null || !Number.isFinite(Number(atrPercent))) return { title: "계산 대기", sub: "일봉 데이터 필요", tone: "blue", score: 50 };
  const atr = Number(atrPercent);
  if (atr >= 10) return { title: "단타 위험", sub: `ATR ${atr.toFixed(1)}%`, tone: "rose", score: 35 };
  if (atr >= 6) return { title: "변동성 큼", sub: `ATR ${atr.toFixed(1)}%`, tone: "rose", score: 50 };
  if (atr >= 3) return { title: "보통", sub: `ATR ${atr.toFixed(1)}%`, tone: "blue", score: 75 };
  return { title: "안정", sub: `ATR ${atr.toFixed(1)}%`, tone: "green", score: 85 };
}

function movingAverageAt(rows, index, period) {
  if (index < period - 1) return null;
  const slice = rows.slice(index - period + 1, index + 1);
  const sum = slice.reduce((acc, row) => acc + Number(row.close || 0), 0);
  return sum / period;
}

function averageVolumeAt(rows, index, period) {
  if (index < period - 1) return null;
  const slice = rows.slice(index - period + 1, index + 1);
  const sum = slice.reduce((acc, row) => acc + Number(row.volume || 0), 0);
  return sum / period;
}

function bucketReturn(value) {
  if (value >= 8) return "급등";
  if (value >= 3) return "강상승";
  if (value >= 0.5) return "상승";
  if (value > -0.5) return "보합";
  if (value > -3) return "하락";
  if (value > -8) return "강하락";
  return "급락";
}

function bucketVolumeRatio(value) {
  if (value >= 3) return "폭증";
  if (value >= 1.5) return "증가";
  if (value >= 0.7) return "보통";
  return "감소";
}

function bucketClosePosition(value) {
  if (value >= 0.75) return "상단";
  if (value >= 0.45) return "중단";
  return "하단";
}

function makePatternFeature(rows, index) {
  if (!Array.isArray(rows) || index < 60 || index >= rows.length) return null;
  const row = rows[index];
  const prev = rows[index - 1];
  const close = Number(row.close || 0);
  const prevClose = Number(prev?.close || 0);
  const high = Number(row.high || 0);
  const low = Number(row.low || 0);
  const volume = Number(row.volume || 0);
  if (!close || !prevClose || !high || !low) return null;
  const ma5 = movingAverageAt(rows, index, 5);
  const ma20 = movingAverageAt(rows, index, 20);
  const ma60 = movingAverageAt(rows, index, 60);
  const ma5Prev = movingAverageAt(rows, index - 3, 5);
  const avgVol20 = averageVolumeAt(rows, index, 20);
  if (!ma5 || !ma20 || !ma60 || !avgVol20) return null;
  const returnPct = ((close - prevClose) / prevClose) * 100;
  const volumeRatio = volume / avgVol20;
  const closePosition = high === low ? 0.5 : (close - low) / (high - low);
  return {
    returnBucket: bucketReturn(returnPct),
    volumeBucket: bucketVolumeRatio(volumeRatio),
    closePositionBucket: bucketClosePosition(closePosition),
    aboveMa5: close >= ma5,
    aboveMa20: close >= ma20,
    aboveMa60: close >= ma60,
    ma5SlopeUp: ma5Prev ? ma5 >= ma5Prev : false,
  };
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  let score = 0;
  if (a.returnBucket === b.returnBucket) score += 2;
  if (a.volumeBucket === b.volumeBucket) score += 1;
  if (a.closePositionBucket === b.closePositionBucket) score += 1;
  if (a.aboveMa5 === b.aboveMa5) score += 1;
  if (a.aboveMa20 === b.aboveMa20) score += 1;
  if (a.aboveMa60 === b.aboveMa60) score += 1;
  if (a.ma5SlopeUp === b.ma5SlopeUp) score += 1;
  return score;
}

function calculateNextDayPatternStats(data, lookbackDays = 260) {
  const rows = Array.isArray(data) ? data.slice(-lookbackDays) : [];
  if (rows.length < 80) return { total: 0, up: 0, down: 0, flat: 0, upRate: null, avgReturn: null, medianReturn: null, score: 50, label: "데이터 부족", reliability: "낮음" };
  const currentFeature = makePatternFeature(rows, rows.length - 1);
  if (!currentFeature) return { total: 0, up: 0, down: 0, flat: 0, upRate: null, avgReturn: null, medianReturn: null, score: 50, label: "계산 대기", reliability: "낮음" };
  const matches = [];
  for (let i = 60; i < rows.length - 1; i += 1) {
    const feature = makePatternFeature(rows, i);
    const score = similarityScore(currentFeature, feature);
    if (score >= 6) {
      const todayClose = Number(rows[i].close || 0);
      const nextClose = Number(rows[i + 1].close || 0);
      if (!todayClose || !nextClose) continue;
      matches.push({ score, nextReturn: ((nextClose - todayClose) / todayClose) * 100 });
    }
  }
  const up = matches.filter((item) => item.nextReturn > 0.2).length;
  const down = matches.filter((item) => item.nextReturn < -0.2).length;
  const flat = matches.length - up - down;
  const upRate = matches.length ? (up / matches.length) * 100 : null;
  const returns = matches.map((item) => item.nextReturn).sort((a, b) => a - b);
  const avgReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : null;
  const medianReturn = returns.length ? (returns.length % 2 ? returns[Math.floor(returns.length / 2)] : (returns[returns.length / 2 - 1] + returns[returns.length / 2]) / 2) : null;
  const reliability = matches.length >= 40 ? "높음" : matches.length >= 20 ? "보통" : matches.length >= 10 ? "낮음" : "매우 낮음";
  let finalScore = upRate == null ? 50 : Math.round(upRate + (avgReturn > 0 ? 3 : avgReturn < 0 ? -3 : 0));
  if (matches.length < 10) finalScore = Math.round((finalScore + 50) / 2);
  let label = "중립";
  if (matches.length < 10) label = "사례 부족";
  else if (upRate >= 65) label = "상승 우세";
  else if (upRate >= 55) label = "상승 약우세";
  else if (upRate <= 35) label = "하락 우세";
  else if (upRate <= 45) label = "하락 약우세";
  return { total: matches.length, up, down, flat, upRate, avgReturn, medianReturn, score: clampScore(finalScore), label, reliability };
}

function calculateVolumeValueStats(dailyData) {
  if (!Array.isArray(dailyData) || dailyData.length < 25) return { volumeRatio: 1, valueRatio: 1, score: 50, label: "보통" };
  const today = dailyData[dailyData.length - 1];
  const prev20 = dailyData.slice(-21, -1);
  const avgVolume20 = prev20.reduce((sum, row) => sum + Number(row.volume || 0), 0) / Math.max(1, prev20.length);
  const avgValue20 = prev20.reduce((sum, row) => sum + Number(row.value || row.close * row.volume || 0), 0) / Math.max(1, prev20.length);
  const volumeRatio = avgVolume20 ? Number(today.volume || 0) / avgVolume20 : 1;
  const valueRatio = avgValue20 ? Number(today.value || today.close * today.volume || 0) / avgValue20 : 1;
  const isUpCandle = Number(today.close || 0) >= Number(today.open || 0);
  const isUpVsPrev = Number(today.close || 0) >= Number(dailyData[dailyData.length - 2]?.close || today.close || 0);
  let score = 50;
  if (volumeRatio >= 1.5) score += 12;
  if (valueRatio >= 1.5) score += 12;
  if (volumeRatio >= 2.5 && valueRatio >= 2.0) score += 8;
  if (isUpCandle && isUpVsPrev && volumeRatio >= 1.2) score += 10;
  if (!isUpCandle && volumeRatio >= 1.5) score -= 15;
  if (!isUpVsPrev && valueRatio >= 1.5) score -= 10;
  let label = "보통";
  if (score >= 75) label = "강한 관심";
  else if (score >= 60) label = "관심 증가";
  else if (score <= 35) label = "매물 출회";
  else if (score <= 45) label = "약함";
  return { volumeRatio, valueRatio, score: clampScore(score), label };
}

function getSupplyStrengthValue(summary, periodLabel, investor) {
  return Number(summary?.supplyStrength?.[periodLabel]?.[investor] || 0);
}

function calculateThemeStrengthStats(peerScores = [], marketCapTop = []) {
  const validPeers = Array.isArray(peerScores) ? peerScores.filter(Boolean) : [];
  const parsed = validPeers.map((item) => {
    const change = Number(String(item.change || "0").replace("%", ""));
    return { ...item, changeNumber: Number.isFinite(change) ? change : 0, scoreNumber: Number(item.score || 0) };
  });
  const total = parsed.length;
  const upCount = parsed.filter((item) => item.changeNumber > 0).length;
  const avgChange = total ? parsed.reduce((sum, item) => sum + item.changeNumber, 0) / total : 0;
  const avgScore = total ? parsed.reduce((sum, item) => sum + item.scoreNumber, 0) / total : 50;
  const topNames = new Set((marketCapTop || []).slice(0, 5).map((item) => String(item.name || "")));
  const leaders = parsed.filter((item) => topNames.has(String(item.name || "")));
  const leaderAvgChange = leaders.length ? leaders.reduce((sum, item) => sum + item.changeNumber, 0) / leaders.length : avgChange;
  const upRate = total ? (upCount / total) * 100 : 50;
  let score = 50 + (upRate - 50) * 0.35 + avgChange * 4 + (avgScore - 50) * 0.25 + leaderAvgChange * 3;
  const finalScore = clampScore(score);
  let label = "중립";
  if (finalScore >= 75) label = "테마 강함";
  else if (finalScore >= 62) label = "테마 우위";
  else if (finalScore <= 35) label = "테마 약함";
  else if (finalScore <= 45) label = "테마 둔화";
  return { total, upCount, upRate, avgChange, avgScore, leaderAvgChange, score: finalScore, label };
}

function calculateEnhancedTradingScore({ dynamicScores, supplyScore, supplyStrength20, foreignHoldChange20, volumeStats, volumeProfileScore, volatilityScore, themeStrengthScore, nextDayStats }) {
  const trendScore = Number(dynamicScores?.trend || 50);
  const volumeScore = Number(volumeStats?.score || dynamicScores?.volume || 50);
  const supplyBase = Number(supplyScore || dynamicScores?.supply || 50);
  const smartStrength = Number(supplyStrength20?.foreign || 0) + Number(supplyStrength20?.institution || 0);
  const supplyAdjusted = clampScore(supplyBase
    + (smartStrength >= 1 ? 8 : smartStrength >= 0.5 ? 5 : smartStrength >= 0.2 ? 3 : smartStrength <= -1 ? -8 : smartStrength <= -0.5 ? -5 : smartStrength <= -0.2 ? -3 : 0)
    + (Number(foreignHoldChange20 || 0) >= 0.5 ? 4 : Number(foreignHoldChange20 || 0) >= 0.2 ? 2 : Number(foreignHoldChange20 || 0) <= -0.5 ? -4 : Number(foreignHoldChange20 || 0) <= -0.2 ? -2 : 0));
  const profileScore = Number(volumeProfileScore || dynamicScores?.volumeProfile || 50);
  const volScore = Number(volatilityScore || dynamicScores?.volatility || 50);
  const themeScore = Number(themeStrengthScore || dynamicScores?.theme || 50);
  const nextDayScore = Number(nextDayStats?.score || 50);
  const finalScore = clampScore(trendScore * 0.25 + volumeScore * 0.20 + supplyAdjusted * 0.20 + profileScore * 0.15 + volScore * 0.10 + themeScore * 0.07 + nextDayScore * 0.03);
  const parts = { trend: clampScore(trendScore), volume: clampScore(volumeScore), supply: supplyAdjusted, volumeProfile: clampScore(profileScore), volatility: clampScore(volScore), theme: clampScore(themeScore), nextDay: clampScore(nextDayScore) };
  const strengths = [];
  const weaknesses = [];
  if (parts.trend >= 65) strengths.push("추세 구조 우위"); else if (parts.trend <= 45) weaknesses.push("추세 약세");
  if (parts.volume >= 65) strengths.push(`거래량·거래대금 ${volumeStats?.label || "증가"}`); else if (parts.volume <= 45) weaknesses.push("거래량 신뢰도 낮음");
  if (parts.supply >= 65) strengths.push(`수급 점수 ${parts.supply}점`); else if (parts.supply <= 45) weaknesses.push("수급 약세");
  if (smartStrength >= 0.2) strengths.push(`외국인+기관 1개월 강도 ${formatSignedPercent(smartStrength, 2)}`); else if (smartStrength <= -0.2) weaknesses.push(`외국인+기관 1개월 강도 ${formatSignedPercent(smartStrength, 2)}`);
  if (Number(foreignHoldChange20 || 0) >= 0.2) strengths.push(`외국인 보유율 20일 ${formatSignedPoint(foreignHoldChange20)}`); else if (Number(foreignHoldChange20 || 0) <= -0.2) weaknesses.push(`외국인 보유율 20일 ${formatSignedPoint(foreignHoldChange20)}`);
  if (parts.volumeProfile >= 65) strengths.push("매물대 여유 양호"); else if (parts.volumeProfile <= 45) weaknesses.push("가까운 저항 부담");
  if (parts.volatility <= 40) weaknesses.push("변동성 과다"); else if (parts.volatility >= 70) strengths.push("변동성 안정");
  if (parts.theme >= 65) strengths.push("테마 동조 강함"); else if (parts.theme <= 45) weaknesses.push("테마 동조 약함");
  if (nextDayStats?.total >= 10 && nextDayStats.upRate >= 60) strengths.push(`유사패턴 상승 ${nextDayStats.upRate.toFixed(0)}%`); else if (nextDayStats?.total >= 10 && nextDayStats.upRate <= 45) weaknesses.push(`유사패턴 상승 ${nextDayStats.upRate.toFixed(0)}%`);
  return { score: finalScore, label: scoreText(finalScore), parts, strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4) };
}

function PeriodSummaryTable({ rows, labels }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">기간별 수급·변동성 요약</h3>
          <p className="text-xs font-bold text-slate-500">1주·1개월·3개월·6개월·1년·2년 기준 한눈에 보기</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">1주=5거래일</span>
      </div>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-100">
        <div className="grid min-w-[760px] bg-slate-50 text-xs font-black text-slate-500" style={{ gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${labels.length}, minmax(92px, 1fr))` }}>
          <div className="p-3">구분</div>
          {labels.map((label) => <div key={label} className="p-3 text-right">{label}</div>)}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid min-w-[760px] border-t border-slate-100 text-sm" style={{ gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${labels.length}, minmax(92px, 1fr))` }}>
            <div className="p-3 font-black text-slate-800">{row.label}</div>
            {labels.map((label) => <div key={`${row.label}-${label}`} className={`p-3 text-right font-black ${row.tones?.[label] || "text-slate-900"}`}>{row.values?.[label] ?? "-"}</div>)}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">기관·외국인 금액은 순매매량 × 종가 기준 추정값입니다. 변동성은 ATR% 기준입니다.</p>
    </div>
  );
}

function roundToTick(price) {
  if (!Number.isFinite(price)) return 0;
  if (price < 1000) return Math.round(price);
  if (price < 5000) return Math.round(price / 5) * 5;
  if (price < 10000) return Math.round(price / 10) * 10;
  if (price < 50000) return Math.round(price / 50) * 50;
  if (price < 100000) return Math.round(price / 100) * 100;
  if (price < 500000) return Math.round(price / 500) * 500;
  return Math.round(price / 1000) * 1000;
}

function scoreText(score) {
  if (score >= 85) return "강한 상승 우위";
  if (score >= 70) return "상승 우위";
  if (score >= 60) return "약한 상승 우위";
  if (score >= 50) return "중립";
  if (score >= 40) return "하락 위험 우위";
  return "단기 회피";
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function TopMetricCard({ label, value, sub, icon: Icon, tone = "slate" }) {
  const toneClass = tone === "red" ? "text-rose-600" : tone === "blue" ? "text-blue-600" : tone === "green" ? "text-emerald-600" : "text-slate-950";
  return (
    <Card className="min-h-[124px] overflow-hidden">
      <div className="flex items-start gap-3">
        {Icon && <div className="shrink-0 rounded-2xl bg-blue-50 p-3 text-blue-700"><Icon className="h-5 w-5" /></div>}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-500">{label}</p>
          <p
            className={`mt-2 line-clamp-2 min-h-[2.55em] max-w-full break-keep text-[clamp(10.5px,0.92vw,24px)] font-black leading-[1.15] tracking-[-0.04em] ${toneClass}`}
            title={String(value)}
          >
            {value}
          </p>
          <p className="mt-1 line-clamp-2 break-keep text-[clamp(11px,0.82vw,14px)] font-semibold leading-5 text-slate-500">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white"
      >
        ?
      </button>
      {open && <span className="absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium leading-5 text-slate-700 shadow-xl">{text}</span>}
    </span>
  );
}

function movingAverage(data, period) {
  return data.map((_, idx) => {
    const start = Math.max(0, idx - period + 1);
    const slice = data.slice(start, idx + 1);
    return slice.reduce((sum, x) => sum + x[3], 0) / slice.length;
  });
}

function calculateVolumeProfileFromDaily(dailyData, lookback = 60, bins = 12) {
  const data = dailyData.slice(-lookback);
  if (data.length < 5) return [];
  const minPrice = Math.min(...data.map((d) => d.low));
  const maxPrice = Math.max(...data.map((d) => d.high));
  const binSize = (maxPrice - minPrice) / bins || 1;
  const profile = Array.from({ length: bins }, (_, i) => ({
    from: minPrice + binSize * i,
    to: minPrice + binSize * (i + 1),
    volume: 0,
  }));
  for (const day of data) {
    const dayRange = Math.max(1, day.high - day.low);
    for (const bin of profile) {
      const overlap = Math.max(0, Math.min(day.high, bin.to) - Math.max(day.low, bin.from));
      if (overlap > 0) bin.volume += day.volume * (overlap / dayRange);
    }
  }
  const maxVolume = Math.max(...profile.map((p) => p.volume)) || 1;
  return profile.map((p) => ({
    ...p,
    score: p.volume / maxVolume,
    label: `${formatPrice(roundToTick(p.from))}~${formatPrice(roundToTick(p.to))}`,
  }));
}

function getCloseMaFromDaily(dailyData, period) {
  if (!dailyData || dailyData.length === 0) return null;
  const slice = dailyData.slice(-period);
  if (slice.length === 0) return null;
  return slice.reduce((sum, d) => sum + d.close, 0) / slice.length;
}

function calculateDynamicLevels(dailyData, lookbackDays = 60) {
  if (!dailyData || dailyData.length < 30) {
    return {
      confirm: "-",
      breakout: "-",
      pullback: "-",
      invalid: "-",
      resistance: "-",
      support: "-",
      confirmPrice: null,
      breakoutPrice: null,
      pullbackLow: null,
      pullbackHigh: null,
    };
  }

  const today = dailyData[dailyData.length - 1];
  const yesterday = dailyData[dailyData.length - 2];
  const close = today.close;
  const lookbackData = dailyData.slice(-lookbackDays);
  const profile = calculateVolumeProfileFromDaily(dailyData, lookbackDays, 12);

  const periodHigh = Math.max(...lookbackData.slice(0, -1).map((d) => d.high));
  const periodLow = Math.min(...lookbackData.map((d) => d.low));
  const prevHigh = yesterday.high;
  const prevLow = yesterday.low;

  const ma5 = getCloseMaFromDaily(dailyData, 5);
  const ma20 = getCloseMaFromDaily(dailyData, 20);
  const ma60 = getCloseMaFromDaily(dailyData, 60);
  const ma120 = getCloseMaFromDaily(dailyData, 120);

  const atrData = dailyData.slice(-15);
  let atr = close * 0.025;
  if (atrData.length >= 2) {
    const trs = [];
    for (let i = 1; i < atrData.length; i += 1) {
      const high = atrData[i].high;
      const low = atrData[i].low;
      const prevClose = atrData[i - 1].close;
      trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
    atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  }

  const maxDistance = lookbackDays <= 5 ? 0.05 : lookbackDays <= 20 ? 0.08 : lookbackDays <= 60 ? 0.12 : 0.15;
  const pullbackBand = lookbackDays <= 5 ? 0.008 : lookbackDays <= 20 ? 0.012 : lookbackDays <= 60 ? 0.015 : 0.02;

  const profileWithScore = profile.map((p) => {
    const mid = (p.from + p.to) / 2;
    const distancePct = Math.abs(mid - close) / close;
    return {
      ...p,
      mid,
      distancePct,
      score: p.volume / Math.pow(distancePct + 0.008, 1.15),
    };
  });

  // 위 저항/아래 지지는 단순 최대 거래량이 아니라,
  // 현재가와의 거리까지 반영한 “가까우면서 의미 있는 매물대”를 우선한다.
  const aboveZones = profileWithScore
    .filter((p) => p.from > close)
    .sort((a, b) => b.score - a.score);

  const belowZones = profileWithScore
    .filter((p) => p.to < close)
    .sort((a, b) => b.score - a.score);

  const nearestAbove = aboveZones[0];
  const nearestBelow = belowZones[0];
  const maxVolumeZone = [...profileWithScore].sort((a, b) => b.volume - a.volume)[0];

  const resistancePrice = nearestAbove ? roundToTick(nearestAbove.mid) : roundToTick(periodHigh);
  const supportPrice = nearestBelow ? roundToTick(nearestBelow.mid) : roundToTick(periodLow);
  const resistanceDistancePct = resistancePrice && close ? ((resistancePrice - close) / close) * 100 : null;
  const supportDistancePct = supportPrice && close ? ((supportPrice - close) / close) * 100 : null;
  const maxZoneMid = maxVolumeZone ? roundToTick(maxVolumeZone.mid) : null;
  const maxZoneDistancePct = maxZoneMid && close ? ((maxZoneMid - close) / close) * 100 : null;
  const formatZoneDesc = (zone, distancePct, fallbackText) => {
    if (!zone || distancePct == null) return fallbackText;
    const volumeText = Number(zone.volume || 0) > 0 ? `누적거래량 ${formatVolumeCompact(zone.volume)}` : "누적거래량 산출";
    return `현재가 대비 ${formatSignedPercent(distancePct, 1)} · ${volumeText}`;
  };

  // 1) 상승 확인선: 내일 바로 확인 가능한 가장 가까운 저항.
  // 전일 고가, 단기 이평선, 가까운 매물대, 현재가+0.5ATR 중 현재가 위에 있는 가장 가까운 값을 사용한다.
  const confirmCandidates = [
    prevHigh,
    close + atr * 0.5,
    nearestAbove?.mid,
    ma5,
    lookbackDays >= 20 ? ma20 : null,
  ]
    .filter((v) => Number.isFinite(v))
    .filter((v) => v > close * 1.002)
    .filter((v) => v < close * (1 + Math.max(0.04, maxDistance)));

  let confirmPrice = confirmCandidates.length > 0
    ? Math.min(...confirmCandidates)
    : close * 1.01;
  confirmPrice = roundToTick(confirmPrice);

  // 2) 강한 돌파선: 선택 기간 내 의미 있는 고점/강한 매물대 돌파선.
  // 가까운 확인선보다 한 단계 위에 있는 추세 돌파 가격으로 본다.
  const strongAbove = aboveZones
    .filter((p) => p.volume >= (nearestAbove?.volume || 0) * 0.65)
    .sort((a, b) => a.mid - b.mid)[0];

  const breakoutCandidates = [
    periodHigh,
    strongAbove?.mid,
    nearestAbove?.to,
    confirmPrice + atr * 0.8,
  ].filter((v) => Number.isFinite(v) && v > close * 1.005);

  let breakoutPrice = breakoutCandidates.length > 0
    ? Math.max(confirmPrice, Math.min(...breakoutCandidates))
    : confirmPrice + atr;
  breakoutPrice = roundToTick(breakoutPrice);

  // 3) 눌림 관심구간: 현재가 근처의 현실적인 지지 후보만 사용한다.
  // 기간에 따라 의미 있는 이평선 조합을 다르게 사용한다.
  const maSupportCandidates = lookbackDays <= 5
    ? [ma5, prevLow]
    : lookbackDays <= 20
      ? [ma5, ma20, prevLow]
      : lookbackDays <= 60
        ? [ma20, ma60, prevLow]
        : [ma60, ma120, prevLow];

  const supportCandidates = [
    ...maSupportCandidates,
    nearestBelow?.mid,
    periodLow,
  ]
    .filter((v) => Number.isFinite(v))
    .filter((v) => v < close)
    .filter((v) => v >= close * (1 - maxDistance));

  let pullbackBase;
  if (supportCandidates.length > 0) {
    // 가장 가까운 지지 후보를 우선 사용
    pullbackBase = Math.max(...supportCandidates);
  } else {
    // 지지 후보가 너무 멀면 현재가 기준 자연 눌림 구간으로 대체
    pullbackBase = close * (lookbackDays <= 5 ? 0.985 : lookbackDays <= 20 ? 0.97 : 0.955);
  }

  const halfBand = Math.max(close * pullbackBand, atr * 0.35);
  let pullbackLow = roundToTick(pullbackBase - halfBand);
  let pullbackHigh = roundToTick(pullbackBase + halfBand);

  // 눌림 상단이 현재가를 넘으면 의미가 없으므로 제한
  if (pullbackHigh >= close) {
    pullbackHigh = roundToTick(close * 0.995);
  }

  // 눌림 구간 폭이 너무 넓어지지 않도록 기간별 제한
  const maxWidth = close * (lookbackDays <= 5 ? 0.025 : lookbackDays <= 20 ? 0.035 : lookbackDays <= 60 ? 0.045 : 0.055);
  if (pullbackHigh - pullbackLow > maxWidth) {
    const center = (pullbackHigh + pullbackLow) / 2;
    pullbackLow = roundToTick(center - maxWidth / 2);
    pullbackHigh = roundToTick(center + maxWidth / 2);
  }

  const invalidPrice = roundToTick(Math.min(pullbackLow - atr * 0.4, periodLow));

  return {
    confirm: `${formatPrice(confirmPrice)}`,
    breakout: `${formatPrice(breakoutPrice)}`,
    pullback: `${formatPrice(pullbackLow)} ~ ${formatPrice(pullbackHigh)}`,
    invalid: `${formatPrice(invalidPrice)}`,
    resistance: nearestAbove ? nearestAbove.label : `${formatPrice(roundToTick(periodHigh))} 부근`,
    support: nearestBelow ? nearestBelow.label : `${formatPrice(roundToTick(periodLow))} 부근`,
    maxVolumeZone: maxVolumeZone ? maxVolumeZone.label : "-",
    resistanceDistancePct,
    supportDistancePct,
    maxZoneDistancePct,
    resistanceDesc: formatZoneDesc(nearestAbove, resistanceDistancePct, "선택 기간 기준 최근 고점 부근"),
    supportDesc: formatZoneDesc(nearestBelow, supportDistancePct, "선택 기간 기준 최근 저점 부근"),
    maxVolumeZoneDesc: maxVolumeZone ? formatZoneDesc(maxVolumeZone, maxZoneDistancePct, "거래량 최대 구간") : "거래량 최대 구간",
    confirmPrice,
    breakoutPrice,
    pullbackLow,
    pullbackHigh,
  };
}

function StarRating({ score }) {
  const stars = Math.ceil(score / 20);
  return (
    <div className="flex items-center gap-3">
      <div className="flex text-2xl leading-none">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= stars ? "text-yellow-400" : "text-slate-300"}>★</span>)}
      </div>
      <p className="text-2xl font-black text-slate-950">{score}</p>
    </div>
  );
}

function MiniScoreStars({ score }) {
  const stars = Math.ceil(score / 20);
  return (
    <div className="flex items-center gap-2">
      <div className="flex text-3xl leading-none">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= stars ? "text-yellow-400" : "text-slate-300"}>★</span>)}
      </div>
      <p className="text-3xl font-black text-slate-950">{(score / 20).toFixed(1)}</p>
      <p className="text-lg font-bold text-slate-500">/ 5.0</p>
    </div>
  );
}

function CandleChart({ data, months, levels, volumes = [] }) {
  const visibleData = data.slice(-months * 20);
  const visibleVolumes = volumes.slice(-months * 20);

  const width = 1320;
  const height = 645;
  const left = 70;
  const rightProfile = 170;
  const top = 28;
  const bottom = 78;
  const volumeH = 86;
  const volumeGap = 12;
  const chartW = width - left - rightProfile - 20;
  const chartH = height - top - bottom - volumeH - volumeGap;

  if (visibleData.length === 0) {
    return <div className="rounded-2xl bg-slate-50 p-10 text-center font-bold text-slate-500">차트 데이터가 없습니다.</div>;
  }

  const allHighs = visibleData.map((d) => d[1]);
  const allLows = visibleData.map((d) => d[2]);
  const markerValues = [levels.confirmPrice, levels.breakoutPrice, levels.pullbackLow, levels.pullbackHigh].filter(Number.isFinite);
  const max = Math.max(...allHighs, ...markerValues);
  const min = Math.min(...allLows, ...markerValues);
  const pad = (max - min) * 0.08 || 1;
  const y = (v) => top + ((max + pad - v) / (max - min + pad * 2)) * chartH;
  const x = (i) => left + (i + 0.5) * (chartW / visibleData.length);
  const candleW = Math.max(5, Math.min(14, (chartW / visibleData.length) * 0.55));

  const ma5 = movingAverage(data, 5).slice(-months * 20);
  const ma20 = movingAverage(data, 20).slice(-months * 20);
  const ma60 = movingAverage(data, 60).slice(-months * 20);
  const ma120 = movingAverage(data, 120).slice(-months * 20);
  const ma300 = movingAverage(data, 300).slice(-months * 20);
  const linePoints = (arr) => arr.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  const gridValues = [min, min + (max - min) * 0.25, min + (max - min) * 0.5, min + (max - min) * 0.75, max];

  const profileBins = 10;
  const profileMin = Math.min(...visibleData.map((d) => d[2]));
  const profileMax = Math.max(...visibleData.map((d) => d[1]));
  const profileBinSize = (profileMax - profileMin) / profileBins || 1;
  const rawProfile = Array.from({ length: profileBins }, (_, i) => ({
    from: profileMin + profileBinSize * i,
    to: profileMin + profileBinSize * (i + 1),
    volume: 0,
  }));

  visibleData.forEach((day, idx) => {
    const [, high, low] = day;
    const dayRange = Math.max(1, high - low);
    const dayVolume = visibleVolumes[idx] || 1;
    rawProfile.forEach((bin) => {
      const overlap = Math.max(0, Math.min(high, bin.to) - Math.max(low, bin.from));
      if (overlap > 0) bin.volume += dayVolume * (overlap / dayRange);
    });
  });

  const totalProfileVolume = rawProfile.reduce((sum, p) => sum + p.volume, 0) || 1;
  const maxProfileVolume = Math.max(...rawProfile.map((p) => p.volume), 1);
  const profile = rawProfile
    .map((p) => ({
      ...p,
      share: (p.volume / totalProfileVolume) * 100,
      strength: Math.round((p.volume / maxProfileVolume) * 100),
    }))
    .reverse();

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[780px] w-full rounded-2xl bg-white">
      <rect x="0" y="0" width={width} height={height} fill="white" />

      <defs>
        <pattern id="pullbackHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#fce7f3" opacity="0.55" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#ec4899" strokeWidth="3" opacity="0.55" />
        </pattern>
      </defs>

      {gridValues.map((v) => (
        <g key={v}>
          <line x1={left} x2={left + chartW} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3 3" />
          <rect x={left + chartW + 12} y={y(v) - 13} width="112" height="26" rx="7" fill="white" opacity="0.92" stroke="#e2e8f0" />
          <text x={left + chartW + 116} y={y(v) + 5} textAnchor="end" fontSize="14.4" fontWeight="800" fill="#475569">{Math.round(v).toLocaleString("ko-KR")}</text>
        </g>
      ))}

      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={left + chartW * t} x2={left + chartW * t} y1={top} y2={top + chartH} stroke="#f1f5f9" />
      ))}

      <g>
        {profile.map((p, i) => {
          const yy = y(p.to) + 2;
          const h = Math.max(7, y(p.from) - y(p.to) - 4);
          const percent = Math.round(p.share * 10) / 10;
          const maxBandW = chartW * 0.62;
          const minBandW = chartW * 0.12;
          const w = Math.max(minBandW, (p.strength / 100) * maxBandW);
          const color = p.strength >= 80 ? "#fb923c" : p.strength >= 55 ? "#fde047" : "#86efac";
          const textColor = p.strength >= 80 ? "#9a3412" : p.strength >= 55 ? "#854d0e" : "#166534";
          const strokeColor = p.strength >= 80 ? "#fdba74" : p.strength >= 55 ? "#facc15" : "#4ade80";

          return (
            <g key={i} opacity="0.88">
              <rect
                x={left}
                y={yy}
                width={w}
                height={h}
                rx="4"
                fill={color}
                stroke={strokeColor}
                opacity="0.5"
              />
              <g>
                <rect
                  x={Math.min(left + w + 6, left + chartW - 92)}
                  y={yy + Math.max(0, h / 2 - 11)}
                  width="86"
                  height="22"
                  rx="7"
                  fill="white"
                  opacity="0.9"
                  stroke="#cbd5e1"
                />
                <text
                  x={Math.min(left + w + 12, left + chartW - 86)}
                  y={yy + h / 2 + 4}
                  fontSize="12"
                  fontWeight="700"
                  fill={textColor}
                >
                  {percent}% · {p.strength}
                </text>
              </g>
            </g>
          );
        })}
      </g>

      <g transform={`translate(${left}, ${top + 14})`}>
        <rect x="0" y="-9" width="9" height="9" fill="#86efac" opacity="0.7" rx="2" />
        <text x="13" y="1" fontSize="12" fontWeight="900" fill="#166534">약</text>
        <rect x="36" y="-9" width="9" height="9" fill="#fde047" opacity="0.7" rx="2" />
        <text x="49" y="1" fontSize="12" fontWeight="900" fill="#854d0e">중</text>
        <rect x="72" y="-9" width="9" height="9" fill="#fb923c" opacity="0.7" rx="2" />
        <text x="85" y="1" fontSize="12" fontWeight="900" fill="#9a3412">강</text>
        <text x="116" y="1" fontSize="12" fontWeight="900" fill="#64748b">매물대: 비중% · 강도</text>
      </g>

      {visibleData.map((d, i) => {
        const [open, high, low, close] = d;
        const up = close >= open;
        const color = up ? "#ef4444" : "#2563eb";
        const cy1 = y(Math.max(open, close));
        const cy2 = y(Math.min(open, close));
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={y(high)} y2={y(low)} stroke={color} strokeWidth="2" />
            <rect x={x(i) - candleW / 2} y={cy1} width={candleW} height={Math.max(2, cy2 - cy1)} fill={color} stroke={color} rx="1" />
          </g>
        );
      })}

      <polyline points={linePoints(ma5)} fill="none" stroke="#f59e0b" strokeWidth="2.2" />
      <polyline points={linePoints(ma20)} fill="none" stroke="#ef4444" strokeWidth="2.2" />
      <polyline points={linePoints(ma60)} fill="none" stroke="#16a34a" strokeWidth="2.2" />
      <polyline points={linePoints(ma120)} fill="none" stroke="#8b5cf6" strokeWidth="2" />
      <polyline points={linePoints(ma300)} fill="none" stroke="#94a3b8" strokeWidth="2" />

      <g>
        {(() => {
          const maxVolume = Math.max(...visibleVolumes, 1);
          const volumeTop = top + chartH + volumeGap;
          const volumeBottom = volumeTop + volumeH;
          const volumeMid = volumeTop + volumeH / 2;
          return (
            <>
              <rect x={left} y={volumeTop} width={chartW} height={volumeH} rx="8" fill="#f8fafc" />
              <line x1={left} x2={left + chartW} y1={volumeTop} y2={volumeTop} stroke="#cbd5e1" />
              <line x1={left} x2={left + chartW} y1={volumeMid} y2={volumeMid} stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1={left} x2={left + chartW} y1={volumeBottom} y2={volumeBottom} stroke="#cbd5e1" />

              <rect x={left + chartW + 12} y={volumeTop - 13} width="112" height="26" rx="7" fill="white" opacity="0.92" stroke="#e2e8f0" />
              <text x={left + chartW + 116} y={volumeTop + 5} textAnchor="end" fontSize="14.4" fontWeight="800" fill="#475569">
                {Math.round(maxVolume / 10000).toLocaleString("ko-KR")}만
              </text>

              <rect x={left + chartW + 12} y={volumeMid - 13} width="112" height="26" rx="7" fill="white" opacity="0.92" stroke="#e2e8f0" />
              <text x={left + chartW + 116} y={volumeMid + 5} textAnchor="end" fontSize="14.4" fontWeight="800" fill="#475569">
                {Math.round(maxVolume / 2 / 10000).toLocaleString("ko-KR")}만
              </text>

              <rect x={left + chartW + 12} y={volumeBottom - 13} width="112" height="26" rx="7" fill="white" opacity="0.92" stroke="#e2e8f0" />
              <text x={left + chartW + 116} y={volumeBottom + 5} textAnchor="end" fontSize="14.4" fontWeight="800" fill="#475569">0</text>

              <rect x={left + 4} y={volumeTop + 5} width="58" height="24" rx="7" fill="white" opacity="0.9" />
              <text x={left + 12} y={volumeTop + 21} fontSize="13.2" fontWeight="900" fill="#64748b">거래량</text>

              {visibleData.map((d, i) => {
                const [open, , , close] = d;
                const up = close >= open;
                const color = up ? "#ef4444" : "#2563eb";
                const vol = visibleVolumes[i] || 0;
                const barH = Math.max(3, (vol / maxVolume) * volumeH);
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x(i) - candleW / 2}
                    y={volumeBottom - barH}
                    width={candleW}
                    height={barH}
                    fill={color}
                    opacity="0.68"
                    rx="1.5"
                  />
                );
              })}
            </>
          );
        })()}
      </g>

      {Number.isFinite(levels.pullbackLow) && Number.isFinite(levels.pullbackHigh) && (
        <g>
          <rect
            x={left}
            y={y(levels.pullbackHigh)}
            width={chartW}
            height={Math.max(10, y(levels.pullbackLow) - y(levels.pullbackHigh))}
            fill="url(#pullbackHatch)"
            stroke="#ec4899"
            strokeWidth="2.5"
            rx="6"
            opacity="0.9"
          />
          <rect x={left + chartW * 0.72} y={y(levels.pullbackLow) - 34} width="142" height="30" rx="9" fill="#ec4899" />
          <text
            x={left + chartW * 0.72 + 12}
            y={y(levels.pullbackLow) - 14}
            fontSize="14"
            fontWeight="900"
            fill="white"
            stroke="black"
            strokeWidth="2.4"
            paintOrder="stroke fill"
          >
            눌림 관심구간
          </text>
        </g>
      )}

      {Number.isFinite(levels.confirmPrice) && (
        <g>
          <line x1={left} x2={left + chartW} y1={y(levels.confirmPrice)} y2={y(levels.confirmPrice)} stroke="#16a34a" strokeWidth="4" />
          <rect x={left + chartW * 0.72} y={y(levels.confirmPrice) - 34} width="132" height="30" rx="9" fill="#16a34a" />
          <text
            x={left + chartW * 0.72 + 13}
            y={y(levels.confirmPrice) - 14}
            fontSize="14"
            fontWeight="900"
            fill="white"
            stroke="black"
            strokeWidth="2.4"
            paintOrder="stroke fill"
          >
            상승 확인선
          </text>
        </g>
      )}

      {Number.isFinite(levels.breakoutPrice) && (
        <g>
          <line x1={left} x2={left + chartW} y1={y(levels.breakoutPrice)} y2={y(levels.breakoutPrice)} stroke="#2563eb" strokeWidth="4" />
          <rect x={left + chartW * 0.73} y={y(levels.breakoutPrice) - 34} width="132" height="30" rx="9" fill="#2563eb" />
          <text
            x={left + chartW * 0.73 + 13}
            y={y(levels.breakoutPrice) - 14}
            fontSize="14"
            fontWeight="900"
            fill="white"
            stroke="black"
            strokeWidth="2.4"
            paintOrder="stroke fill"
          >
            강한 돌파선
          </text>
        </g>
      )}
    </svg>
  );
}

function PeriodButton({ active, children, onClick }) {
  return <button onClick={onClick} className={`rounded-xl px-3 py-2 text-sm font-black ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{children}</button>;
}

function SideRow({ color, title, value, desc }) {
  const bg = color === "green" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : color === "blue" ? "bg-blue-50 border-blue-100 text-blue-800" : color === "amber" ? "bg-amber-50 border-amber-100 text-amber-800" : "bg-rose-50 border-rose-100 text-rose-800";
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black">{title}</p>
          <p className="mt-1 line-clamp-2 break-keep text-xs font-semibold leading-5 opacity-80">{desc}</p>
        </div>
        <p className="shrink-0 text-right text-base font-black leading-tight text-slate-950 md:text-lg">{value}</p>
      </div>
    </div>
  );
}

function BottomTile({ icon: Icon, label, value, sub, tone = "blue" }) {
  const iconTone = tone === "green" ? "text-emerald-600 bg-emerald-50" : tone === "rose" ? "text-rose-600 bg-rose-50" : tone === "pink" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50";
  return (
    <Card className="min-h-[92px] overflow-hidden">
      <div className="flex items-center gap-3">
        <div className={`shrink-0 rounded-2xl p-3 ${iconTone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-500">{label}</p>
          <p className={`mt-1 line-clamp-2 break-keep text-lg font-black leading-tight ${tone === "green" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "text-slate-950"}`}>{value}</p>
          <p className="line-clamp-2 break-keep text-xs font-semibold leading-5 text-slate-500">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

function inferThemeByName(name) {
  const n = String(name || "");

  if (/(삼성전자|SK하이닉스|DB하이텍|한미반도체|리노공업|ISC|원익IPS|주성엔지니어링|테스|유진테크|HPSP|이오테크닉스)/.test(n)) return "반도체 / AI";
  if (/(현대차|기아|현대모비스|HL만도|성우하이텍|화신|에스엘|모트렉스|코리아에프티|구영테크)/.test(n)) return "자동차 / 부품";
  if (/(대우건설|현대건설|GS건설|DL이앤씨|HDC현대산업개발|삼성E&A|삼성엔지니어링|금호건설|계룡건설|코오롱글로벌|건설|건자재|시멘트|레미콘)/.test(n)) return "건설 / 해외수주";
  if (/(삼천당제약|퓨쳐켐|셀트리온|삼성바이오|유한양행|한미약품|알테오젠|리가켐바이오|HLB|보령|종근당|대웅제약|일동제약|제약|바이오|켐|팜|메드|메디|신약)/.test(n)) return "바이오 / 제약";
  if (/(LG에너지솔루션|삼성SDI|에코프로|포스코퓨처엠|엘앤에프|대주전자재료|엔켐|후성|천보|나노신소재|2차전지|배터리|양극재|음극재)/.test(n)) return "2차전지 / 소재";
  if (/(NAVER|카카오|크래프톤|엔씨소프트|넷마블|위메이드|컴투스|펄어비스|카카오게임즈|네오위즈|게임|인터넷)/.test(n)) return "인터넷 / 게임";
  if (/(한화솔루션|OCI|HD현대에너지솔루션|SK이터닉스|대명에너지|SDN|신성이엔지|에스에너지|태양광|신재생|풍력)/.test(n)) return "태양광 / 신재생";

  return "미분류";
}

const THEME_SCORE_MAP = {
  "태양광 / 신재생": {
    top: [
      { name: "HD현대에너지솔루션", score: 82, change: "+4.8%" },
      { name: "OCI홀딩스", score: 76, change: "+2.9%" },
      { name: "SK이터닉스", score: 72, change: "+1.7%" },
      { name: "대명에너지", score: 69, change: "+1.2%" },
      { name: "SDN", score: 64, change: "+0.8%" },
    ],
    bottom: [
      { name: "한화솔루션", score: 42, change: "-1.6%" },
      { name: "신성이엔지", score: 39, change: "-2.1%" },
      { name: "에스에너지", score: 36, change: "-2.8%" },
      { name: "윌링스", score: 33, change: "-3.4%" },
      { name: "파루", score: 29, change: "-4.2%" },
    ],
  },
  "2차전지 / 실리콘 음극재": {
    top: [
      { name: "대주전자재료", score: 78, change: "+3.4%" },
      { name: "나노신소재", score: 74, change: "+2.6%" },
      { name: "포스코퓨처엠", score: 71, change: "+1.9%" },
      { name: "이녹스", score: 68, change: "+1.3%" },
      { name: "천보", score: 63, change: "+0.7%" },
    ],
    bottom: [
      { name: "엔켐", score: 44, change: "-1.4%" },
      { name: "후성", score: 41, change: "-1.9%" },
      { name: "솔브레인홀딩스", score: 38, change: "-2.3%" },
      { name: "동화기업", score: 35, change: "-2.7%" },
      { name: "탑머티리얼", score: 31, change: "-3.6%" },
    ],
  },
  "반도체 / AI": {
    top: [
      { name: "한미반도체", score: 84, change: "+3.8%" },
      { name: "SK하이닉스", score: 80, change: "+2.7%" },
      { name: "리노공업", score: 76, change: "+1.9%" },
      { name: "ISC", score: 72, change: "+1.4%" },
      { name: "삼성전자", score: 68, change: "+0.8%" },
    ],
    bottom: [
      { name: "DB하이텍", score: 43, change: "-1.2%" },
      { name: "원익IPS", score: 40, change: "-1.8%" },
      { name: "주성엔지니어링", score: 37, change: "-2.2%" },
      { name: "테스", score: 34, change: "-2.9%" },
      { name: "유진테크", score: 31, change: "-3.3%" },
    ],
  },
  "자동차 / 부품": {
    top: [
      { name: "기아", score: 79, change: "+2.6%" },
      { name: "현대차", score: 75, change: "+1.8%" },
      { name: "현대모비스", score: 70, change: "+1.1%" },
      { name: "HL만도", score: 66, change: "+0.7%" },
      { name: "성우하이텍", score: 62, change: "+0.3%" },
    ],
    bottom: [
      { name: "화신", score: 42, change: "-1.1%" },
      { name: "에스엘", score: 39, change: "-1.6%" },
      { name: "모트렉스", score: 36, change: "-2.0%" },
      { name: "코리아에프티", score: 33, change: "-2.8%" },
      { name: "구영테크", score: 30, change: "-3.4%" },
    ],
  },
  "건설 / 해외수주": {
    top: [
      { name: "현대건설", score: 78, change: "+2.9%" },
      { name: "DL이앤씨", score: 74, change: "+2.1%" },
      { name: "GS건설", score: 70, change: "+1.6%" },
      { name: "HDC현대산업개발", score: 66, change: "+1.0%" },
      { name: "삼성E&A", score: 62, change: "+0.5%" },
    ],
    bottom: [
      { name: "대우건설", score: 44, change: "-1.2%" },
      { name: "금호건설", score: 40, change: "-1.8%" },
      { name: "계룡건설", score: 37, change: "-2.3%" },
      { name: "코오롱글로벌", score: 34, change: "-2.9%" },
      { name: "동부건설", score: 31, change: "-3.5%" },
    ],
  },
  "바이오 / 제약": {
    top: [
      { name: "알테오젠", score: 82, change: "+4.2%" },
      { name: "리가켐바이오", score: 77, change: "+2.5%" },
      { name: "퓨쳐켐", score: 74, change: "+2.1%" },
      { name: "삼천당제약", score: 71, change: "+1.6%" },
      { name: "삼성바이오로직스", score: 68, change: "+1.0%" },
    ],
    bottom: [
      { name: "셀트리온", score: 45, change: "-0.8%" },
      { name: "한미약품", score: 42, change: "-1.1%" },
      { name: "종근당", score: 39, change: "-1.4%" },
      { name: "대웅제약", score: 36, change: "-2.0%" },
      { name: "보령", score: 33, change: "-2.7%" },
    ],
  },
  "인터넷 / 게임": {
    top: [
      { name: "크래프톤", score: 78, change: "+2.8%" },
      { name: "NAVER", score: 73, change: "+1.9%" },
      { name: "카카오", score: 67, change: "+1.2%" },
      { name: "엔씨소프트", score: 61, change: "+0.6%" },
      { name: "넷마블", score: 58, change: "+0.2%" },
    ],
    bottom: [
      { name: "위메이드", score: 42, change: "-1.3%" },
      { name: "컴투스", score: 38, change: "-1.9%" },
      { name: "펄어비스", score: 35, change: "-2.5%" },
      { name: "카카오게임즈", score: 32, change: "-3.1%" },
      { name: "네오위즈", score: 30, change: "-3.6%" },
    ],
  },
  "미분류": {
    top: [
      { name: "삼성전자", score: 76, change: "+2.5%" },
      { name: "SK하이닉스", score: 72, change: "+1.8%" },
      { name: "현대차", score: 69, change: "+1.2%" },
      { name: "기아", score: 65, change: "+0.9%" },
      { name: "셀트리온", score: 61, change: "+0.4%" },
    ],
    bottom: [
      { name: "카카오", score: 43, change: "-1.0%" },
      { name: "LG화학", score: 39, change: "-1.6%" },
      { name: "POSCO홀딩스", score: 36, change: "-2.1%" },
      { name: "삼성SDI", score: 32, change: "-2.8%" },
      { name: "NAVER", score: 28, change: "-3.5%" },
    ],
  },
};

function normalizeThemeKey(theme) {
  if (!theme) return "미분류";
  if (/반도체|AI/.test(theme)) return "반도체 / AI";
  if (/자동차|부품/.test(theme)) return "자동차 / 부품";
  if (/건설|건자재|시멘트|레미콘|해외수주/.test(theme)) return "건설 / 해외수주";
  if (/바이오|제약/.test(theme)) return "바이오 / 제약";
  if (/2차전지|배터리|소재|음극재|양극재/.test(theme)) return "2차전지 / 실리콘 음극재";
  if (/인터넷|게임/.test(theme)) return "인터넷 / 게임";
  if (/태양광|신재생/.test(theme)) return "태양광 / 신재생";
  return theme;
}

function ThemePeerScores({
  theme,
  stockName,
  peerScores = [],
  peerLoading = false,
  themeGroups = [],
  activeThemeIndex = 0,
  onSelectThemeIndex = () => {},
  demotedThemeCodes = {},
  onDemotePeer = () => {},
  demotedThemesByStock = {},
  onDemoteTheme = () => {},
}) {
  const inferredTheme = inferThemeByName(stockName);
  const normalizedTheme = normalizeThemeKey(theme);
  const finalTheme = normalizedTheme === "미분류" ? inferredTheme : normalizedTheme;
  const fallbackData = THEME_SCORE_MAP[finalTheme] || THEME_SCORE_MAP["미분류"];
  const hiddenThemesForStock = new Set((demotedThemesByStock?.[String(stockName || "")] || []).map(String));
  const visibleThemeGroups = themeGroups
    .map((group, originalIndex) => ({ ...group, originalIndex }))
    .filter((group) => !hiddenThemesForStock.has(String(group.theme)));
  const fallbackGroup = visibleThemeGroups[0] || themeGroups[0] || null;
  const rawActiveGroup = themeGroups[activeThemeIndex] || fallbackGroup;
  const activeGroup = rawActiveGroup && hiddenThemesForStock.has(String(rawActiveGroup.theme)) ? fallbackGroup : rawActiveGroup;
  const displayTheme = activeGroup?.theme || finalTheme || "미분류";
  const demotedCodesForTheme = new Set((demotedThemeCodes?.[displayTheme] || []).map(String));
  const adjustedPeerScores = [...peerScores].map((item) => ({
    ...item,
    score: demotedCodesForTheme.has(String(item.code)) ? 0 : item.score,
    _demoted: demotedCodesForTheme.has(String(item.code)),
  }));
  const hasRealPeerScores = adjustedPeerScores.length > 0;
  const backendCoreMarketCapTop = Array.isArray(activeGroup?.coreMarketCapTop) ? activeGroup.coreMarketCapTop : [];
  const marketCapTop = backendCoreMarketCapTop.length
    ? backendCoreMarketCapTop.filter((item) => !demotedCodesForTheme.has(String(item.code))).slice(0, 5)
    : adjustedPeerScores
        .filter((item) => Number(item.marketCap || 0) > 0)
        .sort((a, b) => Number(b.marketCap || 0) - Number(a.marketCap || 0))
        .slice(0, 5);
  const data = hasRealPeerScores
    ? {
        top: [...adjustedPeerScores].sort((a, b) => b.score - a.score).slice(0, 5),
        bottom: [...adjustedPeerScores].sort((a, b) => a.score - b.score).slice(0, 5),
        marketCapTop,
      }
    : {
        ...fallbackData,
        marketCapTop: marketCapTop.length ? marketCapTop : fallbackData.top,
      };
  const Row = ({ item, rank, weak = false }) => (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${weak ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{rank}</span>
        <p className="min-w-0 truncate break-keep text-[clamp(11px,1vw,14px)] font-black leading-tight text-slate-800" title={item.name}>{item.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-[clamp(10px,0.9vw,12px)] font-black ${item.change?.startsWith("+") ? "text-rose-600" : "text-blue-600"}`}>{item.change || "-"}</span>
        <span className={`rounded-lg px-2 py-1 text-[clamp(10px,0.9vw,12px)] font-black ${weak ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{item.score}점</span>
        {item.code && (
          <button type="button" title="이 종목을 이 테마 우선순위에서 뒤로 밀기" onClick={() => onDemotePeer(displayTheme, item)} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600">-</button>
        )}
      </div>
    </div>
  );

  const MarketCapRow = ({ item, rank }) => (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600">{rank}</span>
        <p className="min-w-0 truncate break-keep text-[clamp(11px,1vw,14px)] font-black leading-tight text-slate-800" title={item.name}>{item.name}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[clamp(10px,0.9vw,12px)] font-black text-blue-700">
        {formatMarketCap(item.marketCap)}
      </span>
      {item.code && (
        <button type="button" title="이 종목을 이 테마 우선순위에서 뒤로 밀기" onClick={() => onDemotePeer(displayTheme, item)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600">-</button>
      )}
    </div>
  );

  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">테마 유사 종목 매매 점수</h3>
          <p className="text-xs font-bold text-slate-500">
            {displayTheme} · {stockName} 기준 · {hasRealPeerScores ? "실제 일봉 점수" : peerLoading ? "불러오는 중" : "예시 데이터"}
          </p>
          {visibleThemeGroups.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleThemeGroups.slice(0, 2).map((group) => (
                <div key={group.theme} className="flex items-center overflow-hidden rounded-full ring-1 ring-slate-200">
                  <button
                    type="button"
                    onClick={() => onSelectThemeIndex(group.originalIndex)}
                    className={`px-3 py-1.5 text-xs font-black transition ${
                      displayTheme === group.theme ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {group.theme}
                    {Number(group.themeMarketCap || 0) > 0 ? ` · ${formatMarketCap(group.themeMarketCap)}` : ""}
                  </button>
                  <button type="button" title="이 종목에서 이 테마 숨기기" onClick={() => onDemoteTheme(stockName, group.theme)} className="h-full bg-slate-100 px-2 py-1.5 text-xs font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600">-</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          {peerLoading ? "계산 중" : "점수 상위·하위 / 시총 상위"}
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-emerald-700">상위 5개</p>
            <p className="text-xs font-bold text-slate-400">강한 종목</p>
          </div>
          <div className="space-y-2">
            {data.top.map((item, idx) => <Row key={item.name} item={item} rank={idx + 1} />)}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-rose-700">하위 5개</p>
            <p className="text-xs font-bold text-slate-400">약한 종목</p>
          </div>
          <div className="space-y-2">
            {data.bottom.map((item, idx) => <Row key={item.name} item={item} rank={idx + 1} weak />)}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-blue-700">시총 상위 5개</p>
            <p className="text-xs font-bold text-slate-400">테마 대형주</p>
          </div>
          <div className="space-y-2">
            {data.marketCapTop?.length ? data.marketCapTop.map((item, idx) => <MarketCapRow key={`${item.name}-cap`} item={item} rank={idx + 1} />) : (
              <div className="rounded-xl bg-white px-3 py-3 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                시총 데이터 연결 필요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function averageClose(days) {
  if (!days || days.length === 0) return null;
  return days.reduce((sum, d) => sum + Number(d.close || 0), 0) / days.length;
}

function calculateSimpleRSI(dailyData, period = 14) {
  if (!dailyData || dailyData.length < period + 1) return 50;
  const data = dailyData.slice(-(period + 1));
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < data.length; i += 1) {
    const diff = Number(data[i].close || 0) - Number(data[i - 1].close || 0);
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 80;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateSimpleATRPercent(dailyData, period = 14) {
  if (!dailyData || dailyData.length < period + 1) return 3;
  const data = dailyData.slice(-(period + 1));
  const trs = [];

  for (let i = 1; i < data.length; i += 1) {
    const high = Number(data[i].high || 0);
    const low = Number(data[i].low || 0);
    const prevClose = Number(data[i - 1].close || 0);
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  const close = Number(data[data.length - 1].close || 1);
  return (atr / close) * 100;
}

function calculateTradingScores(dailyData, stock, levels) {
  const fallback = stock?.scores || {
    priceAction: 50,
    trend: 50,
    volume: 50,
    momentum: 50,
    volatility: 50,
    supply: 50,
    theme: 50,
    volumeProfile: 50,
    candle: 50,
  };

  if (!dailyData || dailyData.length < 30) return fallback;

  const today = dailyData[dailyData.length - 1];
  const yesterday = dailyData[dailyData.length - 2] || today;
  const close = Number(today.close || 0);
  const open = Number(today.open || close);
  const high = Number(today.high || close);
  const low = Number(today.low || close);
  const volume = Number(today.volume || 0);
  const value = Number(today.value || close * volume);

  const ma5 = averageClose(dailyData.slice(-5)) || close;
  const ma20 = averageClose(dailyData.slice(-20)) || close;
  const ma60 = averageClose(dailyData.slice(-60)) || ma20;
  const ma120 = dailyData.length >= 120 ? averageClose(dailyData.slice(-120)) : ma60;
  const prevMa20 = averageClose(dailyData.slice(-25, -5)) || ma20;
  const prevMa60 = dailyData.length >= 80 ? averageClose(dailyData.slice(-80, -20)) : ma60;

  const recent20 = dailyData.slice(-20);
  const recent60 = dailyData.slice(-60);
  const high20 = Math.max(...recent20.slice(0, -1).map((d) => Number(d.high || 0)));
  const low20 = Math.min(...recent20.map((d) => Number(d.low || close)));
  const high60 = Math.max(...recent60.slice(0, -1).map((d) => Number(d.high || 0)));
  const low60 = Math.min(...recent60.map((d) => Number(d.low || close)));
  const vol20 = recent20.reduce((sum, d) => sum + Number(d.volume || 0), 0) / Math.max(1, recent20.length);
  const value20 = recent20.reduce((sum, d) => sum + Number(d.value || d.close * d.volume || 0), 0) / Math.max(1, recent20.length);

  const rsi = calculateSimpleRSI(dailyData, 14);
  const atrPct = calculateSimpleATRPercent(dailyData, 14);
  const prev5 = dailyData[dailyData.length - 6] || yesterday;
  const prev20 = dailyData[dailyData.length - 21] || yesterday;
  const roc5 = prev5.close ? ((close - prev5.close) / prev5.close) * 100 : 0;
  const roc20 = prev20.close ? ((close - prev20.close) / prev20.close) * 100 : 0;
  const dayRange = Math.max(1, high - low);
  const closePosition = ((close - low) / dayRange) * 100;
  const bodyRatio = Math.abs(close - open) / dayRange;
  const upperWickRatio = (high - Math.max(open, close)) / dayRange;
  const lowerWickRatio = (Math.min(open, close) - low) / dayRange;
  const volumeRatio = vol20 ? volume / vol20 : 1;
  const valueRatio = value20 ? value / value20 : 1;
  const isDown = close < yesterday.close;
  const isUpDay = close >= open;

  let priceAction = 35;
  if (close > ma5) priceAction += 10;
  if (close > ma20) priceAction += 15;
  if (close > ma60) priceAction += 15;
  if (close > ma120) priceAction += 10;
  if (close > high20) priceAction += 12;
  else if (close > high20 * 0.97) priceAction += 7;
  if (close < low20 * 1.03) priceAction -= 10;
  if (isDown && volumeRatio > 1.8 && closePosition < 35) priceAction -= 12;

  let trend = 35;
  if (ma5 > ma20) trend += 12;
  if (ma20 > ma60) trend += 16;
  if (ma60 > ma120) trend += 10;
  if (ma20 > prevMa20) trend += 14;
  if (ma60 >= prevMa60) trend += 8;
  if (close > ma20 && ma20 > ma60) trend += 8;
  if (close < ma20 && ma20 < ma60) trend -= 12;

  let volumeScore = 45;
  if (volumeRatio > 1.2) volumeScore += 10;
  if (volumeRatio > 1.8) volumeScore += 8;
  if (valueRatio > 1.2) volumeScore += 8;
  if (close > yesterday.close && volumeRatio > 1.1) volumeScore += 12;
  if (isDown && volumeRatio > 1.4) volumeScore -= 16;
  if (isDown && volumeRatio > 2.0 && closePosition < 35) volumeScore -= 12;

  let momentum = 45;
  if (rsi >= 50 && rsi <= 70) momentum += 18;
  else if (rsi > 70 && rsi <= 82) momentum += 8;
  else if (rsi < 40) momentum -= 10;
  if (roc5 > 0) momentum += 8;
  if (roc20 > 0) momentum += 14;
  if (roc20 > 15 && upperWickRatio > 0.3) momentum -= 8;

  let volatility = 55;
  if (atrPct >= 1.2 && atrPct <= 4.5) volatility += 15;
  if (atrPct > 7) volatility -= 18;
  if ((high60 - low60) / Math.max(1, close) * 100 > 35 && close > ma20) volatility += 5;
  if (upperWickRatio > 0.45) volatility -= 10;

  let volumeProfile = 50;
  const resistanceDistance = levels?.breakoutPrice ? ((levels.breakoutPrice - close) / close) * 100 : 5;
  const supportDistance = levels?.pullbackLow ? ((close - levels.pullbackLow) / close) * 100 : 5;
  if (resistanceDistance > 3) volumeProfile += 10;
  if (resistanceDistance > 8) volumeProfile += 8;
  if (resistanceDistance < 1.5) volumeProfile -= 8;
  if (supportDistance < 8) volumeProfile += 8;
  if (supportDistance > 18) volumeProfile -= 8;

  let candle = 45;
  if (isUpDay) candle += 12;
  if (closePosition > 65) candle += 15;
  if (closePosition > 80) candle += 8;
  if (lowerWickRatio > 0.35) candle += 8;
  if (upperWickRatio > 0.4) candle -= 12;
  if (bodyRatio > 0.55 && isUpDay) candle += 7;
  if (!isUpDay && bodyRatio > 0.55 && closePosition < 35) candle -= 12;

  let theme = 50;
  const themeName = stock?.theme || "";
  if (/반도체|AI/.test(themeName)) theme += 18;
  if (/2차전지|소재|음극재|양극재/.test(themeName)) theme += 10;
  if (/바이오|제약/.test(themeName)) theme += 8;
  if (/태양광|신재생/.test(themeName)) theme += 6;
  if (/건설|해외수주/.test(themeName)) theme += 6;
  if (trend >= 65) theme += 8;
  if (volumeScore >= 65) theme += 6;

  let supply = 50;
  if (close > yesterday.close && volumeRatio > 1.1) supply += 12;
  if (close > ma20 && valueRatio > 1.1) supply += 10;
  if (isDown && volumeRatio > 1.4) supply -= 12;
  if (trend >= 65) supply += 6;

  return {
    priceAction: clampScore(priceAction),
    trend: clampScore(trend),
    volume: clampScore(volumeScore),
    momentum: clampScore(momentum),
    volatility: clampScore(volatility),
    supply: clampScore(supply),
    theme: clampScore(theme),
    volumeProfile: clampScore(volumeProfile),
    candle: clampScore(candle),
  };
}

export default function App() {
  const [query, setQuery] = useState("한화솔루션");
  const [selected, setSelected] = useState("한화솔루션");
  const [customStock, setCustomStock] = useState(null);
  const [peerScores, setPeerScores] = useState([]);
  const [themeGroups, setThemeGroups] = useState([]);
  const [activeThemeIndex, setActiveThemeIndex] = useState(0);
  const [themeDemotions, setThemeDemotions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("themeDemotions") || "{}"); } catch { return {}; }
  });
  const [themeHiddenByStock, setThemeHiddenByStock] = useState(() => {
    try { return JSON.parse(localStorage.getItem("themeHiddenByStock") || "{}"); } catch { return {}; }
  });
  const [peerLoading, setPeerLoading] = useState(false);
  const [chartMonths, setChartMonths] = useState(3);
  const [dailyData, setDailyData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [investorData, setInvestorData] = useState(null);
  const [investorLoading, setInvestorLoading] = useState(false);
  const [investorError, setInvestorError] = useState("");

  const defaultScores = STOCKS["한화솔루션"].scores;
  const defaultAvgCost = STOCKS["한화솔루션"].avgCost;
  const defaultFallbackCandles = STOCKS["한화솔루션"].fallbackCandles;
  const stock = customStock || STOCKS[selected] || STOCKS["한화솔루션"];

  useEffect(() => {
    let cancelled = false;
    async function loadDailyData() {
      setDataLoading(true);
      setDataError("");
      try {
        const response = await fetch(`http://127.0.0.1:4000/api/daily/${stock.code}`);
        if (!response.ok) throw new Error("일봉 데이터를 불러오지 못했습니다.");
        const json = await response.json();
        if (!cancelled) setDailyData(json.data || []);
      } catch {
        if (!cancelled) {
          setDailyData([]);
          setDataError("FastAPI 서버 연결 실패");
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadDailyData();
    return () => { cancelled = true; };
  }, [stock.code]);

  useEffect(() => {
    let cancelled = false;
    async function loadInvestorData() {
      if (!stock?.code) return;
      setInvestorLoading(true);
      setInvestorError("");
      try {
        const response = await fetch(`http://127.0.0.1:4000/api/investor/${stock.code}`);
        if (!response.ok) throw new Error("수급 데이터를 불러오지 못했습니다.");
        const json = await response.json();
        if (!cancelled) setInvestorData(json);
      } catch {
        if (!cancelled) {
          setInvestorData(null);
          setInvestorError("수급 API 연결 필요");
        }
      } finally {
        if (!cancelled) setInvestorLoading(false);
      }
    }
    loadInvestorData();
    return () => { cancelled = true; };
  }, [stock.code]);

  const candleData = useMemo(() => {
    if (dailyData.length > 0) return dailyData.map((d) => [d.open, d.high, d.low, d.close]);
    return stock.fallbackCandles;
  }, [dailyData, stock]);

  const volumeData = useMemo(() => {
    if (dailyData.length > 0) return dailyData.map((d) => d.volume || 0);
    return stock.fallbackCandles.map((_, idx) => 1000000 + Math.round(Math.abs(Math.sin(idx + 1)) * 2500000));
  }, [dailyData, stock]);

  const latest = dailyData[dailyData.length - 1];
  const prev = dailyData[dailyData.length - 2];
  const price = latest ? latest.close : candleData[candleData.length - 1]?.[3] || 0;
  const volume = latest ? latest.volume : 0;
  const value = latest ? latest.value : 0;
  const prevVolume = prev ? prev.volume : 0;
  const prevValue = prev ? prev.value : 0;
  const volumeChangeRate = latest && prevVolume ? ((volume - prevVolume) / prevVolume) * 100 : 0;
  const valueChangeRate = latest && prevValue ? ((value - prevValue) / prevValue) * 100 : 0;
  const dateText = latest ? `${latest.date} 15:30 기준` : "예시 데이터";
  const changeRate = latest && prev ? ((latest.close - prev.close) / prev.close) * 100 : 0;
  const changeAmount = latest && prev ? latest.close - prev.close : 0;
  const isUp = changeRate >= 0;
  const chartLookbackDays = chartMonths === 0.25 ? 5 : chartMonths === 12 ? 240 : chartMonths === 24 ? 480 : chartMonths * 20;
  const chartPeriodLabel = chartMonths === 0.25 ? "1주" : chartMonths === 12 ? "1년" : chartMonths === 24 ? "2년" : `${chartMonths}개월`;
  const levels = useMemo(() => calculateDynamicLevels(dailyData, chartLookbackDays), [dailyData, chartLookbackDays]);
  const dynamicScores = useMemo(() => calculateTradingScores(dailyData, stock, levels), [dailyData, stock, levels]);
  const activeThemeGroup = themeGroups[activeThemeIndex] || themeGroups[0] || null;
  const activeCoreMarketCapTop = Array.isArray(activeThemeGroup?.coreMarketCapTop) ? activeThemeGroup.coreMarketCapTop : [];
  const themeStrengthStats = useMemo(() => calculateThemeStrengthStats(peerScores, activeCoreMarketCapTop), [peerScores, activeCoreMarketCapTop]);
  const currentAtrPercent = calculateAtrPercentByDays(dailyData, chartLookbackDays);
  const volatilityStatus = getAtrStatus(currentAtrPercent);
  const volumeStats = useMemo(() => calculateVolumeValueStats(dailyData), [dailyData]);
  const investorSummary = investorData?.summary || null;
  const institutionNet20 = Number(investorSummary?.sum20?.institution || 0);
  const foreignNet20 = Number(investorSummary?.sum20?.foreign || 0);
  const getNetBuyStatus = (value) => {
    if (!investorSummary) return { title: "준비중", sub: "수급 API 연결 필요", tone: "slate" };
    if (value > 0) return { title: "순매수", sub: formatSignedMoney(value), tone: "red" };
    if (value < 0) return { title: "순매도", sub: formatSignedMoney(value), tone: "blue" };
    return { title: "중립", sub: "0원", tone: "slate" };
  };
  const institutionStatus = getNetBuyStatus(institutionNet20);
  const foreignStatus = getNetBuyStatus(foreignNet20);
  const foreignHoldRate = Number(investorSummary?.foreignHoldRate || 0);
  const foreignHoldChange5 = Number(investorSummary?.foreignHoldRateChange5 || 0);
  const foreignHoldChange20 = Number(investorSummary?.foreignHoldRateChange20 || 0);
  const foreignStrength20 = getSupplyStrengthValue(investorSummary, "1개월", "foreign");
  const institutionStrength20 = getSupplyStrengthValue(investorSummary, "1개월", "institution");
  const foreignStatusSub = foreignHoldRate > 0 ? `${foreignStatus.sub} · 보유 ${foreignHoldRate.toFixed(2)}% · 20일 ${formatSignedPoint(foreignHoldChange20)}` : foreignStatus.sub;
  const institutionStatusSub = investorSummary ? `${institutionStatus.sub} · 강도 ${formatSignedPercent(institutionStrength20, 2)}` : institutionStatus.sub;
  const nextDayStats = calculateNextDayPatternStats(dailyData, 260);
  const nextDayStatus = (() => {
    if (!dailyData?.length) return { title: "계산 대기", sub: "일봉 데이터 필요", tone: "slate" };
    if (!nextDayStats.total) return { title: nextDayStats.label, sub: "유사 조건 부족", tone: "slate" };
    const avgText = nextDayStats.avgReturn == null ? "평균 -" : `평균 ${formatSignedPercent(nextDayStats.avgReturn, 2)}`;
    const medianText = nextDayStats.medianReturn == null ? "중앙값 -" : `중앙값 ${formatSignedPercent(nextDayStats.medianReturn, 2)}`;
    const sub = `${nextDayStats.upRate.toFixed(0)}% · ${nextDayStats.up}승 ${nextDayStats.down}패 · ${avgText} · ${medianText} · ${nextDayStats.total}건`;
    if (nextDayStats.upRate >= 60) return { title: nextDayStats.label, sub, tone: "red" };
    if (nextDayStats.upRate <= 45) return { title: nextDayStats.label, sub, tone: "blue" };
    return { title: nextDayStats.label, sub, tone: "slate" };
  })();
  const enhancedScore = useMemo(() => calculateEnhancedTradingScore({
    dynamicScores,
    supplyScore: investorSummary?.supplyScore,
    supplyStrength20: investorSummary?.supplyStrength?.["1개월"],
    foreignHoldChange20,
    volumeStats,
    volumeProfileScore: dynamicScores?.volumeProfile,
    volatilityScore: volatilityStatus.score,
    themeStrengthScore: themeStrengthStats.score,
    nextDayStats,
  }), [dynamicScores, investorSummary, foreignHoldChange20, volumeStats, volatilityStatus.score, themeStrengthStats.score, nextDayStats]);
  const averageScore = enhancedScore.score;
  const recentFiveScores = useMemo(() => {
    const offsets = isUp ? [-7, -5, -3, -4, -2] : [8, 6, 4, 5, 3];
    return offsets.map((offset, idx) => ({
      day: `D-${5 - idx}`,
      score: Math.max(0, Math.min(100, averageScore + offset)),
    }));
  }, [averageScore, isUp]);
  const avgCostPeriod = chartPeriodLabel;
  const periodLabels = ["1주", "1개월", "3개월", "6개월", "1년", "2년"];
  const periodDays = { "1주": 5, "1개월": 20, "3개월": 60, "6개월": 120, "1년": 240, "2년": 480 };
  const moneyTone = (value) => Number(value || 0) > 0 ? "text-rose-600" : Number(value || 0) < 0 ? "text-blue-600" : "text-slate-500";
  const periodSummaryRows = [
    {
      label: "변동성",
      values: Object.fromEntries(periodLabels.map((label) => {
        const value = calculateAtrPercentByDays(dailyData, periodDays[label]);
        return [label, value == null ? "-" : `${value.toFixed(1)}%`];
      })),
      tones: Object.fromEntries(periodLabels.map((label) => {
        const value = calculateAtrPercentByDays(dailyData, periodDays[label]);
        return [label, value == null ? "text-slate-500" : value >= 8 ? "text-rose-600" : value >= 5 ? "text-amber-600" : "text-emerald-600"];
      })),
    },
    {
      label: "기관 순매수",
      values: Object.fromEntries(periodLabels.map((label) => [
        label,
        formatMoneyWithStrength(investorSummary?.periodSummary?.[label]?.institution || 0, investorSummary?.supplyStrength?.[label]?.institution || 0),
      ])),
      tones: Object.fromEntries(periodLabels.map((label) => [label, moneyTone(investorSummary?.periodSummary?.[label]?.institution || 0)])),
    },
    {
      label: "외국인 순매수",
      values: Object.fromEntries(periodLabels.map((label) => [
        label,
        formatMoneyWithStrength(investorSummary?.periodSummary?.[label]?.foreign || 0, investorSummary?.supplyStrength?.[label]?.foreign || 0),
      ])),
      tones: Object.fromEntries(periodLabels.map((label) => [label, moneyTone(investorSummary?.periodSummary?.[label]?.foreign || 0)])),
    },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadPeerScores() {
      if (!stock?.code || !dailyData || dailyData.length === 0) {
        setPeerScores([]);
        return;
      }

      try {
        setPeerLoading(true);
        const themeResponse = await fetch(`http://127.0.0.1:4000/api/theme/${stock.code}`);
        const themeJson = await themeResponse.json();
        const groups = Array.isArray(themeJson.themeGroups) ? themeJson.themeGroups : [];
        const safeIndex = Math.min(activeThemeIndex, Math.max(0, groups.length - 1));
        const activeGroup = groups[safeIndex] || { theme: themeJson.theme, peers: themeJson.peers || [] };
        const peers = Array.isArray(activeGroup.peers) ? activeGroup.peers.slice(0, 20) : [];

        if (!cancelled) {
          setThemeGroups(groups);
          if (safeIndex !== activeThemeIndex) setActiveThemeIndex(safeIndex);
        }

        const rows = await Promise.all(
          peers.map(async (peer) => {
            try {
              const dailyResponse = await fetch(`http://127.0.0.1:4000/api/daily/${peer.code}`);
              const dailyJson = await dailyResponse.json();
              const peerDaily = Array.isArray(dailyJson.data) ? dailyJson.data : [];
              if (peerDaily.length < 30) return null;

              const peerLevels = calculateDynamicLevels(peerDaily, chartLookbackDays);
              const scores = calculateTradingScores(peerDaily, { theme: activeGroup.theme || themeJson.theme, scores: defaultScores }, peerLevels);
              const score = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
              const latestPeer = peerDaily[peerDaily.length - 1];
              const prevPeer = peerDaily[peerDaily.length - 2];
              const change = latestPeer && prevPeer && prevPeer.close
                ? ((latestPeer.close - prevPeer.close) / prevPeer.close) * 100
                : 0;

              return {
                name: peer.name,
                code: peer.code,
                score,
                change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
                marketCap: Number(peer.marketCap || peer.marcap || peer.market_cap || peer.Marcap || 0),
              };
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setPeerScores(rows.filter(Boolean));
        }
      } catch {
        if (!cancelled) setPeerScores([]);
      } finally {
        if (!cancelled) setPeerLoading(false);
      }
    }

    loadPeerScores();

    return () => {
      cancelled = true;
    };
  }, [stock?.code, dailyData, chartLookbackDays, stock?.theme, activeThemeIndex]);

  const marketCap = value ? Math.round((value * 26) / 100000000) : 0;

  const handleSearch = async () => {
    const key = query.trim();
    if (!key) return;

    if (STOCKS[key]) {
      setCustomStock(null);
      setSelected(key);
      setChartMonths(3);
      return;
    }

    if (/^[0-9]{6}$/.test(key)) {
      setSelected(key);
      setCustomStock({
        name: `종목코드 ${key}`,
        code: key,
        market: "KRX",
        theme: "미분류",
        risk: "미정",
        scores: defaultScores,
        avgCost: defaultAvgCost,
        fallbackCandles: defaultFallbackCandles,
      });
      setChartMonths(3);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:4000/api/search?q=${encodeURIComponent(key)}`);
      const json = await response.json();
      const found = json.data?.[0];

      if (!found) {
        alert("검색 결과가 없습니다. 종목명을 다시 확인하거나 6자리 종목코드로 검색해보세요.");
        return;
      }

      setSelected(found.code);
      setCustomStock({
        name: found.name,
        code: found.code,
        market: found.market,
        theme: found.theme || inferThemeByName(found.name),
        risk: "미정",
        scores: defaultScores,
        avgCost: defaultAvgCost,
        fallbackCandles: defaultFallbackCandles,
      });
      setChartMonths(3);
    } catch {
      alert("종목 검색 서버 연결에 실패했습니다. FastAPI 서버가 켜져 있는지 확인하세요.");
    }
  };

  const handleDemotePeer = (themeName, item) => {
    const code = String(item?.code || "");
    const themeKey = String(themeName || "미분류");
    if (!code) return;
    setThemeDemotions((prev) => {
      const current = Array.isArray(prev[themeKey]) ? prev[themeKey].map(String) : [];
      const nextList = current.includes(code) ? current : [...current, code];
      const next = { ...prev, [themeKey]: nextList };
      localStorage.setItem("themeDemotions", JSON.stringify(next));
      return next;
    });
  };

  const handleDemoteTheme = (stockKey, themeName) => {
    const stockNameKey = String(stockKey || stock?.name || "");
    const themeKey = String(themeName || "");
    if (!stockNameKey || !themeKey) return;
    setThemeHiddenByStock((prev) => {
      const current = Array.isArray(prev[stockNameKey]) ? prev[stockNameKey].map(String) : [];
      const nextList = current.includes(themeKey) ? current : [...current, themeKey];
      const next = { ...prev, [stockNameKey]: nextList };
      localStorage.setItem("themeHiddenByStock", JSON.stringify(next));
      return next;
    });
    setActiveThemeIndex(0);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950 md:p-10">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">내매매몇점</h1>
            <p className="mt-3 text-lg font-bold text-slate-500">내 매매, 오늘은 몇 점?</p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-12 w-80 rounded-xl border border-slate-300 bg-white px-4 font-bold outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="종목명 또는 코드 검색"
            />
            <button onClick={handleSearch} className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-5 font-black text-white">
              <Search className="h-4 w-4" /> 검색
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-6">
          <TopMetricCard label="종목" value={stock.name} sub={`${stock.market} · ${stock.code}`} icon={Building2} />
          <TopMetricCard label="현재가" value={formatPrice(price)} sub={dateText} />
          <TopMetricCard label="등락률" value={`${isUp ? "+" : ""}${changeRate.toFixed(2)}%`} sub={`${isUp ? "+" : ""}${formatPrice(changeAmount)}`} icon={isUp ? TrendingUp : TrendingDown} tone={isUp ? "green" : "blue"} />
          <TopMetricCard
            label="거래량"
            value={formatVolumeCompact(volume)}
            sub={dataLoading ? "불러오는 중" : dataError || `전일 대비 ${volumeChangeRate >= 0 ? "+" : ""}${volumeChangeRate.toFixed(1)}%`}
            icon={BarChart3}
            tone={volumeChangeRate >= 0 ? "green" : "blue"}
          />
          <TopMetricCard
            label="거래대금"
            value={formatTradingValueCompact(value)}
            sub={`전일 대비 ${valueChangeRate >= 0 ? "+" : ""}${valueChangeRate.toFixed(1)}%`}
            icon={Landmark}
            tone={valueChangeRate >= 0 ? "green" : "blue"}
          />
          <Card className="min-h-[124px] overflow-hidden">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-500">오늘의 매매 점수</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{chartPeriodLabel}</span>
              </div>
              <div className="mt-2">
                <StarRating score={averageScore} />
                <p className="mt-1 text-xs font-black text-slate-500">{enhancedScore.label} · {(averageScore / 20).toFixed(1)} / 5.0</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">오늘의 매매 점수 구성</h2>
                <p className="text-xs font-bold text-slate-500">추세 25 · 거래량 20 · 수급 20 · 매물대 15 · 변동성 10 · 테마 7 · 다음날 3</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">{enhancedScore.score}점</span>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {[
                ["추세", enhancedScore.parts.trend],
                ["거래량", enhancedScore.parts.volume],
                ["수급", enhancedScore.parts.supply],
                ["매물대", enhancedScore.parts.volumeProfile],
                ["변동성", enhancedScore.parts.volatility],
                ["테마", enhancedScore.parts.theme],
                ["다음날", enhancedScore.parts.nextDay],
              ].map(([label, score]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-500">{label}</span>
                    <b className="text-sm text-slate-950">{score}점</b>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black text-emerald-700">강점</h3>
                <div className="space-y-2">
                  {(enhancedScore.strengths.length ? enhancedScore.strengths : ["뚜렷한 강점 부족"]).map((text) => (
                    <p key={text} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{text}</p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-rose-700">부담</h3>
                <div className="space-y-2">
                  {(enhancedScore.weaknesses.length ? enhancedScore.weaknesses : ["뚜렷한 부담 제한적"]).map((text) => (
                    <p key={text} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{text}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">차트</h2>
                <div className="mt-3 flex flex-wrap gap-5 text-sm font-bold text-slate-500">
                  <span className="text-amber-500">━ 5일선</span>
                  <span className="text-red-500">━ 20일선</span>
                  <span className="text-green-600">━ 60일선</span>
                  <span className="text-violet-500">━ 120일선</span>
                  <span className="text-slate-400">━ 300일선</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 0.25, label: "1주" },
                  { value: 1, label: "1개월" },
                  { value: 3, label: "3개월" },
                  { value: 6, label: "6개월" },
                  { value: 12, label: "1년" },
                  { value: 24, label: "2년" },
                ].map((item) => (
                  <PeriodButton key={item.label} active={chartMonths === item.value} onClick={() => setChartMonths(item.value)}>{item.label}</PeriodButton>
                ))}
              </div>
            </div>
            <CandleChart data={candleData} months={chartMonths} levels={levels} volumes={volumeData} />
            <section className="mt-4 grid gap-3 md:grid-cols-5">
              <BottomTile icon={TrendingUp} label="추세" value={averageScore >= 60 ? "상승 전환 시도" : "약세 지속"} sub="차트 구조 기준" tone={averageScore >= 60 ? "green" : "rose"} />
              <BottomTile icon={Activity} label="변동성" value={volatilityStatus.title} sub={volatilityStatus.sub} tone={volatilityStatus.tone} />
              <BottomTile icon={Users} label="기관 순매수" value={institutionStatus.title} sub={institutionStatusSub} tone={institutionStatus.tone === "red" ? "rose" : institutionStatus.tone === "blue" ? "blue" : "blue"} />
              <BottomTile icon={Globe2} label="외국인 순매수" value={foreignStatus.title} sub={foreignStatusSub} tone={foreignStatus.tone === "red" ? "rose" : foreignStatus.tone === "blue" ? "blue" : "blue"} />
              <BottomTile icon={BarChart3} label="다음날 통계" value={nextDayStatus.title} sub={nextDayStatus.sub} tone={nextDayStatus.tone === "red" ? "rose" : nextDayStatus.tone === "blue" ? "blue" : "blue"} />
            </section>
            <PeriodSummaryTable rows={periodSummaryRows} labels={periodLabels} />
            <ThemePeerScores
              theme={stock.theme}
              stockName={stock.name}
              peerScores={peerScores}
              peerLoading={peerLoading}
              themeGroups={themeGroups}
              activeThemeIndex={activeThemeIndex}
              onSelectThemeIndex={setActiveThemeIndex}
              demotedThemeCodes={themeDemotions}
              onDemotePeer={handleDemotePeer}
              demotedThemesByStock={themeHiddenByStock}
              onDemoteTheme={handleDemoteTheme}
            />
            <p className="mt-2 text-xs font-semibold text-slate-400">※ 차트는 KRX 일봉 데이터를 기반으로 표시됩니다. 수급·테마 점수와 테마 유사 종목 점수는 아직 일부 예시값입니다.</p>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-4 text-2xl font-black">내일 대응 구간</h2>
              <div className="space-y-3">
                <SideRow color="green" title="돌파 확인가" value={levels.confirm} desc={`${chartPeriodLabel} 기준 가장 가까운 확인 가격대`} />
                <SideRow color="blue" title="1차 저항 / 강한 돌파" value={levels.breakout} desc={`${chartPeriodLabel} 기준 강한 매수세가 필요한 가격대`} />
                <SideRow color="amber" title="1차 지지 / 눌림" value={levels.pullback} desc={`${chartPeriodLabel} 기준 하락 시 관심을 가질 매수 구간`} />
                <SideRow color="rose" title="손절 기준가" value={levels.invalid} desc={`${chartPeriodLabel} 기준 지지 이탈 위험 가격대`} />
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">핵심 매물 구간</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">{chartPeriodLabel} 기준</span>
              </div>
              <div className="space-y-3">
                <SideRow color="rose" title="위 저항 매물대" value={levels.resistance} desc={levels.resistanceDesc || `${chartPeriodLabel} 기준 현재가 위쪽의 가까운 저항 구간`} />
                <SideRow color="green" title="아래 지지 매물대" value={levels.support} desc={levels.supportDesc || `${chartPeriodLabel} 기준 현재가 아래쪽의 가까운 지지 구간`} />
                <SideRow color="amber" title="최대 매물대" value={levels.maxVolumeZone} desc={levels.maxVolumeZoneDesc || `${chartPeriodLabel} 기준 거래량이 가장 많이 쌓인 구간`} />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">수급 현황</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{investorLoading ? "불러오는 중" : investorData?.summary?.date || "API 필요"}</span>
                </div>
                {investorData?.summary ? (
                  <div className="space-y-3 text-sm">
                    {[
                      { label: "1일", data: investorData.summary.sum1 },
                      { label: "5일", data: investorData.summary.sum5 },
                      { label: "20일", data: investorData.summary.sum20 },
                    ].map((row) => (
                      <div key={row.label} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                        <div className="mb-2 flex items-center justify-between"><b className="text-slate-900">{row.label} 순매수</b><span className="text-[10px] font-bold text-slate-400">추정금액</span></div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100"><p className="font-bold text-slate-500">개인</p><b className={Number(row.data?.retail || 0) > 0 ? "text-rose-600" : "text-blue-600"}>{formatSignedMoney(row.data?.retail)}</b></div>
                          <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100"><p className="font-bold text-slate-500">외국인</p><b className={Number(row.data?.foreign || 0) > 0 ? "text-rose-600" : "text-blue-600"}>{formatSignedMoney(row.data?.foreign)}</b></div>
                          <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100"><p className="font-bold text-slate-500">기관</p><b className={Number(row.data?.institution || 0) > 0 ? "text-rose-600" : "text-blue-600"}>{formatSignedMoney(row.data?.institution)}</b></div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-blue-700">외국인 보유율</span><b className="text-sm text-slate-950">{foreignHoldRate > 0 ? `${foreignHoldRate.toFixed(2)}%` : "-"}</b></div>
                      <p className="mt-1 text-xs font-bold text-blue-700">5일 {formatSignedPoint(foreignHoldChange5)} · 20일 {formatSignedPoint(foreignHoldChange20)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                      <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-700">1개월 수급강도</span><span className="text-[10px] font-bold text-slate-400">순매수 / 시총</span></div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100"><p className="font-bold text-slate-500">외국인</p><b className={foreignStrength20 > 0 ? "text-rose-600" : foreignStrength20 < 0 ? "text-blue-600" : "text-slate-500"}>{formatSignedPercent(foreignStrength20, 2)}</b></div>
                        <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100"><p className="font-bold text-slate-500">기관</p><b className={institutionStrength20 > 0 ? "text-rose-600" : institutionStrength20 < 0 ? "text-blue-600" : "text-slate-500"}>{formatSignedPercent(institutionStrength20, 2)}</b></div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 text-white"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-300">수급 점수</span><b className="text-lg">{investorData.summary.supplyScore ?? "-"}점</b></div><p className="mt-1 text-xs font-bold text-slate-300">{investorData.summary.signal || "수급 데이터 확인 중"}</p></div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">{investorError || "수급 API 연결 후 표시됩니다."}</div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">수급 평균단가</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{avgCostPeriod} 기준</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-xl bg-slate-50 p-2"><span>개인</span><b>{formatAvgCostCell(investorData?.summary?.avgCost?.[avgCostPeriod]?.retail, stock.avgCost?.[avgCostPeriod]?.retail)}</b></div>
                  <div className="flex justify-between rounded-xl bg-blue-50 p-2"><span>외국인</span><b>{formatAvgCostCell(investorData?.summary?.avgCost?.[avgCostPeriod]?.foreign, stock.avgCost?.[avgCostPeriod]?.foreign)}</b></div>
                  <div className="flex justify-between rounded-xl bg-violet-50 p-2"><span>기관</span><b>{formatAvgCostCell(investorData?.summary?.avgCost?.[avgCostPeriod]?.institution, stock.avgCost?.[avgCostPeriod]?.institution)}</b></div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-400">차트 기간 버튼과 연동됩니다. 수급 평균단가는 기간 전체 순매수 금액 ÷ 순매수 수량 기준 추정값입니다.</p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-2xl font-black">오늘의 매매 점수</h2>
              <MiniScoreStars score={averageScore} />
              <p className="mt-3 text-sm font-bold text-slate-500">{scoreText(averageScore)} 구간입니다.</p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="mb-2 text-xs font-black text-slate-500">최근 5일 매매 점수</p>
                <div className="grid grid-cols-5 gap-1">
                  {recentFiveScores.map((item) => (
                    <div key={item.day} className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-100">
                      <p className="text-[10px] font-bold text-slate-500">{item.day}</p>
                      <p className="text-sm font-black text-slate-950">{item.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-xl font-black">선별된 핵심 지표</h2>
            <div className="space-y-3 text-sm leading-7 text-slate-700">
              <p className="rounded-2xl bg-slate-50 p-4"><b>추세:</b> SMA 5/20/60, 20일선 기울기, ADX+DMI, SuperTrend</p>
              <p className="rounded-2xl bg-slate-50 p-4"><b>거래량:</b> 거래량/20일 평균 비율, 거래대금, OBV, VWAP</p>
              <p className="rounded-2xl bg-slate-50 p-4"><b>모멘텀:</b> RSI, MACD Histogram, Stochastic RSI, ROC</p>
              <p className="rounded-2xl bg-slate-50 p-4"><b>매물대:</b> Volume Profile, 위 매물대 거리, 아래 지지대, 전고점/전저점</p>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-xl font-black">주의 문구</h2>
            <div className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>현재 차트와 가격 데이터는 FastAPI pykrx 서버의 KRX 일봉을 사용합니다. 수급 금액은 네이버 외국인·기관 순매매량 × 종가 기준 추정값이며, 테마 유사 종목 점수는 백엔드 테마 데이터와 일봉 점수를 함께 사용합니다.</p>
                <p className="font-black">오늘의 매매 점수 계산 방식: 추세 25%, 거래량·거래대금 20%, 수급강도 20%, 매물대 위치 15%, 변동성 10%, 테마 강도 7%, 다음날 유사패턴 통계 3%로 가중 계산합니다. 수급강도는 순매수 추정금액 / 시가총액 기준입니다. 별점은 20점당 1칸 기준입니다.</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
