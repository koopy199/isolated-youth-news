/**
 * 좌측 섹션: 지정 단체·기업 (고정 리스트, 총 7곳)
 * scrape-left.js는 name만 사용해 포털 검색을 수행한다 (홈페이지를 직접 크롤링하지 않음).
 * url은 scrape-right.js가 "관련 단체 홈페이지" 공모 정보를 찾을 때 참고용으로 사용 — null이면 그 용도로만 건너뜀.
 */
module.exports = [
  { name: "사단법인 오늘은", url: "https://www.oneul.or.kr" },
  { name: "청년재단", url: "https://kyf.or.kr" },
  { name: "고민정거장", url: null }, // 공식 홈페이지 없음 — Instagram @worrystation 만 확인됨
  { name: "(주)안무서운회사", url: "https://notscary.co.kr" },
  { name: "광명시 청년동", url: "https://gmyouthzone.org" },
  { name: "무브유어마인드", url: "https://www.moveyourmind.co.kr" }, // URL 확신도 낮음, 확인 필요
  { name: "서울청년기지개센터", url: "https://siryc.or.kr" },
];
