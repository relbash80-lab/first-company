const ar = {
  // عام
  appName: 'نظام إدارة استيراد السيارات',
  dashboard: 'لوحة المتابعة',
  cars: 'السيارات',
  containers: 'الحاويات',
  payments: 'الدفعات',
  finance: 'كشف حساب',
  subscription: 'الاشتراك والباقات',
  settings: 'الإعدادات',
  logout: 'تسجيل الخروج',
  login: 'تسجيل الدخول',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  edit: 'تعديل',
  add: 'إضافة',
  search: 'بحث',
  filter: 'تصفية',
  all: 'الكل',
  yes: 'نعم',
  no: 'لا',
  confirm: 'تأكيد',
  close: 'إغلاق',
  loading: 'جاري التحميل...',
  noData: 'لا توجد بيانات',
  actions: 'إجراءات',
  details: 'التفاصيل',
  notes: 'ملاحظات',
  total: 'الإجمالي',
  export: 'تصدير',

  // المصادقة
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  forgotPassword: 'نسيت كلمة المرور؟',
  loginTitle: 'دخول إلى النظام',
  loginSubtitle: 'نظام إدارة استيراد السيارات من المزادات الأمريكية',

  // لوحة المتابعة
  totalCars: 'إجمالي السيارات',
  totalRemainingPurchase: 'متبقي المشتريات',
  totalRemainingShipping: 'متبقي الشحن',
  carsNeedFollowUp: 'سيارات تحتاج متابعة',
  recentCars: 'آخر السيارات المضافة',
  financialSummary: 'الملخص المالي',
  statusOverview: 'نظرة عامة على الحالات',

  // السيارات
  addCar: 'إضافة سيارة',
  editCar: 'تعديل سيارة',
  incompleteVehicle: 'سيارة غير مكتملة',
  carDraftHint: 'جميع الحقول اختيارية. احفظ السيارة الآن وارجع لإكمال بياناتها في أي وقت.',
  saveAndContinueLater: 'حفظ والمتابعة لاحقًا',
  carDetails: 'تفاصيل السيارة',
  yearMakeModel: 'السنة / الشركة / الموديل',
  vin: 'رقم الهيكل (VIN)',
  auction: 'جهة المزاد',
  lotStock: 'رقم اللوت',
  buyingLocation: 'موقع الشراء',
  buyingDate: 'تاريخ الشراء',
  wireDate: 'تاريخ الحوالة',
  owner: 'المالك',
  buyingPrice: 'سعر الشراء',
  commission: 'العمولة',
  otherFees: 'مصاريف أخرى',
  subTotal: 'المجموع الجزئي',
  paid: 'المدفوع',
  remaining: 'المتبقي',

  // الشحن
  shipping: 'الشحن',
  destination: 'الوجهة',
  destinationType: 'نوع الوجهة',
  shippingPort: 'ميناء الشحن',
  containerNumber: 'رقم الحاوية',
  shippingLine: 'خط الشحن',
  transitArrival: 'تاريخ وصول الترانزيت',
  shippingWireDate: 'تاريخ حوالة الشحن',
  inlandPrice: 'النقل الداخلي',
  oceanPrice: 'الشحن البحري',
  shippingSubTotal: 'إجمالي الشحن',
  shippingPaid: 'المدفوع للشحن',
  shippingRemaining: 'المتبقي للشحن',

  // الحاويات
  container: 'حاوية',
  containerDetails: 'تفاصيل الحاوية',
  carsInContainer: 'السيارات في الحاوية',
  sharedCosts: 'التكاليف المشتركة',
  costPerCar: 'التكلفة لكل سيارة',
  splitEqually: 'تقسيم بالتساوي',
  splitByShare: 'تقسيم حسب الحصة',
  addSharedCost: 'إضافة تكلفة مشتركة',
  costDescription: 'وصف التكلفة',
  costAmount: 'المبلغ',

  // الحالات
  status: 'الحالة',
  purchased: 'مشتراة',
  purchasePaid: 'مدفوعة (شراء)',
  atPort: 'في الميناء',
  loaded: 'محمّلة في حاوية',
  inTransit: 'ترانزيت',
  arrived: 'وصلت',

  // المزادات
  copart: 'Copart',
  iaai: 'IAAI',

  // الموانئ
  portNJ: 'نيو جيرسي (NJ)',
  portGA: 'جورجيا (GA)',
  portTX: 'تكساس (TX)',
  portCA: 'كاليفورنيا (CA)',

  // خطوط الشحن
  arkas: 'Arkas',
  msc: 'MSC',
  maersk: 'Maersk',

  // الدفعات
  addPayment: 'إضافة دفعة',
  paymentDate: 'تاريخ الدفعة',
  paymentAmount: 'مبلغ الدفعة',
  paymentType: 'نوع الدفعة',
  purchasePayment: 'دفعة شراء',
  shippingPayment: 'دفعة شحن',
  paymentHistory: 'سجل الدفعات',

  // رسائل
  carAdded: 'تم حفظ السيارة ويمكن إكمال بياناتها لاحقًا',
  carUpdated: 'تم تحديث بيانات السيارة',
  carDeleted: 'تم حذف السيارة',
  paymentAdded: 'تمت إضافة الدفعة',
  confirmDelete: 'هل أنت متأكد من الحذف؟',
  vinExists: 'رقم الهيكل موجود مسبقاً',
  requiredField: 'هذا الحقل مطلوب',
  invalidVin: 'يمكن حفظه الآن وإكمال رقم الهيكل إلى 17 حرفًا لاحقًا',
  subscriptionBlocked: 'لا يمكن إنشاء سجل سيارة جديد: جدّد الاشتراك أو راجع حدود الباقة من صفحة الاشتراك والباقات.',

  // العملة
  currency: '$',
};

export default ar;
