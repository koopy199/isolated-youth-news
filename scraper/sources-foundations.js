/**
 * 우측 섹션: 종사자가 직접 조사해 제공한 청년지원기관 목록 (엑셀 "청년지원기관_리스트_1.xlsx" 기반)
 * scrape-right.js가 홈페이지를 크롤링해 공모/지원사업 게시물을 찾는 데 사용한다.
 * 이미 별도 전용 크롤러가 있는 사랑의열매·아름다운재단과, 좌측 목록에 이미 있는
 * 청년재단·사단법인 오늘은·(주)안무서운회사·서울청년기지개센터는 중복이라 제외했다.
 * 홈페이지가 따로 없는 곳(사람마중, 한국은둔형외톨이부모협회 — hsak.kr에 회원단체로만 등재)과
 * URL이 없는 곳(두나무 등 후원기업)도 제외했다.
 */
module.exports = [
  { name: "사단법인 씨즈 (두더지땅굴)", url: "https://theseeds.asia" },
  { name: "사단법인 니트생활자", url: "https://neetpeople.kr" },
  { name: "사단법인 푸른고래 리커버리센터", url: "https://the-recoverycenter.org" },
  { name: "(사)파이나다운청년들 (PIE)", url: "https://www.pie-edu.com" },
  { name: "사람을세우는사람들 (EXIT)", url: "https://www.instagram.com/theyouth1091" },
  { name: "사회적협동조합 일하는학교", url: "https://www.workingschool.net" },
  { name: "청년이음센터 (생명의전화종합사회복지관)", url: "http://www.lifelineseoul.or.kr" },
  { name: "한국은둔형외톨이지원연대 (KHYSA)", url: "http://hsak.kr" },
  { name: "K2인터내셔널코리아", url: "https://k2-kr.com" },
  { name: "광주광역시 은둔형외톨이지원센터", url: "https://gjtory.kr" },
  { name: "서울시고립예방센터", url: "https://sihsc.welfare.seoul.kr/knockseoul/main.do" },
  { name: "사회연대은행 (함께만드는세상)", url: "https://www.bss.or.kr" },
  { name: "함께일하는재단", url: "https://hamkke.org" },
  { name: "열매나눔재단", url: "https://merryyear.org" },
  { name: "나눔과기쁨", url: "http://www.joyfulunion.or.kr" },
  { name: "엔젤스헤이븐", url: "http://angelshaven.or.kr" },
  { name: "삼성 (삼성 희망디딤돌)", url: "https://csr.samsung.com/ko/program/samsung-stepping-stone-of-hope" },
  { name: "SK행복나눔재단", url: "https://skhappiness.org" },
  { name: "포스코1%나눔재단", url: "https://www.poscofoundation.org" },
  { name: "현대차정몽구재단", url: "https://www.hyundai-cmkfoundation.org" },
  { name: "HD현대1%나눔재단", url: "https://csr.hyundai-holdings.co.kr" },
  { name: "포니정재단", url: "https://ponychung.org" },
  { name: "에쓰오일 (S-OIL)", url: "https://www.s-oil.com" },
  { name: "신한금융희망재단", url: "https://www.shinhanfoundation.or.kr" },
  { name: "우체국공익재단", url: "https://www.kopf.or.kr" },
  { name: "스타벅스코리아 (스타벅스 재단)", url: "https://www.starbucks.co.kr/responsibility/starbucks_foundation.do" },
  { name: "KT&G복지재단", url: "https://www.ktngwelfare.org" },
  { name: "유니퀘스트그룹", url: "https://www.uniquest.co.kr" },
  { name: "다음세대재단", url: "https://www.daumfoundation.org" },
  { name: "신용카드사회공헌재단", url: "https://www.ccfd.or.kr" },
  { name: "(재)바보의나눔", url: "https://babo.or.kr" },
];
