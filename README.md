# S2B 개인회원 사전가입 마이크로사이트 (퍼블리싱 결과물)

화면기획서 v0.4 (2026.09.07) 기준. 화면 HTML + 벨리데이션 JS까지 완료, 서버 연동은 Struts/JSP 로 별도 개발.

## 구조

```
index.html                  화면 목록 / 흐름 / 유효성 규칙 요약 (개발·검수용, 서비스 제외)
assets/css/s2b.css          공통 스타일 (s2b.kr 룩앤필)
assets/js/s2b.js            알럿, 벨리데이션, 이메일 인증, 개인정보 동의 팝업, S2B_API 스텁
assets/img/                 s2b.kr 현재 CI 이미지
assets/fonts/               Noto Sans KR woff2 (400/500/700, 내부망용 로컬 글꼴)
pages/*.html                화면 11개 (팝업 단위)
test/check.html             벨리데이션 자체점검 (브라우저에서 열면 PASS/FAIL 출력)
docs/                       기획검토 · 백로그 · 형상관리 경로
```

## 문서

- `docs/260908_S2B개인회원사전가입_기획검토.md` — 기획서 충돌·누락 항목과 퍼블리싱 임시 처리 기준
- `docs/260908_S2B개인회원사전가입_백로그.md` — 기획 확정·퍼블·서버 개발·검수 잔여 작업
- `docs/260908_S2B개인회원사전가입_형상관리.md` — 운영 소스 반영 경로(안), Action URL, 브랜치 규칙

## JSP 변환 시 할 일

1. `pages/*.html` 을 JSP 로 옮기고 `<!-- [JSP] ... -->` 주석 위치에 EL/JSTL 바인딩.
2. `assets/js/s2b.js` 의 `S2B_API` 3개 함수를 `$.ajax` 로 교체 (s2b.kr 은 jQuery 1.12.4 사용 중).

   | 함수 | 용도 | 콜백 |
   |---|---|---|
   | `checkId(userId, cb)` | 아이디 중복확인 | `cb({available})` |
   | `sendAuthMail(email, cb)` | 인증메일 발송 | `cb({success})` |
   | `verifyAuthCode(email, authCode, cb)` | 인증코드 검증 | `cb({verified})` |

3. `closePopup()` / `goMain()` 을 `window.close()` / 메인 이동으로 교체.
4. 회원정보입력 `<form>` 의 `data-demo` 제거 → 검증 통과 시 `form.submit()` POST.
5. `class="dev-note"` 요소와 개발용 링크 제거.

## 회원정보입력 전송 필드 (ActionForm)

| name | 설명 | 비고 |
|---|---|---|
| userNm, mobileNo, ci | KCB 인증 결과 | 서버는 세션값 사용, hidden 은 표시용 |
| instType, instCd, instNm | 로그인 기관 (D 수요기관 / S 공급업체) | 세션 |
| userId | 아이디 | 영문+숫자 6~15자 소문자 |
| userPw, userPw2 | 비밀번호/확인 | 영문+숫자+특수문자 8~20자 |
| email, authCode | 이메일, 인증코드 | 서버에서 인증완료 여부 재검증 |
| agreeYn | 개인정보수집 동의 | 동의 시 JS 가 Y 세팅 |

서버에서 반드시 재검증: 아이디 중복, 이메일 인증 완료 여부, CI 중복(수요기관 1:1, 공급업체 컴퍼니코드별 1:1), 형식 규칙.

## 화면 흐름

- 최초가입: intro → phone-auth → member-form → complete → my-info
- 추가가입: status(예/아니오/조회) → phone-auth → CI 대조 분기 → ci-dup-* 또는 member-form
- 조회: my-info(이메일 인증) → my-info-result-demand / my-info-result-supplier
