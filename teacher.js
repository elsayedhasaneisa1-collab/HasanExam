const SUPABASE_URL =
    "https://zvvfjmadziyuwutdresz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";


const $ =
    id =>
        document.getElementById(id);


let rows = [];

let q = 0;


/*
 * بيانات المدرس في الذاكرة فقط
 */
let teacherUsername = "";
let teacherPassword = "";


/* =========================================================
   RPC
========================================================= */

async function rpc(
    functionName,
    body = {}
) {

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_KEY,

                    "Authorization":
                        "Bearer " +
                        SUPABASE_KEY
                },

                body:
                    JSON.stringify(body)
            }
        );


    const text =
        await response.text();


    if (!response.ok) {

        let message =
            text ||
            "حدث خطأ في الخادم.";


        try {

            const json =
                JSON.parse(text);


            message =
                json.message ||
                json.error_description ||
                json.error ||
                message;

        } catch (_) {}


        throw new Error(
            message
        );

    }


    if (!text) {
        return null;
    }


    return JSON.parse(text);

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
   NORMALIZE
========================================================= */

function normalizeResult(
    value
) {

    const result =
        value || {};


    return {

        name:
            String(
                result.student_name ??
                result.name ??
                result.student ??
                "اسم الطالب غير متاح"
            ),

        exam:
            String(
                result.exam_title ??
                result.title ??
                result.exam ??
                "امتحان"
            ),

        score:
            Number(
                result.score ??
                result.correct ??
                0
            ),

        total:
            Number(
                result.total_questions ??
                result.total ??
                0
            )

    };

}


/* =========================================================
   PERCENTAGE
========================================================= */

function percentage(
    value
) {

    const result =
        normalizeResult(
            value
        );


    if (
        result.total <= 0
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                result.score /
                result.total *
                100
            )
        )
    );

}


/* =========================================================
   MENU
========================================================= */

function openMenu() {

    $("menu")
        ?.classList
        .add("open");


    $("overlay")
        ?.classList
        .add("open");

}


function closeMenu() {

    $("menu")
        ?.classList
        .remove("open");


    $("overlay")
        ?.classList
        .remove("open");

}


$("hamb").onclick =
    openMenu;


$("close").onclick =
    closeMenu;


$("overlay").onclick =
    closeMenu;


/* =========================================================
   PAGES
========================================================= */

function showPage(
    pageId
) {

    document
        .querySelectorAll(".page")
        .forEach(
            element =>
                element
                    .classList
                    .add("hidden")
        );


    const target =
        $(pageId);


    if (target) {

        target
            .classList
            .remove("hidden");

    }


    document
        .querySelectorAll(".nav")
        .forEach(
            button =>
                button
                    .classList
                    .toggle(
                        "active",
                        button.dataset.page ===
                            pageId
                    )
        );


    closeMenu();


    if (
        pageId ===
        "results"
    ) {

        loadResults();

    }

}


document
    .querySelectorAll(".nav")
    .forEach(
        button => {

            button.onclick =
                () =>
                    showPage(
                        button.dataset.page
                    );

        }
    );


document
    .querySelectorAll("[data-go]")
    .forEach(
        button => {

            button.onclick =
                () =>
                    showPage(
                        button.dataset.go
                    );

        }
    );


/* =========================================================
   LOGIN
========================================================= */

$("loginForm")
    .onsubmit =
        async event => {

            event.preventDefault();


            const username =
                $("user")
                    .value
                    .trim();


            const password =
                $("pass")
                    .value;


            $("err")
                .textContent = "";


            if (
                !username ||
                !password
            ) {

                $("err")
                    .textContent =
                        "اكتب اسم المستخدم وكلمة المرور.";

                return;

            }


            if (
                username !== "Hasan" ||
                password !== "25808"
            ) {

                $("err")
                    .textContent =
                        "بيانات الدخول غير صحيحة.";

                return;

            }


            teacherUsername =
                username;


            teacherPassword =
                password;


            startTeacherPanel();

        };


/* =========================================================
   LOGOUT
========================================================= */

$("logout")
    .onclick =
        () => {

            teacherUsername = "";

            teacherPassword = "";

            rows = [];

            localStorage.removeItem(
                "hasan_last_exam_code"
            );

            location.reload();

        };


/* =========================================================
   REFRESH
========================================================= */

$("refresh")
    .onclick =
        loadResults;


$("refreshTop")
    .onclick =
        loadResults;


$("search")
    .oninput =
        renderResults;


$("order")
    .onchange =
        renderResults;


/* =========================================================
   RESULT CARD
========================================================= */

function resultCard(
    raw
) {

    const result =
        normalizeResult(
            raw
        );


    const percent =
        percentage(
            raw
        );


    const wrong =
        Math.max(
            0,
            result.total -
            result.score
        );


    const initial =
        result.name
            .trim()
            .charAt(0) ||
        "ط";


    return `

        <div
            class="result"
            data-index="${rows.indexOf(raw)}"
        >

            <div class="result-avatar">
                ${esc(initial)}
            </div>


            <div>

                <div class="name">
                    ${esc(result.name)}
                </div>

                <div class="exam">
                    ${esc(result.exam)}
                </div>

            </div>


            <div class="rstat">

                <b>
                    ${result.score} / ${result.total}
                </b>

                إجابات صحيحة

            </div>


            <div class="rstat">

                <b>
                    ${wrong}
                </b>

                إجابات خاطئة

            </div>


            <div class="rpercent">
                ${percent}%
            </div>

        </div>

    `;

}


/* =========================================================
   TOP STUDENT
========================================================= */

function topCard(
    raw,
    index
) {

    const result =
        normalizeResult(
            raw
        );


    const percent =
        percentage(
            raw
        );


    return `

        <article class="student">

            <div
                class="rank ${
                    index === 0
                        ? "one"
                        : ""
                }"
            >
                ${index + 1}
            </div>


            <div class="name">
                ${esc(result.name)}
            </div>


            <div class="exam">
                ${esc(result.exam)}
            </div>


            <div class="meter">

                <i
                    style="width:${percent}%"
                ></i>

            </div>


            <div class="scoreline">

                <span>
                    ${result.score} من ${result.total}
                </span>

                <b>
                    ${percent}%
                </b>

            </div>

        </article>

    `;

}


/* =========================================================
   RENDER RESULTS
========================================================= */

function renderResults() {

    const search =
        $("search")
            .value
            .trim()
            .toLowerCase();


    let filtered =
        rows.filter(
            item =>
                normalizeResult(
                    item
                )
                    .name
                    .toLowerCase()
                    .includes(search)
        );


    filtered.sort(
        (a, b) =>
            $("order").value === "desc"

                ? percentage(b) -
                  percentage(a)

                : percentage(a) -
                  percentage(b)
    );


    $("resultsList")
        .innerHTML =

        filtered.length

            ? filtered
                .map(
                    resultCard
                )
                .join("")

            :

            `
                <div class="student">
                    لا توجد نتائج مطابقة.
                </div>
            `;


    document
        .querySelectorAll(
            ".result"
        )
        .forEach(
            element => {

                element.onclick =
                    () => {

                        const index =
                            Number(
                                element.dataset.index
                            );


                        showDetails(
                            rows[index]
                        );

                    };

            }
        );

}


/* =========================================================
   DETAILS
========================================================= */

function showDetails(
    raw
) {

    const result =
        normalizeResult(
            raw
        );


    const percent =
        percentage(
            raw
        );


    const wrong =
        Math.max(
            0,
            result.total -
            result.score
        );


    $("modalName")
        .textContent =
            result.name;


    $("modalBody")
        .innerHTML =

        `

        <div class="modal-stat">

            <div>

                <small>
                    الامتحان
                </small>

                <b>
                    ${esc(result.exam)}
                </b>

            </div>


            <div>

                <small>
                    النسبة
                </small>

                <b>
                    ${percent}%
                </b>

            </div>


            <div>

                <small>
                    الإجابات الصحيحة
                </small>

                <b>
                    ${result.score}
                </b>

            </div>


            <div>

                <small>
                    الإجابات الخاطئة
                </small>

                <b>
                    ${wrong}
                </b>

            </div>


            <div>

                <small>
                    الدرجة
                </small>

                <b>
                    ${result.score} /
                    ${result.total}
                </b>

            </div>


            <div>

                <small>
                    التقييم
                </small>

                <b>

                    ${
                        percent >= 90
                            ? "ممتاز 🏆"

                            : percent >= 75
                                ? "جيد جدًا ⭐"

                                : percent >= 50
                                    ? "جيد 👍"

                                    : "يحتاج مراجعة 📚"
                    }

                </b>

            </div>

        </div>

        `;

}


$("modalClose")
    .onclick =
        () =>
            $("detailsModal")
                .classList
                .add("hidden");


$("detailsModal")
    .onclick =
        event => {

            if (
                event.target.id ===
                "detailsModal"
            ) {

                $("detailsModal")
                    .classList
                    .add("hidden");

            }

        };


/* =========================================================
   PDF
========================================================= */

$("downloadPdf")
    .onclick =
        () => {

            if (
                rows.length === 0
            ) {

                alert(
                    "لا توجد نتائج لتنزيلها."
                );

                return;

            }


            const jsPDF =
                window.jspdf?.jsPDF;


            if (!jsPDF) {

                alert(
                    "أداة PDF لم يتم تحميلها."
                );

                return;

            }


            const doc =
                new jsPDF({

                    orientation:
                        "landscape",

                    unit:
                        "pt",

                    format:
                        "a4"

                });


            doc.setFontSize(
                20
            );


            doc.text(
                "Hasan Eissa - Student Results",
                40,
                45
            );


            doc.setFontSize(
                10
            );


            doc.text(
                new Date()
                    .toLocaleString(
                        "en-GB"
                    ),
                40,
                63
            );


            const data =
                rows
                    .slice()
                    .sort(
                        (a, b) =>
                            percentage(b) -
                            percentage(a)
                    )
                    .map(
                        (item, index) => {

                            const result =
                                normalizeResult(
                                    item
                                );


                            return [

                                index + 1,

                                result.name,

                                result.exam,

                                `${result.score}/${result.total}`,

                                Math.max(
                                    0,
                                    result.total -
                                    result.score
                                ),

                                `${percentage(item)}%`

                            ];

                        }
                    );


            if (
                typeof doc.autoTable !==
                "function"
            ) {

                alert(
                    "إضافة PDF غير جاهزة. تأكد من تحميل AutoTable."
                );

                return;

            }


            doc.autoTable({

                startY:
                    80,

                head:
                    [[
                        "#",
                        "Student",
                        "Exam",
                        "Score",
                        "Wrong",
                        "Percentage"
                    ]],

                body:
                    data,

                theme:
                    "grid",

                styles:
                    {
                        fontSize:
                            9,

                        cellPadding:
                            6
                    },

                headStyles:
                    {
                        fillColor:
                            [
                                22,
                                70,
                                110
                            ],

                        textColor:
                            255
                    }

            });


            doc.save(
                "Hasan-Eissa-Results.pdf"
            );

        };


/* =========================================================
   LOAD RESULTS
========================================================= */

async function loadResults() {

    if (
        !teacherUsername ||
        !teacherPassword
    ) {

        return;

    }


    try {

        const code =
            localStorage.getItem(
                "hasan_last_exam_code"
            );


        const data =
            await rpc(
                "teacher_public_results",
                {

                    p_code:
                        code || null,

                    p_teacher_username:
                        teacherUsername,

                    p_teacher_password:
                        teacherPassword

                }
            );


        rows =
            Array.isArray(data)
                ? data
                : [];


        const percentages =
            rows.map(
                percentage
            );


        const average =
            percentages.length

                ? Math.round(
                    percentages.reduce(
                        (
                            a,
                            b
                        ) =>
                            a + b,
                        0
                    )
                    /
                    percentages.length
                )

                : 0;


        const highest =
            percentages.length

                ? Math.max(
                    ...percentages
                )

                : 0;


        const highestIndex =
            percentages.findIndex(
                value =>
                    value ===
                    highest
            );


        $("total")
            .textContent =
                rows.length;


        $("count")
            .textContent =
                rows.length;


        $("avg")
            .textContent =
                average + "%";


        $("high")
            .textContent =
                highest + "%";


        $("highName")
            .textContent =

            highestIndex >= 0

                ? normalizeResult(
                    rows[
                        highestIndex
                    ]
                ).name

                : "—";


        const sorted =
            rows
                .slice()
                .sort(
                    (a, b) =>
                        percentage(b) -
                        percentage(a)
                );


        $("topStudents")
            .innerHTML =

            sorted
                .slice(
                    0,
                    3
                )
                .map(
                    topCard
                )
                .join("")

            ||

            `
                <div class="student">
                    لا توجد نتائج حتى الآن.
                </div>
            `;


        renderResults();

    } catch (error) {

        console.error(
            error
        );


        $("topStudents")
            .innerHTML =

            `
                <div class="student">
                    تعذر تحميل النتائج من الخادم.
                </div>
            `;

    }

}


/* =========================================================
   ADD QUESTION
========================================================= */

function addQuestion() {

    q++;


    const container =
        document.createElement(
            "div"
        );


    container.className =
        "question";


    container.innerHTML =

        `

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
            placeholder="اكتب السؤال هنا"
        >


        <label>
            الاختيارات — اختر الإجابة الصحيحة
        </label>


        <div class="opts">

            ${
                [0,1,2,3]
                    .map(
                        index =>

                            `

                            <div class="opt">

                                <input
                                    type="radio"
                                    name="question_${q}"
                                    value="${index}"
                                    ${
                                        index === 0
                                            ? "checked"
                                            : ""
                                    }
                                >

                                <input
                                    class="qo"
                                    placeholder="الاختيار ${index + 1}"
                                >

                            </div>

                            `
                    )
                    .join("")
            }

        </div>

        `;


    container
        .querySelector(
            ".remove"
        )
        .onclick =
            () =>
                container.remove();


    $("questions")
        .append(
            container
        );

}


$("addQ")
    .onclick =
        addQuestion;


/* =========================================================
   CREATE EXAM
========================================================= */

$("createExam")
    .onclick =
        async () => {

            try {

                const title =
                    $("examTitle")
                        .value
                        .trim()
                    ||
                    "امتحان اللغة العربية";


                const duration =
                    Number(
                        $("duration")
                            .value
                    );


                const availabilityDays =
                    Number(
                        $("availabilityDays")
                            .value
                    );


                const elements =
                    [
                        ...
                        document
                            .querySelectorAll(
                                ".question"
                            )
                    ];


                if (
                    elements.length === 0
                ) {

                    throw new Error(
                        "أضف سؤالًا واحدًا على الأقل."
                    );

                }


                const questions =
                    elements.map(
                        element => {

                            const selected =
                                element.querySelector(
                                    'input[type="radio"]:checked'
                                );


                            const text =
                                element
                                    .querySelector(
                                        ".qt"
                                    )
                                    .value
                                    .trim();


                            const options =
                                [
                                    ...
                                    element
                                        .querySelectorAll(
                                            ".qo"
                                        )
                                ]
                                    .map(
                                        input =>
                                            input
                                                .value
                                                .trim()
                                    );


                            return {

                                text,

                                options,

                                correct_index:
                                    selected
                                        ? Number(
                                            selected.value
                                        )
                                        : 0

                            };

                        }
                    );


                if (
                    duration < 1 ||
                    duration > 1440
                ) {

                    throw new Error(
                        "مدة حل الامتحان يجب أن تكون بين 1 و1440 دقيقة."
                    );

                }


                if (
                    availabilityDays <= 0 ||
                    availabilityDays > 365
                ) {

                    throw new Error(
                        "مدة إتاحة الامتحان يجب أن تكون أكبر من صفر وأقل من 365 يوم."
                    );

                }


                if (
                    questions.some(
                        question =>
                            !question.text ||
                            question.options.length !== 4 ||
                            question.options.some(
                                option =>
                                    !option
                            )
                    )
                ) {

                    throw new Error(
                        "أكمل بيانات جميع الأسئلة والاختيارات."
                    );

                }


                $("createExam")
                    .disabled = true;


                $("createExam")
                    .textContent =
                        "جاري إنشاء الامتحان...";


                const data =
                    await rpc(
                        "create_public_exam_with_expiry",
                        {

                            p_title:
                                title,

                            p_duration_minutes:
                                duration,

                            p_questions:
                                questions,

                            p_availability_days:
                                availabilityDays,

                            p_teacher_username:
                                teacherUsername,

                            p_teacher_password:
                                teacherPassword

                        }
                    );


                const result =
                    Array.isArray(data)
                        ? data[0]
                        : data;


                if (
                    !result?.code
                ) {

                    throw new Error(
                        "لم يتم إنشاء الامتحان."
                    );

                }


                const code =
                    result.code;


                localStorage.setItem(
                    "hasan_last_exam_code",
                    code
                );


                const studentUrl =
                    `${location.origin}${location.pathname.replace(
                        /teacher\.html$/i,
                        "index.html"
                    )}?exam=${encodeURIComponent(
                        code
                    )}`;


                $("examLink")
                    .value =
                        studentUrl;


                if (
                    result.expires_at
                ) {

                    $("shareExpiry")
                        .textContent =

                        `⏰ ينتهي فتح الامتحان في: ${
                            new Date(
                                result.expires_at
                            ).toLocaleString(
                                "ar-EG"
                            )
                        }`;

                }


                $("share")
                    .classList
                    .remove("hidden");


                $("createExam")
                    .disabled = false;


                $("createExam")
                    .textContent =
                        "إنشاء الامتحان";


                alert(
                    "تم إنشاء الامتحان بنجاح 🎉"
                );


                await loadResults();

            } catch (error) {

                console.error(
                    error
                );


                alert(
                    cleanError(
                        error.message
                    )
                );


                $("createExam")
                    .disabled = false;


                $("createExam")
                    .textContent =
                        "إنشاء الامتحان";

            }

        };


/* =========================================================
   COPY
========================================================= */

$("copy")
    .onclick =
        async () => {

            const link =
                $("examLink")
                    .value;


            if (!link) {
                return;
            }


            try {

                await navigator
                    .clipboard
                    .writeText(
                        link
                    );


                $("copy")
                    .textContent =
                        "تم ✓";


                setTimeout(
                    () => {

                        $("copy")
                            .textContent =
                                "نسخ";

                    },
                    1200
                );

            } catch (_) {

                $("examLink")
                    .select();


                document
                    .execCommand(
                        "copy"
                    );

            }

        };


/* =========================================================
   ERROR
========================================================= */

function cleanError(
    message
) {

    return String(
        message || ""
    )
        .replace(
            /^Error:\s*/i,
            ""
        );

}


/* =========================================================
   START PANEL
========================================================= */

function startTeacherPanel() {

    $("login")
        .classList
        .add("hidden");


    $("app")
        .classList
        .remove("hidden");


    $("app")
        .setAttribute(
            "aria-hidden",
            "false"
        );


    $("app")
        .removeAttribute(
            "inert"
        );


    document.body
        .classList
        .add(
            "authenticated"
        );


    if (
        !document.querySelector(
            ".question"
        )
    ) {

        addQuestion();

    }


    loadResults();

}