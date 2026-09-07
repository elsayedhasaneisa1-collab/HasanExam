// =====================================================
// التكوين الأساسي
// =====================================================
const CONFIG = {
  SUPABASE_URL: "https://zvvfjmadziyuwutdresz.supabase.co",
  SUPABASE_KEY: "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc"
};

// =====================================================
// تهيئة Supabase
// =====================================================
const supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// =====================================================
// عناصر DOM
// =====================================================
const DOM = {
  loading: document.getElementById('loading'),
  start: document.getElementById('start'),
  exam: document.getElementById('exam'),
  result: document.getElementById('result'),
  examTitle: document.getElementById('examTitle'),
  examInfo: document.getElementById('examInfo'),
  studentName: document.getElementById('studentName'),
  startBtn: document.getElementById('startBtn'),
  error: document.getElementById('error'),
  liveTitle: document.getElementById('liveTitle'),
  studentLabel: document.getElementById('studentLabel'),
  timer: document.getElementById('timer'),
  progress: document.getElementById('progress'),
  qmeta: document.getElementById('qmeta'),
  question: document.getElementById('question'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
  submit: document.getElementById('submit'),
  score: document.getElementById('score')
};

// =====================================================
// حالة التطبيق
// =====================================================
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

// =====================================================
// دوال مساعدة
// =====================================================
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text ?? '').replace(/[&<>"']/g, char => map[char]);
}

function show(element) {
  if (element) element.classList.remove('hidden');
}

function hide(element) {
  if (element) element.classList.add('hidden');
}

function showError(message) {
  DOM.error.textContent = message;
}

function clearError() {
  DOM.error.textContent = '';
}

// =====================================================
// الوظائف الرئيسية
// =====================================================

// تهيئة الامتحان
async function initExam() {
  const params = new URLSearchParams(window.location.search);
  const examCode = params.get('exam');

  if (!examCode) {
    showError('رابط الامتحان غير صحيح.');
    hide(DOM.loading);
    show(DOM.start);
    DOM.examTitle.textContent = 'رابط غير صحيح';
    DOM.examInfo.textContent = 'الرجاء التحقق من الرابط';
    return;
  }

  try {
    const { data, error } = await supabase.rpc('get_public_exam', {
      p_code: examCode
    });

    if (error || !data || !data.length) {
      throw new Error('الامتحان غير موجود أو تم إغلاقه.');
    }

    STATE.exam = data[0];
    DOM.examTitle.textContent = STATE.exam.title;
    DOM.examInfo.textContent = `${STATE.exam.question_count} سؤال • الوقت ${STATE.exam.duration_minutes} دقيقة`;
    
    hide(DOM.loading);
    show(DOM.start);
    DOM.startBtn.disabled = false;

  } catch (error) {
    console.error('Error loading exam:', error);
    showError(error.message || 'حدث خطأ أثناء تحميل الامتحان');
    hide(DOM.loading);
    show(DOM.start);
    DOM.examTitle.textContent = 'تعذر فتح الامتحان';
    DOM.examInfo.textContent = error.message;
  }
}

// بدء الامتحان
async function startExam() {
  const name = DOM.studentName.value.trim();

  if (name.length < 2) {
    showError('اكتب اسمك أولًا 😊');
    return;
  }

  DOM.startBtn.disabled = true;
  showError('جاري بدء الامتحان...');

  try {
    const { data, error } = await supabase.rpc('start_public_attempt', {
      p_code: STATE.exam.code,
      p_student_name: name
    });

    if (error) {
      throw new Error(error.message);
    }

    STATE.attemptId = data.attempt_id;
    STATE.questions = data.questions || [];
    STATE.answers = new Array(STATE.questions.length).fill(null);
    STATE.endAt = new Date(data.ends_at).getTime();
    STATE.studentName = name;

    // إظهار واجهة الامتحان
    hide(DOM.start);
    show(DOM.exam);
    
    DOM.liveTitle.textContent = STATE.exam.title;
    DOM.studentLabel.textContent = `الطالب: ${name}`;

    // بدء المؤقت وعرض السؤال الأول
    STATE.timerId = setInterval(updateTimer, 250);
    renderQuestion();
    updateTimer();

  } catch (error) {
    console.error('Error starting exam:', error);
    showError(`تعذر بدء الامتحان: ${error.message}`);
    DOM.startBtn.disabled = false;
  }
}

// تحديث المؤقت
function updateTimer() {
  const remaining = Math.max(0, STATE.endAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  DOM.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // تحذير عند اقتراب الوقت
  if (seconds <= 60 && seconds > 0) {
    DOM.timer.style.color = '#ff7187';
  } else {
    DOM.timer.style.color = '';
  }

  if (remaining <= 0) {
    clearInterval(STATE.timerId);
    submitExam(true);
  }
}

// عرض السؤال الحالي
function renderQuestion() {
  const q = STATE.questions[STATE.current];
  if (!q) return;

  DOM.qmeta.textContent = `السؤال ${STATE.current + 1} من ${STATE.questions.length}`;
  
  let html = `<div class="q">${escapeHTML(q.text)}</div>`;
  html += q.options.map((option, index) => {
    const selected = STATE.answers[STATE.current] === index ? 'selected' : '';
    return `<button class="option ${selected}" data-index="${index}">${escapeHTML(option)}</button>`;
  }).join('');

  DOM.question.innerHTML = html;

  // إضافة مستمعي الأحداث للخيارات
  document.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.answers[STATE.current] = parseInt(btn.dataset.index);
      renderQuestion();
    });
  });

  // تحديث شريط التقدم
  DOM.progress.style.width = `${((STATE.current + 1) / STATE.questions.length) * 100}%`;

  // تحديث أزرار التنقل
  DOM.prev.disabled = STATE.current === 0;
  
  if (STATE.current === STATE.questions.length - 1) {
    DOM.next.classList.add('hidden');
    DOM.submit.classList.remove('hidden');
  } else {
    DOM.next.classList.remove('hidden');
    DOM.submit.classList.add('hidden');
  }
}

// تسليم الامتحان
async function submitExam(auto = false) {
  if (STATE.submitted) return;
  STATE.submitted = true;

  clearInterval(STATE.timerId);

  const payload = STATE.questions.map((q, i) => ({
    question_id: q.id,
    selected_index: STATE.answers[i]
  }));

  // إخفاء الامتحان وإظهار النتيجة
  hide(DOM.exam);
  show(DOM.result);
  DOM.score.innerHTML = '<p>جاري تسليم الامتحان وحساب الدرجة...</p>';

  try {
    const { data, error } = await supabase.rpc('submit_public_attempt', {
      p_attempt_id: STATE.attemptId,
      p_answers: payload
    });

    if (error) {
      throw new Error(error.message);
    }

    const message = auto ? '⏰ انتهى الوقت وتم التسليم تلقائيًا.' : '🎉 تم التسليم بنجاح.';
    DOM.score.innerHTML = `
      <div style="font-size: 30px; font-weight: 900; margin: 15px 0;">
        ${data.score} / ${data.total}
      </div>
      <p>${message}</p>
    `;

  } catch (error) {
    console.error('Error submitting exam:', error);
    DOM.score.innerHTML = `<p class="error">حدث خطأ أثناء التسليم: ${escapeHTML(error.message)}</p>`;
  }
}

// =====================================================
// مستمعات الأحداث
// =====================================================

DOM.startBtn.addEventListener('click', startExam);

DOM.studentName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startExam();
});

DOM.prev.addEventListener('click', () => {
  if (STATE.current > 0) {
    STATE.current--;
    renderQuestion();
  }
});

DOM.next.addEventListener('click', () => {
  if (STATE.current < STATE.questions.length - 1) {
    STATE.current++;
    renderQuestion();
  }
});

DOM.submit.addEventListener('click', () => submitExam(false));

// =====================================================
// بدء التطبيق
// =====================================================
document.addEventListener('DOMContentLoaded', initExam);