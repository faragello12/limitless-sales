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

### Replit
Replit يعد خيارًا جيدًا ومجانياً لتشغيل تطبيق Node.js صغير مباشرة من GitHub.

1. انشئ حساب مجاني في Replit.
2. انشئ Repl جديد من نوع `Node.js`.
3. اربط المشروع بالمستودع على GitHub أو ارفع الملفات يدوياً.
4. ضع الأمر التالي في إعدادات التشغيل:
   ```bash
   npm install && npm run seed && npm start
   ```
5. اضبط متغيرات البيئة في Replit:
   - `JWT_SECRET`
   - `ALLOWED_ORIGIN`
   - `ADMIN_PASSWORD`
   - `SALES_PASSWORD`

> ملاحظة: Replit يحتفظ بالملفات في مساحة المشروع، لذا يمكن استخدام SQLite محلياً للتطبيق التجريبي.

### Glitch
Glitch يوفر استضافة مجانية لتطبيقات Express مع ملفات دائمة ضمن حدود بسيطة.

1. أنشئ مشروع جديد على Glitch.
2. استورد الملفات من GitHub أو انسخها إلى المشروع.
3. استخدم `package.json` الحالي و`server.js`.
4. أضف متغيرات البيئة في إعدادات المشروع.

> ملاحظة: هذا مناسب للتجارب والعروض، لكن ليس للإنتاج طويل المدى.

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

This project uses a custom Express server and is not directly compatible with Vercel/Netlify static hosting.

If you want to use Vercel, deploy it as a serverless function or use a platform that supports Node.js servers.

## 4. Recommendations

- Use PostgreSQL or MySQL in production.
- Do not expose `database/limitless.db` directly.
- Use a strong `JWT_SECRET` and store it securely.
