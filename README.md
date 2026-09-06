# صفحة الطلاب فقط
ارفع الملفات الثلاثة كما هي إلى الاستضافة:
- index.html
- style.css
- app.js

رابط الطالب يكون:
https://YOUR-SITE/index.html?exam=EXAM-CODE

الطالب لا يحتاج حسابًا أو كلمة مرور. يكتب اسمه ويبدأ.
الوقت النهائي يأتي من Supabase عند بدء المحاولة، والتصحيح يتم عبر دالة Supabase.

مهم: هذه الصفحة تعتمد على دوال SQL التي شغلتها سابقًا:
get_public_exam
start_public_attempt
submit_public_attempt
