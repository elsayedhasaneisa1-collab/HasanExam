const SUPABASE_URL = "https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

const $ = id => document.getElementById(id);

let rows = [];
let q = 0;

async function rpc(fn, body = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    },
    body: JSON.stringify(body)
  });

  const text = await r.text();

  if (!r.ok) {
    throw new Error(text || "حدث خطأ في الاتصال بالخادم");
  }

  return text ? JSON.parse(text) : null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function N(x) {
  const r = x || {};

  return {
    name: String(
      r.student_name ??
      r.name ??
      r.student ??
      "اسم الطالب غير متاح"
    ),

    exam: String(
      r.exam_title ??
      r.title ??
      r.exam ??
      "امتحان"
    ),

    score: Number(
      r.score ??
      r.correct ??
      r.correct_answers ??
      0
    ),

    total: Number(
      r.total_questions ??
      r.total ??
      r.questions_count ??
      0
    )
  };
}

function P(x) {
  const n = N(x);

  return n.total > 0
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((n.score / n.total) * 100)
        )
      )
    : 0;
}


/* =========================
   MENU
========================= */

function openMenu() {
  $("menu")?.classList.add("open");
  $("overlay")?.classList.add("open");
}

function closeMenu() {
  $("menu")?.classList.remove("open");
  $("overlay")?.classList.remove("open");
}


/* =========================
   PAGE NAVIGATION
========================= */

function page(id) {
  document.querySelectorAll(".page").forEach(x => {
    x.classList.add("hidden");
  });

  const target = $(id);

  if (target) {
    target.classList.remove("hidden");
  }

  document.querySelectorAll(".nav").forEach(x => {
    x.classList.toggle(
      "active",
      x.dataset.page === id
    );
  });

  closeMenu();

  if (id === "results") {
    render();
  }
}


/* =========================
   RESULTS
========================= */

function resultCard(x) {
  const n = N(x);
  const p = P(x);
  const wrong = Math.max(0, n.total - n.score);
  const initial =
    n.name.trim().charAt(0) || "ط";

  return `
    <div class="result" data-index="${rows.indexOf(x)}">

      <div class="result-avatar">
        ${esc(initial)}
      </div>

      <div>
        <div class="name">${esc(n.name)}</div>
        <div class="exam">${esc(n.exam)}</div>
      </div>

      <div class="rstat">
        <b>${n.score} / ${n.total}</b>
        إجابات صحيحة
      </div>

      <div class="rstat">
        <b>${wrong}</b>
        إجابات خاطئة
      </div>

      <div class="rpercent">
        ${p}%
      </div>

    </div>
  `;
}

function topCard(x, i) {
  const n = N(x);
  const p = P(x);

  return `
    <article class="student">

      <div class="rank ${i === 0 ? "one" : ""}">
        ${i + 1}
      </div>

      <div class="name">
        ${esc(n.name)}
      </div>

      <div class="exam">
        ${esc(n.exam)}
      </div>

      <div class="meter">
        <i style="width:${p}%"></i>
      </div>

      <div class="scoreline">
        <span>${n.score} من ${n.total}</span>
        <b>${p}%</b>
      </div>

    </article>
  `;
}

function render() {
  const search = $("search");

  if (!search || !$("resultsList")) return;

  const term = search.value
    .trim()
    .toLowerCase();

  let filtered = rows.filter(x =>
    N(x)
      .name
      .toLowerCase()
      .includes(term)
  );

  filtered.sort((a, b) => {
    const order = $("order")?.value || "desc";

    return order === "desc"
      ? P(b) - P(a)
      : P(a) - P(b);
  });

  $("resultsList").innerHTML =
    filtered.length
      ? filtered.map(resultCard).join("")
      : `<div class="student">لا توجد نتائج مطابقة.</div>`;

  document.querySelectorAll(".result").forEach(el => {
    el.onclick = () => {
      const index = Number(el.dataset.index);

      if (rows[index]) {
        showDetails(rows[index]);
      }
    };
  });
}


/* =========================
   DETAILS MODAL
========================= */

function showDetails(raw) {
  const n = N(raw);
  const p = P(raw);
  const wrong = Math.max(0, n.total - n.score);

  if (!$("modalName") || !$("modalBody") || !$("detailsModal")) {
    return;
  }

  $("modalName").textContent = n.name;

  $("modalBody").innerHTML = `
    <div class="modal-stat">

      <div>
        <small>الامتحان</small>
        <b>${esc(n.exam)}</b>
      </div>

      <div>
        <small>النسبة</small>
        <b>${p}%</b>
      </div>

      <div>
        <small>الإجابات الصحيحة</small>
        <b>${n.score}</b>
      </div>

      <div>
        <small>الإجابات الخاطئة</small>
        <b>${wrong}</b>
      </div>

      <div>
        <small>الدرجة</small>
        <b>${n.score} / ${n.total}</b>
      </div>

      <div>
        <small>التقييم</small>
        <b>
          ${
            p >= 90
              ? "ممتاز 🏆"
              : p >= 75
              ? "جيد جدًا ⭐"
              : p >= 50
              ? "جيد 👍"
              : "يحتاج مراجعة 📚"
          }
        </b>
      </div>

    </div>
  `;

  $("detailsModal").classList.remove("hidden");
}


/* =========================
   PDF
========================= */

async function downloadResultsPDF() {

  if (!rows.length) {
    alert("لا توجد نتائج لتنزيلها.");
    return;
  }

  const jsPDF =
    window.jspdf?.jsPDF;

  if (!jsPDF) {
    alert(
      "مكتبة PDF لم يتم تحميلها. تأكد من اتصال الإنترنت ثم أعد المحاولة."
    );
    return;
  }

  const button = $("downloadPdf");

  if (button) {
    button.disabled = true;
    button.textContent = "⏳ جاري تجهيز PDF...";
  }

  try {

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4"
    });

    /* محاولة تحميل الخط العربي */
    try {

      const response =
        await fetch("NotoNaskhArabic-Regular.ttf");

      if (response.ok) {

        const buffer =
          await response.arrayBuffer();

        const bytes =
          new Uint8Array(buffer);

        let binary = "";

        const chunkSize = 8192;

        for (
          let i = 0;
          i < bytes.length;
          i += chunkSize
        ) {
          binary += String.fromCharCode(
            ...bytes.subarray(
              i,
              Math.min(
                i + chunkSize,
                bytes.length
              )
            )
          );
        }

        const base64 =
          btoa(binary);

        doc.addFileToVFS(
          "NotoNaskhArabic-Regular.ttf",
          base64
        );

        doc.addFont(
          "NotoNaskhArabic-Regular.ttf",
          "NotoArabic",
          "normal"
        );

        doc.setFont("NotoArabic");

        if (typeof doc.setR2L === "function") {
          doc.setR2L(true);
        }
      }

    } catch (fontError) {
      console.warn(
        "تعذر تحميل الخط العربي:",
        fontError
      );

      doc.setFont("helvetica");

      if (typeof doc.setR2L === "function") {
        doc.setR2L(false);
      }
    }

    doc.setFontSize(20);

    doc.text(
      "Hasan Eissa - Student Results",
      40,
      45
    );

    doc.setFontSize(10);

    doc.text(
      new Date().toLocaleString("en-GB"),
      40,
      63
    );

    const data =
      rows
        .slice()
        .sort((a, b) => P(b) - P(a))
        .map((x, i) => {

          const n = N(x);

          return [
            i + 1,
            n.name,
            n.exam,
            `${n.score}/${n.total}`,
            `${Math.max(
              0,
              n.total - n.score
            )}`,
            `${P(x)}%`
          ];
        });


    /* AutoTable */
    if (
      typeof doc.autoTable === "function"
    ) {

      doc.autoTable({
        startY: 80,

        head: [[
          "#",
          "Student",
          "Exam",
          "Score",
          "Wrong",
          "Percentage"
        ]],

        body: data,

        theme: "grid",

        styles: {
          fontSize: 9,
          cellPadding: 6,
          font: "NotoArabic",
          fontStyle: "normal"
        },

        headStyles: {
          fillColor: [22, 70, 110],
          textColor: 255
        }
      });

    } else {

      /* Fallback لو AutoTable غير موجود */

      let y = 90;

      const columns = [
        "#",
        "Student",
        "Exam",
        "Score",
        "Wrong",
        "Percentage"
      ];

      doc.setFontSize(9);

      columns.forEach((text, i) => {
        doc.text(
          text,
          40 + i * 105,
          y
        );
      });

      y += 20;

      data.forEach(row => {

        row.forEach((text, i) => {

          doc.text(
            String(text),
            40 + i * 105,
            y
          );

        });

        y += 18;

        if (y > 540) {
          doc.addPage();
          y = 50;
        }
      });
    }

    doc.save(
      "Hasan-Eissa-Results.pdf"
    );

  } catch (error) {

    console.error(error);

    alert(
      "حدث خطأ أثناء إنشاء ملف PDF."
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "⬇ تنزيل النتائج PDF";
    }

  }
}


/* =========================
   LOAD RESULTS
========================= */

async function load() {

  try {

    const result =
      await rpc(
        "teacher_public_results"
      );

    rows =
      Array.isArray(result)
        ? result
        : [];

    const percentages =
      rows.map(P);

    const avg =
      percentages.length
        ? Math.round(
            percentages.reduce(
              (a, b) => a + b,
              0
            ) /
              percentages.length
          )
        : 0;

    const best =
      percentages.length
        ? Math.max(...percentages)
        : 0;

    const bestIndex =
      percentages.findIndex(
        x => x === best
      );

    if ($("total"))
      $("total").textContent =
        rows.length;

    if ($("count"))
      $("count").textContent =
        rows.length;

    if ($("avg"))
      $("avg").textContent =
        avg + "%";

    if ($("high"))
      $("high").textContent =
        best + "%";

    if ($("highName"))
      $("highName").textContent =
        bestIndex >= 0
          ? N(rows[bestIndex]).name
          : "—";

    const sorted =
      rows
        .slice()
        .sort(
          (a, b) => P(b) - P(a)
        );

    if ($("topStudents")) {

      $("topStudents").innerHTML =
        sorted.length
          ? sorted
              .slice(0, 3)
              .map(topCard)
              .join("")
          : `<div class="student">
              لا توجد نتائج حتى الآن.
            </div>`;
    }

    render();

  } catch (error) {

    console.error(error);

    if ($("topStudents")) {
      $("topStudents").innerHTML =
        `<div class="student">
          تعذر تحميل النتائج من الخادم.
        </div>`;
    }
  }
}


/* =========================
   ADD QUESTION
========================= */

function renumberQuestions() {

  document
    .querySelectorAll(".question")
    .forEach((element, index) => {

      const title =
        element.querySelector(".qbar b");

      if (title) {
        title.textContent =
          `السؤال ${index + 1}`;
      }

    });

  q =
    document.querySelectorAll(
      ".question"
    ).length;
}


function addQuestion() {

  const container =
    $("questions");

  if (!container) {
    console.error(
      "عنصر questions غير موجود"
    );
    return;
  }

  q++;

  const question =
    document.createElement("div");

  question.className =
    "question";

  question.innerHTML = `

    <div class="qbar">

      <b>
        السؤال ${q}
      </b>

      <button
        type="button"
        class="remove"
      >
        حذف
      </button>

    </div>

    <label>
      نص السؤال
    </label>

    <input
      class="qt"
      type="text"
      placeholder="اكتب السؤال هنا"
      autocomplete="off"
    >

    <label>
      الاختيارات — اختر الإجابة الصحيحة
    </label>

    <div class="opts">

      ${[0, 1, 2, 3]
        .map(
          i => `
            <div class="opt">

              <input
                type="radio"
                name="q${q}"
                value="${i}"
                ${i === 0 ? "checked" : ""}
              >

              <input
                class="qo"
                type="text"
                placeholder="الاختيار ${i + 1}"
                autocomplete="off"
              >

            </div>
          `
        )
        .join("")}

    </div>
  `;


  const removeButton =
    question.querySelector(".remove");

  removeButton.onclick = () => {

    question.remove();

    renumberQuestions();

  };


  container.appendChild(question);

  renumberQuestions();


  /* ينزل تلقائي للسؤال الجديد */
  question.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });


  /* يركز على نص السؤال */
  setTimeout(() => {

    question
      .querySelector(".qt")
      ?.focus();

  }, 150);
}


/* =========================
   CREATE EXAM
========================= */

async function createExam() {

  try {

    const title =
      $("examTitle")
        ?.value
        .trim() ||
      "امتحان اللغة العربية";

    const duration =
      Number(
        $("duration")?.value
      );

    const questionElements =
      [
        ...document.querySelectorAll(
          ".question"
        )
      ];

    if (!duration || duration < 1) {
      throw new Error(
        "اكتب مدة صحيحة للامتحان."
      );
    }

    if (!questionElements.length) {
      throw new Error(
        "أضف سؤالًا واحدًا على الأقل."
      );
    }


    const questions =
      questionElements.map(
        (element, index) => {

          const text =
            element
              .querySelector(".qt")
              ?.value
              .trim() || "";

          const options =
            [
              ...element.querySelectorAll(
                ".qo"
              )
            ].map(
              input =>
                input.value.trim()
            );

          const selected =
            element.querySelector(
              'input[type="radio"]:checked'
            );

          if (!text) {
            throw new Error(
              `اكتب نص السؤال رقم ${index + 1}.`
            );
          }

          if (
            options.length !== 4 ||
            options.some(
              option => !option
            )
          ) {
            throw new Error(
              `أكمل الاختيارات في السؤال رقم ${index + 1}.`
            );
          }

          if (!selected) {
            throw new Error(
              `حدد الإجابة الصحيحة للسؤال رقم ${index + 1}.`
            );
          }

          return {
            text,
            options,
            correct_index:
              Number(
                selected.value
              )
          };
        }
      );


    const button =
      $("createExam");

    if (button) {
      button.disabled = true;
      button.textContent =
        "⏳ جاري إنشاء الامتحان...";
    }


    const result =
      await rpc(
        "create_public_exam",
        {
          p_title: title,
          p_duration_minutes:
            duration,
          p_questions:
            questions
        }
      );


    const code =
      Array.isArray(result)
        ? result[0]?.code
        : result?.code;


    if (!code) {
      throw new Error(
        "لم يتم إنشاء الامتحان."
      );
    }


    const examPath =
      location.pathname
        .replace(
          /teacher\.html$/i,
          "index.html"
        );


    const examLink =
      `${location.origin}${examPath}?exam=${encodeURIComponent(code)}`;


    if ($("examLink")) {
      $("examLink").value =
        examLink;
    }

    $("share")
      ?.classList
      .remove("hidden");


    alert(
      "🎉 تم إنشاء الامتحان بنجاح!"
    );

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "حدث خطأ أثناء إنشاء الامتحان."
    );

  } finally {

    const button =
      $("createExam");

    if (button) {
      button.disabled = false;
      button.textContent =
        "إنشاء الامتحان";
    }

  }
}


/* =========================
   COPY LINK
========================= */

async function copyExamLink() {

  const input =
    $("examLink");

  if (!input?.value) {
    return;
  }

  try {

    await navigator.clipboard.writeText(
      input.value
    );

  } catch {

    input.select();

    document.execCommand(
      "copy"
    );
  }

  const button =
    $("copy");

  if (button) {

    const oldText =
      button.textContent;

    button.textContent =
      "تم ✓";

    setTimeout(() => {
      button.textContent =
        oldText || "نسخ";
    }, 1200);
  }
}


/* =========================
   START DASHBOARD
========================= */

function start() {

  $("login")
    ?.classList
    .add("hidden");

  $("app")
    ?.classList
    .remove("hidden");


  /*
    إضافة السؤال الأول تلقائيًا
    عند فتح صفحة إنشاء الامتحان
  */
  if (
    $("questions") &&
    !document.querySelector(
      ".question"
    )
  ) {
    addQuestion();
  }

  load();
}


/* =========================
   WAIT FOR FULL HTML
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* Menu */

    $("hamb")?.addEventListener(
      "click",
      openMenu
    );

    $("close")?.addEventListener(
      "click",
      closeMenu
    );

    $("overlay")?.addEventListener(
      "click",
      closeMenu
    );


    /* Navigation */

    document
      .querySelectorAll(".nav")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => page(
            button.dataset.page
          )
        );

      });


    document
      .querySelectorAll("[data-go]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => page(
            button.dataset.go
          )
        );

      });


    /* Login */

    $("loginForm")?.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const username =
          $("user")
            ?.value
            .trim();

        const password =
          $("pass")
            ?.value;

        if (
          username === "Hasan" &&
          password === "25808"
        ) {

          sessionStorage.tc = "1";

          start();

        } else {

          if ($("err")) {
            $("err").textContent =
              "بيانات الدخول غير صحيحة.";
          }

        }
      }
    );


    /* Logout */

    $("logout")?.addEventListener(
      "click",
      () => {

        sessionStorage.removeItem(
          "tc"
        );

        location.reload();

      }
    );


    /* Refresh */

    $("refresh")?.addEventListener(
      "click",
      load
    );

    $("refreshTop")?.addEventListener(
      "click",
      load
    );


    /* Search */

    $("search")?.addEventListener(
      "input",
      render
    );

    $("order")?.addEventListener(
      "change",
      render
    );


    /* PDF */

    $("downloadPdf")?.addEventListener(
      "click",
      downloadResultsPDF
    );


    /* Add Question */

    $("addQ")?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        addQuestion();

      }
    );


    /* Create Exam */

    $("createExam")?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        createExam();

      }
    );


    /* Copy */

    $("copy")?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        copyExamLink();

      }
    );


    /* Modal */

    $("modalClose")?.addEventListener(
      "click",
      () => {

        $("detailsModal")
          ?.classList
          .add("hidden");

      }
    );


    $("detailsModal")?.addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "detailsModal"
        ) {

          $("detailsModal")
            .classList
            .add("hidden");

        }

      }
    );


    /* Auto Login */

    if (
      sessionStorage.tc === "1"
    ) {
      start();
    }

  }
);