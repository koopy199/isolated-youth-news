/**
 * 우측: 고립청년 공모·지원사업 소식 수집기
 * - 포털 검색: 네이버/다음/구글 (각각 무료 API 키 필요, 없으면 해당 포털만 건너뜀)
 * - 재단 후보 홈페이지: discover-foundations.js가 캐싱해둔 목록
 * - 관련 단체 홈페이지: 좌측 7개 단체 목록 재사용
 */
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { searchNaver, searchDaum, searchGoogle } = require("./search-utils");

const OUT_PATH = path.join(__dirname, "..", "docs", "data", "right.json");
const FOUNDATIONS_PATH = path.join(__dirname, "..", "docs", "data", "foundations.json");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

const KEYWORDS = ["고립청년 지원사업", "고립청년 공모사업"];

function strip(t) { return (t || "").replace(/\s+/g, " ").replace(/&[a-z#0-9]+;/gi, " ").trim(); }

function absUrl(base, href) {
  if (!href) return base;
  if (href.startsWith("http")) return href;
  try { return new URL(href, base).href; } catch { return base; }
}

function isoNow() {
  return new Date(Date.now() + 9 * 3600000).toISOString().replace("Z", "+09:00");
}

function normalizeDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  const m = str.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return str.slice(0, 10);
}

function dateTs(str) {
  const d = new Date(str || "");
  return isNaN(d) ? 0 : d.getTime();
}

function hasGrant(title) {
  // "모집"/"신청"/"공고" 단독은 행사 참가자 모집 등과 겹쳐 오탐이 많아 제외하고,
  // 지원금·공모사업 성격이 뚜렷한 복합어 위주로 판단한다.
  return /공모사업|공모전|지원사업|지원금|보조금|사업\s?공고|모집\s?공고/.test(title);
}

// 포털 뉴스검색이 "청년"/"지원" 등 낱말만 겹쳐도 무관한 지역뉴스를 끌어오는 경우가 많아,
// 제목에 "고립" 또는 "은둔"이 포함된 것만 최소한으로 통과시킨다.
function isOnTopic(title) {
  return /고립|은둔/.test(title);
}

// ── 포털 검색 (네이버/다음/구글) ────────────────────────────────
async function scrapePortals() {
  const items = [];
  for (const kw of KEYWORDS) {
    const [naver, daum, google] = await Promise.all([
      searchNaver(kw, 10),
      searchDaum(kw, 10),
      searchGoogle(kw, 10),
    ]);
    for (const it of [...naver, ...daum, ...google].filter(it => isOnTopic(it.title))) {
      items.push({
        title: it.title, url: it.url, date: it.date,
        source: it.portal, source_url: "",
        keyword: kw,
      });
    }
  }
  return items;
}

// ── 홈페이지 크롤링 (재단/단체 공용) ──────────────────────────────
async function scrapeSite(name, url) {
  const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(res.data);
  const items = [];
  $("a").each((_, a) => {
    const title = strip($(a).text());
    if (title.length < 8 || title.length > 80 || !hasGrant(title)) return;
    const rawHref = $(a).attr("href") || "";
    if (!rawHref || rawHref.startsWith("javascript:") || rawHref.startsWith("#")) return;
    const href = absUrl(url, rawHref);
    const parent = $(a).closest("li, tr, .item, article");
    const date = strip(parent.find("[class*='date'], time").first().text());
    items.push({ title, url: href, date, source: name, source_url: url });
  });
  return [...new Map(items.map(i => [i.title, i])).values()].slice(0, 10);
}

function loadFoundations() {
  if (!fs.existsSync(FOUNDATIONS_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(FOUNDATIONS_PATH, "utf-8")).foundations || []; }
  catch { return []; }
}

function loadLeftSources() {
  try { return require("./sources-left").filter(s => s.url); }
  catch { return []; }
}

// ── 메인 ────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  let existingItems = [];
  if (fs.existsSync(OUT_PATH)) {
    try { existingItems = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")).items || []; }
    catch { console.log("기존 데이터 로드 실패, 새로 시작"); }
  }
  // 필터 기준이 바뀌어도 예전에 쌓인 데이터가 계속 남지 않도록, 누적된 항목도 매번 현재 기준으로 재검증한다.
  existingItems = existingItems.filter(it => it.keyword ? isOnTopic(it.title) : hasGrant(it.title));

  const newItems = [];

  console.log("[포털 검색]");
  newItems.push(...await scrapePortals());

  console.log("\n[재단 홈페이지 (캐싱된 후보 목록)]");
  for (const f of loadFoundations()) {
    process.stdout.write(`  ${f.name}... `);
    try {
      const items = await scrapeSite(f.name, f.url);
      newItems.push(...items);
      console.log(`${items.length}건`);
    } catch (e) { console.log(`오류: ${e.message.slice(0, 60)}`); }
  }

  console.log("\n[관련 단체 홈페이지 (좌측 목록 재사용)]");
  for (const s of loadLeftSources()) {
    process.stdout.write(`  ${s.name}... `);
    try {
      const items = await scrapeSite(s.name, s.url);
      newItems.push(...items);
      console.log(`${items.length}건`);
    } catch (e) { console.log(`오류: ${e.message.slice(0, 60)}`); }
  }

  newItems.forEach(it => { it.date = normalizeDate(it.date); });

  const seenKeys = new Set();
  const merged = [];
  for (const item of [...newItems, ...existingItems]) {
    const key = (item.url || "").trim() || (item.title || "").trim();
    if (key && !seenKeys.has(key)) { seenKeys.add(key); merged.push(item); }
  }
  merged.sort((a, b) => dateTs(b.date) - dateTs(a.date));

  fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: isoNow(), total: merged.length, items: merged }, null, 2), "utf-8");
  console.log(`\n저장 완료 → ${OUT_PATH} (총 ${merged.length}건)`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
