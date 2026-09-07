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
// بيانات تسجيل الدخول (مؤقتة)
// =====================================================
const TEACHER_CREDENTIALS = {
  username: 'Hasan',
  password: '25808'
};

// =====================================================
// حالة التطبيق
// =====================================================
const STATE = {
  questions: [],
  lastResults: [],
  lastResultsCode: '',
  pdfDownloadedForCode: '',
  isAuthenticated: false
};

// =====================================================
// عناصر DOM
// =====================================================
const DOM = {};

function cacheDOM() {
  DOM.login = document.getElementById('login');
  DOM.app = document.getElementById('app');
  DOM.username = document.getElementById('username');
  DOM.password = document.getElementById('password');
  DOM.loginBtn = document.getElementById('loginBtn');
  DOM.loginError = document.getElementById('loginError');
  DOM.logoutBtn = document.getElementById('logoutBtn');
  
  DOM.examTitleInput = document.getElementById('examTitleInput');
  DOM.duration = document.getElementById('duration');
  DOM.availabilityDays = document.getElementById('availabilityDays');
  DOM.questionsContainer = document.getElementById('questionsContainer');
  DOM.addQuestionBtn = document.getElementById('addQuestionBtn');
  DOM.createExamBtn = document.getElementById('createExamBtn');
  DOM.createError = document.getElementById('createError');
  
  DOM.createdExam = document.getElementById('createdExam');
  DOM.createdCode = document.getElementById('createdCode');
  DOM.shareLink = document.getElementById('shareLink');
  DOM.shareExpiry = document.getElementById('shareExpiry');
  DOM.copyLinkBtn = document.getElementById('copyLinkBtn');
  DOM.newExamBtn = document.getElementById('newExamBtn');
  
  DOM.resultsCode = document.getElementById('resultsCode');
  DOM.loadResultsBtn = document.getElementById('loadResultsBtn');
  DOM.resultsBody = document.getElementById('resultsBody');
  DOM.resultsError = document.getElementById('resultsError');
  DOM.downloadPdfBtn = document.getElementById('downloadPdfBtn');
  DOM.deleteExamBtn = document.getElementById('deleteExamBtn');
  
  DOM.detailsModal = document.getElementById('detailsModal');
  DOM.modalContent = document.getElementById('modalContent');
  DOM.closeModalBtn = document.getElementById('closeModalBtn');
  
  DOM.toast = document.getElementById('toast');
}

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

function showToast(message, type = 'info', duration = 3000) {
  const toast = DOM.toast;
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  
  // Force reflow
  void toast.offsetWidth;
  
  toast.classList.add('show');
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showError(element, message) {
  if (element) element.textContent = message;
}

function clearError(element) {
  if (element) element.textContent = '';
}

function isAuthenticated() {
  return STATE.isAuthenticated;
}

// =====================================================
// المصادقة
// =====================================================
function authenticate() {
  const username = DOM.username.value.trim();
  const password = DOM.password.value.trim();
  
  clearError(DOM.loginError);
  
  if (!username || !password) {
    showError(DOM.loginError, 'اكتب اسم المستخدم وكلمة المرور.');
    return false;
  }
  
  if (username !== TEACHER_CREDENTIALS.username || password !== TEACHER_CREDENTIALS.password) {
    showError(DOM.loginError, 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    return false;
  }
  
  STATE.isAuthenticated = true;
  
  // حفظ الجلسة
  sessionStorage.setItem('hasan_teacher_username', username);
  sessionStorage.setItem('hasan_teacher_password', password);
  
  // إظهار التطبيق
  hide(DOM.login);
  show(DOM.app);
  document.body.classList.add('authenticated');
  
  // تحميل الامتحان المحفوظ
  loadSavedExam();
  
  showToast('تم تسجيل الدخول بنجاح ✅', 'success');
  return true;
}

function logout() {
  STATE.isAuthenticated = false;
  sessionStorage.removeItem('hasan_teacher_username');
  sessionStorage.removeItem('hasan_teacher_password');
  location.reload();
}

function checkAutoLogin() {
  const username = sessionStorage.getItem('hasan_teacher_username');
  const password = sessionStorage.getItem('hasan_teacher_password');
  
  if (username === TEACHER_CREDENTIALS.username && password === TEACHER_CREDENTIALS.password) {
    STATE.isAuthenticated = true;
    hide(DOM.login);
    show(DOM.app);
    document.body.classList.add('authenticated');
    loadSavedExam();
    return true;
  }
  return false;
}

// =====================================================
// إدارة الأسئلة
// =====================================================
function addQuestion() {
  STATE.questions.push({
    text: '',
    options: ['', '', '', ''],
    correct_index: 0
  });
  renderQuestions();
  
  // التمرير إلى السؤال الجديد
  setTimeout(() => {
    const elements = document.querySelectorAll('[data-question-index]');
    const last = elements[elements.length - 1];
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

function renderQuestions() {
  if (!DOM.questionsContainer) return;
  
  if (!STATE.questions.length) {
    DOM.questionsContainer.innerHTML = `
      <div class="empty">لم تتم إضافة أي أسئلة بعد.</div>
    `;
    return;
  }
  
  DOM.questionsContainer.innerHTML = STATE.questions.map((question, qIndex) => {
    return `
      <div class="questionEditor" data-question-index="${qIndex}">
        <div class="questionHeader">
          <strong>السؤال ${qIndex + 1}</strong>
          <button type="button" class="danger small" onclick="window.removeQuestion(${qIndex})">حذف السؤال</button>
        </div>
        
        <textarea class="questionText" placeholder="اكتب نص السؤال..." 
          oninput="window.updateQuestionText(${qIndex}, this.value)">
          ${escapeHTML(question.text)}
        </textarea>
        
        <div class="optionsGrid">
          ${question.options.map((option, optionIndex) => `
            <div class="optionEditor">
              <label>الاختيار ${optionIndex + 1}</label>
              <input type="text" value="${escapeHTML(option)}" placeholder="اكتب الاختيار..."
                oninput="window.updateOption(${qIndex}, ${optionIndex}, this.value)">
              <label class="correctOption">
                <input type="radio" name="correct-${qIndex}" 
                  ${question.correct_index === optionIndex ? 'checked' : ''}
                  onchange="window.updateCorrect(${qIndex}, ${optionIndex})">
                الإجابة الصحيحة
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// دوال عامة لتحديث الأسئلة
window.updateQuestionText = function(index, value) {
  if (STATE.questions[index]) STATE.questions[index].text = value;
};

window.updateOption = function(questionIndex, optionIndex, value) {
  if (STATE.questions[questionIndex]) {
    STATE.questions[questionIndex].options[optionIndex] = value;
  }
};

window.updateCorrect = function(questionIndex, optionIndex) {
  if (STATE.questions[questionIndex]) {
    STATE.questions[questionIndex].correct_index = optionIndex;
  }
};

window.removeQuestion = function(index) {
  if (!confirm('هل تريد حذف هذا السؤال؟')) return;
  STATE.questions.splice(index, 1);
  renderQuestions();
};

// =====================================================
// إنشاء الامتحان
// =====================================================
async function createExam() {
  const title = DOM.examTitleInput.value.trim();
  const duration = Number(DOM.duration.value);
  const availabilityDays = Number(DOM.availabilityDays.value);
  
  clearError(DOM.createError);
  
  // التحقق من المدخلات
  if (!title) {
    showError(DOM.createError, 'اكتب اسم الامتحان.');
    return;
  }
  
  if (!Number.isFinite(duration) || duration < 1) {
    showError(DOM.createError, 'اكتب مدة صحيحة للامتحان.');
    return;
  }
  
  if (!Number.isFinite(availabilityDays) || availabilityDays < 1) {
    showError(DOM.createError, 'اكتب مدة إتاحة صحيحة.');
    return;
  }
  
  if (!STATE.questions.length) {
    showError(DOM.createError, 'أضف سؤالًا واحدًا على الأقل.');
    return;
  }
  
  // التحقق من الأسئلة
  for (let i = 0; i < STATE.questions.length; i++) {
    const q = STATE.questions[i];
    
    if (!q.text || !q.text.trim()) {
      showError(DOM.createError, `السؤال رقم ${i + 1} فارغ.`);
      return;
    }
    
    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j] || !q.options[j].trim()) {
        showError(DOM.createError, `الاختيار ${j + 1} في السؤال ${i + 1} فارغ.`);
        return;
      }
    }
    
    if (q.correct_index < 0 || q.correct_index > 3) {
      showError(DOM.createError, `حدد الإجابة الصحيحة للسؤال ${i + 1}.`);
      return;
    }
  }
  
  // إعداد البيانات
  const cleanQuestions = STATE.questions.map(q => ({
    text: q.text.trim(),
    options: q.options.map(o => o.trim()),
    correct_index: q.correct_index
  }));
  
  // تعطيل الزر
  DOM.createExamBtn.disabled = true;
  const oldText = DOM.createExamBtn.textContent;
  DOM.createExamBtn.textContent = 'جاري إنشاء الامتحان...';
  
  try {
    const { data, error } = await supabase.rpc('create_public_exam_with_expiry', {
      p_title: title,
      p_duration_minutes: duration,
      p_questions: cleanQuestions,
      p_availability_days: availabilityDays,
      p_teacher_username: TEACHER_CREDENTIALS.username,
      p_teacher_password: TEACHER_CREDENTIALS.password
    });
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error('لم يتم إنشاء الامتحان.');
    
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !result.code) throw new Error('لم يتم استلام كود الامتحان.');
    
    // حفظ الكود
    localStorage.setItem('hasan_last_exam_code', result.code);
    
    // عرض النتيجة
    DOM.createdCode.textContent = result.code;
    
    const basePath = location.pathname.replace(/teacher\.html$/, '');
    const shareLink = `${location.origin}${basePath}index.html?exam=${encodeURIComponent(result.code)}`;
    DOM.shareLink.value = shareLink;
    
    if (result.expires_at) {
      const date = new Date(result.expires_at);
      DOM.shareExpiry.textContent = `ينتهي الامتحان في: ${date.toLocaleString('ar-EG')}`;
    }
    
    show(DOM.createdExam);
    showToast('تم إنشاء الامتحان بنجاح 🎉', 'success');
    
  } catch (error) {
    console.error('Create exam error:', error);
    showError(DOM.createError, error.message || 'حدث خطأ أثناء إنشاء الامتحان.');
    showToast(error.message || 'فشل إنشاء الامتحان', 'error');
  } finally {
    DOM.createExamBtn.disabled = false;
    DOM.createExamBtn.textContent = oldText;
  }
}

// =====================================================
// النتائج
// =====================================================
async function loadResults() {
  const code = DOM.resultsCode.value.trim();
  clearError(DOM.resultsError);
  
  if (!code) {
    showError(DOM.resultsError, 'اكتب كود الامتحان.');
    return;
  }
  
  DOM.loadResultsBtn.disabled = true;
  const oldText = DOM.loadResultsBtn.textContent;
  DOM.loadResultsBtn.textContent = 'جاري تحميل النتائج...';
  
  try {
    const { data, error } = await supabase.rpc('teacher_public_results', {
      p_code: code,
      p_teacher_username: TEACHER_CREDENTIALS.username,
      p_teacher_password: TEACHER_CREDENTIALS.password
    });
    
    if (error) throw new Error(error.message);
    
    STATE.lastResults = Array.isArray(data) ? data : [];
    STATE.lastResultsCode = code;
    
    renderResults(STATE.lastResults);
    
    DOM.downloadPdfBtn.disabled = STATE.lastResults.length === 0;
    DOM.deleteExamBtn.disabled = true; // يظل معطل حتى تحميل PDF
    
    if (STATE.lastResults.length > 0) {
      showToast(`تم تحميل ${STATE.lastResults.length} نتيجة`, 'success');
    } else {
      showToast('لا توجد نتائج لهذا الامتحان', 'info');
    }
    
  } catch (error) {
    console.error('Load results error:', error);
    showError(DOM.resultsError, error.message || 'تعذر تحميل النتائج.');
    showToast(error.message || 'فشل تحميل النتائج', 'error');
  } finally {
    DOM.loadResultsBtn.disabled = false;
    DOM.loadResultsBtn.textContent = oldText;
  }
}

function renderResults(rows) {
  if (!DOM.resultsBody) return;
  
  if (!rows.length) {
    DOM.resultsBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">لا توجد نتائج حتى الآن.</td>
      </tr>
    `;
    return;
  }
  
  DOM.resultsBody.innerHTML = rows.map((row, index) => {
    const score = row.score ?? 0;
    const total = row.total ?? row.question_count ?? '-';
    const submitted = row.submitted_at ? new Date(row.submitted_at).toLocaleString('ar-EG') : '-';
    const status = row.submitted_at ? 'تم التسليم' : 'لم يتم التسليم';
    
    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(row.student_name)}</strong></td>
        <td><strong>${escapeHTML(score)}</strong> / ${escapeHTML(total)}</td>
        <td>${escapeHTML(submitted)}</td>
        <td>${status}</td>
        <td>
          <button type="button" class="small" onclick="window.showDetails(${index})">التفاصيل</button>
        </td>
      </tr>
    `;
  }).join('');
}

// =====================================================
// تفاصيل النتيجة (Modal)
// =====================================================
window.showDetails = function(index) {
  const row = STATE.lastResults[index];
  if (!row) return;
  
  const score = row.score ?? 0;
  const total = row.total ?? row.question_count ?? '-';
  const submitted = row.submitted_at ? new Date(row.submitted_at).toLocaleString('ar-EG') : '-';
  
  DOM.modalContent.innerHTML = `
    <div class="details">
      <h3>تفاصيل النتيجة</h3>
      <p><strong>الطالب:</strong> ${escapeHTML(row.student_name)}</p>
      <p><strong>الدرجة:</strong> ${escapeHTML(score)} / ${escapeHTML(total)}</p>
      <p><strong>وقت التسليم:</strong> ${escapeHTML(submitted)}</p>
    </div>
  `;
  
  show(DOM.detailsModal);
};

// =====================================================
// PDF
// =====================================================
function downloadPDF() {
  const code = DOM.resultsCode.value.trim();
  
  if (!code) {
    showToast('اكتب كود الامتحان أولًا.', 'error');
    return;
  }
  
  if (!STATE.lastResults.length) {
    showToast('لا توجد نتائج لتصديرها.', 'error');
    return;
  }
  
  if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
    showToast('تعذر تحميل نظام PDF.', 'error');
    return;
  }
  
  try {
    const doc = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // العنوان
    doc.setFontSize(18);
    doc.text('نتائج امتحان أستاذ حسن عيسى', 105, 18, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`كود الامتحان: ${code}`, 105, 26, { align: 'center' });
    doc.text(`تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}`, 105, 32, { align: 'center' });
    
    // إعداد البيانات
    const rows = STATE.lastResults.map((row, index) => [
      String(index + 1),
      String(row.student_name ?? ''),
      `${row.score ?? 0} / ${row.total ?? row.question_count ?? '-'}`,
      row.submitted_at ? new Date(row.submitted_at).toLocaleString('en-GB') : '-',
      row.submitted_at ? 'تم التسليم' : 'لم يتم التسليم'
    ]);
    
    doc.autoTable({
      startY: 38,
      head: [['#', 'الطالب', 'الدرجة', 'وقت التسليم', 'الحالة']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fontStyle: 'bold', fillColor: [22, 136, 255] },
      didDrawPage: function(data) {
        doc.setFontSize(8);
        doc.text(`الصفحة ${data.pageNumber}`, 105, 285, { align: 'center' });
      }
    });
    
    doc.save(`نتائج-الامتحان-${code}.pdf`);
    
    STATE.pdfDownloadedForCode = code;
    DOM.deleteExamBtn.disabled = false;
    
    showToast('تم تنزيل PDF بنجاح 📄', 'success');
    
  } catch (error) {
    console.error('PDF error:', error);
    showToast('حدث خطأ أثناء إنشاء PDF.', 'error');
  }
}

// =====================================================
// حذف الامتحان
// =====================================================
async function deleteExam() {
  const code = STATE.lastResultsCode || DOM.resultsCode.value.trim();
  
  if (!code) {
    showToast('اكتب كود الامتحان أولًا.', 'error');
    return;
  }
  
  if (STATE.pdfDownloadedForCode !== code) {
    showToast('يجب تنزيل النتائج PDF أولًا قبل حذف الامتحان.', 'error');
    return;
  }
  
  if (!confirm(`تحذير ⚠️\n\nسيتم حذف الامتحان (${code}) وجميع نتائجه وإجابات الطلاب نهائيًا.\n\nتأكد أنك احتفظت بملف PDF.\n\nهل تريد المتابعة؟`)) {
    return;
  }
  
  const typedCode = prompt(`للتأكيد النهائي، اكتب كود الامتحان:\n${code}`);
  if (typedCode === null) return;
  
  if (typedCode.trim().toUpperCase() !== code.toUpperCase()) {
    showToast('كود الامتحان غير مطابق. لم يتم حذف أي شيء.', 'error');
    return;
  }
  
  DOM.deleteExamBtn.disabled = true;
  const oldText = DOM.deleteExamBtn.textContent;
  DOM.deleteExamBtn.textContent = 'جاري حذف الامتحان...';
  
  try {
    const { data, error } = await supabase.rpc('delete_public_exam', {
      p_code: code,
      p_teacher_username: TEACHER_CREDENTIALS.username,
      p_teacher_password: TEACHER_CREDENTIALS.password
    });
    
    if (error) throw new Error(error.message);
    if (!data || data.success !== true) throw new Error('لم يتم حذف الامتحان.');
    
    // إعادة تعيين الحالة
    STATE.lastResults = [];
    STATE.lastResultsCode = '';
    STATE.pdfDownloadedForCode = '';
    
    renderResults([]);
    DOM.resultsCode.value = '';
    DOM.downloadPdfBtn.disabled = true;
    DOM.deleteExamBtn.disabled = true;
    
    if (localStorage.getItem('hasan_last_exam_code') === code) {
      localStorage.removeItem('hasan_last_exam_code');
    }
    
    hide(DOM.createdExam);
    showToast('تم حذف الامتحان وجميع نتائجه بنجاح ✅', 'success');
    
  } catch (error) {
    console.error('Delete exam error:', error);
    showToast(error.message || 'حدث خطأ أثناء حذف الامتحان.', 'error');
    DOM.deleteExamBtn.disabled = false;
    DOM.deleteExamBtn.textContent = oldText;
  }
}

// =====================================================
// تحميل الامتحان المحفوظ
// =====================================================
function loadSavedExam() {
  const code = localStorage.getItem('hasan_last_exam_code');
  if (code && DOM.resultsCode) {
    DOM.resultsCode.value = code;
  }
}

// =====================================================
// نسخ الرابط
// =====================================================
async function copyLink() {
  const input = DOM.shareLink;
  if (!input || !input.value.trim()) return;
  
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand('copy');
  }
  
  const oldText = DOM.copyLinkBtn.textContent;
  DOM.copyLinkBtn.textContent = 'تم النسخ ✅';
  setTimeout(() => {
    DOM.copyLinkBtn.textContent = oldText;
  }, 1500);
  
  showToast('تم نسخ الرابط 📋', 'success');
}

// =====================================================
// إغلاق المودال
// =====================================================
function closeModal() {
  hide(DOM.detailsModal);
}

// =====================================================
// مستمعات الأحداث
// =====================================================
function setupEventListeners() {
  // Login
  DOM.loginBtn.addEventListener('click', authenticate);
  DOM.username.addEventListener('keydown', (e) => { if (e.key === 'Enter') authenticate(); });
  DOM.password.addEventListener('keydown', (e) => { if (e.key === 'Enter') authenticate(); });
  DOM.logoutBtn.addEventListener('click', logout);
  
  // Questions
  DOM.addQuestionBtn.addEventListener('click', addQuestion);
  
  // Create Exam
  DOM.createExamBtn.addEventListener('click', createExam);
  
  // Results
  DOM.loadResultsBtn.addEventListener('click', loadResults);
  DOM.resultsCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadResults(); });
  
  // PDF
  DOM.downloadPdfBtn.addEventListener('click', downloadPDF);
  
  // Delete
  DOM.deleteExamBtn.addEventListener('click', deleteExam);
  
  // Copy Link
  DOM.copyLinkBtn.addEventListener('click', copyLink);
  
  // New Exam
  DOM.newExamBtn.addEventListener('click', () => {
    STATE.questions = [];
    renderQuestions();
    DOM.examTitleInput.value = '';
    DOM.duration.value = '30';
    DOM.availabilityDays.value = '1';
    clearError(DOM.createError);
    hide(DOM.createdExam);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // Modal
  DOM.closeModalBtn.addEventListener('click', closeModal);
  DOM.detailsModal.addEventListener('click', (e) => {
    if (e.target === DOM.detailsModal) closeModal();
  });
}

// =====================================================
// التهيئة
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();
  
  // التحقق من الدخول التلقائي
  if (!checkAutoLogin()) {
    show(DOM.login);
    hide(DOM.app);
  }
  
  // تهيئة الأسئلة
  renderQuestions();
  
  // إعداد المستمعات
  setupEventListeners();
  
  // إخفاء المودال مبدئيًا
  hide(DOM.detailsModal);
});