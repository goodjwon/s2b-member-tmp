/* =====================================================================
 * S2B 개인회원 사전가입 - 공통 스크립트
 *
 * [개발자 안내 - Struts/JSP 연동]
 *  - 화면 벨리데이션/알럿/타이머는 그대로 사용하면 되고,
 *    서버 호출은 아래 "S2B_API" 블록 3개 함수만 $.ajax(또는 fetch)로 교체하면 된다.
 *  - 콜백 규약: 성공/실패 모두 cb(결과객체) 한 번 호출. 통신오류는 s2bAlert 로 안내 후 cb 미호출 가능.
 *  - 최종 가입(다음 버튼)은 form.submit() → Struts Action(insert.do) 으로 POST.
 *    ActionForm 프로퍼티명은 input name 과 동일: userId, userPw, userPw2, email, authCode, agreeYn
 *    + hidden: userNm, mobileNo, ci, instType, instCd, instNm
 *  - closePopup()/goMain() 은 데모용(index.html 이동). 실제는 window.close() / 메인 URL로 교체.
 *  - class="dev-note" 요소는 개발용 표시이므로 JSP 변환 시 제거.
 * ===================================================================== */
(function () {
  'use strict';

  /* ===== 공통 알럿 (window.alert 대체) ===== */
  window.s2bAlert = function (msg, cb) {
    var dim = document.createElement('div');
    dim.className = 'dim';
    dim.innerHTML =
      '<div class="alert" role="alertdialog">' +
      '<div class="alert-head">알림</div>' +
      '<div class="alert-body"></div>' +
      '<div class="alert-foot"><button type="button" class="btn primary sm">확인</button></div></div>';
    dim.querySelector('.alert-body').textContent = msg;
    var btn = dim.querySelector('button');
    btn.onclick = function () { dim.remove(); if (cb) cb(); };
    document.body.appendChild(dim);
    btn.focus();
  };

  /* ===== 공통 확인 (예/아니오) ===== */
  window.s2bConfirm = function (msg, onYes, onNo) {
    var dim = document.createElement('div');
    dim.className = 'dim';
    dim.innerHTML =
      '<div class="alert" role="alertdialog">' +
      '<div class="alert-head">확인</div>' +
      '<div class="alert-body"></div>' +
      '<div class="alert-foot"><button type="button" class="btn primary sm" data-v="y">예</button>' +
      '<button type="button" class="btn sm" data-v="n">아니오</button></div></div>';
    dim.querySelector('.alert-body').textContent = msg;
    dim.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { dim.remove(); (b.dataset.v === 'y' ? onYes : onNo) && (b.dataset.v === 'y' ? onYes : onNo)(); };
    });
    document.body.appendChild(dim);
  };

  /* ===== 닫기 / S2B 메인 이동 =====
     [JSP] 팝업 창이면 window.close(), 레이어 팝업이면 부모의 닫기 함수 호출.
     goMain: opener.location.href = '/S2BNCustomer/S2B/index.jsp'; window.close(); 형태로 교체 */
  window.goMain = function () { location.href = '../index.html'; };
  window.closePopup = function () { location.href = '../index.html'; };

  /* =====================================================================
   * 서버 연동 지점 (S2B_API) - 개발 시 이 블록만 교체
   *  ※ 아래 구현은 데모용 스텁. 요청/응답 필드명은 예시이며 Action 설계에 맞게 조정.
   * ===================================================================== */
  var demoCode = ''; // 데모 전용
  window.S2B_API = {
    /* 아이디 중복확인
       [JSP] POST /S2BNCustomer/S2B/member/preJoin/checkId.do  {userId}
             응답 {available:true|false}
       cb({available:boolean}) */
    checkId: function (userId, cb) {
      var used = ['admin', 's2buser', 'yh0134', 'test01']; // 데모용 기가입 아이디
      cb({ available: used.indexOf(userId) < 0 });
    },
    /* 이메일 인증메일 발송
       [JSP] POST /S2BNCustomer/S2B/member/preJoin/sendAuthMail.do  {email}
             응답 {success:true}  (인증코드는 서버 세션/DB에 보관, 화면에 내려주지 말 것)
       cb({success:boolean, demoCode?:string})  - demoCode 는 데모 표시용, 실제 응답엔 없음 */
    sendAuthMail: function (email, cb) {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; demoCode = '';
      for (var i = 0; i < 6; i++) demoCode += chars[Math.floor(Math.random() * chars.length)];
      cb({ success: true, demoCode: demoCode });
    },
    /* 이메일 인증코드 검증
       [JSP] POST /S2BNCustomer/S2B/member/preJoin/verifyAuthCode.do  {email, authCode}
             응답 {verified:true|false}
       cb({verified:boolean}) */
    verifyAuthCode: function (email, authCode, cb) {
      cb({ verified: authCode === demoCode });
    }
  };

  /* ===== 유틸 ===== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function setMsg(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg' + (type ? ' ' + type : '');
  }
  function setState(inp, state) {
    inp.classList.remove('ok', 'err');
    if (state) inp.classList.add(state);
  }

  /* ===== 이메일 인증 (회원정보입력 / 나의 가입정보 조회 공통) =====
     필요 요소(data-role): email, email-msg, btn-send, code-row, code, code-msg, btn-verify, timer
     옵션: opts.onVerified() - 인증 완료 콜백  */
  window.initEmailAuth = function (root, opts) {
    opts = opts || {};
    var email = $('[data-role=email]', root), emailMsg = $('[data-role=email-msg]', root),
        btnSend = $('[data-role=btn-send]', root), codeRow = $('[data-role=code-row]', root),
        code = $('[data-role=code]', root), codeMsg = $('[data-role=code-msg]', root),
        btnVerify = $('[data-role=btn-verify]', root), timerEl = $('[data-role=timer]', root),
        devNote = $('[data-role=dev-code]', root);
    var state = { sent: false, verified: false, timer: null, remain: 0 };
    var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    function validEmail() {
      var v = email.value.trim();
      if (!v) { setState(email, ''); setMsg(emailMsg, ''); return false; }
      if (!EMAIL_RE.test(v)) { setState(email, 'err'); setMsg(emailMsg, '올바른 이메일 형식이 아닙니다.', 'err'); return false; }
      setState(email, 'ok');
      if (!state.sent) setMsg(emailMsg, '유효한 형식입니다. 인증메일을 발송해주세요', 'ok');
      return true;
    }
    function reset() {
      state.sent = false; state.verified = false;
      clearInterval(state.timer);
      codeRow.classList.add('hidden');
      code.value = ''; code.disabled = false; setState(code, ''); setMsg(codeMsg, '인증코드는 5분간 유효합니다. 숫자+영문만 입력 가능');
      btnSend.textContent = '인증메일 발송';
      btnVerify.textContent = '인증'; btnVerify.disabled = false;
      if (timerEl) timerEl.textContent = '';
      if (devNote) devNote.classList.add('hidden');
    }
    function tick() {
      var m = Math.floor(state.remain / 60), s = state.remain % 60;
      if (timerEl) timerEl.textContent = m + '분 ' + s + '초';
      if (state.remain <= 0) {
        clearInterval(state.timer);
        setMsg(codeMsg, '인증코드 유효시간이 만료되었습니다. 재발송 버튼을 클릭해주세요', 'err');
        btnVerify.disabled = true;
      }
      state.remain--;
    }
    function send() {
      if (!validEmail()) { email.focus(); return; }
      reset();
      S2B_API.sendAuthMail(email.value.trim(), function (res) {
        if (!res.success) { s2bAlert('인증메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'); return; }
        state.sent = true;
        if (devNote && res.demoCode) { devNote.textContent = '(개발용) 발송된 인증코드: ' + res.demoCode; devNote.classList.remove('hidden'); }
        setMsg(emailMsg, '인증메일을 발송했습니다.', 'ok');
        btnSend.textContent = '재발송';
        codeRow.classList.remove('hidden');
        state.remain = 5 * 60; tick();
        state.timer = setInterval(tick, 1000);
        code.focus();
      });
    }
    function verify() {
      var v = code.value.trim().toUpperCase();
      if (!v) { s2bAlert('인증코드 입력후에 인증버튼을 클릭하시기 바랍니다.', function () { code.focus(); }); return; }
      if (v.length !== 6) { setState(code, 'err'); setMsg(codeMsg, '6자리코드를 입력해주세요', 'err'); code.focus(); return; }
      S2B_API.verifyAuthCode(email.value.trim(), v, function (res) {
        if (!res.verified) {
          setState(code, 'err');
          s2bAlert('입력하신 인증코드가 일치하지 않습니다.\n입력코드를 확인하여 주시기 바랍니다.', function () { code.focus(); });
          return;
        }
        state.verified = true;
        clearInterval(state.timer);
        setState(code, 'ok'); setMsg(codeMsg, '이메일 인증이 완료되었습니다.', 'ok');
        code.disabled = true; email.readOnly = true;
        btnVerify.textContent = '인증완료'; btnVerify.disabled = true;
        if (timerEl) timerEl.textContent = '';
        s2bAlert('인증되었습니다.', function () { if (opts.onVerified) opts.onVerified(); });
      });
    }

    email.addEventListener('input', function () { if (state.sent) reset(); validEmail(); });
    btnSend.addEventListener('click', send);
    code.addEventListener('input', function () {
      code.value = code.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
      setState(code, ''); setMsg(codeMsg, code.value.length === 6 ? '' : '6자리코드를 입력해주세요', code.value.length === 6 ? '' : 'info');
    });
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
    btnVerify.addEventListener('click', verify);

    return { get verified() { return state.verified; }, get sent() { return state.sent; } };
  };

  /* ===== 회원정보입력 폼 ===== */
  window.initMemberForm = function (form) {
    var id = $('#userId', form), idMsg = $('#userIdMsg', form), btnDup = $('#btnDup', form),
        pw = $('#userPw', form), pwMsg = $('#userPwMsg', form),
        pw2 = $('#userPw2', form), pw2Msg = $('#userPw2Msg', form),
        agree = $('#agree', form), btnView = $('#btnPrivacy', form);
    var st = { dupOk: false, agreed: false };

    /* --- 아이디: 영문+숫자 6~15자, 대문자→소문자, 한글/특수문자/공백 불가, 실시간 검증 --- */
    function validId(quiet) {
      var v = id.value;
      if (!v) { setState(id, ''); setMsg(idMsg, ''); return false; }
      if (!/^[a-z0-9]{6,15}$/.test(v)) { setState(id, 'err'); setMsg(idMsg, '아이디 형식이 올바르지 않습니다.', 'err'); return false; }
      setState(id, st.dupOk ? 'ok' : '');
      if (!quiet) setMsg(idMsg, st.dupOk ? '사용가능한 아이디입니다.' : '사용 가능한 아이디 형식입니다. 중복확인을 해주세요', st.dupOk ? 'ok' : 'info');
      return true;
    }
    id.addEventListener('input', function () {
      id.value = id.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      st.dupOk = false;
      validId();
    });
    btnDup.addEventListener('click', function () {
      if (!id.value) { s2bAlert('아이디 입력후에 중복확인을 하시기 바랍니다.', function () { id.focus(); }); return; }
      if (!validId()) { id.focus(); return; }
      S2B_API.checkId(id.value, function (res) {
        if (!res.available) {
          st.dupOk = false; setState(id, 'err');
          s2bAlert('입력하신 아이디는 이미 사용중인 아이디입니다.', function () { id.focus(); id.select(); });
          return;
        }
        st.dupOk = true; validId();
        s2bAlert('사용가능한 아이디입니다.', function () { pw.focus(); });
      });
    });

    /* --- 비밀번호: 영문+숫자+특수문자 8~20자, 대문자→소문자, 한글/공백 불가 --- */
    function validPw() {
      var v = pw.value;
      if (!v) { setState(pw, ''); setMsg(pwMsg, ''); return false; }
      var ok = v.length >= 8 && v.length <= 20 && /[a-z]/.test(v) && /\d/.test(v) && /[^a-z0-9]/.test(v);
      setState(pw, ok ? 'ok' : 'err');
      setMsg(pwMsg, ok ? '사용 가능한 형식입니다.' : '영문+숫자+특수문자포함 8~20자로 입력해주세요', ok ? 'ok' : 'err');
      return ok;
    }
    function validPw2() {
      var v = pw2.value;
      if (!v) { setState(pw2, ''); setMsg(pw2Msg, ''); return false; }
      var ok = v === pw.value;
      setState(pw2, ok ? 'ok' : 'err');
      setMsg(pw2Msg, ok ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.', ok ? 'ok' : 'err');
      return ok;
    }
    pw.addEventListener('input', function () {
      pw.value = pw.value.toLowerCase().replace(/[\sㄱ-힝]/g, '').slice(0, 20);
      validPw(); if (pw2.value) validPw2();
    });
    pw2.addEventListener('input', function () {
      pw2.value = pw2.value.toLowerCase().replace(/[\sㄱ-힝]/g, '').slice(0, 20);
      validPw2();
    });

    /* --- 이메일 인증 --- */
    var mail = initEmailAuth(form);

    /* --- 개인정보수집/이용 동의: 직접 체크 불가, 본문 하단까지 스크롤 후 동의 시 체크 --- */
    agree.addEventListener('click', function (e) {
      if (st.agreed) { e.preventDefault(); return; } // 동의 후 해제 불가
      e.preventDefault();
      s2bAlert('본문 확인이 필수입니다.\n보기버튼을 클릭하시기 바랍니다.', function () { btnView.focus(); });
    });
    btnView.addEventListener('click', function () {
      var tpl = $('#privacyTpl');
      var dim = document.createElement('div');
      dim.className = 'dim';
      dim.innerHTML = tpl.innerHTML;
      document.body.appendChild(dim);
      var box = $('.scroll-box', dim), btnAgree = $('[data-role=btn-agree]', dim), hint = $('.scroll-hint', dim);
      function check() {
        if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) {
          btnAgree.disabled = false; hint.textContent = '본문 확인이 완료되었습니다. 동의 버튼을 클릭하세요';
          hint.style.color = '#2e9e5b';
        }
      }
      box.addEventListener('scroll', check); check();
      btnAgree.addEventListener('click', function () {
        st.agreed = true; agree.checked = true; dim.remove();
      });
      dim.querySelectorAll('[data-role=btn-close]').forEach(function (b) { b.onclick = function () { dim.remove(); }; });
    });

    /* --- 다음(가입) --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!id.value) return s2bAlert('아이디를 입력해주세요.', function () { id.focus(); });
      if (!validId()) return s2bAlert('아이디 형식이 올바르지 않습니다.\n영문+숫자 6~15자로 입력해주세요.', function () { id.focus(); });
      if (!st.dupOk) return s2bAlert('아이디 중복확인을 해주세요.', function () { btnDup.focus(); });
      if (!validPw()) return s2bAlert('비밀번호는 영문+숫자+특수문자포함 8~20자로 입력해주세요.', function () { pw.focus(); });
      if (!validPw2()) return s2bAlert('비밀번호가 일치하지 않습니다.', function () { pw2.focus(); });
      if (!mail.verified) return s2bAlert(mail.sent ? '이메일 인증을 완료해주세요.' : '이메일 인증메일을 발송하고 인증을 완료해주세요.', function () { $('[data-role=' + (mail.sent ? 'code' : 'email') + ']', form).focus(); });
      if (!st.agreed) return s2bAlert('본문 확인이 필수입니다.\n보기버튼을 클릭하시기 바랍니다.', function () { btnView.focus(); });
      /* 검증 통과 → 서버 전송
         [JSP] agreeYn hidden 세팅 후 form.submit() (method=post, action=insert.do).
               서버에서도 아이디 중복/이메일 인증여부/CI 를 반드시 재검증할 것.
         데모: 비밀번호가 URL에 노출되지 않도록 GET 전송 대신 페이지 이동만 처리 */
      var agreeYn = $('[name=agreeYn]', form); if (agreeYn) agreeYn.value = 'Y';
      if (form.dataset.demo !== undefined) { location.href = form.getAttribute('action'); return; }
      form.submit();
    });
  };
})();
