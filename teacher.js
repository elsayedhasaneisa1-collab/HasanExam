const SUPABASE_URL =
  "https://zvvfjmadziyuwutdresz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

const client =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const $ = (id) =>
  document.getElementById(id);

let teacherUsername = "";
let teacherPassword = "";

let questions = [];

let lastCreatedExam = null;


/* =========================
   HELPERS
========================= */

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}

function show(id) {
  const el = $(id);
  if (el) {
    el.classList.remove("hidden");
  }
}

function hide(id) {
  const el = $(id);
  if (el) {
    el.classList.add("hidden");
  }
}

function setText(id, text) {
  const el = $(id);
  if (el) {
    el.textContent = text;
  }
}


/* =========================
   LOGIN
========================= */

$("loginBtn").onclick =
  teacherLogin;

$("password").addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Enter") {
      teacherLogin();
    }
  }
);

$("username").addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Enter") {
      teacherLogin();
    }
  }
);

async function teacherLogin() {
  const username =
    $("username").value.trim();

  const password =
    $("password").value;

  $("loginError").textContent = "";

  if (!username || !password) {
    $("loginError").textContent =
      "اكتب اسم المستخدم وكلمة المرور.";

    return;
  }

  /*
    نتحقق من بيانات المدرس عن طريق
    RPC مخصص في Supabase.
  */

  const { data, error } =
    await client.rpc(
      "hasan_check_teacher",
      {
        p_username: username,
        p_password: password
      }
    );

  if (error) {
    console.error(error);

    $("loginError").textContent =
      "تعذر تسجيل الدخول. تأكد من إعداد قاعدة البيانات.";

    return;
  }

  if (!data) {
    $("loginError").textContent =
      "اسم المستخدم أو كلمة المرور غير صحيحة.";

    return;
  }

  teacherUsername = username;
  teacherPassword = password;

  sessionStorage.setItem(
    "hasan_teacher_username",
    username
  );

  sessionStorage.setItem(
    "hasan_teacher_password",
    password
  );

  hide("login");
  show("app");

  document.body.classList.add(
    "authenticated"
  );

  loadSavedExam();
}


/* =========================
   AUTO LOGIN
========================= */

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    const savedUsername =
      sessionStorage.getItem(
        "hasan_teacher_username"
      );

    const savedPassword =
      sessionStorage.getItem(
        "hasan_teacher_password"
      );

    if (
      savedUsername &&
      savedPassword
    ) {
      teacherUsername =
        savedUsername;

      teacherPassword =
        savedPassword;

      const { data, error } =
        await client.rpc(
          "hasan_check_teacher",
          {
            p_username:
              teacherUsername,

            p_password:
              teacherPassword
          }
        );

      if (!error && data === true) {
        hide("login");
        show("app");

        document.body.classList.add(
          "authenticated"
        );

        loadSavedExam();
      }
    }
  }
);


/* =========================
   LOGOUT
========================= */

$("logoutBtn").onclick = () => {
  sessionStorage.removeItem(
    "hasan_teacher_username"
  );

  sessionStorage.removeItem(
    "hasan_teacher_password"
  );

  teacherUsername = "";
  teacherPassword = "";

  location.reload();
};


/* =========================
   QUESTIONS
========================= */

$("addQuestionBtn").onclick =
  addQuestion;

function addQuestion() {
  const number =
    questions.length + 1;

  questions.push({
    text: "",
    options: ["", "", "", ""],
    correct_index: 0
  });

  renderQuestions();

  setTimeout(() => {
    const element =
      document.querySelector(
        `[data-question-index="${number - 1}"]`
      );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, 100);
}

function renderQuestions() {
  const container =
    $("questionsContainer");

  if (!container) return;

  if (!questions.length) {
    container.innerHTML = `
      <div class="empty">
        لم تتم إضافة أي أسئلة بعد.
      </div>
    `;

    return;
  }

  container.innerHTML =
    questions
      .map(
        (question, qIndex) => `
          <div
            class="questionEditor"
            data-question-index="${qIndex}"
          >

            <div class="questionHeader">

              <strong>
                السؤال ${qIndex + 1}
              </strong>

              <button
                type="button"
                class="danger small"
                onclick="removeQuestion(${qIndex})"
              >
                حذف
              </button>

            </div>

            <textarea
              class="questionText"
              placeholder="اكتب نص السؤال..."
              oninput="updateQuestionText(${qIndex}, this.value)"
            >${esc(question.text)}</textarea>


            <div class="optionsGrid">

              ${question.options
                .map(
                  (option, optionIndex) => `
                    <div class="optionEditor">

                      <label>
                        الاختيار ${optionIndex + 1}
                      </label>

                      <input
                        type="text"
                        value="${esc(option)}"
                        placeholder="اكتب الاختيار..."
                        oninput="
                          updateOption(
                            ${qIndex},
                            ${optionIndex},
                            this.value
                          )
                        "
                      >

                      <label class="correctOption">

                        <input
                          type="radio"
                          name="correct-${qIndex}"
                          ${
                            question.correct_index ===
                            optionIndex
                              ? "checked"
                              : ""
                          }
                          onchange="
                            updateCorrect(
                              ${qIndex},
                              ${optionIndex}
                            )
                          "
                        >

                        الإجابة الصحيحة

                      </label>

                    </div>
                  `
                )
                .join("")}

            </div>

          </div>
        `
      )
      .join("");
}

window.updateQuestionText =
  function (index, value) {
    if (!questions[index]) return;

    questions[index].text =
      value;
  };

window.updateOption =
  function (
    questionIndex,
    optionIndex,
    value
  ) {
    if (!questions[questionIndex])
      return;

    questions[questionIndex]
      .options[optionIndex] = value;
  };

window.updateCorrect =
  function (
    questionIndex,
    optionIndex
  ) {
    if (!questions[questionIndex])
      return;

    questions[questionIndex]
      .correct_index =
      optionIndex;
  };

window.removeQuestion =
  function (index) {
    if (
      !confirm(
        "هل تريد حذف هذا السؤال؟"
      )
    ) {
      return;
    }

    questions.splice(index, 1);

    renderQuestions();
  };


/* =========================
   CREATE EXAM
========================= */

$("createExamBtn").onclick =
  createExam;

async function createExam() {
  const title =
    $("examTitleInput").value.trim();

  const duration =
    Number($("duration").value);

  const availabilityDays =
    Number(
      $("availabilityDays").value
    );

  const errorBox =
    $("createError");

  errorBox.textContent = "";

  if (!title) {
    errorBox.textContent =
      "اكتب اسم الامتحان.";

    return;
  }

  if (
    !Number.isFinite(duration) ||
    duration < 1
  ) {
    errorBox.textContent =
      "اكتب مدة صحيحة للامتحان.";

    return;
  }

  if (
    !Number.isFinite(
      availabilityDays
    ) ||
    availabilityDays < 1
  ) {
    errorBox.textContent =
      "اكتب مدة صلاحية صحيحة.";

    return;
  }

  if (!questions.length) {
    errorBox.textContent =
      "أضف سؤالًا واحدًا على الأقل.";

    return;
  }

  for (
    let i = 0;
    i < questions.length;
    i++
  ) {
    const q = questions[i];

    if (!q.text.trim()) {
      errorBox.textContent =
        `السؤال رقم ${i + 1} فارغ.`;

      return;
    }

    for (
      let j = 0;
      j < q.options.length;
      j++
    ) {
      if (
        !q.options[j].trim()
      ) {
        errorBox.textContent =
          `الاختيار ${j + 1} في السؤال ${
            i + 1
          } فارغ.`;

        return;
      }
    }

    if (
      q.correct_index < 0 ||
      q.correct_index > 3
    ) {
      errorBox.textContent =
        `حدد الإجابة الصحيحة للسؤال ${
          i + 1
        }.`;

      return;
    }
  }

  const button =
    $("createExamBtn");

  button.disabled = true;

  const oldText =
    button.textContent;

  button.textContent =
    "جاري إنشاء الامتحان...";

  const cleanQuestions =
    questions.map((q) => ({
      text: q.text.trim(),
      options: q.options.map(
        (o) => o.trim()
      ),
      correct_index:
        q.correct_index
    }));

  const { data, error } =
    await client.rpc(
      "create_public_exam_with_expiry",
      {
        p_title: title,
        p_duration_minutes:
          duration,
        p_questions:
          cleanQuestions,
        p_availability_days:
          availabilityDays,
        p_teacher_username:
          teacherUsername,
        p_teacher_password:
          teacherPassword
      }
    );

  button.disabled = false;
  button.textContent = oldText;

  if (error) {
    console.error(error);

    errorBox.textContent =
      error.message ||
      "حدث خطأ أثناء إنشاء الامتحان.";

    return;
  }

  if (!data) {
    errorBox.textContent =
      "لم يتم إنشاء الامتحان.";

    return;
  }

  /*
    الدالة ممكن ترجع object أو array
    حسب إعداد PostgreSQL/PostgREST.
  */

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  lastCreatedExam = result;

  const code =
    result.code ||
    result.exam_code;

  const expiresAt =
    result.expires_at;

  if (!code) {
    errorBox.textContent =
      "تم إنشاء الامتحان لكن لم يتم استلام كود الامتحان.";

    return;
  }

  localStorage.setItem(
    "hasan_last_exam_code",
    code
  );

  setText(
    "createdCode",
    code
  );

  const shareLink =
    `${location.origin}${location.pathname.replace(
      /teacher\.html$/,
      ""
    )}index.html?exam=${encodeURIComponent(
      code
    )}`;

  if ($("shareLink")) {
    $("shareLink").value =
      shareLink;
  }

  if (
    expiresAt &&
    $("shareExpiry")
  ) {
    const date =
      new Date(expiresAt);

    $("shareExpiry").textContent =
      "ينتهي الامتحان في: " +
      date.toLocaleString(
        "ar-EG"
      );
  }

  show("createdExam");

  errorBox.textContent = "";

  /*
    نجهز امتحان جديد لو المدرس حب.
  */
}


/* =========================
   COPY LINK
========================= */

$("copyLinkBtn").onclick =
  async () => {
    const input =
      $("shareLink");

    if (!input) return;

    const value =
      input.value.trim();

    if (!value) return;

    try {
      await navigator.clipboard.writeText(
        value
      );

      $("copyLinkBtn").textContent =
        "تم النسخ ✅";

      setTimeout(() => {
        $("copyLinkBtn").textContent =
          "نسخ الرابط";
      }, 1500);
    } catch (error) {
      input.select();

      document.execCommand(
        "copy"
      );

      $("copyLinkBtn").textContent =
        "تم النسخ ✅";
    }
  };


/* =========================
   NEW EXAM
========================= */

$("newExamBtn").onclick =
  () => {
    questions = [];

    renderQuestions();

    $("examTitleInput").value =
      "";

    $("duration").value =
      "";

    $("availabilityDays").value =
      "1";

    $("createError").textContent =
      "";

    hide("createdExam");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


/* =========================
   RESULTS
========================= */

$("loadResultsBtn").onclick =
  loadResults;

async function loadResults() {
  const code =
    $("resultsCode").value.trim();

  const errorBox =
    $("resultsError");

  errorBox.textContent = "";

  if (!code) {
    errorBox.textContent =
      "اكتب كود الامتحان.";

    return;
  }

  const button =
    $("loadResultsBtn");

  button.disabled = true;

  const oldText =
    button.textContent;

  button.textContent =
    "جاري تحميل النتائج...";

  const {
    data,
    error
  } = await client.rpc(
    "teacher_public_results",
    {
      p_code: code,
      p_teacher_username:
        teacherUsername,
      p_teacher_password:
        teacherPassword
    }
  );

  button.disabled = false;
  button.textContent =
    oldText;

  if (error) {
    console.error(error);

    errorBox.textContent =
      error.message ||
      "تعذر تحميل النتائج.";

    return;
  }

  const rows =
    Array.isArray(data)
      ? data
      : [];

  renderResults(rows);

  $("downloadPdfBtn").disabled =
    rows.length === 0;
}


/* =========================
   RENDER RESULTS
========================= */

function renderResults(rows) {
  const body =
    $("resultsBody");

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="text-align:center"
        >
          لا توجد نتائج حتى الآن.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    rows
      .map(
        (row, index) => {
          const score =
            row.score ?? 0;

          const total =
            row.total ??
            row.question_count ??
            "-";

          const submitted =
            row.submitted_at
              ? new Date(
                  row.submitted_at
                ).toLocaleString(
                  "ar-EG"
                )
              : "-";

          return `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                ${esc(
                  row.student_name
                )}
              </td>

              <td>
                <strong>
                  ${score}
                </strong>
                /
                ${total}
              </td>

              <td>
                ${submitted}
              </td>

              <td>
                ${
                  row.submitted_at
                    ? "تم التسليم"
                    : "لم يتم التسليم"
                }
              </td>

              <td>
                <button
                  type="button"
                  class="small"
                  onclick='showDetails(${JSON.stringify(
                    row
                  )})'
                >
                  التفاصيل
                </button>
              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================
   RESULT DETAILS
========================= */

window.showDetails =
  function (row) {
    const modal =
      $("detailsModal");

    const content =
      $("modalContent");

    if (!modal || !content)
      return;

    content.innerHTML = `
      <div class="details">

        <h3>
          نتيجة الطالب
        </h3>

        <p>
          <strong>
            الاسم:
          </strong>
          ${esc(
            row.student_name
          )}
        </p>

        <p>
          <strong>
            الدرجة:
          </strong>
          ${esc(
            row.score ?? 0
          )}
          /
          ${esc(
            row.total ??
            row.question_count ??
            "-"
          )}
        </p>

        <p>
          <strong>
            وقت التسليم:
          </strong>
          ${
            row.submitted_at
              ? new Date(
                  row.submitted_at
                ).toLocaleString(
                  "ar-EG"
                )
              : "-"
          }
        </p>

      </div>
    `;

    modal.classList.remove(
      "hidden"
    );
  };


/* =========================
   CLOSE MODAL
========================= */

$("closeModalBtn").onclick =
  () => {
    hide("detailsModal");
  };

$("detailsModal").addEventListener(
  "click",
  (e) => {
    if (
      e.target ===
      $("detailsModal")
    ) {
      hide("detailsModal");
    }
  }
);


/* =========================
   PDF
========================= */

$("downloadPdfBtn").onclick =
  downloadPDF;

function downloadPDF() {
  const code =
    $("resultsCode").value.trim();

  if (!code) {
    alert(
      "اكتب كود الامتحان أولًا."
    );

    return;
  }

  const table =
    $("resultsBody");

  if (!table) return;

  const rows =
    Array.from(
      table.querySelectorAll(
        "tr"
      )
    );

  if (!rows.length) {
    alert(
      "لا توجد نتائج لتصديرها."
    );

    return;
  }

  const {
    jsPDF
  } = window.jspdf || {};

  if (!jsPDF) {
    alert(
      "تعذر تحميل نظام PDF."
    );

    return;
  }

  const doc =
    new jsPDF({
      orientation:
        "portrait",
      unit: "mm",
      format: "a4"
    });

  doc.setFontSize(18);

  doc.text(
    "Hasan Exam - Results",
    105,
    18,
    {
      align: "center"
    }
  );

  doc.setFontSize(11);

  doc.text(
    "Exam Code: " + code,
    105,
    26,
    {
      align: "center"
    }
  );

  const dataRows = [];

  rows.forEach((tr) => {
    const cells =
      Array.from(
        tr.querySelectorAll(
          "td"
        )
      );

    if (
      cells.length >= 5
    ) {
      dataRows.push([
        cells[0].innerText.trim(),
        cells[1].innerText.trim(),
        cells[2].innerText.trim(),
        cells[3].innerText.trim(),
        cells[4].innerText.trim()
      ]);
    }
  });

  if (
    typeof doc.autoTable !==
    "function"
  ) {
    alert(
      "إضافة PDF لم يتم تحميلها."
    );

    return;
  }

  doc.autoTable({
    startY: 34,

    head: [[
      "#",
      "Student",
      "Score",
      "Submitted",
      "Status"
    ]],

    body: dataRows,

    styles: {
      fontSize: 9,
      cellPadding: 3
    },

    headStyles: {
      fontStyle: "bold"
    }
  });

  doc.save(
    `hasan-exam-results-${code}.pdf`
  );
}


/* =========================
   LOAD LAST EXAM
========================= */

function loadSavedExam() {
  const code =
    localStorage.getItem(
      "hasan_last_exam_code"
    );

  if (!code) return;

  if ($("resultsCode")) {
    $("resultsCode").value =
      code;
  }
}


/* =========================
   INITIAL STATE
========================= */

(function initTeacher() {
  hide("app");

  hide("createdExam");
  hide("detailsModal");

  renderQuestions();

  if ($("downloadPdfBtn")) {
    $("downloadPdfBtn").disabled =
      true;
  }
})();