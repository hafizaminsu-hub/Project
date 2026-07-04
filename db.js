/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - قاعدة البيانات (localStorage)
 * ==========================================
 * تم تعديل هذا الملف لاستخدام localStorage فقط لضمان التوافق مع جميع المتصفحات
 * وحل مشكلة "تعذر الاتصال بقاعدة البيانات المحلية".
 *
 * ملاحظة: localStorage يعمل حتى عند فتح الملف مباشرة (file://) ولا يتطلب خادم.
 * الحد الأقصى للتخزين حوالي 5-10 ميجابايت، وهو كافٍ لمعظم حالات الاستخدام.
 */

// تعريف أسماء جداول (مفاتيح localStorage)
const TABLES = {
    children: 'children',
    sponsors: 'sponsors',
    sponsorships: 'sponsorships',
    donations: 'donations',
    visits: 'visits',
    users: 'users'
};

// للتأكد من التوافق مع بقية الكود (لا نحتاج فعلياً لـ db)
let db = null;
let useLocalStorage = true;

// ==================== دوال مساعدة للتعامل مع localStorage ====================

/**
 * قراءة جميع السجلات من جدول (localStorage key)
 * @param {string} storeName - اسم الجدول
 * @returns {Array} المصفوفة المخزنة
 */
function lsGet(storeName) {
    const data = localStorage.getItem(storeName);
    return data ? JSON.parse(data) : [];
}

/**
 * حفظ مصفوفة كاملة في localStorage
 * @param {string} storeName - اسم الجدول
 * @param {Array} records - المصفوفة المراد حفظها
 */
function lsSet(storeName, records) {
    localStorage.setItem(storeName, JSON.stringify(records));
}

// ==================== تهيئة قاعدة البيانات ====================

/**
 * فتح قاعدة البيانات (وهمية للتوافق مع بقية الكود، لا تفعل شيئاً).
 * @returns {Promise<null>}
 */
function openDatabase() {
    return new Promise((resolve) => {
        console.log('استخدام localStorage كقاعدة بيانات');
        // التأكد من وجود جميع الجداول الأساسية
        Object.values(TABLES).forEach(table => {
            if (!localStorage.getItem(table)) {
                lsSet(table, []);
            }
        });
        resolve(null);
    });
}

/**
 * إنشاء المستخدم الافتراضي (مدير) إذا لم يكن هناك أي مستخدم.
 */
async function initializeDefaultUser() {
    try {
        const users = await getAllRecords('users');
        if (users.length === 0) {
            const defaultUser = {
                name: 'مدير النظام',
                username: 'admin',
                password: btoa('admin123'), // تشفير Base64 بسيط
                role: 'مدير'
            };
            await addRecord('users', defaultUser);
            console.log('تم إنشاء المستخدم الافتراضي: admin / admin123');
        }
    } catch (error) {
        console.error('خطأ في إنشاء المستخدم الافتراضي:', error);
    }
}

// ==================== دوال CRUD الأساسية ====================

/**
 * إضافة سجل جديد إلى جدول
 * @param {string} storeName - اسم الجدول
 * @param {object} record - السجل (بدون id)
 * @returns {Promise<number>} المعرف الجديد (id)
 */
function addRecord(storeName, record) {
    return new Promise((resolve, reject) => {
        try {
            const records = lsGet(storeName);
            // حساب id جديد (أكبر id موجود + 1، أو 1 إذا كانت المصفوفة فارغة)
            const newId = records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1;
            const newRecord = { ...record, id: newId };
            records.push(newRecord);
            lsSet(storeName, records);
            resolve(newId);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * تحديث سجل موجود
 * @param {string} storeName - اسم الجدول
 * @param {object} record - السجل مع id
 * @returns {Promise<number>} المعرف
 */
function updateRecord(storeName, record) {
    return new Promise((resolve, reject) => {
        try {
            const records = lsGet(storeName);
            const index = records.findIndex(r => r.id === record.id);
            if (index !== -1) {
                records[index] = { ...record };
                lsSet(storeName, records);
                resolve(record.id);
            } else {
                reject(new Error(`السجل ذو المعرف ${record.id} غير موجود في ${storeName}`));
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * حذف سجل بواسطة المعرف
 * @param {string} storeName - اسم الجدول
 * @param {number} id - المعرف
 * @returns {Promise<void>}
 */
function deleteRecord(storeName, id) {
    return new Promise((resolve, reject) => {
        try {
            let records = lsGet(storeName);
            const newRecords = records.filter(r => r.id !== id);
            lsSet(storeName, newRecords);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * جلب جميع سجلات جدول
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
function getAllRecords(storeName) {
    return new Promise((resolve) => {
        resolve(lsGet(storeName));
    });
}

/**
 * جلب سجل واحد حسب المعرف
 * @param {string} storeName
 * @param {number} id
 * @returns {Promise<object|null>}
 */
function getRecordById(storeName, id) {
    return new Promise((resolve) => {
        const records = lsGet(storeName);
        const record = records.find(r => r.id === id);
        resolve(record || null);
    });
}

/**
 * حذف جميع سجلات جدول (تفريغ)
 * @param {string} storeName
 * @returns {Promise<void>}
 */
function clearStore(storeName) {
    return new Promise((resolve) => {
        lsSet(storeName, []);
        resolve();
    });
}

/**
 * استيراد مصفوفة سجلات إلى جدول (يستبدل البيانات القديمة)
 * @param {string} storeName
 * @param {Array} records
 * @returns {Promise<void>}
 */
async function importRecords(storeName, records) {
    // نمسح البيانات القديمة ثم نحفظ الجديدة
    lsSet(storeName, records);
    return Promise.resolve();
}

/**
 * الحصول على عدد السجلات في جدول
 * @param {string} storeName
 * @returns {Promise<number>}
 */
function getCount(storeName) {
    return new Promise((resolve) => {
        const records = lsGet(storeName);
        resolve(records.length);
    });
}