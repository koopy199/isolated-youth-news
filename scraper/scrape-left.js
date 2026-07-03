/**
 * 좌측: 지정 단체 관련 포털 검색 수집기
 * 단체 홈페이지를 직접 크롤링하지 않고, 단체명을 네이버/다음/구글에 검색해
 * 나온 뉴스·소식 중 중복을 제거하고 단체별 상위 N건만 표시한다.
 */
const fs = require("fs");
const path = require("path");
const { searchNaver, searchDaum, searchGoogle } = require("./search-utils");

const ORGS = require("./sources-left");

const OUT_PATH = path.join(__dirname, "..", "docs", "data", "left.json");
const PER_ORG_LIMIT = 5;

function isoNow() {
  return new Date(Date.now() + 9 * 3600000).toISOString().replace("Z", "+09:00");
}

function dateTs(str) {
  const d = new Date(str || "");
  return isNaN(d) ? 0 : d.getTime();
}

// 언론 기사는 "사단법인"/"(주)" 같은 법인격 접두사 없이 약칭만 쓰는 경우가 많아,
// 검색과 매칭 모두 접두사를 뗀 이름으로 수행한다 (화면 표시용 정식 명칭은 그대로 둠).
function bareName(name) {
  return name.replace(/^\s*(사단법인|재단법인|\(주\)|㈜)\s*/, "").replace(/\s*주식회사\s*$/, "").trim();
}

// 네이버 등 포털 뉴스검색은 단체명 일부 단어만 겹쳐도 매칭하는 경우가 많다
// (예: "오늘은"이 일상 어휘라 무관 기사가 대거 걸림).
// 제목이나 요약에 단체명 전체 문구가 실제로 들어있는 것만 통과시킨다.
function mentionsOrg(it, name) {
  return `${it.title} ${it.description || ""}`.includes(name);
}

async function collectForOrg(fullName) {
  const name = bareName(fullName);
  const [naver, daum, google] = await Promise.all([
    searchNaver(name, 10),
    searchDaum(name, 10),
    searchGoogle(name, 10),
  ]);

  const seen = new Set();
  const deduped = [];
  for (const it of [...naver, ...daum, ...google].filter(it => mentionsOrg(it, name))) {
    const key = (it.url || "").trim() || it.title.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  deduped.sort((a, b) => dateTs(b.date) - dateTs(a.date));
  return deduped.slice(0, PER_ORG_LIMIT);
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  const allItems = [];
  const stats = {};

  for (const { name } of ORGS) {
    process.stdout.write(`${name}\n`);
    try {
      const items = await collectForOrg(name);
      allItems.push(...items.map(it => ({
        title: it.title, url: it.url, date: it.date,
        source: name, portal: it.portal,
      })));
      stats[name] = items.length;
      console.log(`  → ${items.length}건`);
    } catch (e) {
      stats[name] = `오류: ${e.message.slice(0, 60)}`;
      console.log(`  → 오류: ${e.message.slice(0, 60)}`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: isoNow(), stats, total: allItems.length, items: allItems }, null, 2), "utf-8");
  console.log(`\n저장 완료 → ${OUT_PATH} (총 ${allItems.length}건)`);
}

main().catch(e => { console.error("오류:", e.message); process.exit(1); });
