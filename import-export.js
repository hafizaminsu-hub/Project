/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - الاستيراد والتصدير
 * ==========================================
 * يدعم: Excel (xlsx) و JSON لجميع الجداول.
 * المكتبات: SheetJS للـ Excel، File API للقراءة.
 */

/**
 * تصدير بيانات جدول إلى ملف JSON.
 * @param {string} storeName - اسم الجدول في IndexedDB
 * @param {string} fileName - اسم الملف المقترح (بدون امتداد)
 */
async function exportToJSON(storeName, fileName) {
    try {
        const data = await getAllRecords(storeName);
        if (data.length === 0) {
            showToast('لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        // تحويل البيانات إلى نص JSON منسق
        const jsonString = JSON.stringify(data, null, 2);
        
        // إنشاء ملف وتنزيله
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        downloadBlob(blob, `${fileName || storeName}.json`);
        
        showToast(`تم تصدير ${data.length} سجل بنجاح`, 'success');
    } catch (error) {
        console.error('خطأ في التصدير إلى JSON:', error);
        showToast('فشل التصدير: ' + error.message, 'error');
    }
}

/**
 * استيراد بيانات من ملف JSON إلى جدول.
 * @param {string} storeName - اسم الجدول
 * @param {File} file - ملف JSON من input[type=file]
 */
async function importFromJSON(storeName, file) {
    try {
        if (!file) {
            showToast('الرجاء اختيار ملف', 'warning');
            return;
        }
        
        // قراءة الملف كنص
        const text = await readFileAsText(file);
        
        // محاولة تحليل JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('الملف لا يحتوي على JSON صالح');
        }
        
        // التأكد أن البيانات مصفوفة
        if (!Array.isArray(data)) {
            // قد يكون الملف بصيغة { tableName: [...] }
            if (data[storeName] && Array.isArray(data[storeName])) {
                data = data[storeName];
            } else {
                throw new Error('الملف لا يحتوي على مصفوفة بيانات صالحة');
            }
        }
        
        if (data.length === 0) {
            showToast('الملف فارغ', 'warning');
            return;
        }
        
        // تأكيد الاستيراد
        if (!confirm(`سيتم استيراد ${data.length} سجل إلى ${storeName}. هل تريد المتابعة؟\n(سيتم مسح البيانات الحالية)`)) {
            return;
        }
        
        // استيراد البيانات (يمسح القديمة أولاً)
        await importRecords(storeName, data);
        showToast(`تم استيراد ${data.length} سجل بنجاح`, 'success');
        
    } catch (error) {
        console.error('خطأ في الاستيراد من JSON:', error);
        showToast('فشل الاستيراد: ' + error.message, 'error');
    }
}

/**
 * تصدير بيانات جدول إلى ملف Excel (xlsx).
 * @param {string} storeName - اسم الجدول
 * @param {string} fileName - اسم الملف (بدون امتداد)
 */
async function exportToExcel(storeName, fileName) {
    try {
        const data = await getAllRecords(storeName);
        if (data.length === 0) {
            showToast('لا توجد بيانات للتصدير', 'warning');
            return;
        }
        
        // تحويل البيانات إلى ورقة عمل Excel
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, storeName);
        
        // تصدير الملف
        XLSX.writeFile(workbook, `${fileName || storeName}.xlsx`);
        showToast(`تم تصدير ${data.length} سجل إلى Excel`, 'success');
        
    } catch (error) {
        console.error('خطأ في التصدير إلى Excel:', error);
        showToast('فشل التصدير: ' + error.message, 'error');
    }
}

/**
 * استيراد بيانات من ملف Excel إلى جدول.
 * @param {string} storeName - اسم الجدول
 * @param {File} file - ملف Excel
 */
async function importFromExcel(storeName, file) {
    try {
        if (!file) {
            showToast('الرجاء اختيار ملف', 'warning');
            return;
        }
        
        // التحقق من امتداد الملف
        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        if (!validExtensions.some(ext => fileName.endsWith(ext))) {
            throw new Error('الرجاء اختيار ملف Excel صالح (.xlsx أو .xls)');
        }
        
        // قراءة الملف
        const data = await readExcelFile(file);
        
        if (data.length === 0) {
            showToast('الملف فارغ', 'warning');
            return;
        }
        
        // تأكيد الاستيراد
        if (!confirm(`سيتم استيراد ${data.length} سجل إلى ${storeName}. هل تريد المتابعة؟\n(سيتم مسح البيانات الحالية)`)) {
            return;
        }
        
        // استيراد البيانات
        await importRecords(storeName, data);
        showToast(`تم استيراد ${data.length} سجل بنجاح`, 'success');
        
    } catch (error) {
        console.error('خطأ في الاستيراد من Excel:', error);
        showToast('فشل الاستيراد: ' + error.message, 'error');
    }
}

/**
 * قراءة ملف Excel وتحويله إلى مصفوفة كائنات JavaScript.
 * @param {File} file - ملف Excel
 * @returns {Promise<Array>} مصفوفة الكائنات
 */
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // قراءة أول ورقة عمل فقط
                const firstSheetName = workbook.SheetNames[0];
                const firstSheet = workbook.Sheets[firstSheetName];
                
                // تحويل إلى JSON
                const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                resolve(json);
            } catch (error) {
                reject(new Error('تعذر قراءة ملف Excel. تأكد من صحة الملف.'));
            }
        };
        
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * قراءة ملف نصي وتحويله إلى string.
 * @param {File} file - الملف
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * تنزيل Blob كملف.
 * @param {Blob} blob - البيانات
 * @param {string} fileName - اسم الملف
 */
function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * تصدير جميع جداول النظام كنسخة احتياطية كاملة (ملف JSON واحد).
 */
async function exportAllData() {
    try {
        const tables = ['children', 'sponsors', 'sponsorships', 'donations', 'visits', 'users'];
        const backup = {};
        
        for (const table of tables) {
            backup[table] = await getAllRecords(table);
        }
        
        // إضافة معلومات النسخة الاحتياطية
        backup._metadata = {
            exportDate: new Date().toISOString(),
            appVersion: '1.0',
            tableCount: tables.length
        };
        
        const jsonString = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const timestamp = new Date().toISOString().split('T')[0];
        downloadBlob(blob, `نسخة_احتياطية_${timestamp}.json`);
        
        showToast('تم تصدير النسخة الاحتياطية الكاملة بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في التصدير الكامل:', error);
        showToast('فشل التصدير: ' + error.message, 'error');
    }
}

/**
 * استيراد نسخة احتياطية كاملة (ملف JSON يحتوي جميع الجداول).
 * @param {File} file - ملف JSON
 */
async function importAllData(file) {
    try {
        if (!file) {
            showToast('الرجاء اختيار ملف', 'warning');
            return;
        }
        
        if (!confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟\nيفضل عمل نسخة احتياطية أولاً.')) {
            return;
        }
        
        const text = await readFileAsText(file);
        const backup = JSON.parse(text);
        
        const tables = ['children', 'sponsors', 'sponsorships', 'donations', 'visits', 'users'];
        let totalImported = 0;
        
        for (const table of tables) {
            if (backup[table] && Array.isArray(backup[table])) {
                await importRecords(table, backup[table]);
                totalImported += backup[table].length;
            }
        }
        
        showToast(`تم استيراد ${totalImported} سجل بنجاح من النسخة الاحتياطية`, 'success');
        
        // إعادة تحميل الصفحة الحالية
        const hash = window.location.hash.slice(1) || 'dashboard';
        window.location.hash = hash;
        
    } catch (error) {
        console.error('خطأ في الاستيراد الكامل:', error);
        showToast('فشل استيراد النسخة الاحتياطية: ' + error.message, 'error');
    }
}