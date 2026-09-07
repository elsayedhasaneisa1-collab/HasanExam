const SUPABASE_URL = "https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

const $ = id => document.getElementById(id);
let rows = [];
let questionNumber = 0;
let authenticated = false;

async function rpc(fn, body = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(body)
  });

  const text = await r.text();
  if (!r.ok) throw new Error(text || "حدث خطأ في الاتصال بالخادم.");
  return text ? JSON.parse(text) : null;
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[ch]));

function normalizeResult(x) {
  const r = x || {};
  return {
    name: String(r.student_name ?? r.name ?? r.student ?? "اسم الطالب غير متاح"),
    exam: String(r.exam_title ?? r.title ?? r.exam ?? "امتحان"),
    score: Number(r.score ?? r.correct ?? r.correct_answers ?? 0),
    total: Number(r.total_questions ?? r.total ?? r.questions_count ?? 0)
  };
}

function percentage(x) {
  const n = normalizeResult(x);
  return n.total > 0
    ? Math.max(0, Math.min(100, Math.round((n.score / n.total) * 100)))
    : 0;
}

function openMenu() {
  if (!authenticated) return;
  $("menu").classList.add("open");
  $("overlay").classList.add("open");
}

function closeMenu() {
  $("menu").classList.remove("open");
  $("overlay").classList.remove("open");
}

function showPage(id) {
  if (!authenticated) return;
  document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
  const target = $(id);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".nav").forEach(nav => {
    nav.classList.toggle("active", nav.dataset.page === id);
  });

  closeMenu();
  if (id === "results") renderResults();
}

function resultCard(raw) {
  const n = normalizeResult(raw);
  const p = percentage(raw);
  const wrong = Math.max(0, n.total - n.score);
  const initial = n.name.trim().charAt(0) || "ط";

  return `
    <div class="result" data-index="${rows.indexOf(raw)}">
      <div class="result-avatar">${esc(initial)}</div>
      <div>
        <div class="name">${esc(n.name)}</div>
        <div class="exam">${esc(n.exam)}</div>
      </div>
      <div class="rstat"><b>${n.score} / ${n.total}</b>إجابات صحيحة</div>
      <div class="rstat"><b>${wrong}</b>إجابات خاطئة</div>
      <div class="rpercent">${p}%</div>
    </div>`;
}

function topCard(raw, index) {
  const n = normalizeResult(raw);
  const p = percentage(raw);

  return `
    <article class="student">
      <div class="rank ${index === 0 ? "one" : ""}">${index + 1}</div>
      <div class="name">${esc(n.name)}</div>
      <div class="exam">${esc(n.exam)}</div>
      <div class="meter"><i style="width:${p}%"></i></div>
      <div class="scoreline"><span>${n.score} من ${n.total}</span><b>${p}%</b></div>
    </article>`;
}

function renderResults() {
  const search = $("search");
  const order = $("order");
  if (!search || !order || !$("resultsList")) return;

  const term = search.value.trim().toLowerCase();
  const filtered = rows.filter(raw =>
    normalizeResult(raw).name.toLowerCase().includes(term)
  );

  filtered.sort((a, b) => {
    return order.value === "desc"
      ? percentage(b) - percentage(a)
      : percentage(a) - percentage(b);
  });

  $("resultsList").innerHTML = filtered.length
    ? filtered.map(resultCard).join("")
    : `<div class="student">لا توجد نتائج مطابقة.</div>`;

  document.querySelectorAll(".result").forEach(card => {
    card.onclick = () => showDetails(rows[Number(card.dataset.index)]);
  });
}

function showDetails(raw) {
  const n = normalizeResult(raw);
  const p = percentage(raw);
  const wrong = Math.max(0, n.total - n.score);

  $("modalName").textContent = n.name;
  $("modalBody").innerHTML = `
    <div class="modal-stat">
      <div><small>الامتحان</small><b>${esc(n.exam)}</b></div>
      <div><small>النسبة</small><b>${p}%</b></div>
      <div><small>الإجابات الصحيحة</small><b>${n.score}</b></div>
      <div><small>الإجابات الخاطئة</small><b>${wrong}</b></div>
      <div><small>الدرجة</small><b>${n.score} / ${n.total}</b></div>
      <div><small>التقييم</small><b>${p >= 90 ? "ممتاز 🏆" : p >= 75 ? "جيد جدًا ⭐" : p >= 50 ? "جيد 👍" : "يحتاج مراجعة 📚"}</b></div>
    </div>`;

  $("detailsModal").classList.remove("hidden");
}

function renumberQuestions() {
  document.querySelectorAll("#questions .question").forEach((box, index) => {
    const title = box.querySelector(".qbar b");
    if (title) title.textContent = `السؤال ${index + 1}`;
  });
  questionNumber = document.querySelectorAll("#questions .question").length;
}

function addQuestion() {
  if (!authenticated) return;
  const questions = $("questions");
  if (!questions) return;

  questionNumber = document.querySelectorAll("#questions .question").length + 1;

  const box = document.createElement("div");
  box.className = "question";
  box.innerHTML = `
    <div class="qbar">
      <b>السؤال ${questionNumber}</b>
      <button type="button" class="remove">حذف</button>
    </div>
    <label>نص السؤال</label>
    <input class="qt" type="text" placeholder="اكتب السؤال هنا" autocomplete="off">
    <label>الاختيارات — اختر الإجابة الصحيحة</label>
    <div class="opts">
      ${[0, 1, 2, 3].map(i => `
        <div class="opt">
          <input type="radio" name="question_${questionNumber}" value="${i}" ${i === 0 ? "checked" : ""} aria-label="الإجابة الصحيحة">
          <input class="qo" type="text" placeholder="الاختيار ${i + 1}" autocomplete="off">
        </div>`).join("")}
    </div>`;

  box.querySelector(".remove").onclick = () => {
    box.remove();
    renumberQuestions();
  };

  questions.appendChild(box);
  box.querySelector(".qt")?.focus();
}

function createExam() {
  if (!authenticated) return;
  return (async () => {
    try {
      const title = $("examTitle").value.trim() || "امتحان اللغة العربية";
      const duration = Number($("duration").value);
      const questionBoxes = [...document.querySelectorAll("#questions .question")];

      if (!duration || duration < 1) {
        throw new Error("اكتب مدة صحيحة للامتحان.");
      }

      if (!questionBoxes.length) {
        throw new Error("أضف سؤالًا واحدًا على الأقل.");
      }

      const questions = questionBoxes.map((box, index) => {
        const selected = box.querySelector("input[type=radio]:checked");
        const text = box.querySelector(".qt")?.value.trim() || "";
        const options = [...box.querySelectorAll(".qo")].map(input => input.value.trim());

        if (!text) throw new Error(`اكتب نص السؤال رقم ${index + 1}.`);
        if (options.some(option => !option)) throw new Error(`أكمل الاختيارات في السؤال رقم ${index + 1}.`);
        if (!selected) throw new Error(`اختر الإجابة الصحيحة للسؤال رقم ${index + 1}.`);

        return {
          text,
          options,
          correct_index: Number(selected.value)
        };
      });

      const button = $("createExam");
      button.disabled = true;
      button.textContent = "جاري إنشاء الامتحان...";

      const response = await rpc("create_public_exam", {
        p_title: title,
        p_duration_minutes: duration,
        p_questions: questions
      });

      const data = Array.isArray(response) ? response[0] : response;
      const code = data?.code;

      if (!code) throw new Error("لم يتم إنشاء الامتحان.");

      $("examLink").value = `${location.origin}${location.pathname.replace(/teacher\.html$/i, "index.html")}?exam=${encodeURIComponent(code)}`;
      $("share").classList.remove("hidden");
    } catch (error) {
      alert(error?.message || "حدث خطأ أثناء إنشاء الامتحان.");
    } finally {
      const button = $("createExam");
      if (button) {
        button.disabled = false;
        button.textContent = "إنشاء الامتحان";
      }
    }
  })();
}

function canvasText(ctx, text, x, y, size, weight = "400") {
  ctx.font = `${weight} ${size}px Arial, Tahoma, sans-serif`;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillText(String(text ?? ""), x, y);
}

function drawPdfPage(pageRows, pageNumber, totalPages) {
  const width = 1684;
  const height = 1190;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#101828";

  canvasText(ctx, "نتائج الطلاب — أستاذ حسن عيسى", width - 70, 80, 38, "700");
  canvasText(ctx, `تاريخ التقرير: ${new Date().toLocaleString("ar-EG")}`, width - 70, 120, 20, "400");
  canvasText(ctx, `صفحة ${pageNumber} من ${totalPages}`, 70, 120, 18, "400");

  const right = width - 70;
  const left = 70;
  const top = 175;
  const rowHeight = 58;

  // RTL columns: الاسم | الامتحان | الدرجة | الخطأ | النسبة | الرقم
  const columns = [
    { title: "الطالب", x: 1510, w: 370 },
    { title: "الامتحان", x: 1120, w: 370 },
    { title: "الدرجة", x: 800, w: 300 },
    { title: "الخطأ", x: 550, w: 230 },
    { title: "النسبة", x: 310, w: 210 },
    { title: "#", x: 110, w: 140 }
  ];

  ctx.fillStyle = "#eaf2ff";
  ctx.fillRect(left, top, right - left, rowHeight);
  ctx.strokeStyle = "#b9c7d8";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, right - left, rowHeight);

  ctx.fillStyle = "#102a43";
  columns.forEach(col => canvasText(ctx, col.title, col.x, top + 38, 20, "700"));

  pageRows.forEach((raw, index) => {
    const n = normalizeResult(raw);
    const p = percentage(raw);
    const wrong = Math.max(0, n.total - n.score);
    const y = top + rowHeight + index * rowHeight;

    ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f7f9fc";
    ctx.fillRect(left, y, right - left, rowHeight);
    ctx.strokeStyle = "#d5dde7";
    ctx.strokeRect(left, y, right - left, rowHeight);
    ctx.fillStyle = "#172033";

    canvasText(ctx, n.name, 1510, y + 38, 18);
    canvasText(ctx, n.exam, 1120, y + 38, 18);
    canvasText(ctx, `${n.score} / ${n.total}`, 800, y + 38, 18);
    canvasText(ctx, wrong, 550, y + 38, 18);
    canvasText(ctx, `${p}%`, 310, y + 38, 18, "700");
    canvasText(ctx, index + 1, 110, y + 38, 18);
  });

  return canvas;
}

function downloadPdf() {
  if (!authenticated) return;
  if (!rows.length) {
    alert("لا توجد نتائج لتنزيلها.");
    return;
  }

  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("أداة PDF لم يتم تحميلها بعد. حاول مرة أخرى.");
    return;
  }

  const sorted = rows.slice().sort((a, b) => percentage(b) - percentage(a));
  const perPage = 14;
  const totalPages = Math.ceil(sorted.length / perPage);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const pageRows = sorted.slice(page * perPage, (page + 1) * perPage);
    const canvas = drawPdfPage(pageRows, page + 1, totalPages);
    const image = canvas.toDataURL("image/jpeg", 0.92);
    doc.addImage(image, "JPEG", 0, 0, 841.89, 595.28, undefined, "FAST");
  }

  doc.save("Hasan-Eissa-Results.pdf");
}

async function loadResults() {
  if (!authenticated) return;
  try {
    const response = await rpc("teacher_public_results");
    rows = Array.isArray(response) ? response : [];

    const percentages = rows.map(percentage);
    const avg = percentages.length
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : 0;
    const best = percentages.length ? Math.max(...percentages) : 0;
    const bestIndex = percentages.findIndex(value => value === best);

    $("total").textContent = rows.length;
    $("count").textContent = rows.length;
    $("avg").textContent = `${avg}%`;
    $("high").textContent = `${best}%`;
    $("highName").textContent = bestIndex >= 0 ? normalizeResult(rows[bestIndex]).name : "—";

    const sorted = rows.slice().sort((a, b) => percentage(b) - percentage(a));
    $("topStudents").innerHTML = sorted.slice(0, 3).map(topCard).join("") ||
      `<div class="student">لا توجد نتائج حتى الآن.</div>`;

    renderResults();
  } catch (error) {
    console.error(error);
    $("topStudents").innerHTML = `<div class="student">تعذر تحميل النتائج من الخادم.</div>`;
  }
}

function authenticate(event) {
  event.preventDefault();

  const user = $("user").value.trim();
  const pass = $("pass").value;
  const error = $("err");

  // لا يتم فتح لوحة التحكم إلا بعد التحقق من البيانات.
  if (user !== "Hasan" || pass !== "25808") {
    error.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة.";
    $("pass").value = "";
    $("pass").focus();
    return;
  }

  error.textContent = "";
  authenticated = true;
  document.body.classList.add("authenticated");
  $("login").classList.add("hidden");
  $("login").setAttribute("aria-hidden", "true");
  $("app").classList.remove("hidden");
  $("app").setAttribute("aria-hidden", "false");
  $("app").removeAttribute("inert");
  loadResults();
}

function logout() {
  // لا نحفظ جلسة المدرس في sessionStorage/localStorage.
  // عند إعادة فتح الصفحة سيطلب كلمة المرور مرة أخرى.
  authenticated = false;
  document.body.classList.remove("authenticated");
  $("app").classList.add("hidden");
  $("app").setAttribute("aria-hidden", "true");
  $("app").setAttribute("inert", "");
  $("login").classList.remove("hidden");
  $("login").setAttribute("aria-hidden", "false");
  $("user").value = "";
  $("pass").value = "";
  $("err").textContent = "";
  closeMenu();
}

document.addEventListener("DOMContentLoaded", () => {
  // حماية إضافية: لا توجد جلسة محفوظة تفتح اللوحة تلقائيًا.
  authenticated = false;
  document.body.classList.remove("authenticated");
  $("app").classList.add("hidden");
  $("app").setAttribute("aria-hidden", "true");
  $("app").setAttribute("inert", "");
  $("login").classList.remove("hidden");
  $("login").setAttribute("aria-hidden", "false");

  $("loginForm").addEventListener("submit", authenticate);
  $("logout").addEventListener("click", logout);
  $("hamb").addEventListener("click", openMenu);
  $("close").addEventListener("click", closeMenu);
  $("overlay").addEventListener("click", closeMenu);
  $("refresh").addEventListener("click", loadResults);
  $("refreshTop").addEventListener("click", loadResults);
  $("search").addEventListener("input", renderResults);
  $("order").addEventListener("change", renderResults);
  $("addQ").addEventListener("click", addQuestion);
  $("createExam").addEventListener("click", createExam);
  $("downloadPdf").addEventListener("click", downloadPdf);

  $("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("examLink").value);
      $("copy").textContent = "تم ✓";
      setTimeout(() => $("copy").textContent = "نسخ", 1200);
    } catch {
      $("examLink").select();
      document.execCommand("copy");
      $("copy").textContent = "تم ✓";
      setTimeout(() => $("copy").textContent = "نسخ", 1200);
    }
  });

  $("modalClose").addEventListener("click", () => $("detailsModal").classList.add("hidden"));
  $("detailsModal").addEventListener("click", event => {
    if (event.target.id === "detailsModal") $("detailsModal").classList.add("hidden");
  });

  document.querySelectorAll(".nav").forEach(nav => {
    nav.addEventListener("click", () => showPage(nav.dataset.page));
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });
});
