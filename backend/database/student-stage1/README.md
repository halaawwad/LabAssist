# LabAssist — Student Database / Stage 1

**اللغة: PostgreSQL SQL. التشغيل المقترح: PostgreSQL 17 داخل Docker Compose.**

هذه حزمة محلية مستقلة للمرحلة الأولى، وليست ملف قاعدة الـ102 جدول السابق. لا تغيّر الفرونت أو GitHub ولا تُرسل دعوات أو بريدًا. لا تشغّلها فوق قاعدة تحتوي على بيانات مهمة.

## ماذا تحتوي؟

15 جدولًا داخل schema باسم `labassist_student`:

| الجدول | الغرض |
|---|---|
| accounts | حسابات الطلاب، مع مراجع مشرفين تجريبية فقط |
| student_profiles | بيانات شاشة البروفايل |
| student_settings | AR/EN وتفضيلات الطالب ولغة شرح المساعد |
| files | مراجع الصورة/الملف في التخزين الخاص؛ لا binary داخل الجدول |
| academic_terms | الفصل؛ بداية تجريبية من تاريخ أول تشغيل للسيد |
| student_enrollments | تسجيل الطالب بالفصل وبيانات Incomplete المستقبلية |
| term_workshop_capacity | سعة25 فريقًا افتراضيًا |
| projects | المشروع ومن كوّن الفريق؛ ليس حقل مشرف وحيد للصلاحيات |
| project_students | ربط الطالب بالمشروع، وتاريخ مغادرته |
| project_supervisors | المشرفون على المشروع؛ ربط واحد لكل زوج مشروع/مشرف |
| activation_invitations | بصمة رابط تفعيل محدود الصلاحية ولمرة واحدة |
| personal_notes | دفتر الطالب الخاص |
| personal_tasks | مهام شخصية، مستقلة عن مهام الفريق |
| personal_reminders | تذكيرات شخصية؛ لا إرسال تلقائي في SQL |
| audit_events | تدقيق الأحداث الحساسة، بلا كلمات مرور أو tokens أصلية |

**المؤجل للمراحل التالية:** مهام الفريق ومشاكله وتقاريره وعروضه ورسائله واجتماعاته وحضور الورشة وعهدتها والسيركيت وAI والمحلات. لا تحتوي هذه الحزمة APIs أو NestJS أو Prisma Client أو خدمة بريد.

## السيد

- 23 فريقًا من المقترح الذي راجعناه: 15 من طالبين و8 من ثلاثة؛ 54 طالبًا.
- 7 مراجع مشرفين بحالة `REFERENCE_ONLY`؛ ليست حسابات موظفين يمكن الدخول بها.
- مثال TEAM03 بمشرفين؛ 24 رابط project-supervisor بلا تكرار.
- الورشة25 فريقًا:23 موجودة ومكانان متاحان. لا مشاريع وهمية TEAM24 وTEAM25، ولا توزيع طاولات مختلق.
- كل الطلاب `PENDING_ACTIVATION` و`password_hash = NULL`؛ لا كلمات مرور افتراضية ولا رموز تفعيل مولّدة مسبقًا.
- الرقم الجامعي8 خانات نصية، والإيميل `s########@stu.najah.edu`.
- الأسماء والأرقام والعناوين مصطنعة. **لا تفعّل إرسال البريد لهذه البيانات.**
- تاريخ بداية الفصل التجريبي = تاريخ أول استيراد بتوقيت فلسطين ليكون اليوم ضمن الأسبوع الأول. `ends_on` غير محدد؛ ليس هذا تاريخ الفصل الجامعي الحقيقي. اضبط تواريخ الجامعة قبل ربط قواعد انتهاء الوصول.
- تعديل الفريق متاح أول14 يومًا، مع2–3 أعضاء وحد4 مشاريع لكل مشرف وسعة الورشة25. القيود مؤجلة لنهاية المعاملة لتسمح بإنشاء مشروع وعضوياته معًا.

## الملفات

- `LabAssist_Student_Stage1.sql`: ملف واحد يجمع الإنشاء والسيد، للاستيراد اليدوي على قاعدة نظيفة فقط.
- `sql/01-schema.sql`: إنشاء الجداول والقواعد.
- `sql/02-demo-seed.sql`: بيانات تجريبية؛ لا تعيد كلمات مرور الحسابات المفعّلة للوضع الافتراضي.
- `compose.yaml`: PostgreSQL محلي على127.0.0.1:5433 معvolume مستمر وhealthcheck.
- `Initialize-Local.ps1`: يولّد سر اتصال PostgreSQL عشوائيًا محليًا؛ لا يطبعه ولا يستبدل سرًا موجودًا.
- `.env.example`: المنفذ المحلي؛ كلمة مرور PostgreSQL في `secrets/postgres_password.txt` بعد التهيئة.
- `tests/acceptance.sql`: اختبارات على قاعدة تجريبية، تُلغىfixtures في نهايتها.
- `validation.json`: نتائج الفحص المعزول الفعلية. فحص PGlite ليس دليل تشغيل Docker أو تزامن اتصالات متعددة.

## التشغيل على Windows / PowerShell

1. فك ZIP في مجلد مستقل، وافتح Docker Desktop وانتظر جاهزية Engine.
2. افتح PowerShell داخل مجلد الحزمة:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Initialize-Local.ps1
docker compose config --quiet
docker compose up -d --wait
docker compose ps
```

سيقوم Docker عند أول تشغيل بإنشاء PostgreSQL ثم تشغيل ملفي `sql/` بالترتيب. **لا تستورد الملف المجمع أيضًا**؛ هذا سيكرر إنشاء الـschema. init scripts تعمل فقط عندما يكون volume البيانات فارغًا، ولا تعيد السيد في كلrestart.

قراءة ملخص البيانات:

```powershell
docker compose exec -T db psql -U labassist_owner -d labassist_student -c "SELECT * FROM labassist_student.workshop_capacity_summary;"
docker compose exec -T db psql -U labassist_owner -d labassist_student -c "SELECT * FROM labassist_student.seed_team_overview ORDER BY team_key;"
```

تشغيل الاختبارات داخل PostgreSQL التجريبية:

```powershell
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U labassist_owner -d labassist_student -f /labassist-tests/acceptance.sql
```

إيقاف الحاوية مع إبقاء البيانات:

```powershell
docker compose stop
```

لا تستخدم أوامر حذفvolume لإصلاح خطأ قبل مراجعة logs والنسخ الاحتياطي. تحديث SQL لاحقًا يكون بترحيلات مراجعة، لا بإعادة تهيئة بيانات مهمة.

## بيانات الاتصال المحلية

| البند | القيمة |
|---|---|
| Host من الجهاز | localhost |
| Port من الجهاز | 5433، أو القيمة المحددة في.env |
| Database | labassist_student |
| User إداري محلي | labassist_owner |
| Password | محتوى ملفsecrets المحلي بعد التهيئة؛ لا ترفعه إلىGitHub |
| Schema | labassist_student |
| Host من backend داخل نفس شبكةCompose مستقبلًا | db:5432 |

سر PostgreSQL هو **سر الاتصال بقاعدة البيانات**، وليس كلمة مرور طالب. مستخدم image الافتراضي إداري لأعمال التطوير؛ عند ربط NestJS نضيف مستخدم خدمة بصلاحيات دنيا ونمنع وصول التطبيق مباشرة إلى حساب المالك.

## التفعيل وكلمة المرور

1. الدكتور ينشئ/يدعو الطالب ويربطه بالفريق مسبقًا.
2. Backend يولّد token عشوائيًا قويًا، يحفظ بصمته في `activation_invitations`، ويرسل الرابط المرتبط بالإيميل المسجل. وقت انتهاء الرابط إعداد يُحسم لاحقًا؛ ليس مهلة أسبوع لتغيير كلمة مرور.
3. الطالب يختار السر بنفسه. Backend يتحقق من السياسة والتأكيد، ثم يحسب Argon2id معsalt. لا نستخدمSHA-256 وحده لكلمات المرور.
4. `activate_student` تتلقى **بصمة token وهاش كلمة المرور** وتتحقق من الإيميل والصلاحية والاستخدام، ثم تفعّل الحساب وتستهلك الرابط داخل معاملة.
5. لا نضع plaintext password أورابطتفعيلسري فيSQL seed أوlogs. المخطط يتحقق من شكلhash فقط؛ التحقق الحقيقي من كلمة المرور وصحةhash مسؤولية مكتبةBackend.
6. لإعادة إرسال دعوة: Backend يقفل الطالب ويلغي الدعوة السابقة غير المستخدمة ثم ينشئ دعوة جديدة بمعاملة واحدة. لا نكتفي بإنشاءtokens متوازية.

لا توجد قاعدة تغيير خلال أسبوع، ولا كلمة مرور يختارها الدكتور، ولا كود انضمام للفريق في هذه النسخة.

## حدود الصلاحيات والمرحلة

قيودDB تحمي الهوية والعلاقات والسعة والنافذة والـtoken. خدمةBackend الموثوقة لاحقًا تطبق المصادقة وملكيةالمورد والأرشيف ورفضحسابعند انتهاءالفصل. لا تعطىللموبايل credentials مباشرة، ولا يرسلactorId كهويةموثوقة.

الـschema والـtables والـfunctions ليست متاحة لـPUBLIC. لأن مستخدممالكالتطوير يستطيعالتجاوز فلا نعتبرهذاحدهAuthorizationكاملًا. ربطPrisma والمستخدمالمحدود وتحققالموارد مراحللاحقة موثقة.

مراجع رسمية:
- https://hub.docker.com/_/postgres
- https://docs.docker.com/compose/how-tos/startup-order/
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
