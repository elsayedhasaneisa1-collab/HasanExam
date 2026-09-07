const SUPABASE_URL = "https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

let exam = null;
let attemptId = null;
let questions = [];
let answers = [];
let current = 0;
let endAt = 0;
let timerId = null;
let submitted = false;

async function init() {
  const code = new URLSearchParams(location.search).get("exam");

  if (!code) {
    return fail("رابط الامتحان غير صحيح.");
  }

  $("loading").classList.remove("hidden");
  $("start").classList.add("hidden");

  const { data, error } = await client.rpc(
    "get_public_exam_with_expiry",
    {
      p_code: code
    }
  );

  if (error) {
    console.error(error);
    return fail("الامتحان غير موجود أو تم إغلاقه.");
  }

  /*
    الدالة الجديدة ترجع:
    {
      exam: {...},
      expires_at: "..."
    }
  */

  if (!data || !data.exam) {
    return fail("الامتحان غير موجود أو انتهت صلاحيته.");
  }

  exam = data.exam;

  $("examTitle").textContent = exam.title;

  $("examInfo").textContent =
    `${exam.question_count} سؤال • الوقت ${exam.duration_minutes} دقيقة`;

  $("loading").classList.add("hidden");
  $("start").classList.remove("hidden");
  $("startBtn").disabled = false;
}

function fail(message) {
  $("loading").classList.add("hidden");
  $("start").classList.remove("hidden");

  $("examTitle").textContent = "تعذر فتح الامتحان";
  $("examInfo").textContent = message;

  $("startBtn").disabled = true;
}

$("startBtn").onclick = startExam;

$("studentName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    startExam();
  }
});

async function startExam() {
  const name = $("studentName").value.trim();

  if (name.length < 2) {
    $("error").textContent = "اكتب اسمك أولًا 😊";
    return;
  }

  if (!exam || !exam.code) {
    $("error").textContent = "تعذر العثور على بيانات الامتحان.";
    return;
  }

  $("startBtn").disabled = true;
  $("error").textContent = "جاري بدء الامتحان...";

  const { data, error } = await client.rpc(
    "start_public_attempt_with_expiry",
    {
      p_code: exam.code,
      p_student_name: name
    }
  );

  if (error) {
    console.error(error);

    $("startBtn").disabled = false;

    $("error").textContent =
      error.message || "تعذر بدء الامتحان.";

    return;
  }

  if (!data || !data.attempt_id) {
    $("startBtn").disabled = false;
    $("error").textContent =
      "تعذر بدء الامتحان. حاول مرة أخرى.";

    return;
  }

  attemptId = data.attempt_id;

  questions = Array.isArray(data.questions)
    ? data.questions
    : [];

  if (!questions.length) {
    $("startBtn").disabled = false;
    $("error").textContent =
      "الامتحان لا يحتوي على أسئلة.";

    return;
  }

  answers = new Array(questions.length).fill(null);

  /*
    السيرفر هو المسؤول عن وقت الامتحان.
    نستخدم ends_at القادم من قاعدة البيانات.
  */

  endAt = new Date(data.ends_at).getTime();

  if (!Number.isFinite(endAt)) {
    $("startBtn").disabled = false;
    $("error").textContent =
      "حدث خطأ في توقيت الامتحان.";

    return;
  }

  $("start").classList.add("hidden");
  $("exam").classList.remove("hidden");

  $("liveTitle").textContent = exam.title;
  $("studentLabel").textContent =
    "الطالب: " + name;

  render();

  timerId = setInterval(updateTimer, 250);

  updateTimer();
}

function updateTimer() {
  if (!endAt || submitted) return;

  const left = Math.max(
    0,
    endAt - Date.now()
  );

  const seconds = Math.ceil(left / 1000);

  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;

  $("timer").textContent =
    String(minutes).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0");

  if (left <= 0) {
    clearInterval(timerId);
    submitExam(true);
  }
}

function render() {
  const q = questions[current];

  if (!q) return;

  $("qmeta").textContent =
    `السؤال ${current + 1} من ${questions.length}`;

  const options = Array.isArray(q.options)
    ? q.options
    : [];

  $("question").innerHTML =
    `<div class="q">${esc(q.text || q.question_text || "")}</div>` +
    options
      .map((option, index) => {
        return `
          <button
            class="option ${
              answers[current] === index
                ? "selected"
                : ""
            }"
            data-index="${index}"
            type="button"
          >
            ${esc(option)}
          </button>
        `;
      })
      .join("");

  document
    .querySelectorAll(".option")
    .forEach((button) => {
      button.onclick = () => {
        if (submitted) return;

        answers[current] =
          Number(button.dataset.index);

        render();
      };
    });

  const progress =
    ((current + 1) / questions.length) * 100;

  $("progress").style.width =
    progress + "%";

  $("prev").disabled =
    current === 0;

  $("next").classList.toggle(
    "hidden",
    current === questions.length - 1
  );

  $("submit").classList.toggle(
    "hidden",
    current !== questions.length - 1
  );
}

$("prev").onclick = () => {
  if (submitted) return;

  if (current > 0) {
    current--;
    render();
  }
};

$("next").onclick = () => {
  if (submitted) return;

  if (current < questions.length - 1) {
    current++;
    render();
  }
};

$("submit").onclick = () => {
  submitExam(false);
};

async function submitExam(autoSubmit = false) {
  if (submitted) return;

  submitted = true;

  if (timerId) {
    clearInterval(timerId);
  }

  const payload = questions.map((q, index) => ({
    question_id: q.id,
    selected_index: answers[index]
  }));

  $("exam").classList.add("hidden");
  $("result").classList.remove("hidden");

  $("score").innerHTML =
    "<p>جاري تسليم الامتحان وحساب الدرجة...</p>";

  const { data, error } = await client.rpc(
    "submit_public_attempt",
    {
      p_attempt_id: attemptId,
      p_answers: payload
    }
  );

  if (error) {
    console.error(error);

    $("score").innerHTML = `
      <p class="error">
        حدث خطأ أثناء التسليم:
        ${esc(error.message)}
      </p>
    `;

    return;
  }

  const score =
    data && data.score != null
      ? data.score
      : 0;

  const total =
    data && data.total != null
      ? data.total
      : questions.length;

  $("score").innerHTML = `
    <div style="
      font-size:30px;
      font-weight:900;
      margin-bottom:10px;
    ">
      ${score} / ${total}
    </div>

    <p>
      ${
        autoSubmit
          ? "⏰ انتهى الوقت وتم التسليم تلقائيًا."
          : "🎉 تم التسليم بنجاح."
      }
    </p>
  `;
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

init();