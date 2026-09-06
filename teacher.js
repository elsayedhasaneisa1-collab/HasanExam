const URL="https://zvvfjmadziyuwutdresz.supabase.co",KEY="sb_publishable_5tzbKmV1EQZTDFLtRPLhnQ_POvlG0Xc";const $=x=>document.getElementById(x);let rows=[],q=0;
async function rpc(fn,body={}){let r=await fetch(`${URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY},body:JSON.stringify(body)});let t=await r.text();if(!r.ok)throw Error(t);return t?JSON.parse(t):null}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));function N(x){let r=x||{};return{name:String(r.student_name??r.name??r.student??"اسم الطالب غير متاح"),exam:String(r.exam_title??r.title??r.exam??"امتحان"),score:Number(r.score??r.correct??r.correct_answers??0),total:Number(r.total_questions??r.total??r.questions_count??0)}}function P(x){let n=N(x);return n.total>0?Math.max(0,Math.min(100,Math.round(n.score/n.total*100))):0}
function openMenu(){ $("menu").classList.add("open");$("overlay").classList.add("open")}function closeMenu(){$("menu").classList.remove("open");$("overlay").classList.remove("open")}$("hamb").onclick=openMenu;$("close").onclick=closeMenu;$("overlay").onclick=closeMenu;
function page(id){document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===id));closeMenu();if(id==="results")render()}
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>page(x.dataset.page));document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>page(x.dataset.go));
$("loginForm").onsubmit=e=>{e.preventDefault();if($("user").value.trim()==="Hasan"&&$("pass").value==="25808"){sessionStorage.tc="1";start()}else $("err").textContent="بيانات الدخول غير صحيحة."};$("logout").onclick=()=>{sessionStorage.removeItem("tc");location.reload()};$("refresh").onclick=load;$("refreshTop").onclick=load;$("search").oninput=render;$("order").onchange=render;
function resultCard(x,i){let n=N(x),p=P(x),wrong=Math.max(0,n.total-n.score),initial=n.name.trim().charAt(0)||"ط";return `<div class="result" data-index="${rows.indexOf(x)}"><div class="result-avatar">${esc(initial)}</div><div><div class="name">${esc(n.name)}</div><div class="exam">${esc(n.exam)}</div></div><div class="rstat"><b>${n.score} / ${n.total}</b>إجابات صحيحة</div><div class="rstat"><b>${wrong}</b>إجابات خاطئة</div><div class="rpercent">${p}%</div></div>`}
function topCard(x,i){let n=N(x),p=P(x);return `<article class="student"><div class="rank ${i===0?"one":""}">${i+1}</div><div class="name">${esc(n.name)}</div><div class="exam">${esc(n.exam)}</div><div class="meter"><i style="width:${p}%"></i></div><div class="scoreline"><span>${n.score} من ${n.total}</span><b>${p}%</b></div></article>`}
function render(){let term=$("search").value.trim().toLowerCase(),a=rows.filter(x=>N(x).name.toLowerCase().includes(term));a.sort((x,y)=>$("order").value==="desc"?P(y)-P(x):P(x)-P(y));$("resultsList").innerHTML=a.length?a.map(resultCard).join(""):`<div class="student">لا توجد نتائج مطابقة.</div>`;document.querySelectorAll(".result").forEach(el=>el.onclick=()=>showDetails(rows[+el.dataset.index]))}
function showDetails(raw){let n=N(raw),p=P(raw),w=Math.max(0,n.total-n.score);$("modalName").textContent=n.name;$("modalBody").innerHTML=`<div class="modal-stat"><div><small>الامتحان</small><b>${esc(n.exam)}</b></div><div><small>النسبة</small><b>${p}%</b></div><div><small>الإجابات الصحيحة</small><b>${n.score}</b></div><div><small>الإجابات الخاطئة</small><b>${w}</b></div><div><small>الدرجة</small><b>${n.score} / ${n.total}</b></div><div><small>التقييم</small><b>${p>=90?"ممتاز 🏆":p>=75?"جيد جدًا ⭐":p>=50?"جيد 👍":"يحتاج مراجعة 📚"}</b></div></div>`;$("detailsModal").classList.remove("hidden")}
$("modalClose").onclick=()=>$("detailsModal").classList.add("hidden");$("detailsModal").onclick=e=>{if(e.target.id==="detailsModal")$("detailsModal").classList.add("hidden")};
async function loadArabicFont(doc){
 try{
  const r=await fetch("NotoNaskhArabic-Regular.ttf",{cache:"force-cache"});
  if(!r.ok) throw Error("font");
  const bytes=new Uint8Array(await r.arrayBuffer());
  let bin="",chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) bin+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf",btoa(bin));
  doc.addFont("NotoNaskhArabic-Regular.ttf","NotoNaskhArabic","normal");
  doc.setFont("NotoNaskhArabic","normal");
  return true;
 }catch(e){console.warn("Arabic PDF font unavailable",e);return false}
}
function pdfText(doc,value){const t=String(value??"");return typeof doc.processArabic==="function"?doc.processArabic(t):t}
$("downloadPdf").onclick=async()=>{
 if(!rows.length){alert("لا توجد نتائج لتنزيلها.");return}
 const jsPDF=window.jspdf?.jsPDF;if(!jsPDF){alert("تعذر تحميل أداة PDF. تأكد من اتصال الإنترنت ثم أعد المحاولة.");return}
 const btn=$("downloadPdf"),old=btn.textContent;btn.disabled=true;btn.textContent="⏳ جاري تجهيز PDF...";
 try{
  const doc=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
  const arabic=await loadArabicFont(doc);
  if(!arabic) doc.setFont("helvetica","normal");
  doc.setFontSize(20);
  doc.text(pdfText(doc,arabic?"نتائج الطلاب":"Hasan Eissa - Student Results"),40,45);
  doc.setFontSize(10);doc.text(new Date().toLocaleString("en-GB"),40,63);
  const data=rows.slice().sort((a,b)=>P(b)-P(a)).map((x,i)=>{const n=N(x);return [i+1,pdfText(doc,n.name),pdfText(doc,n.exam),`${n.score}/${n.total}`,`${Math.max(0,n.total-n.score)}`,`${P(x)}%`]});
  if(typeof doc.autoTable!=="function") throw Error("PDF_TABLE_UNAVAILABLE");
  doc.autoTable({
   startY:80,
   head:[["#",pdfText(doc,"الطالب"),pdfText(doc,"الامتحان"),pdfText(doc,"الدرجة"),pdfText(doc,"الخاطئ"),pdfText(doc,"النسبة")]],
   body:data,theme:"grid",
   styles:{font:arabic?"NotoNaskhArabic":"helvetica",fontSize:9,cellPadding:6,halign:arabic?"right":"left"},
   headStyles:{fillColor:[22,70,110],textColor:255,halign:arabic?"right":"left"},
   columnStyles:{0:{halign:"center"},3:{halign:"center"},4:{halign:"center"},5:{halign:"center"}}
  });
  doc.save("Hasan-Eissa-Results.pdf");
 }catch(e){console.error(e);alert("حدث خطأ أثناء إنشاء ملف PDF. تأكد من اتصال الإنترنت ثم حاول مرة أخرى.")}
 finally{btn.disabled=false;btn.textContent=old}
};
function start(){$("login").classList.add("hidden");$("app").classList.remove("hidden");if(!document.querySelector(".question"))addQuestion();load()}if(sessionStorage.tc==="1")start();