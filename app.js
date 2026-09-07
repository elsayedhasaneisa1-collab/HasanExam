// ============================================================
// app.js - نسخة الطالب (المنطق نفسه)
// ============================================================

console.log('🚀 app.js بدأ التحميل');

const SUPABASE_URL = "https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

let supabaseClient = null;

try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase تم تهيئته');
} catch (error) {
    console.error('❌ خطأ في تهيئة Supabase:', error);
}

// ===== عناصر الصفحة =====
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

// ===== حالة التطبيق =====
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

// ===== دوال مساعدة =====
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function showError(msg) {
    if (errorMsg) {
        errorMsg.textContent = msg;
    }
}

function clearError() {
    if (errorMsg) errorMsg.textContent = '';
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

// ===== جلب الامتحان =====
async function loadExam() {
    console.log('🔍 بدء تحميل الامتحان...');

    const params = new URLSearchParams(window.location.search);
    const examCode = params.get('exam');

    console.log('📌 كود الامتحان:', examCode);

    if (!examCode) {
        showError('❌ رابط الامتحان غير صحيح');
        hide(loadingSection);
        show(startSection);
        if (examTitle) examTitle.textContent = '⚠️ رابط غير صحيح';
        if (examInfo) examInfo.textContent = 'الرجاء التحقق من الرابط';
        if (startBtn) startBtn.disabled = true;
        return;
    }

    if (!supabaseClient) {
        showError('❌ مشكلة في الاتصال بقاعدة البيانات');
        hide(loadingSection);
        show(startSection);
        if (examTitle) examTitle.textContent = '⚠️ مشكلة تقنية';
        if (examInfo) examInfo.textContent = 'حاول مرة أخرى';
        if (startBtn) startBtn.disabled = true;
        return;
    }

    try {
        console.log('⏳ جاري الاتصال بـ Supabase...');

        const { data, error } = await supabaseClient.rpc('get_public_exam', {
            p_code: examCode
        });

        console.log('📊 البيانات المستلمة:', data);

        if (error) {
            throw new Error(error.message);
        }

        if (!data || !data.length) {
            throw new Error('الامتحان غير موجود أو انتهت صلاحيته');
        }

        STATE.exam = data[0];

        console.log('✅ تم تحميل الامتحان:', STATE.exam.title);

        if (examTitle) examTitle.textContent = '📖 ' + (STATE.exam.title || 'امتحان');
        if (examInfo) {
            examInfo.textContent = `📝 ${STATE.exam.question_count || 0} أسئلة • ⏱️ ${STATE.exam.duration_minutes || 0} دقائق`;
        }

        hide(loadingSection);
        show(startSection);
        if (startBtn) startBtn.disabled = false;

    } catch (error) {
        console.error('❌ خطأ:', error);
        showError(`❌ ${error.message || 'حدث خطأ غير متوقع'}`);
        hide(loadingSection);
        show(startSection);
        if (examTitle) examTitle.textContent = '⚠️ تعذر فتح الامتحان';
        if (examInfo) examInfo.textContent = error.message || 'حاول مرة أخرى';
        if (startBtn) startBtn.disabled = true;
    }
}

// ===== بدء الامتحان =====
async function startExam() {
    const name = studentNameInput ? studentNameInput.value.trim() : '';

    console.log('👤 اسم الطالب:', name);

    if (name.length < 2) {
        showError('✏️ اكتب اسمك أولاً 😊');
        return;
    }

    clearError();
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '⏳ جاري البدء...';
    }

    try {
        console.log('⏳ بدء الامتحان للطالب:', name);

        const { data, error } = await supabaseClient.rpc('start_public_attempt', {
            p_code: STATE.exam.code,
            p_student_name: name
        });

        console.log('📊 بيانات البدء:', data);

        if (error) {
            throw new Error(error.message);
        }

        if (!data || !data.attempt_id) {
            throw new Error('لم يتم استلام بيانات الامتحان');
        }

        STATE.attemptId = data.attempt_id;
        STATE.questions = data.questions || [];
        STATE.answers = new Array(STATE.questions.length).fill(null);
        STATE.endAt = new Date(data.ends_at).getTime();
        STATE.studentName = name;
        STATE.submitted = false;

        console.log('📝 عدد الأسئلة:', STATE.questions.length);

        if (!STATE.questions.length) {
            throw new Error('لا توجد أسئلة في هذا الامتحان');
        }

        hide(startSection);
        show(examSection);

        if (studentLabel) {
            const span = studentLabel.querySelector('span');
            if (span) span.textContent = name;
        }

        renderQuestion();

        if (STATE.timerId) clearInterval(STATE.timerId);
        STATE.timerId = setInterval(updateTimer, 500);
        updateTimer();

    } catch (error) {
        console.error('❌ خطأ:', error);
        showError(`❌ ${error.message || 'تعذر بدء الامتحان'}`);
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '🚀 ابدأ الامتحان';
        }
    }
}

// ===== عرض السؤال =====
function renderQuestion() {
    const q = STATE.questions[STATE.current];
    if (!q) return;

    console.log('📝 عرض السؤال:', STATE.current + 1);

    if (qmeta) {
        qmeta.textContent = `📌 السؤال ${STATE.current + 1} من ${STATE.questions.length}`;
    }

    let html = `<div class="question-text">${escapeHTML(q.text)}</div>`;
    html += '<div class="options">';

    const letters = ['أ', 'ب', 'ج', 'د'];
    q.options.forEach((option, index) => {
        const selected = STATE.answers[STATE.current] === index ? 'selected' : '';
        html += `
            <button class="option ${selected}" data-index="${index}">
                <span class="letter">${letters[index]}.</span>
                ${escapeHTML(option)}
            </button>
        `;
    });
    html += '</div>';

    if (questionDiv) questionDiv.innerHTML = html;

    document.querySelectorAll('.option').forEach(btn => {
        btn.addEventListener('click', function() {
            if (STATE.submitted) return;
            STATE.answers[STATE.current] = parseInt(this.dataset.index);
            renderQuestion();
        });
    });

    const progress = ((STATE.current + 1) / STATE.questions.length) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (prevBtn) prevBtn.disabled = STATE.current === 0;

    const isLast = STATE.current === STATE.questions.length - 1;
    if (nextBtn) nextBtn.classList.toggle('hidden', isLast);
    if (submitBtn) submitBtn.classList.toggle('hidden', !isLast);
}

// ===== المؤقت =====
function updateTimer() {
    if (STATE.submitted) return;

    const remaining = Math.max(0, STATE.endAt - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (timerDisplay) {
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (seconds <= 60 && seconds > 0) {
        if (timerDisplay) {
            timerDisplay.classList.add('warning');
        }
    } else {
        if (timerDisplay) {
            timerDisplay.classList.remove('warning');
        }
    }

    if (remaining <= 0 && !STATE.submitted) {
        clearInterval(STATE.timerId);
        submitExam(true);
    }
}

// ===== التنقل =====
if (prevBtn) {
    prevBtn.addEventListener('click', function() {
        if (STATE.current > 0 && !STATE.submitted) {
            STATE.current--;
            renderQuestion();
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', function() {
        if (STATE.current < STATE.questions.length - 1 && !STATE.submitted) {
            STATE.current++;
            renderQuestion();
        }
    });
}

// ===== تسليم الامتحان =====
async function submitExam(auto = false) {
    if (STATE.submitted) return;
    STATE.submitted = true;

    if (STATE.timerId) {
        clearInterval(STATE.timerId);
        STATE.timerId = null;
    }

    const payload = STATE.questions.map((q, i) => ({
        question_id: q.id,
        selected_index: STATE.answers[i] !== undefined ? STATE.answers[i] : null
    }));

    hide(examSection);
    show(resultSection);

    if (scoreDiv) {
        scoreDiv.innerHTML = '<div class="spinner"></div><p>⏳ جاري التسليم...</p>';
    }

    try {
        console.log('⏳ جاري تسليم الامتحان...');

        const { data, error } = await supabaseClient.rpc('submit_public_attempt', {
            p_attempt_id: STATE.attemptId,
            p_answers: payload
        });

        console.log('📊 النتيجة:', data);

        if (error) {
            throw new Error(error.message);
        }

        const message = auto ? '⏰ انتهى الوقت وتم التسليم تلقائيًا.' : '🎉 تم تسليم الامتحان بنجاح.';

        let emoji = '🌟';
        let resultText = 'ممتاز!';
        if (data.score < data.total * 0.5) {
            emoji = '📚';
            resultText = 'حاول مرة أخرى';
        } else if (data.score < data.total * 0.7) {
            emoji = '👍';
            resultText = 'جيد';
        }

        if (scoreDiv) {
            scoreDiv.innerHTML = `
                <div style="font-size: 60px; margin: 10px 0;">${emoji}</div>
                <div style="font-size: 38px; font-weight: 900; margin: 15px 0;">
                    <span class="score-number">${data.score}</span> / ${data.total}
                </div>
                <div style="font-size: 24px; margin: 10px 0;">${resultText}</div>
                <p style="margin-top: 20px; opacity: 0.7; font-size:16px;">${message}</p>
            `;
        }

    } catch (error) {
        console.error('❌ خطأ:', error);
        if (scoreDiv) {
            scoreDiv.innerHTML = `
                <div style="font-size: 60px;">❌</div>
                <p class="error">حدث خطأ أثناء التسليم: ${escapeHTML(error.message)}</p>
                <button onclick="location.reload()" style="margin-top:20px;padding:14px 30px;background:#ffd93d;border:0;border-radius:16px;color:#1a1a2e;font-weight:700;font-size:18px;cursor:pointer;">
                    🔄 إعادة المحاولة
                </button>
            `;
        }
    }
}

// ===== ربط الأزرار =====
if (startBtn) {
    startBtn.addEventListener('click', startExam);
}

if (studentNameInput) {
    studentNameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') startExam();
    });
}

if (submitBtn) {
    submitBtn.addEventListener('click', function() {
        submitExam(false);
    });
}

// ===== بدء التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM تحمّل');

    if (loadingSection) show(loadingSection);
    if (startSection) hide(startSection);
    if (examSection) hide(examSection);
    if (resultSection) hide(resultSection);

    loadExam();
});

console.log('✅ app.js تحمّل بالكامل');