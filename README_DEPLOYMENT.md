# Deployment Guide

## 1. Local Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t limitless-sales .
   ```
2. Run the container:
   ```bash
   docker run -e JWT_SECRET="your_secret_here" -e ALLOWED_ORIGIN="http://localhost:3000" -p 3000:3000 limitless-sales
   ```
3. Visit `http://localhost:3000`

## 2. Free Hosting Options

### Glitch
Glitch يقدم خيارًا مجانيًا لتشغيل تطبيقات Node.js وExpress. هذا هو الخيار الأفضل طالما تحتاج تطبيقًا حيًا بدون دفع.

1. أنشئ حساب مجاني على Glitch.
2. أنشئ مشروع جديد من نوع `hello-express` أو `Node.js`.
3. استورد الملفات من GitHub أو انسخ المشروع إلى Glitch يدويًا.
4. تأكد من وجود `package.json` و`server.js` و`public/`.
5. اضبط أمر التشغيل في ملف `package.json` أو في إعدادات المشروع:
   ```bash
   npm install && npm start
   ```
6. أضف متغيرات البيئة في إعدادات المشروع:
   - `JWT_SECRET`
   - `ALLOWED_ORIGIN` (رابط التطبيق على Glitch)
   - `ADMIN_PASSWORD`
   - `SALES_PASSWORD`

> ملاحظة: Glitch يدعم ملفات المشروع بسعة محدودة، ويمكن استخدام SQLite للتطبيق التجريبي على قسم صغير.

### Deta
Deta Micro هي خدمة مجانية لتشغيل تطبيقات Node.js دون دفع. يمكنك تشغيل السيرفر مباشرة وتحميل المشروع عبر GitHub أو الزر المخصص.

1. أنشئ حساب مجاني على [Deta](https://www.deta.sh).
2. أنشئ Micro جديد من نوع `Node.js`.
3. اربط المشروع أو استخدم `git clone` داخل بيئة Deta.
4. أضف متغيرات البيئة:
   - `JWT_SECRET`
   - `ALLOWED_ORIGIN`
   - `ADMIN_PASSWORD`
   - `SALES_PASSWORD`
5. شغّل:
   ```bash
   npm install
   npm run seed
   npm start
   ```

> ملاحظة: Deta مجاني للتجارب والتطبيقات الصغيرة، لذا هذا مناسب لعرض المشروع.

## 3. Render Deployment

Render supports Node.js web services.

1. Push this repository to GitHub.
2. Create a new web service on Render.
3. Set the build command to:
   ```bash
   npm install
   ```
4. Set the start command to:
   ```bash
   npm start
   ```
5. Add environment variables:
   - `JWT_SECRET`
   - `ALLOWED_ORIGIN`

> Note: Render's filesystem is not persistent for SQLite. For production use, connect to a remote database instead of the local SQLite file.

## 4. Vercel / Netlify

### الأفضل: Vercel
Vercel هو الخيار الأفضل بين الاثنين عندما تريد تشغيل هذا المشروع لأنه يدعم تطبيقات Node.js. المهم هنا هو أن تقوم بإعداد قاعدة بيانات خارجية حقيقية عبر `DATABASE_URL` لأن SQLite المحلي على Vercel لا يبقى بعد إعادة نشر.

- Vercel يدعم تشغيل Express كخدمة serverless عبر `@vercel/node`
- إذا لم تحدد `DATABASE_URL`، سيستخدم التطبيق SQLite محليًا في `/tmp/limitless.db` على Vercel، لكن هذه البيانات ستكون مؤقتة في بيئة serverless
- إذا أردت نشر حقيقي طويل المدى، استخدم `DATABASE_URL` مع PostgreSQL أو قاعدة بيانات خارجية أخرى، ولا تعتمد على SQLite المحلي
- أضف متغير البيئة `DATABASE_URL` في إعدادات المشروع على Vercel مع رابط اتصال PostgreSQL

### Netlify
Netlify لا يدعم خادم Express كامل بشكل مباشر إلا إذا حولت كل نقطة نهاية إلى وظائف Serverless منفصلة داخل `netlify/functions`. لذلك هو أقل مناسبة هنا من Vercel.

### Vercel Deployment Steps
1. ثبت حساب مجاني على https://vercel.com
2. اربط المستودع من GitHub
3. أضف ملف `vercel.json` في جذر المشروع (موجود بالفعل)
4. عيّن متغيرات البيئة في إعدادات المشروع على Vercel:
   - `JWT_SECRET`
   - `ALLOWED_ORIGIN` (رابط التطبيق على Vercel)
   - `ADMIN_PASSWORD`
   - `SALES_PASSWORD`
5. اضغط Deploy

> ملاحظة: إذا أردت بيانات دائمة، ستحتاج قاعدة بيانات خارجية لأن ملفات SQLite المحلية على Vercel لا تبقى بعد إعادة النشر.

## 5. Recommendations

- Use PostgreSQL or MySQL in production.
- Do not expose `database/limitless.db` directly.
- Use a strong `JWT_SECRET` and store it securely.
