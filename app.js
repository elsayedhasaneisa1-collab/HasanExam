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
    id =>
        document.getElementById(id);


let exam = null;
let attemptId = null;
let questions = [];
let answers = [];
let current = 0;

let endAt = 0;
let timerId = null;

let submitted = false;


/* =========================================================
   INIT
========================================================= */

async function init() {

    const code =
        new URLSearchParams(
            location.search
        ).get("exam");


    if (!code) {

        return fail(
            "رابط الامتحان غير صحيح."
        );

    }


    try {

        const { data, error } =
            await client.rpc(
                "get_public_exam_with_expiry",
                {
                    p_code: code
                }
            );


        if (error) {

            throw error;

        }


        if (!data || !data.exam) {

            throw new Error(
                "الامتحان غير موجود."
            );

        }


        exam =
            data.exam;


        $("examTitle")
            .textContent =
                exam.title;


        $("examInfo")
            .textContent =
                `${exam.question_count} سؤال • الوقت ${exam.duration_minutes} دقيقة`;


        if (data.expires_at) {

            const expiry =
                new Date(
                    data.expires_at
                );


            const notice =
                document.createElement(
                    "div"
                );


            notice.className =
                "notice";


            notice.textContent =
                `⏰ متاح حتى ${expiry.toLocaleString("ar-EG")}`;


            $("examInfo")
                .after(notice);
        }


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
            cleanError(
                error.message
            )
        );

    }
}


/* =========================================================
   FAIL
========================================================= */

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


/* =========================================================
   START
========================================================= */

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


    if (!exam) {

        return;

    }


    $("startBtn")
        .disabled = true;


    $("error")
        .textContent =
            "جاري بدء الامتحان...";


    try {

        const { data, error } =
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

            throw error;

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

            throw new Error(
                "الامتحان لا يحتوي على أسئلة."
            );

        }


        answers =
            new Array(
                questions.length
            ).fill(null);


        endAt =
            new Date(
                data.ends_at
            ).getTime();


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
                cleanError(
                    error.message
                );

    }

}


/* =========================================================
   TIMER
========================================================= */

function updateTimer() {

    const left =
        Math.max(
            0,
            endAt -
            Date.now()
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
            String(
                minutes
            ).padStart(
                2,
                "0"
            )
            +
            ":"
            +
            String(
                sec
            ).padStart(
                2,
                "0"
            );


    if (
        left <= 0
    ) {

        clearInterval(
            timerId
        );


        submitExam(
            true
        );

    }

}


/* =========================================================
   RENDER
========================================================= */

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

        ${question.options
            .map(
                (option, index) =>

                    `
                    <button
                        type="button"
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
            +
            "%";


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


/* =========================================================
   NAVIGATION
========================================================= */

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


/* =========================================================
   SUBMIT
========================================================= */

async function submitExam(
    automatic
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

        const { data, error } =
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

            throw error;

        }


        $("score")
            .innerHTML =

            `
            <div
                style="
                    font-size:30px;
                    font-weight:900;
                "
            >
                ${data.score} / ${data.total}
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
                حدث خطأ أثناء تسليم الامتحان:
                ${esc(error.message)}
            </p>
            `;

    }

}


/* =========================================================
   ESCAPE
========================================================= */

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


/* =========================================================
   ERROR
========================================================= */

function cleanError(
    message
) {

    const text =
        String(
            message || ""
        );


    return text
        .replace(
            /^Error:\s*/i,
            ""
        );

}


init();