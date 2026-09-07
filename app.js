// ============================================================
// app.js - النسخة النهائية المضبوطة
// ============================================================

// ===== بيانات Supabase =====
const SUPABASE_URL = "https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

// ===== تهيئة Supabase =====
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// عناصر الصفحة
// ============================================================
const loadingSection = document.getElementById('loading');
const startSection = document.getElementById('start');
const examSection = document.getElementById('exam');
const resultSection = document.getElementById('result');

const examTitle = document.getElementById('examTitle');
const examInfo = document.getElementById('examInfo');
const studentNameInput = document.getElementById('studentName');
const startBtn = document.getElementById('startBtn');
const errorMsg = document.getElementById('error');

const liveTitle = document.getElementById('liveTitle');
const studentLabel = document.getElementById('studentLabel');
const timerDisplay = document.getElementById('timer');
const progressBar = document.getElementById('progress');
const qmeta = document.getElementById('qmeta');
const questionDiv = document.getElementById('question');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const submitBtn = document.getElementById('submit');

const scoreDiv = document.getElementById('score');

// ============================================================
// حالة التطبيق
// ============================================================
const STATE = {
  exam: null,
  attemptId: null,
  questions: [],
  answers: [],
  current: 0,
  endAt: 0,
  timerId: null,
  submitted: false,
  studentName: ''
};

// ============================================================
// دوال مساعدة
// ============================================================
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function showError(msg) {
  errorMsg.textContent = msg;
}

function clearError() {
  errorMsg.textContent = '';
}

function escapeHTML(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#039;';
    return m;
  });
}

// ============================================================
// 1. جلب الامتحان
// ============================================================
async function loadExam() {
  // جلب كود الامتحان من الرابط
  const params = new URLSearchParams(window.location.search);
  const examCode = params.get('exam');

  console.log('📌 كود الامتحان:', examCode);

  // لو مفيش كود
  if (!examCode) {
    showError('❌ رابط الامتحان غير صحيح - مفيش كود');
    hide(loadingSection);
    show(startSection);
    examTitle.textContent = '⚠️ رابط غير صحيح';
    examInfo.textContent = 'الرجاء التحقق من الرابط';
    startBtn.disabled = true;
    return;
  }

  try {
    console.log('⏳ جاري تحميل الامتحان...');

    // جلب بيانات الامتحان من Supabase
    const { data, error } = await supabaseClient.rpc('get_public_exam', {
      p_code: examCode
    });

    console.log('📊 البيانات:', data);
    console.log('❌ الخطأ:', error);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !data.length) {
      throw new Error('الامتحان غير موجود أو منتهي الصلاحية');
    }

    // حفظ بيانات الامتحان
    STATE.exam = data[0];

    // عرض البيانات
    examTitle.textContent = STATE.exam.title || 'امتحان';
    examInfo.textContent = `${STATE.exam.question_count || 0} سؤال • ${STATE.exam.duration_minutes || 0} دقيقة`;

    // إخفاء التحميل وإظهار البداية
    hide(loadingSection);
    show(startSection);
    startBtn.disabled = false;

    console.log('✅ تم تحميل الامتحان بنجاح');

  } catch (error) {
    console.error('❌ خطأ:', error);
    showError(`❌ ${error.message || 'حدث خطأ'}`);
    hide(loadingSection);
    show(startSection);
    examTitle.textContent = '⚠️ تعذر فتح الامتحان';
    examInfo.textContent = error.message || 'حاول مرة أخرى';
    startBtn.disabled = true;
  }
}

// ============================================================
// 2. بدء الامتحان
// ============================================================
async function startExam() {
  const name = studentNameInput.value.trim();

  if (name.length < 2) {
    showError('✏️ اكتب اسمك أولاً 😊');
    return;
  }

  clearError();
  startBtn.disabled = true;
  startBtn.textContent = '⏳ جاري البدء...';

  try {
    console.log('⏳ بدء الامتحان للطالب:', name);

    const { data, error } = await supabaseClient.rpc('start_public_attempt', {
      p_code: STATE.exam.code,
      p_student_name: name
    });

    console.log('📊 بيانات البدء:', data);
    console.log('❌ الخطأ:', error);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !data.attempt_id) {
      throw new Error('لم يتم استلام بيانات الامتحان');
    }

    // حفظ البيانات
    STATE.attemptId = data.attempt_id;
    STATE.questions = data.questions || [];
    STATE.answers = new Array(STATE.questions.length).fill(null);
    STATE.endAt = new Date(data.ends_at).getTime();
    STATE.studentName = name;
    STATE.submitted = false;

    if (!STATE.questions.length) {
      throw new Error('لا توجد أسئلة في هذا الامتحان');
    }

    console.log('✅ عدد الأسئلة:', STATE.questions.length);

    // إظهار واجهة الامتحان
    hide(startSection);
    show(examSection);

    liveTitle.textContent = STATE.exam.title || 'امتحان';
    studentLabel.textContent = `👤 الطالب: ${name}`;

    // عرض السؤال الأول
    renderQuestion();

    // بدء المؤقت
    if (STATE.timerId) clearInterval(STATE.timerId);
    STATE.timerId = setInterval(updateTimer, 500);
    updateTimer();

  } catch (error) {
    console.error('❌ خطأ:', error);
    showError(`❌ ${error.message || 'تعذر بدء الامتحان'}`);
    startBtn.disabled = false;
    startBtn.textContent = '🚀 ابدأ الامتحان';
  }
}

// ============================================================
// 3. عرض السؤال
// ============================================================
function renderQuestion() {
  const q = STATE.questions[STATE.current];
  if (!q) return;

  // رقم السؤال
  qmeta.textContent = `📌 السؤال ${STATE.current + 1} من ${STATE.questions.length}`;

  // نص السؤال والخيارات
  let html = `<div class="q">${escapeHTML(q.text)}</div>`;
  html += '<div class="options-list">';
  
  const letters = ['أ', 'ب', 'ج', 'د'];
  q.options.forEach((option, index) => {
    const selected = STATE.answers[STATE.current] === index ? 'selected' : '';
    html += `
      <button class="option ${selected}" data-index="${index}">
        <span class="option-label">${letters[index]}.</span>
        ${escapeHTML(option)}
      </button>
    `;
  });
  html += '</div>';

  questionDiv.innerHTML = html;

  // ربط الأزرار
  document.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', function() {
      if (STATE.submitted) return;
      STATE.answers[STATE.current] = parseInt(this.dataset.index);
      renderQuestion();
    });
  });

  // شريط التقدم
  const progress = ((STATE.current + 1) / STATE.questions.length) * 100;
  progressBar.style.width = `${progress}%`;

  // أزرار التنقل
  prevBtn.disabled = STATE.current === 0;
  
  const isLast = STATE.current === STATE.questions.length - 1;
  nextBtn.classList.toggle('hidden', isLast);
  submitBtn.classList.toggle('hidden', !isLast);
}

// ============================================================
// 4. المؤقت
// ============================================================
function updateTimer() {
  if (STATE.submitted) return;

  const remaining = Math.max(0, STATE.endAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // تحذير عند انتهاء الوقت
  if (seconds <= 60 && seconds > 0) {
    timerDisplay.style.color = '#ff7187';
    timerDisplay.style.animation = 'pulse 0.5s ease-in-out infinite';
  } else {
    timerDisplay.style.color = '';
    timerDisplay.style.animation = '';
  }

  if (remaining <= 0 && !STATE.submitted) {
    clearInterval(STATE.timerId);
    submitExam(true);
  }
}

// ============================================================
// 5. التنقل بين الأسئلة
// ============================================================
prevBtn.addEventListener('click', function() {
  if (STATE.current > 0 && !STATE.submitted) {
    STATE.current--;
    renderQuestion();
  }
});

nextBtn.addEventListener('click', function() {
  if (STATE.current < STATE.questions.length - 1 && !STATE.submitted) {
    STATE.current++;
    renderQuestion();
  }
});

// ============================================================
// 6. تسليم الامتحان
// ============================================================
async function submitExam(auto = false) {
  if (STATE.submitted) return;
  STATE.submitted = true;

  if (STATE.timerId) {
    clearInterval(STATE.timerId);
    STATE.timerId = null;
  }

  // تجهيز الإجابات
  const payload = STATE.questions.map((q, i) => ({
    question_id: q.id,
    selected_index: STATE.answers[i] !== undefined ? STATE.answers[i] : null
  }));

  // إظهار شاشة النتيجة
  hide(examSection);
  show(resultSection);
  scoreDiv.innerHTML = '<div class="spinner"></div><p>⏳ جاري التسليم...</p>';

  try {
    console.log('⏳ جاري تسليم الامتحان...');

    const { data, error } = await supabaseClient.rpc('submit_public_attempt', {
      p_attempt_id: STATE.attemptId,
      p_answers: payload
    });

    console.log('📊 النتيجة:', data);
    console.log('❌ الخطأ:', error);

    if (error) {
      throw new Error(error.message);
    }

    const message = auto ? '⏰ انتهى الوقت وتم التسليم تلقائيًا.' : '🎉 تم تسليم الامتحان بنجاح.';
    
    let emoji = '🎉';
    let resultText = 'ممتاز! 🌟';
    if (data.score < data.total * 0.5) {
      emoji = '📚';
      resultText = 'حاول مرة أخرى';
    } else if (data.score < data.total * 0.7) {
      emoji = '👍';
      resultText = 'جيد';
    }

    scoreDiv.innerHTML = `
      <div style="font-size: 48px; margin: 10px 0;">${emoji}</div>
      <div style="font-size: 32px; font-weight: 900; margin: 15px 0;">
        <span style="color: #5ce1ff;">${data.score}</span> / ${data.total}
      </div>
      <div style="font-size: 18px; margin: 10px 0;">${resultText}</div>
      <p style="margin-top: 20px; opacity: 0.7;">${message}</p>
    `;

  } catch (error) {
    console.error('❌ خطأ:', error);
    scoreDiv.innerHTML = `
      <div style="font-size: 48px;">❌</div>
      <p class="error">حدث خطأ أثناء التسليم: ${escapeHTML(error.message)}</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:12px 30px;background:#2588ff;border:0;border-radius:12px;color:#fff;font-weight:700;cursor:pointer;">
        🔄 إعادة المحاولة
      </button>
    `;
  }
}

// ============================================================
// 7. ربط الأزرار
// ============================================================
startBtn.addEventListener('click', startExam);

studentNameInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') startExam();
});

submitBtn.addEventListener('click', function() {
  submitExam(false);
});

// ============================================================
// 8. إضافة الـ CSS المفقود
// ============================================================
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .option-label {
    font-weight: 700;
    color: #5ce1ff;
    margin-left: 8px;
  }
  .option {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    background: rgba(255,255,255,0.05);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: right;
  }
  .option:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
    transform: translateX(-4px);
  }
  .option.selected {
    background: rgba(37, 136, 255, 0.25);
    border-color: #2588ff;
    box-shadow: 0 0 20px rgba(37, 136, 255, 0.15);
  }
  .option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255,255,255,0.1);
    border-top-color: #2588ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 20px auto;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// ============================================================
// 9. بدء التطبيق
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ صفحة الطالب تحمّلت');
  
  // إظهار شاشة التحميل
  show(loadingSection);
  hide(startSection);
  hide(examSection);
  hide(resultSection);
  
  // تحميل الامتحان
  loadExam();
});

// ============================================================
// 10. معالجة الأخطاء العامة
// ============================================================
window.addEventListener('error', function(e) {
  console.error('❌ خطأ عام:', e);
  if (!STATE.submitted && !STATE.exam) {
    showError('❌ حدث خطأ غير متوقع. حاول تحديث الصفحة.');
    hide(loadingSection);
    show(startSection);
    startBtn.disabled = true;
  }
});

console.log('✅ app.js تحمّل');