/**
 * 네이버 / 다음(카카오) / 구글 포털 검색 공통 유틸
 * 각 함수는 해당 포털의 무료 API 키가 없으면 빈 배열을 반환한다 (해당 포털만 건너뜀).
 */
const axios = require("axios");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

function strip(t) { return (t || "").replace(/\s+/g, " ").replace(/&[a-z#0-9]+;/gi, " ").trim(); }

async function searchNaver(keyword, count = 10) {
  const cid = process.env.NAVER_CLIENT_ID || "";
  const cs = process.env.NAVER_CLIENT_SECRET || "";
  if (!cid || !cs) { console.log(`  (네이버) NAVER_CLIENT_ID/SECRET 미설정 — 건너뜀`); return []; }
  try {
    const res = await axios.get("https://openapi.naver.com/v1/search/news.json", {
      params: { query: keyword, display: count, sort: "date" },
      headers: { ...HEADERS, "X-Naver-Client-Id": cid, "X-Naver-Client-Secret": cs },
      timeout: 15000,
    });
    return (res.data.items || []).map(it => ({
      title: strip(it.title.replace(/<[^>]+>/g, "")),
      url: it.originallink || it.link,
      date: it.pubDate || "",
      portal: "네이버",
    }));
  } catch (e) { console.log(`  (네이버:${keyword}) 오류: ${e.message.slice(0, 60)}`); return []; }
}

async function searchDaum(keyword, count = 10) {
  const kakaoKey = process.env.KAKAO_REST_API_KEY || "";
  if (!kakaoKey) { console.log(`  (다음) KAKAO_REST_API_KEY 미설정 — 건너뜀`); return []; }
  try {
    const res = await axios.get("https://dapi.kakao.com/v2/search/web", {
      params: { query: keyword, size: count },
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
      timeout: 15000,
    });
    return (res.data.documents || []).map(it => ({
      title: strip((it.title || "").replace(/<[^>]+>/g, "")),
      url: it.url,
      date: it.datetime || "",
      portal: "다음",
    }));
  } catch (e) { console.log(`  (다음:${keyword}) 오류: ${e.message.slice(0, 60)}`); return []; }
}

async function searchGoogle(keyword, count = 10) {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const cseId = process.env.GOOGLE_CSE_ID || "";
  if (!apiKey || !cseId) { console.log(`  (구글) GOOGLE_API_KEY/GOOGLE_CSE_ID 미설정 — 건너뜀`); return []; }
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key: apiKey, cx: cseId, q: keyword, num: Math.min(count, 10) },
      timeout: 15000,
    });
    return (res.data.items || []).map(it => ({
      title: strip(it.title || ""),
      url: it.link,
      date: "",
      portal: "구글",
    }));
  } catch (e) { console.log(`  (구글:${keyword}) 오류: ${e.message.slice(0, 60)}`); return []; }
}

module.exports = { searchNaver, searchDaum, searchGoogle };
