const SUPABASE_URL =
  "https://zvvfjmadziyuwutdresz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";


/* =====================================================
   SUPABASE
===================================================== */

const client =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =====================================================
   HELPERS
===================================================== */

const $ = (id) =>
  document.getElementById(id);


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


/* =====================================================
   STATE
===================================================== */

let teacherUsername = "";
let teacherPassword = "";

let questions = [];

let lastResults = [];


/* =====================================================
   OPEN DASHBOARD
===================================================== */

function openDashboard() {

  hide("login");

  show("app");

  const app =
    $("app");

  if (app) {

    app.removeAttribute(
      "inert"
    );

    app.setAttribute(
      "aria-hidden",
      "false"
    );

  }

  document.body.classList.add(
    "authenticated"
  );

  loadSavedExam();

}


/* =====================================================
   LOGIN
===================================================== */

if ($("loginBtn")) {

  $("loginBtn").onclick =
    teacherLogin;

}


if ($("username")) {

  $("username").addEventListener(
    "keydown",
    (e) => {

      if (e.key === "Enter") {
        teacherLogin();
      }

    }
  );

}


if ($("password")) {

  $("password").addEventListener(
    "keydown",
    (e) => {

      if (e.key === "Enter") {
        teacherLogin();
      }

    }
  );

}


function teacherLogin() {

  const username =
    $("username")
      ?.value
      .trim() || "";

  const password =
    $("password")
      ?.value || "";


  if ($("loginError")) {
    $("loginError").textContent = "";
  }


  if (!username || !password) {

    if ($("loginError")) {

      $("loginError").textContent =
        "اكتب اسم المستخدم وكلمة المرور.";

    }

    return;
  }


  /*
    بيانات الدخول الحالية
  */

  if (
    username !== "Hasan" ||
    password !== "25808"
  ) {

    if ($("loginError")) {

      $("loginError").textContent =
        "اسم المستخدم أو كلمة المرور غير صحيحة.";

    }

    return;
  }


  teacherUsername =
    username;

  teacherPassword =
    password;


  sessionStorage.setItem(
    "hasan_teacher_username",
    username
  );

  sessionStorage.setItem(
    "hasan_teacher_password",
    password
  );


  openDashboard();

}


/* =====================================================
   AUTO LOGIN
===================================================== */

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const savedUsername =
      sessionStorage.getItem(
        "hasan_teacher_username"
      );

    const savedPassword =
      sessionStorage.getItem(
        "hasan_teacher_password"
      );


    if (
      savedUsername === "Hasan" &&
      savedPassword === "25808"
    ) {

      teacherUsername =
        savedUsername;

      teacherPassword =
        savedPassword;

      openDashboard();

    }


    renderQuestions();

    hide("createdExam");

    hide("detailsModal");


    if ($("downloadPdfBtn")) {

      $("downloadPdfBtn").disabled =
        true;

    }

  }
);


/* =====================================================
   LOGOUT
===================================================== */

if ($("logoutBtn")) {

  $("logoutBtn").onclick =
    () => {

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

}


/* =====================================================
   ADD QUESTION
===================================================== */

if ($("addQuestionBtn")) {

  $("addQuestionBtn").onclick =
    addQuestion;

}


function addQuestion() {

  questions.push({

    text: "",

    options: [
      "",
      "",
      "",
      ""
    ],

    correct_index: 0

  });


  renderQuestions();


  setTimeout(() => {

    const items =
      document.querySelectorAll(
        "[data-question-index]"
      );

    const last =
      items[items.length - 1];

    if (last) {

      last.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

    }

  }, 100);

}


/* =====================================================
   RENDER QUESTIONS
===================================================== */

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
        (q, qIndex) => {

          return `

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
                  حذف السؤال
                </button>

              </div>


              <textarea
                class="questionText"
                placeholder="اكتب نص السؤال..."
                oninput="
                  updateQuestionText(
                    ${qIndex},
                    this.value
                  )
                "
              >${esc(q.text)}</textarea>


              <div class="optionsGrid">

                ${q.options
                  .map(
                    (option, optionIndex) => {

                      return `

                        <div
                          class="optionEditor"
                        >

                          <label>
                            الاختيار
                            ${optionIndex + 1}
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


                          <label
                            class="correctOption"
                          >

                            <input
                              type="radio"
                              name="correct-${qIndex}"
                              ${
                                q.correct_index ===
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

                      `;

                    }
                  )
                  .join("")}

              </div>

            </div>

          `;

        }
      )
      .join("");

}


/* =====================================================
   QUESTION FUNCTIONS
===================================================== */

window.updateQuestionText =
  function (
    index,
    value
  ) {

    if (!questions[index])
      return;

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
      .options[optionIndex] =
      value;

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


    questions.splice(
      index,
      1
    );


    renderQuestions();

  };


/* =====================================================
   CREATE EXAM
===================================================== */

if ($("createExamBtn")) {

  $("createExamBtn").onclick =
    createExam;

}


async function createExam() {

  const title =
    $("examTitleInput")
      ?.value
      .trim() || "";


  const duration =
    Number(
      $("duration")
        ?.value
    );


  const availabilityDays =
    Number(
      $("availabilityDays")
        ?.value
    );


  const errorBox =
    $("createError");


  if (errorBox) {
    errorBox.textContent = "";
  }


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
      "اكتب مدة إتاحة صحيحة.";

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

    const q =
      questions[i];


    if (
      !q.text ||
      !q.text.trim()
    ) {

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
        !q.options[j] ||
        !q.options[j].trim()
      ) {

        errorBox.textContent =
          `الاختيار ${j + 1} في السؤال ${i + 1} فارغ.`;

        return;

      }

    }

  }


  const button =
    $("createExamBtn");

  const oldText =
    button.textContent;


  button.disabled = true;

  button.textContent =
    "جاري إنشاء الامتحان...";


  const cleanQuestions =
    questions.map(
      (q) => ({

        text:
          q.text.trim(),

        options:
          q.options.map(
            (option) =>
              option.trim()
          ),

        correct_index:
          q.correct_index

      })
    );


  try {

    const {
      data,
      error
    } = await client.rpc(
      "create_public_exam_with_expiry",
      {

        p_title:
          title,

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


    if (error) {

      console.error(
        "CREATE EXAM ERROR:",
        error
      );

      errorBox.textContent =
        error.message ||
        "حدث خطأ أثناء إنشاء الامتحان.";

      return;

    }


    const result =
      Array.isArray(data)
        ? data[0]
        : data;


    if (!result) {

      errorBox.textContent =
        "لم يتم إنشاء الامتحان.";

      return;

    }


    const code =
      result.code ||
      result.exam_code;


    const expiresAt =
      result.expires_at;


    if (!code) {

      console.error(
        "CREATE RESPONSE:",
        data
      );

      errorBox.textContent =
        "تم إنشاء الامتحان ولكن لم يتم استلام الكود.";

      return;

    }


    localStorage.setItem(
      "hasan_last_exam_code",
      code
    );


    if ($("createdCode")) {

      $("createdCode").textContent =
        code;

    }


    const basePath =
      location.pathname.replace(
        /teacher\.html$/,
        ""
      );


    const shareLink =
      `${location.origin}${basePath}index.html?exam=${encodeURIComponent(code)}`;


    if ($("shareLink")) {

      $("shareLink").value =
        shareLink;

    }


    if (
      expiresAt &&
      $("shareExpiry")
    ) {

      $("shareExpiry").textContent =
        "ينتهي الامتحان في: " +
        new Date(
          expiresAt
        ).toLocaleString(
          "ar-EG"
        );

    }


    show("createdExam");


  } catch (error) {

    console.error(error);

    errorBox.textContent =
      "حدث خطأ غير متوقع أثناء إنشاء الامتحان.";

  } finally {

    button.disabled = false;

    button.textContent =
      oldText;

  }

}


/* =====================================================
   COPY LINK
===================================================== */

if ($("copyLinkBtn")) {

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

      } catch {

        input.select();

        document.execCommand(
          "copy"
        );

      }


      const oldText =
        $("copyLinkBtn")
          .textContent;


      $("copyLinkBtn")
        .textContent =
        "تم النسخ ✅";


      setTimeout(() => {

        $("copyLinkBtn")
          .textContent =
          oldText;

      }, 1500);

    };

}


/* =====================================================
   NEW EXAM
===================================================== */

if ($("newExamBtn")) {

  $("newExamBtn").onclick =
    () => {

      questions = [];

      renderQuestions();


      if ($("examTitleInput")) {

        $("examTitleInput")
          .value = "";

      }


      if ($("duration")) {

        $("duration")
          .value = "";

      }


      if ($("availabilityDays")) {

        $("availabilityDays")
          .value = "1";

      }


      if ($("createError")) {

        $("createError")
          .textContent = "";

      }


      hide("createdExam");


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    };

}


/* =====================================================
   RESULTS
===================================================== */

if ($("loadResultsBtn")) {

  $("loadResultsBtn").onclick =
    loadResults;

}


async function loadResults() {

  const code =
    $("resultsCode")
      ?.value
      .trim() || "";


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

  const oldText =
    button.textContent;


  button.disabled = true;

  button.textContent =
    "جاري تحميل النتائج...";


  try {

    const {
      data,
      error
    } = await client.rpc(
      "teacher_public_results",
      {

        p_code:
          code,

        p_teacher_username:
          teacherUsername,

        p_teacher_password:
          teacherPassword

      }
    );


    if (error) {

      console.error(
        "RESULTS ERROR:",
        error
      );

      errorBox.textContent =
        error.message ||
        "تعذر تحميل النتائج.";

      return;

    }


    lastResults =
      Array.isArray(data)
        ? data
        : [];


    renderResults(
      lastResults
    );


    if ($("downloadPdfBtn")) {

      $("downloadPdfBtn").disabled =
        lastResults.length === 0;

    }

  } finally {

    button.disabled = false;

    button.textContent =
      oldText;

  }

}


/* =====================================================
   RENDER RESULTS
===================================================== */

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
                  ${esc(score)}
                </strong>
                /
                ${esc(total)}
              </td>

              <td>
                ${esc(submitted)}
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
                  onclick="showDetails(${index})"
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


/* =====================================================
   DETAILS
===================================================== */

window.showDetails =
  function (index) {

    const row =
      lastResults[index];

    if (!row) return;


    const modal =
      $("detailsModal");

    const content =
      $("modalContent");


    if (!modal || !content)
      return;


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


    content.innerHTML = `

      <div class="details">

        <h3>
          تفاصيل النتيجة
        </h3>

        <p>
          <strong>
            الطالب:
          </strong>

          ${esc(
            row.student_name
          )}
        </p>


        <p>

          <strong>
            الدرجة:
          </strong>

          ${esc(score)}
          /
          ${esc(total)}

        </p>


        <p>

          <strong>
            وقت التسليم:
          </strong>

          ${esc(submitted)}

        </p>

      </div>

    `;


    show("detailsModal");

  };


/* =====================================================
   CLOSE MODAL
===================================================== */

if ($("closeModalBtn")) {

  $("closeModalBtn").onclick =
    () => {

      hide(
        "detailsModal"
      );

    };

}


if ($("detailsModal")) {

  $("detailsModal").addEventListener(
    "click",
    (e) => {

      if (
        e.target ===
        $("detailsModal")
      ) {

        hide(
          "detailsModal"
        );

      }

    }
  );

}


/* =====================================================
   PDF
===================================================== */

if ($("downloadPdfBtn")) {

  $("downloadPdfBtn").onclick =
    downloadPDF;

}


function downloadPDF() {

  const code =
    $("resultsCode")
      ?.value
      .trim() || "";


  if (!code) {

    alert(
      "اكتب كود الامتحان أولًا."
    );

    return;

  }


  if (!lastResults.length) {

    alert(
      "لا توجد نتائج لتصديرها."
    );

    return;

  }


  if (
    !window.jspdf ||
    !window.jspdf.jsPDF
  ) {

    alert(
      "تعذر تحميل نظام PDF."
    );

    return;

  }


  const doc =
    new window.jspdf.jsPDF({

      orientation:
        "portrait",

      unit:
        "mm",

      format:
        "a4"

    });


  doc.setFontSize(18);

  doc.text(
    "Hasan Exam - Results",
    105,
    18,
    {
      align:
        "center"
    }
  );


  doc.setFontSize(11);

  doc.text(
    "Exam Code: " + code,
    105,
    26,
    {
      align:
        "center"
    }
  );


  const rows =
    lastResults.map(
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
                "en-GB"
              )
            : "-";


        return [

          String(index + 1),

          String(
            row.student_name ?? ""
          ),

          `${score} / ${total}`,

          submitted,

          row.submitted_at
            ? "Submitted"
            : "Not submitted"

        ];

      }
    );


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

    startY:
      34,

    head: [[

      "#",

      "Student",

      "Score",

      "Submitted",

      "Status"

    ]],

    body:
      rows,

    styles: {

      fontSize:
        9,

      cellPadding:
        3

    },

    headStyles: {

      fontStyle:
        "bold"

    }

  });


  doc.save(
    `hasan-exam-results-${code}.pdf`
  );

}


/* =====================================================
   SAVED EXAM
===================================================== */

function loadSavedExam() {

  const code =
    localStorage.getItem(
      "hasan_last_exam_code"
    );


  if (
    code &&
    $("resultsCode")
  ) {

    $("resultsCode").value =
      code;

  }

}