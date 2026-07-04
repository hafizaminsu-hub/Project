/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - المصادقة والصلاحيات
 * ==========================================
 * يدير تسجيل الدخول والخروج وصلاحيات المستخدمين.
 * الصلاحيات: مدير (كامل)، محاسب (مالي)، باحث (ميداني)
 */

// تعريف الأدوار (Roles)
const ROLES = {
    ADMIN: 'مدير',
    ACCOUNTANT: 'محاسب',
    RESEARCHER: 'باحث'
};

// الصلاحيات: أي الصفحات يمكن لكل دور الوصول إليها
const PERMISSIONS = {
    [ROLES.ADMIN]: [
        'dashboard', 
        'children', 
        'sponsors', 
        'sponsorships', 
        'donations', 
        'visits', 
        'reports', 
        'settings'
    ],
    [ROLES.ACCOUNTANT]: [
        'dashboard', 
        'sponsorships', 
        'donations', 
        'reports'
    ],
    [ROLES.RESEARCHER]: [
        'children', 
        'visits'
    ]
};

// أسماء الصفحات بالعربية للعرض
const PAGE_NAMES = {
    dashboard: 'لوحة التحكم',
    children: 'إدارة الأطفال',
    sponsors: 'الكافلون',
    sponsorships: 'الكفالات',
    donations: 'التبرعات',
    visits: 'الزيارات',
    reports: 'التقارير',
    settings: 'الإعدادات',
    login: 'تسجيل الدخول'
};

// المستخدم الحالي المسجل دخوله
let currentUser = null;

/**
 * التحقق من بيانات تسجيل الدخول.
 * @param {string} username - اسم المستخدم
 * @param {string} password - كلمة المرور (نص عادي)
 * @returns {Promise<object|null>} المستخدم إذا نجح، null إذا فشل
 */
async function login(username, password) {
    try {
        // البحث عن المستخدم بواسطة اسم المستخدم
        const users = await getAllRecords('users');
        const user = users.find(u => u.username === username);
        
        if (!user) {
            console.log('المستخدم غير موجود:', username);
            return null;
        }
        
        // فك تشفير كلمة المرور المخزنة (Base64) ومقارنتها
        let storedPassword;
        try {
            storedPassword = atob(user.password);
        } catch (e) {
            // إذا كانت كلمة المرور غير مشفرة (للتوافق مع الإصدارات القديمة)
            storedPassword = user.password;
        }
        
        if (storedPassword === password) {
            // تسجيل دخول ناجح - تخزين المستخدم في sessionStorage
            currentUser = { ...user };
            // لا نخزن كلمة المرور في الذاكرة بعد التحقق
            delete currentUser.password;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('تم تسجيل الدخول بنجاح:', user.name);
            return currentUser;
        }
        
        console.log('كلمة المرور غير صحيحة');
        return null;
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return null;
    }
}

/**
 * تسجيل الخروج من النظام.
 * يمسح بيانات الجلسة ويعيد التوجيه لصفحة تسجيل الدخول.
 */
function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    console.log('تم تسجيل الخروج');
    window.location.hash = '#login';
}

/**
 * استعادة جلسة المستخدم من sessionStorage عند تحميل الصفحة.
 * @returns {object|null} المستخدم المستعاد أو null
 */
function restoreSession() {
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            console.log('تم استعادة الجلسة للمستخدم:', currentUser.name);
            return currentUser;
        } catch (e) {
            console.error('فشل استعادة الجلسة:', e);
            sessionStorage.removeItem('currentUser');
            return null;
        }
    }
    return null;
}

/**
 * التحقق من صلاحية المستخدم الحالي لدخول صفحة معينة.
 * @param {string} page - معرف الصفحة (مثل 'children')
 * @returns {boolean} true إذا كان مسموحاً، false إذا كان ممنوعاً
 */
function hasPermission(page) {
    if (!currentUser) return false;
    // المدير لديه كل الصلاحيات
    if (currentUser.role === ROLES.ADMIN) return true;
    
    const allowedPages = PERMISSIONS[currentUser.role] || [];
    return allowedPages.includes(page);
}

/**
 * التحقق من إمكانية المستخدم تعديل البيانات (وليس فقط قراءتها).
 * @returns {boolean}
 */
function canEdit() {
    if (!currentUser) return false;
    // الباحث لا يمكنه التعديل
    return currentUser.role !== ROLES.RESEARCHER;
}

/**
 * التحقق من إمكانية الوصول للبيانات المالية.
 * @returns {boolean}
 */
function canAccessFinancials() {
    if (!currentUser) return false;
    return currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.ACCOUNTANT;
}

/**
 * إضافة مستخدم جديد (للمدير فقط).
 * @param {object} userData - بيانات المستخدم { name, username, password, role }
 * @returns {Promise<number>} معرف المستخدم الجديد
 */
async function addUser(userData) {
    // التحقق من عدم وجود مستخدم بنفس اسم المستخدم
    const users = await getAllRecords('users');
    if (users.find(u => u.username === userData.username)) {
        throw new Error('اسم المستخدم موجود مسبقاً');
    }
    
    // تشفير كلمة المرور قبل الحفظ
    const newUser = {
        ...userData,
        password: btoa(userData.password)
    };
    return await addRecord('users', newUser);
}

/**
 * تحديث بيانات مستخدم.
 * @param {object} userData - يجب أن يحتوي على id
 * @returns {Promise<number>}
 */
async function updateUser(userData) {
    // إذا تم توفير كلمة مرور جديدة، نشفرها
    if (userData.password && userData.password.length > 0) {
        // نتأكد أنها ليست مشفرة مسبقاً
        if (!userData.password.startsWith('=')) {
            userData.password = btoa(userData.password);
        }
    } else {
        // إذا لم نوفر كلمة مرور، نستبعدها من التحديث
        delete userData.password;
    }
    return await updateRecord('users', userData);
}

/**
 * حذف مستخدم (لا يمكن حذف آخر مدير).
 * @param {number} id - معرف المستخدم
 * @returns {Promise<void>}
 */
async function deleteUser(id) {
    const users = await getAllRecords('users');
    const userToDelete = users.find(u => u.id === id);
    
    if (!userToDelete) {
        throw new Error('المستخدم غير موجود');
    }
    
    // منع حذف آخر مدير في النظام
    if (userToDelete.role === ROLES.ADMIN) {
        const admins = users.filter(u => u.role === ROLES.ADMIN);
        if (admins.length <= 1) {
            throw new Error('لا يمكن حذف آخر مدير في النظام');
        }
    }
    
    // منع المستخدم من حذف نفسه
    if (currentUser && currentUser.id === id) {
        throw new Error('لا يمكنك حذف حسابك الحالي');
    }
    
    await deleteRecord('users', id);
}

/**
 * الحصول على قائمة المستخدمين (بدون كلمات المرور).
 * @returns {Promise<Array>}
 */
async function getUsers() {
    const users = await getAllRecords('users');
    // إزالة كلمات المرور من النتيجة للعرض
    return users.map(u => ({
        ...u,
        password: undefined
    }));
}