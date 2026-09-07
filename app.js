const SUPABASE_URL =
    "https://zvvfjmadziyuwutdresz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";

const client =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const $ =
    id => document.getElementById(id);


let exam = null;
let attemptId = null;
let questions = [];
let answers = [];
let current = 0;
let endAt = 0;
let timerId = null;
let submitted = false;


/* ============================================================
   INIT
============================================================ */

async function init() {

    const code =
        new URLSearchParams(
            location.search
        ).get("exam");


    if (!code) {

        fail(
            "رابط الامتحان غير صحيح."
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await client.rpc(
                "get_public_exam_with_expiry",
                {
                    p_code: code
                }
            );


        if (error) {

            fail(
                readableError(error)
            );

            return;
        }


        if (
            !data ||
            !data.exam
        ) {

            fail(
                "الامتحان غير موجود أو تم إغلاقه."
            );

            return;
        }


        exam =
            data.exam;


        $("examTitle")
            .textContent =
                exam.title ||
                "امتحان اللغة العربية";


        $("examInfo")
            .textContent =
                `${exam.question_count} سؤال • الوقت ${exam.duration_minutes} دقيقة`;


        $("loading")
            .classList
            .add("hidden");


        $("start")
            .classList
            .remove("hidden");


        $("startBtn")
            .disabled = false;

    } catch (error) {

        console.error(error);

        fail(
            "تعذر الاتصال بالخادم."
        );
    }
}


/* ============================================================
   FAIL
============================================================ */

function fail(message) {

    $("loading")
        .classList
        .add("hidden");


    $("start")
        .classList
        .remove("hidden");


    $("examTitle")
        .textContent =
            "تعذر فتح الامتحان";


    $("examInfo")
        .textContent =
            message;


    $("startBtn")
        .disabled = true;
}


/* ============================================================
   ERROR MESSAGE
============================================================ */

function readableError(error) {

    const message =
        error?.message ||
        "حدث خطأ غير معروف.";


    if (
        message.includes(
            "انتهت صلاحية"
        )
    ) {

        return (
            "⛔ انتهت صلاحية هذا الامتحان " +
            "ولا يمكن الدخول إليه."
        );
    }


    if (
        message.includes(
            "لا يمكن بدء"
        )
    ) {

        return (
            "⛔ انتهت صلاحية هذا الامتحان " +
            "ولا يمكن بدء محاولة جديدة."
        );
    }


    if (
        message.includes(
            "لم يبدأ"
        )
    ) {

        return (
            "⏳ الامتحان لم يبدأ بعد."
        );
    }


    if (
        message.includes(
            "غير موجود"
        )
    ) {

        return (
            "❌ الامتحان غير موجود."
        );
    }


    if (
        message.includes(
            "انتهى وقت"
        )
    ) {

        return (
            "⏰ انتهى وقت الامتحان."
        );
    }


    return message;
}


/* ============================================================
   START BUTTON
============================================================ */

$("startBtn")
    .onclick =
        startExam;


$("studentName")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                startExam();
            }

        }
    );


/* ============================================================
   START EXAM
============================================================ */

async function startExam() {

    const name =
        $("studentName")
            .value
            .trim();


    if (name.length < 2) {

        $("error")
            .textContent =
                "اكتب اسمك أولًا 😊";

        return;
    }


    if (
        !exam ||
        !exam.code
    ) {

        $("error")
            .textContent =
                "بيانات الامتحان غير متاحة.";

        return;
    }


    $("startBtn")
        .disabled = true;


    $("error")
        .textContent =
            "جاري بدء الامتحان...";


    try {

        const {
            data,
            error
        } =
            await client.rpc(
                "start_public_attempt_with_expiry",
                {
                    p_code:
                        exam.code,

                    p_student_name:
                        name
                }
            );


        if (error) {

            $("startBtn")
                .disabled = false;


            $("error")
                .textContent =
                    readableError(error);

            return;
        }


        if (
            !data ||
            !data.attempt_id
        ) {

            $("startBtn")
                .disabled = false;


            $("error")
                .textContent =
                    "تعذر إنشاء محاولة الامتحان.";

            return;
        }


        attemptId =
            data.attempt_id;


        questions =
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];


        if (
            questions.length === 0
        ) {

            $("startBtn")
                .disabled = false;


            $("error")
                .textContent =
                    "الامتحان لا يحتوي على أسئلة.";

            return;
        }


        answers =
            new Array(
                questions.length
            ).fill(null);


        endAt =
            new Date(
                data.ends_at
            ).getTime();


        if (
            !Number.isFinite(
                endAt
            )
        ) {

            $("startBtn")
                .disabled = false;


            $("error")
                .textContent =
                    "تعذر تحديد وقت انتهاء الامتحان.";

            return;
        }


        $("start")
            .classList
            .add("hidden");


        $("exam")
            .classList
            .remove("hidden");


        $("liveTitle")
            .textContent =
                exam.title;


        $("studentLabel")
            .textContent =
                "الطالب: " + name;


        render();


        timerId =
            setInterval(
                updateTimer,
                250
            );


        updateTimer();

    } catch (error) {

        console.error(error);


        $("startBtn")
            .disabled = false;


        $("error")
            .textContent =
                "تعذر الاتصال بالخادم.";
    }
}


/* ============================================================
   TIMER
============================================================ */

function updateTimer() {

    if (!endAt) {
        return;
    }


    const left =
        Math.max(
            0,
            endAt - Date.now()
        );


    const seconds =
        Math.ceil(
            left / 1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const sec =
        seconds % 60;


    $("timer")
        .textContent =
            String(minutes)
                .padStart(2, "0")
            +
            ":"
            +
            String(sec)
                .padStart(2, "0");


    if (
        left <= 0
    ) {

        clearInterval(
            timerId
        );


        submitExam(true);
    }
}


/* ============================================================
   RENDER QUESTION
============================================================ */

function render() {

    const question =
        questions[current];


    if (!question) {
        return;
    }


    $("qmeta")
        .textContent =
            `السؤال ${current + 1} من ${questions.length}`;


    $("question")
        .innerHTML =
            `
            <div class="q">
                ${esc(question.text)}
            </div>

            ${
                question.options
                    .map(
                        (option, index) =>
                            `
                            <button
                                class="option ${
                                    answers[current] === index
                                        ? "selected"
                                        : ""
                                }"
                                data-index="${index}"
                            >
                                ${esc(option)}
                            </button>
                            `
                    )
                    .join("")
            }
            `;


    document
        .querySelectorAll(
            ".option"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        if (
                            submitted
                        ) {
                            return;
                        }


                        answers[current] =
                            Number(
                                button.dataset.index
                            );


                        render();
                    };

            }
        );


    $("progress")
        .style
        .width =
            (
                (
                    current + 1
                )
                /
                questions.length
                *
                100
            )
            + "%";


    $("prev")
        .disabled =
            current === 0;


    $("next")
        .classList
        .toggle(
            "hidden",
            current ===
                questions.length - 1
        );


    $("submit")
        .classList
        .toggle(
            "hidden",
            current !==
                questions.length - 1
        );
}


/* ============================================================
   NAVIGATION
============================================================ */

$("prev")
    .onclick =
        () => {

            if (
                current > 0
            ) {

                current--;

                render();
            }
        };


$("next")
    .onclick =
        () => {

            if (
                current <
                questions.length - 1
            ) {

                current++;

                render();
            }
        };


$("submit")
    .onclick =
        () =>
            submitExam(false);


/* ============================================================
   SUBMIT
============================================================ */

async function submitExam(
    automatic = false
) {

    if (submitted) {
        return;
    }


    submitted = true;


    clearInterval(
        timerId
    );


    const payload =
        questions.map(
            (question, index) => ({
                question_id:
                    question.id,

                selected_index:
                    answers[index]
            })
        );


    $("exam")
        .classList
        .add("hidden");


    $("result")
        .classList
        .remove("hidden");


    $("score")
        .innerHTML =
            "<p>جاري تسليم الامتحان وحساب الدرجة...</p>";


    try {

        const {
            data,
            error
        } =
            await client.rpc(
                "submit_public_attempt",
                {
                    p_attempt_id:
                        attemptId,

                    p_answers:
                        payload
                }
            );


        if (error) {

            $("score")
                .innerHTML =
                    `
                    <p class="error">
                        ${esc(
                            readableError(
                                error
                            )
                        )}
                    </p>
                    `;

            return;
        }


        const score =
            Number(
                data?.score || 0
            );


        const total =
            Number(
                data?.total ||
                questions.length
            );


        $("score")
            .innerHTML =
                `
                <div
                    style="
                        font-size:30px;
                        font-weight:900;
                    "
                >
                    ${score} / ${total}
                </div>

                <p>
                    ${
                        automatic
                            ? "⏰ انتهى الوقت وتم التسليم تلقائيًا."
                            : "🎉 تم التسليم بنجاح."
                    }
                </p>
                `;

    } catch (error) {

        console.error(error);


        $("score")
            .innerHTML =
                `
                <p class="error">
                    حدث خطأ أثناء تسليم الامتحان.
                </p>
                `;
    }
}


/* ============================================================
   ESCAPE
============================================================ */

function esc(value) {

    return String(
        value ?? ""
    )
        .replace(
            /[&<>"']/g,
            character =>
                ({
                    "&":
                        "&amp;",

                    "<":
                        "&lt;",

                    ">":
                        "&gt;",

                    '"':
                        "&quot;",

                    "'":
                        "&#039;"
                }[character])
        );
}


/* ============================================================
   START
============================================================ */

init();