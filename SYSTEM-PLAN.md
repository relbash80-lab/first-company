# 📋 نظام إدارة استيراد السيارات — خطة النظام

> آخر تحديث: 2026-08-05
> الحالة: **المرحلة الأولى — التأسيس ✅**

---

## 1. نبذة عن المشروع
نظام ويب متكامل لإدارة استيراد السيارات من المزادات الأمريكية (Copart / IAAI) إلى ليبيا (بنغازي).
يغطي مرحلتين: **المشتريات والعمولة** + **النقل اللوجستي (الداخلي + البحري)**.

---

## 2. التقنيات المستخدمة

| المكوّن | التقنية | الإصدار |
|---|---|---|
| الواجهة | React + Vite | React 19 / Vite 6 |
| التصميم | Tailwind CSS v4 | 4.1 |
| قاعدة البيانات | Firebase Firestore | 11.7 |
| المصادقة | Firebase Auth | 11.7 |
| الاستضافة | Firebase Hosting | — |
| الأيقونات | React Icons | 5.5 |
| الإشعارات | React Hot Toast | 2.5 |
| التوجيه | React Router DOM | 7.6 |
| اللغة | ثنائي (عربي RTL + إنجليزي LTR) | — |

---

## 3. هيكل المشروع

```
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/                  # صور وملفات ثابتة
│   ├── components/
│   │   ├── auth/                # مكونات المصادقة
│   │   ├── cars/                # مكونات السيارات
│   │   │   ├── CarFormModal.jsx # نموذج إضافة/تعديل سيارة
│   │   │   └── CarDetailModal.jsx # عرض تفاصيل سيارة
│   │   ├── common/              # مكونات مشتركة
│   │   ├── containers/          # مكونات الحاويات
│   │   ├── dashboard/           # مكونات لوحة المتابعة
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx    # التخطيط العام
│   │   │   ├── Header.jsx       # الشريط العلوي
│   │   │   └── Sidebar.jsx      # القائمة الجانبية
│   │   ├── payments/            # مكونات الدفعات
│   │   └── shipping/            # مكونات الشحن
│   ├── config/
│   │   └── firebase.js          # إعداد Firebase
│   ├── context/
│   │   ├── AuthContext.jsx      # سياق المصادقة
│   │   └── LanguageContext.jsx  # سياق اللغة (AR/EN)
│   ├── hooks/                   # Custom hooks
│   ├── i18n/
│   │   ├── ar.js                # ترجمة عربية
│   │   ├── en.js                # ترجمة إنجليزية
│   │   └── index.js             # مدير الترجمة
│   ├── pages/
│   │   ├── CarsPage.jsx         # صفحة السيارات
│   │   ├── ContainersPage.jsx   # صفحة الحاويات
│   │   ├── DashboardPage.jsx    # لوحة المتابعة
│   │   ├── LoginPage.jsx        # صفحة الدخول
│   │   └── PaymentsPage.jsx     # صفحة الدفعات
│   ├── services/
│   │   ├── carService.js        # خدمات السيارات (CRUD)
│   │   ├── containerService.js  # خدمات الحاويات
│   │   └── paymentService.js    # خدمات الدفعات
│   ├── utils/                   # أدوات مساعدة
│   ├── App.jsx                  # المكون الرئيسي
│   ├── index.css                # الأنماط الأساسية
│   └── main.jsx                 # نقطة الدخول
├── .env.example                 # مثال ملف البيئة
├── .gitignore
├── index.html
├── package.json
├── SPEC.md                      # المواصفات التفصيلية
├── SYSTEM-PLAN.md               # ← هذا الملف
└── vite.config.js
```

---

## 4. قاعدة البيانات (Firebase Firestore)

### المجموعات (Collections)

#### `cars` — السيارات
| الحقل | النوع | الوصف |
|---|---|---|
| yearMakeModel | string | السنة/الشركة/الموديل |
| vin | string | رقم الهيكل (مفتاح فريد) |
| auction | string | Copart / IAAI |
| lotStock | string | رقم اللوت |
| buyingLocation | string | ولاية-مدينة الشراء |
| buyingDate | string | تاريخ الشراء |
| wireDate | string | تاريخ الحوالة |
| owner | string | المالك |
| buyingPrice | number | سعر الشراء |
| commission | number | العمولة (ثابتة $100) |
| otherFees | number | مصاريف أخرى |
| purchasePaid | number | المدفوع (شراء) |
| notes | string | ملاحظات |
| destination | string | الوجهة |
| destinationType | string | رباعي/ثلاثي |
| shippingPort | string | NJ/GA/TX/CA |
| containerNumber | string | رقم الحاوية |
| shippingLine | string | خط الشحن |
| transitArrivalDate | string | تاريخ وصول الترانزيت |
| inlandPrice | number | النقل الداخلي |
| oceanPrice | number | الشحن البحري |
| shippingPaid | number | المدفوع (شحن) |
| status | string | حالة السيارة |
| createdAt | timestamp | تاريخ الإنشاء |
| updatedAt | timestamp | آخر تحديث |

#### `containers` — الحاويات (مستقبلاً)
| الحقل | النوع | الوصف |
|---|---|---|
| number | string | رقم الحاوية |
| shippingLine | string | خط الشحن |
| port | string | الميناء |
| destination | string | الوجهة |
| sharedCosts | array | التكاليف المشتركة |
| transitArrival | string | تاريخ الترانزيت |

#### `payments` — سجل الدفعات (مستقبلاً)
| الحقل | النوع | الوصف |
|---|---|---|
| carId | string | معرّف السيارة |
| type | string | purchase / shipping |
| amount | number | المبلغ |
| date | string | التاريخ |
| notes | string | ملاحظات |

---

## 5. المنطق المالي (تلقائي)

```
المجموع الجزئي (شراء) = سعر الشراء + العمولة ($100) + مصاريف أخرى
المجموع الجزئي (شحن) = النقل الداخلي + الشحن البحري
المتبقي = المجموع الجزئي − المدفوع
⚠️ لا أرقام سالبة — الحد الأدنى صفر
```

---

## 6. حالات السيارة (Workflow)

```
مشتراة → مدفوعة (شراء) → في الميناء → محمّلة في حاوية → ترانزيت → وصلت
```

---

## 7. المميزات المنجزة ✅

- [x] هيكل المشروع (React + Vite + Tailwind)
- [x] نظام ثنائي اللغة (عربي/إنجليزي) مع تبديل فوري
- [x] دعم RTL/LTR كامل
- [x] إعداد Firebase (Auth + Firestore)
- [x] صفحة تسجيل الدخول (مع إعادة تعيين كلمة المرور)
- [x] التخطيط العام (Sidebar + Header) متجاوب
- [x] لوحة المتابعة (إحصائيات + حالات + آخر السيارات)
- [x] صفحة السيارات (جدول + بحث + فلتر حالة)
- [x] نموذج إضافة/تعديل سيارة (بيانات + مالي + شحن)
- [x] عرض تفاصيل السيارة (Modal)
- [x] حذف سيارة مع تأكيد
- [x] حساب المتبقي تلقائياً (شراء + شحن)
- [x] منع تكرار VIN
- [x] صفحة الحاويات (تجميع تلقائي حسب رقم الحاوية)
- [x] صفحة الدفعات (ملخص مالي + فلتر)
- [x] خدمات Firebase (CRUD) للسيارات والحاويات والدفعات
- [x] حماية المسارات (ProtectedRoute)
- [x] إشعارات Toast

---

## 8. المميزات المتبقية 🔜

- [ ] ربط مشروع Firebase الفعلي (بيانات .env)
- [ ] إنشاء مستخدمين وأدوار (شراء / شحن / مدير)
- [ ] نظام الأدوار والصلاحيات
- [ ] توزيع تكلفة الحاوية المشتركة تلقائياً
- [ ] سجل دفعات مفصّل لكل سيارة
- [ ] تصدير البيانات (CSV / PDF)
- [ ] البحث المتقدم والفلاتر المتعددة
- [ ] لوحة متابعة أسبوعية تلقائية
- [ ] إشعارات للمتابعة (سيارات متأخرة)
- [ ] نشر على Firebase Hosting
- [ ] تحسين الأداء (pagination / lazy loading)

---

## 9. كيفية التشغيل

```bash
# تثبيت الحزم
npm install

# نسخ ملف البيئة وتعبئة بيانات Firebase
cp .env.example .env

# تشغيل بيئة التطوير
npm run dev

# بناء للإنتاج
npm run build
```

---

## 10. ملاحظات مهمة

- العمولة ثابتة **$100** لكل سيارة — محسوبة تلقائياً.
- رقم الهيكل **VIN** هو المفتاح الفريد — لا يمكن تكراره.
- جميع الحسابات المالية **تلقائية** — لا إدخال يدوي للمجاميع.
- النظام يدعم **التحديث اللحظي** (Real-time) من Firestore.

---

*تم إنشاؤه بواسطة: شراكة تقنية 🤝*
