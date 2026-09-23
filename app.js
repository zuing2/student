const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const MQTT_TOPIC = 'school/3rd_grade/teacher_call_system_2026_unique';
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('실시간 웹소켓 서버 연결 완료');
  client.subscribe(MQTT_TOPIC);
});

// 학생 - 호출 제출
function submitCall(e) {
  e.preventDefault();
  
  const studentClass = document.getElementById('studentClass').value;
  const studentName = document.getElementById('studentName').value.trim();
  const purpose = document.querySelector('input[name="purpose"]:checked')?.value;
  const teacher = document.querySelector('input[name="teacher"]:checked')?.value;

  if (!studentClass || !studentName || !purpose || !teacher) return;

  const callData = {
    id: Date.now(),
    studentClass,
    studentName,
    purpose,
    teacher,
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  };

  client.publish(MQTT_TOPIC, JSON.stringify(callData));

  document.getElementById('modalMessage').innerHTML = 
    `<b>3학년 ${studentClass} ${studentName}</b> 학생<br><span style="color:#818cf8; font-weight:700;">${teacher}</span> 호출을 완료했습니다.`;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('callForm').reset();
}

// 선생님 - 대시보드 알림 수신
function initTeacherDashboard() {
  client.on('message', (topic, message) => {
    if (topic === MQTT_TOPIC) {
      const data = JSON.parse(message.toString());
      addCallCard(data);
      playAlertSound();
      speakTTS(data);
    }
  });
}

function addCallCard(data) {
  const emptyNotice = document.getElementById('emptyNotice');
  if (emptyNotice) emptyNotice.style.display = 'none';

  const callList = document.getElementById('callList');
  const card = document.createElement('div');
  card.className = 'call-card';
  card.id = `call-${data.id}`;
  
  card.innerHTML = `
    <div class="call-card-header">
      <span class="badge-purpose purpose-${data.purpose}">${data.purpose}</span>
      <span class="call-time">${data.time}</span>
    </div>
    <div class="call-info">
      <div class="student-detail">3학년 ${data.studentClass} ${data.studentName}</div>
      <div class="teacher-target">👉 ${data.teacher}</div>
    </div>
    <button onclick="dismissCall(${data.id})" class="complete-btn">호출 처리 완료</button>
  `;

  callList.prepend(card);
}

function dismissCall(id) {
  const card = document.getElementById(`call-${id}`);
  if (card) card.remove();
  
  const callList = document.getElementById('callList');
  if (callList && callList.children.length === 0) {
    document.getElementById('emptyNotice').style.display = 'block';
  }
}

function enableAudio() {
  const btn = document.getElementById('audioTestBtn');
  btn.style.background = '#10b981';
  btn.style.color = '#ffffff';
  btn.innerText = '🔊 알림음/음성 활성화됨';
  playChime();
}

function playAlertSound() {
  playChime();
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log('Audio Error', e);
  }
}

function speakTTS(data) {
  if ('speechSynthesis' in window) {
    const text = `3학년 ${data.studentClass} ${data.studentName} 학생이 ${data.purpose} 건으로 ${data.teacher}을 호출했습니다.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
