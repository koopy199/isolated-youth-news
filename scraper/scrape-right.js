/**
 * 우측: 고립청년 공모·지원사업 수집기
 * 뉴스 기사가 아니라 "실제 지금 모집 중인 공모사업"을 목표로, 주요 배분기관의
 * 공모사업 게시판을 직접 크롤링한다.
 * - 사랑의열매 온라인 배분신청 사이트 (전국 공모사업 목록)
 * - 아름다운재단 배분신청 사이트 (WordPress 검색 API)
 * - 재단 후보 홈페이지: discover-foundations.js가 캐싱해둔 목록
 * - 관련 단체 홈페이지: 좌측 7개 단체 목록 재사용
 * 매일 새로 수집한 결과로 교체한다 (좌측과 동일하게 누적하지 않음 —
 * "지금 모집 중인" 정보라 지난 결과를 계속 쌓아둘 이유가 없음).
 */
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "docs", "data", "right.json");
const FOUNDATIONS_PATH = path.join(__dirname, "..", "docs", "data", "foundations.json");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

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

function hasGrant(title) {
  // "모집"/"신청"/"공고" 단독은 행사 참가자 모집 등과 겹쳐 오탐이 많아 제외하고,
  // 지원금·공모사업 성격이 뚜렷한 복합어 위주로 판단한다.
  return /공모사업|공모전|지원사업|지원금|보조금|사업\s?공고|모집\s?공고/.test(title);
}

// 사랑의열매·아름다운재단은 아동·노인·장애인 등 다양한 대상을 함께 다루므로,
// "고립"/"은둔"/"청년" 중 하나라도 언급된 것만 통과시켜 좁힌다.
function isYouthRelated(title) {
  return /고립|은둔|청년/.test(title);
}

// 아름다운재단 공지사항엔 "모집 공고"뿐 아니라 이미 마감된 "결과발표"류 게시물도
// 섞여 있다. 삭제하지 않고 "closed"로 분류해 화면 하단에 따로 보여준다.
function isClosedAnnouncement(title) {
  return /결과\s?발표|선정자\s?발표|선정\s?결과|서류심사|최종선정/.test(title);
}

// "(2026.05.22. 접수마감)"처럼 제목에 마감일이 박혀 있는 경우, 그 날짜가
// 이미 지났으면 "closed"로 분류한다.
function isPastDeadline(title) {
  const m = title.match(/(\d{4})[.\-\s]*(\d{1,2})[.\-\s]*(\d{1,2})\.?\s*접수\s?마감/);
  if (!m) return false;
  const d = new Date(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  return !isNaN(d) && d.getTime() < Date.now();
}

// 판단 근거가 없는 소스(일반 홈페이지 크롤링 등)는 기본적으로 "open"으로 둔다.
function classifyStatus(title) {
  return (isClosedAnnouncement(title) || isPastDeadline(title)) ? "closed" : "open";
}

// ── 사랑의열매 온라인 배분신청 (전국 공모사업 목록) ────────────────
async function scrapeChest() {
  const listUrl = "https://proposal.chest.or.kr/main/mainBusinessList.do";
  const res = await axios.get(listUrl, {
    headers: { ...HEADERS, Referer: "https://proposal.chest.or.kr/" },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data);
  const items = [];
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td").map((__, td) => strip($(td).text())).get();
    if (cells.length < 3) return;
    const [, title, deadline] = cells;
    if (!title || !isYouthRelated(title)) return;
    // 목록의 링크는 javascript:fn_goDetail(bsnsCode, bhfCode, appnDocNo) 형태라
    // 실제 상세페이지 URL(/popup/mainBusinessDetail.do)을 직접 조립해야 한다.
    const onclick = $(tr).find("a").attr("href") || "";
    const m = onclick.match(/fn_goDetail\('([^']*)','([^']*)','([^']*)'/);
    const url = m
      ? `https://proposal.chest.or.kr/popup/mainBusinessDetail.do?dstbBsnsCode=${m[1]}&appnDocNo=${m[3]}`
      : "https://proposal.chest.or.kr/";
    // 이 게시판 자체가 마감 전 공모만 노출하는 구조라 항상 "open"으로 분류한다.
    items.push({ title, url, date: deadline, source: "사랑의열매", source_url: "https://proposal.chest.or.kr/", status: "open" });
  });
  return items;
}

// ── 아름다운재단 배분신청 사이트 (WordPress 검색 API) ──────────────
async function scrapeBeautifulFund() {
  const items = [];
  for (const kw of ["청년", "고립", "은둔"]) {
    try {
      const res = await axios.get("https://change.beautifulfund.org/wp-json/wp/v2/posts", {
        params: { search: kw, per_page: 10, orderby: "date" },
        headers: HEADERS, timeout: 15000,
      });
      for (const p of res.data) {
        const title = strip(p.title.rendered);
        if (!isYouthRelated(title)) continue;
        items.push({
          title, url: p.link, date: p.date.slice(0, 10),
          source: "아름다운재단", source_url: "https://change.beautifulfund.org/",
          status: classifyStatus(title),
        });
      }
    } catch (e) { console.log(`  아름다운재단(${kw}) 오류: ${e.message.slice(0, 60)}`); }
  }
  return items;
}

// ── 홈페이지 크롤링 (재단 후보/관련 단체 공용) ─────────────────────
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
    // 일반 홈페이지 크롤링은 마감 여부를 판단할 근거(별도 마감일 필드)가 없어 기본 "open"으로 둔다.
    items.push({ title, url: href, date, source: name, source_url: url, status: classifyStatus(title) });
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

  const allItems = [];

  console.log("[사랑의열매]");
  try {
    const items = await scrapeChest();
    allItems.push(...items);
    console.log(`  → ${items.length}건`);
  } catch (e) { console.log(`  오류: ${e.message.slice(0, 60)}`); }

  console.log("[아름다운재단]");
  const bfItems = await scrapeBeautifulFund();
  allItems.push(...bfItems);
  console.log(`  → ${bfItems.length}건`);

  console.log("\n[재단 홈페이지 (캐싱된 후보 목록)]");
  for (const f of loadFoundations()) {
    process.stdout.write(`  ${f.name}... `);
    try {
      const items = await scrapeSite(f.name, f.url);
      allItems.push(...items);
      console.log(`${items.length}건`);
    } catch (e) { console.log(`오류: ${e.message.slice(0, 60)}`); }
  }

  console.log("\n[관련 단체 홈페이지 (좌측 목록 재사용)]");
  for (const s of loadLeftSources()) {
    process.stdout.write(`  ${s.name}... `);
    try {
      const items = await scrapeSite(s.name, s.url);
      allItems.push(...items);
      console.log(`${items.length}건`);
    } catch (e) { console.log(`오류: ${e.message.slice(0, 60)}`); }
  }

  allItems.forEach(it => { it.date = normalizeDate(it.date); });

  const seenKeys = new Set();
  const deduped = [];
  for (const item of allItems) {
    const key = (item.url || "").trim() || (item.title || "").trim();
    if (key && !seenKeys.has(key)) { seenKeys.add(key); deduped.push(item); }
  }

  const open = deduped.filter(it => it.status !== "closed");
  const closed = deduped.filter(it => it.status === "closed");

  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated_at: isoNow(),
    total: deduped.length,
    open, closed,
  }, null, 2), "utf-8");
  console.log(`\n저장 완료 → ${OUT_PATH} (모집 중 ${open.length}건 / 마감 ${closed.length}건)`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
