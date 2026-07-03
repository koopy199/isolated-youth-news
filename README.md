# 고립청년 지원 정보 허브

매일 **오전 9시(KST)** GitHub Actions가 자동으로 정보를 수집해 GitHub Pages에 게시하는, 조회 전용(read-only) 정적 사이트입니다. 수동 등록/업로드 기능은 없습니다.

자세한 배경과 의사결정 과정은 [PRD.md](PRD.md)를 참고하세요.

## 현재 배포 상태

- 배포 완료: https://koopy199.github.io/isolated-youth-news/
- 좌측(7개 단체)은 네이버 검색 API 키 등록 후 7곳 모두 정상 동작 확인 완료
- 우측은 뉴스 기사 대신 사랑의열매·아름다운재단 공모사업 게시판 직접 크롤링으로 전환, 실제 신청 가능한 공모만 표시

## 페이지 구성 (좌우 2단)

| 좌측 | 우측 |
|------|------|
| 지정 단체·기업(7곳) 소식 | 고립청년 공모·지원사업 소식 |

### 좌측 — 지정 단체·기업 (7곳, [scraper/sources-left.js](scraper/sources-left.js))

각 단체의 홈페이지를 크롤링하지 않고 **단체명을 네이버·다음·구글에 검색**해 중복을 제거한 뒤 단체별 상위 5건만 게시합니다. 홈페이지가 없어도 이름만으로 수집 가능합니다.

1. 사단법인 오늘은
2. 청년재단
3. 고민정거장 — *공식 홈페이지 없음, Instagram [@worrystation](https://instagram.com/worrystation)만 확인됨 — 포털 검색 방식이라 수집에는 영향 없음*
4. (주)안무서운회사
5. 광명시 청년동
6. 무브유어마인드 *(홈페이지 URL 확신도 낮음 — 우측 섹션의 "관련 단체 홈페이지" 크롤링에만 영향, 좌측 포털 검색과는 무관)*
7. 서울청년기지개센터

### 우측 — 고립청년 공모·지원사업 (뉴스 기사 아님, 실제 신청 가능한 공모만)

포털 뉴스검색으로는 "이미 끝난 일" 기사만 모이고 정작 지금 신청 가능한 공모사업은 잘 안 잡혀서, 주요 배분기관 게시판을 직접 크롤링하는 방식으로 바꿨습니다.

- **사랑의열매** (`proposal.chest.or.kr`): 전국 지회 공모사업 목록을 직접 크롤링 (링크가 `javascript:` 함수 호출 형태라 상세페이지 URL을 코드에서 직접 조립, 목록 조회 시 `Referer` 헤더 필수)
- **아름다운재단** (`change.beautifulfund.org`): WordPress REST API로 "청년"/"고립"/"은둔" 검색, "결과발표"류 및 마감 지난 공고는 제외
- Google Custom Search API로 "고립청년 재단" 검색 → 도메인 자동 추출, **주 1회** 갱신해 `docs/data/foundations.json`에 캐싱 (매일 재검색하지 않음 — 무료 쿼리 한도 관리 목적)
- 캐싱된 재단 후보 + 좌측 7개 단체 홈페이지(있는 경우)에서 공모/지원사업 키워드가 포함된 게시물 크롤링
- 좌측과 달리 매일 결과를 누적하지 않고 새로 수집한 것으로 교체 ("지금 모집 중"인 정보이므로)

## 필요한 GitHub Secrets (전부 무료 티어)

포털 검색(좌측 전체, 우측 키워드 검색)은 아래 키가 없으면 해당 포털은 **0건으로 건너뜁니다** (별도 RSS 폴백 없음 — 과거 시도한 네이버 RSS 폴백 URL은 더 이상 유효하지 않음을 확인했습니다).

| Secret | 용도 | 없을 때 |
|--------|------|---------|
| `GOOGLE_API_KEY`, `GOOGLE_CSE_ID` | 구글 검색 (Google Custom Search API, 하루 100건 무료) — 좌측 검색 + 우측 재단 후보 탐색/키워드 검색 | 구글 관련 수집 전부 건너뜀 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 네이버 검색 API | 네이버 검색 건너뜀 |
| `KAKAO_REST_API_KEY` | 다음(카카오) 웹 검색 API | 다음 검색 건너뜀 |

세 키를 전부 등록하지 않으면 좌측 섹션은 계속 빈 상태로 표시됩니다. MVP를 실제로 확인하려면 최소 1개 이상의 키 등록이 필요합니다.

## 설치 및 배포 방법

### 1. 이 저장소를 GitHub에 올리기

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/isolated-youth-news.git
git push -u origin main
```

### 2. GitHub Pages 활성화

저장소 Settings → Pages → Source: `main` 브랜치의 `/docs` 폴더 선택 후 Save.

### 3. API 키 등록 (좌측 섹션을 채우려면 필요)

저장소 Settings → Secrets and variables → Actions 에서 위 표의 Secret들을 등록. 키가 없어도 배포 자체는 정상 동작하지만, 좌측 섹션은 계속 빈 상태로 남습니다.

### 4. 수동 실행

Actions 탭 → `고립청년 지원 정보 수집` 또는 `고립청년 재단 후보 탐색 (주간)` → Run workflow

## 로컬 개발

```bash
cd scraper
npm install
npm run scrape:left
npm run discover:foundations   # GOOGLE_API_KEY / GOOGLE_CSE_ID 환경변수 필요
npm run scrape:right

# 웹페이지 미리보기
npx serve ../docs -p 3000
# http://localhost:3000 접속
```
