const SUPABASE_URL="https://zvvfjmadziyuwutdresz.supabase.co";
const SUPABASE_KEY="sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
let exam=null,attemptId=null,questions=[],answers=[],current=0,endAt=0,timerId=null,submitted=false;

async function init(){
 const code=new URLSearchParams(location.search).get("exam");
 if(!code){return fail("رابط الامتحان غير صحيح.")}
 const {data,error}=await client.rpc("get_public_exam",{p_code:code});
 if(error||!data?.length){return fail("الامتحان غير موجود أو تم إغلاقه.")}
 exam=data[0];
 $("examTitle").textContent=exam.title;
 $("examInfo").textContent=`${exam.question_count} سؤال • الوقت ${exam.duration_minutes} دقيقة`;
 $("loading").classList.add("hidden");$("start").classList.remove("hidden");$("startBtn").disabled=false;
}
function fail(t){$("loading").classList.add("hidden");$("start").classList.remove("hidden");$("examTitle").textContent="تعذر فتح الامتحان";$("examInfo").textContent=t}
$("startBtn").onclick=startExam;
$("studentName").addEventListener("keydown",e=>{if(e.key==="Enter")startExam()});
async function startExam(){
 const name=$("studentName").value.trim();
 if(name.length<2){$("error").textContent="اكتب اسمك أولًا 😊";return}
 $("startBtn").disabled=true;$("error").textContent="جاري بدء الامتحان...";
 const {data,error}=await client.rpc("start_public_attempt",{p_code:exam.code,p_student_name:name});
 if(error){$("startBtn").disabled=false;$("error").textContent="تعذر بدء الامتحان: "+error.message;return}
 attemptId=data.attempt_id;questions=data.questions||[];answers=new Array(questions.length).fill(null);
 endAt=new Date(data.ends_at).getTime();
 $("start").classList.add("hidden");$("exam").classList.remove("hidden");
 $("liveTitle").textContent=exam.title;$("studentLabel").textContent="الطالب: "+name;
 render();timerId=setInterval(updateTimer,250);updateTimer();
}
function updateTimer(){
 const left=Math.max(0,endAt-Date.now()),s=Math.ceil(left/1000),m=Math.floor(s/60),sec=s%60;
 $("timer").textContent=String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
 if(left<=0){clearInterval(timerId);submitExam(true)}
}
function render(){
 const q=questions[current];
 $("qmeta").textContent=`السؤال ${current+1} من ${questions.length}`;
 $("question").innerHTML=`<div class="q">${esc(q.text)}</div>`+q.options.map((o,i)=>`<button class="option ${answers[current]===i?"selected":""}" data-index="${i}">${esc(o)}</button>`).join("");
 document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{answers[current]=Number(b.dataset.index);render()});
 $("progress").style.width=((current+1)/questions.length*100)+"%";
 $("prev").disabled=current===0;$("next").classList.toggle("hidden",current===questions.length-1);$("submit").classList.toggle("hidden",current!==questions.length-1);
}
$("prev").onclick=()=>{if(current>0){current--;render()}};
$("next").onclick=()=>{if(current<questions.length-1){current++;render()}};
$("submit").onclick=()=>submitExam(false);
async function submitExam(auto){
 if(submitted)return;submitted=true;clearInterval(timerId);
 const payload=questions.map((q,i)=>({question_id:q.id,selected_index:answers[i]}));
 $("exam").classList.add("hidden");$("result").classList.remove("hidden");$("score").innerHTML="<p>جاري تسليم الامتحان وحساب الدرجة...</p>";
 const {data,error}=await client.rpc("submit_public_attempt",{p_attempt_id:attemptId,p_answers:payload});
 if(error){$("score").innerHTML=`<p class="error">حدث خطأ أثناء التسليم: ${esc(error.message)}</p>`;return}
 $("score").innerHTML=`<div style="font-size:30px;font-weight:900">${data.score} / ${data.total}</div><p>${auto?"⏰ انتهى الوقت وتم التسليم تلقائيًا.":"🎉 تم التسليم بنجاح."}</p>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
init();