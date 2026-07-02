/**
 * 우측 재단 후보 탐색기 (주 1회 실행)
 * 구글 검색 기준 "고립청년"+"재단" 키워드가 함께 검색되는 도메인을 재단 후보로 캐싱한다.
 * 필터링은 느슨하게 — 다소 부적합한 결과가 섞여도 허용.
 */
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "docs", "data", "foundations.json");
const QUERY = "고립청년 재단";

function isoNow() {
  return new Date(Date.now() + 9 * 3600000).toISOString().replace("Z", "+09:00");
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

async function searchGoogle(query) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) {
    console.log("GOOGLE_API_KEY / GOOGLE_CSE_ID 미설정 — 재단 후보 탐색 건너뜀");
    return [];
  }
  const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
    params: { key: apiKey, cx: cseId, q: query, num: 10 },
    timeout: 15000,
  });
  return res.data.items || [];
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  let existing = [];
  if (fs.existsSync(OUT_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")).foundations || []; }
    catch { console.log("기존 재단 목록 로드 실패, 새로 시작"); }
  }

  const results = await searchGoogle(QUERY);

  const seen = new Set(existing.map(f => f.url));
  const foundations = [...existing];
  for (const r of results) {
    const domain = domainOf(r.link);
    if (!domain) continue;
    const url = `https://${domain}`;
    if (seen.has(url)) continue;
    seen.add(url);
    foundations.push({ name: r.title, url, snippet: r.snippet || "" });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: isoNow(), query: QUERY, total: foundations.length, foundations }, null, 2), "utf-8");
  console.log(`재단 후보 총 ${foundations.length}건 저장 → ${OUT_PATH}`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
