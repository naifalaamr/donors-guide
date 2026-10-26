# دليل الجهات المانحة · الدفعة 47

موقع ثابت مبني بـ Astro من بيانات `src/data/donors.json`، منشور على https://naifalaamr.github.io/donors-guide/

## التشغيل على جهازك
```bash
cd donors-guide
npm install
npm run dev
```
ثم افتح http://localhost:4321

## الصفحات
- `/` الدليل: بحث عربي يتجاهل الهمزات والتاء المربوطة والتشكيل، وتصفية بالنوع وطريقة التقديم ونوع المنحة والمنطقة والمجال، وروابط قابلة للمشاركة (`/?type=waqf`).
- `/donors/d47-001/` صفحة لكل جهة بالمحاور التسعة، مع طباعة وإضافة للمقارنة.
- `/compare/` مقارنة حتى 4 جهات.
- `/about/` و`/submit/`.
- `/data/donors.json` و`/data/donors.csv` البيانات للتنزيل.

## إضافة جهة
أضف كائناً إلى `src/data/donors.json` برقم `code` التالي و`id` بالصيغة `d47-097`، ثم `npm run build`. يرفض البناء أي حقل غير معروف (مثل اسم الطالب) أو رقم جوال شخصي أو اسماً مكرراً.

## النشر
كل دفع إلى الفرع `main` في المستودع naifalaamr/donors-guide يبني الموقع وينشره على GitHub Pages تلقائياً عبر `.github/workflows/deploy.yml`.
