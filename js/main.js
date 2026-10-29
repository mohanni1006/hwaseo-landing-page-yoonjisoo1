// 1. Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const mainHeader = document.getElementById('main-header');
if (menuToggle && mainHeader) {
  menuToggle.addEventListener('click', function() {
    mainHeader.classList.toggle('mobile-active');
  });
}

document.querySelectorAll('.nav-menu a').forEach(link => {
  link.addEventListener('click', () => {
    if (mainHeader) mainHeader.classList.remove('mobile-active');
  });
});

// 2. 자동 슬라이드
let currentSlide = 0;
const slides = document.querySelectorAll('.slide-item');
const indicators = document.querySelectorAll('.slider-indicators .indicator');
const totalSlides = slides.length;
let slideTimer = null;

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });
  indicators.forEach((ind, i) => {
    ind.classList.toggle('active', i === index);
  });
  currentSlide = index;
}

function nextSlide() {
  const nextIndex = (currentSlide + 1) % totalSlides;
  showSlide(nextIndex);
}

function startSlideInterval() {
  if (slideTimer) clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, 2000);
}

function goToSlide(index) {
  showSlide(index);
  startSlideInterval();
}

// 3. FAQ Accordion Toggle
function toggleFaq(el) {
  const item = el.parentElement;
  item.classList.toggle('open');
}

// 4. Phone Auto-hyphen
const phoneInput = document.getElementById('formPhone');
if (phoneInput) {
  phoneInput.addEventListener('input', function(e) {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 3 && val.length <= 7) {
      val = val.slice(0, 3) + '-' + val.slice(3);
    } else if (val.length > 7) {
      val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 11);
    }
    e.target.value = val;
  });
}

// 5. 팝업창 제어 (단일 팝업 -> 닫기 시 즉시 메인 페이지 노출)
function openPopup() {
  const modal = document.getElementById('popupModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closePopup() {
  const modal = document.getElementById('popupModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 6. 페이지 로드 초기화 (과거 날짜 선택 제한 & 칸 전체 클릭 시 달력 열기)
window.addEventListener('DOMContentLoaded', function() {
  openPopup();
  showSlide(0);
  startSlideInterval();

  // 방문 예약 일자 설정
  const dateInput = document.getElementById('formVisitDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    dateInput.addEventListener('click', function() {
      if (typeof this.showPicker === 'function') {
        try {
          this.showPicker();
        } catch (e) {
          // 브라우저 포커스 정책 예외 안전 처리
        }
      }
    });
  }
});

// =========================================================================
// 🔒 [보안 설정] Cloudflare Workers 중계 엔드포인트
// =========================================================================
const PROXY_ENDPOINT = "https://honorsville-yoonjisoo-webhook.mohanni1006.workers.dev";

// Base64 분할 난독화 안전 복원 함수
function getDecodedEndpoint(parts) {
  try {
    if (Array.isArray(parts)) {
      return parts.map(p => atob(p)).join('');
    }
    return atob(parts);
  } catch (e) {
    console.error("웹후크 복원 실패:", e);
    return "";
  }
}

// 예비용 난독화 디스코드 웹후크 (프록시 장애 시 자동 전환용)
const _dParts = [
  "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv",
  "MTU2MjAwOTEzMjIxMzYwNDM1My8=",
  "eFBtM0dodm5vQ1ZzUmN1UXVVQTQ3R3pmMHdnM011ZzBsa2czN0RDcHY5eFJ4X24xcEl4bE0ySzdCZjZUQjJTeHNmRS0="
];

// 예비용 난독화 문자 웹후크 (프록시 장애 시 자동 전환용)
const _sParts = [
  "aHR0cHM6Ly9ob29rLnVzMi5tYWtlLmNvbS8=",
  "dm1rdGJpbnpoeDRzMTR2c29jMWxzbWFudmo3cmdzcmE="
];

// 7. 문자(SMS) 페이로드 생성 (담당 관리자: 010-9089-2322)
function buildSmsPayload(data) {
  const ADMIN_PHONE = "010-9089-2322";
  
  let smsMessage = `[아너스빌] ${data.name} ${data.phone}\n방문: ${data.visitDate} ${data.visitTime}\n타입: ${data.interest}`;
  if (data.memo && data.memo !== '없음') {
    smsMessage += `\n메모: ${data.memo}`;
  }

  return {
    recipient: ADMIN_PHONE,
    message: smsMessage,
    data: data
  };
}

// 8. 디스코드 및 문자 전송 처리 엔진 (이중 안전장치 적용)
async function submitReservation(event) {
  event.preventDefault();

  const agree = document.getElementById('formAgree').checked;
  if (!agree) {
    alert('개인정보 수집 및 이용 동의에 체크해 주세요.');
    return;
  }

  const name = document.getElementById('formName').value.trim();
  const phone = document.getElementById('formPhone').value.trim();
  const visitDate = document.getElementById('formVisitDate').value;
  const visitTime = document.getElementById('formVisitTime').value;
  const interest = document.getElementById('formInterestType').value;
  const memo = document.getElementById('formMemo').value.trim() || '없음';
  const submitTime = new Date().toLocaleString('ko-KR');

  if (!name || !phone || !visitDate || !visitTime) {
    alert('성함, 전화번호, 방문 예약 일자 및 시간을 모두 선택해 주세요.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerText = '상담 접수 전송 중...';

  const reservationData = {
    name: name,
    phone: phone,
    visitDate: visitDate,
    visitTime: visitTime,
    interest: interest,
    memo: memo,
    submitTime: submitTime
  };

  const discordPayload = {
    username: "화서역 호수공원 아너스빌 알림봇",
    embeds: [
      {
        title: "📢 [전지윤] 신규 방문예약 접수 완료!",
        color: 12951641,
        fields: [
          { name: "👤 고객 성함", value: `**${name}**`, inline: true },
          { name: "📞 전화번호", value: `**${phone}**`, inline: true },
          { name: "📅 방문 일자", value: visitDate, inline: true },
          { name: "⏰ 방문 시간", value: visitTime, inline: true },
          { name: "🏠 관심 평형", value: interest, inline: true },
          { name: "📝 문의 내용", value: memo, inline: false },
          { name: "⏱ 접수 일시", value: submitTime, inline: false }
        ],
        footer: {
          text: "화서역 호수공원 아너스빌 공식 분양홍보관 (대표문의: 1833-2725 / 수신: 010-9089-2322)"
        }
      }
    ]
  };

  const smsPayload = buildSmsPayload(reservationData);

  try {
    let isSuccess = false;

    // [1단계] Cloudflare Workers 프록시 전송 시도
    if (PROXY_ENDPOINT && PROXY_ENDPOINT.trim() !== "") {
      try {
        const proxyRes = await fetch(PROXY_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discordPayload, smsPayload })
        });
        if (proxyRes.ok) {
          isSuccess = true;
        } else {
          console.warn("Worker 프록시 응답 실패(상태코드: " + proxyRes.status + "). 예비 직발송 모드로 전환합니다.");
        }
      } catch (proxyErr) {
        console.warn("Worker 프록시 연결 지연/오류로 예비 직발송 모드로 전환합니다.", proxyErr);
      }
    }

    // [2단계] 워커 응답 실패 시 자동 Fallback: 난독화 해제 후 직접 전송
    if (!isSuccess) {
      const discordUrl = getDecodedEndpoint(_dParts);
      const smsUrl = getDecodedEndpoint(_sParts);

      const [discordRes] = await Promise.all([
        fetch(discordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload)
        }),
        fetch(smsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(smsPayload)
        }).catch(err => console.warn("SMS 전송 알림 지연:", err))
      ]);

      if (discordRes.ok || discordRes.status === 204) {
        isSuccess = true;
      } else {
        const errText = await discordRes.text();
        console.error("디스코드 직접 발송 실패:", discordRes.status, errText);
      }
    }

    if (isSuccess) {
      alert("방문 예약이 정상 접수되었습니다.\n담당자(전지윤)가 예약 일시 확인 후 신속히 안내 연락드리겠습니다.");
      document.getElementById('consultForm').reset();
    } else {
      alert("상담 예약 전송 중 일시적인 오류가 발생했습니다. 대표번호(1833-2725)로 문의해 주세요.");
    }
  } catch (err) {
    console.error("전송 처리 최종 오류:", err);
    alert("네트워크 통신 오류가 발생했습니다.\n대표번호(1833-2725)로 연락 주시면 즉시 안내해 드리겠습니다.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '상담 예약 신청';
  }
}

// 9. 플로팅 스피드 다이얼 메뉴 토글
function toggleFloatingMenu(forceState) {
  const container = document.getElementById('floatingNavContainer');
  if (!container) return;
  if (typeof forceState === 'boolean') {
    container.classList.toggle('open', forceState);
  } else {
    container.classList.toggle('open');
  }
}

// 10. 다이렉트 문자(SMS) 연결 (010-9089-2322 번호로 발송)
function openDirectSms() {
  const ADMIN_PHONE = "010-9089-2322";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    window.location.href = `sms:${ADMIN_PHONE}${separator}body=${encodeURIComponent('[화서역 호수공원 아너스빌] 상담 및 방문예약 문의합니다.')}`;
  } else {
    alert(`모바일 기기에서 터치하시면 바로 문자(SMS) 전송 화면으로 연결됩니다.\n문자 상담 번호: ${ADMIN_PHONE}\n대표전화: 1833-2725`);
  }
}

// 플로팅 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
  const container = document.getElementById('floatingNavContainer');
  if (container && container.classList.contains('open')) {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  }
});
