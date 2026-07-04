/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - التطبيق الرئيسي
 * ==========================================
 * يدير التوجيه (Router)، تهيئة التطبيق، والأحداث العامة.
 * ينسق بين جميع وحدات النظام.
 */

// ==================== المتغيرات العامة ====================

// قائمة الصفحات
const PAGES = {
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

// ==================== دوال مساعدة ====================

/**
 * عرض إشعار Toast منبثق.
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الإشعار: success | error | warning | info
 * @param {number} duration - مدة العرض بالميلي ثانية (افتراضي 3000)
 */
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // أيقونة حسب النوع
    let icon = 'fa-check-circle';
    switch (type) {
        case 'error': icon = 'fa-times-circle'; break;
        case 'warning': icon = 'fa-exclamation-triangle'; break;
        case 'info': icon = 'fa-info-circle'; break;
        default: icon = 'fa-check-circle';
    }
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas ${icon} text-lg"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // إزالة تلقائية بعد المدة المحددة
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastFadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

/**
 * فتح نافذة Modal عامة.
 * @param {string} title - عنوان النافذة
 * @param {string} bodyHTML - محتوى HTML
 * @param {function|null} onSave - دالة الحفظ (اختياري)
 * @param {string} saveText - نص زر الحفظ
 */
function openModal(title, bodyHTML, onSave = null, saveText = 'حفظ') {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h3 class="text-lg font-bold text-gray-800">${title}</h3>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 transition p-1">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div class="p-6">
            ${bodyHTML}
        </div>
        <div class="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button onclick="closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium">
                إلغاء
            </button>
            ${onSave ? `
                <button id="modalSaveBtn" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
                    <i class="fas fa-save ml-2"></i> ${saveText}
                </button>
            ` : ''}
        </div>
    `;
    
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // ربط زر الحفظ
    if (onSave) {
        const saveBtn = document.getElementById('modalSaveBtn');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse ml-2"></i> جاري الحفظ...';
                try {
                    await onSave();
                    closeModal();
                } catch (error) {
                    showToast('حدث خطأ: ' + error.message, 'error');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `<i class="fas fa-save ml-2"></i> ${saveText}`;
                }
            };
        }
    }
}

/**
 * إغلاق المودال.
 */
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
}

// إغلاق المودال بالنقر على الخلفية
document.addEventListener('click', function(e) {
    if (e.target.id === 'modal-overlay') {
        closeModal();
    }
});

// إغلاق المودال بمفتاح Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ==================== نظام التوجيه (Router) ====================

/**
 * الانتقال إلى صفحة معينة وتحميل محتواها.
 * @param {string} page - معرف الصفحة
 */
async function navigateTo(page) {
    // إذا كانت صفحة تسجيل الدخول، نعرض صفحة تسجيل الدخول
    if (page === 'login') {
        showLoginPage();
        return;
    }
    
    // التحقق من وجود مستخدم مسجل
    if (!currentUser) {
        showLoginPage();
        return;
    }
    
    // التحقق من الصلاحية
    if (!hasPermission(page)) {
        showToast('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
        // الرجوع إلى أول صفحة مسموحة
        const allowedPages = PERMISSIONS[currentUser.role] || [];
        page = allowedPages.length > 0 ? allowedPages[0] : 'dashboard';
    }
    
    // تحديث حالة الروابط في القائمة الجانبية
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    // تحديث عنوان الصفحة
    const pageTitle = document.getElementById('current-page-title');
    if (pageTitle) {
        pageTitle.textContent = PAGES[page] || page;
    }
    
    // إخفاء القائمة الجانبية في الموبايل
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    }
    
    // تحميل محتوى الصفحة
    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'children':
                await loadChildrenPage();
                break;
            case 'sponsors':
                await loadSponsorsPage();
                break;
            case 'sponsorships':
                await loadSponsorshipsPage();
                break;
            case 'donations':
                await loadDonationsPage();
                break;
            case 'visits':
                await loadVisitsPage();
                break;
            case 'reports':
                await loadReportsPage();
                break;
            case 'settings':
                await loadSettingsPage();
                break;
            default:
                document.getElementById('page-content').innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20">
                        <i class="fas fa-exclamation-triangle text-5xl text-gray-300 mb-4"></i>
                        <h2 class="text-xl text-gray-500">الصفحة غير موجودة</h2>
                    </div>`;
        }
    } catch (error) {
        console.error('خطأ في تحميل الصفحة:', error);
        document.getElementById('page-content').innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <i class="fas fa-exclamation-circle text-5xl text-red-300 mb-4"></i>
                <h2 class="text-xl text-red-500">حدث خطأ في تحميل الصفحة</h2>
                <p class="text-gray-500 mt-2">${error.message}</p>
            </div>`;
    }
}

// ==================== تحميل الصفحات ====================

/**
 * صفحة إدارة الأطفال.
 */
async function loadChildrenPage() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">إدارة الأطفال</h2>
                <p class="text-gray-500 mt-1">إضافة وتعديل وحذف بيانات الأطفال</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${canEdit() ? `<button id="addChildBtn" class="btn-primary">
                    <i class="fas fa-plus ml-2"></i> إضافة طفل
                </button>` : ''}
                <button id="importExcelBtn" class="btn-outline">
                    <i class="fas fa-file-import ml-2"></i> استيراد Excel
                </button>
                <input type="file" id="importExcelFile" accept=".xlsx,.xls" class="hidden">
                <button id="importJSONBtn" class="btn-outline">
                    <i class="fas fa-file-import ml-2"></i> استيراد JSON
                </button>
                <input type="file" id="importJSONFile" accept=".json" class="hidden">
                <button id="exportExcelBtn" class="btn-outline">
                    <i class="fas fa-file-export ml-2"></i> Excel
                </button>
                <button id="exportJSONBtn" class="btn-outline">
                    <i class="fas fa-file-export ml-2"></i> JSON
                </button>
            </div>
        </div>
        
        <!-- فلترة وبحث -->
        <div class="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-4">
            <div class="flex flex-wrap gap-3">
                <input type="text" id="searchChildren" placeholder="🔍 بحث عن طفل..." class="search-input max-w-xs">
                <select id="filterStatus" class="max-w-xs">
                    <option value="">جميع الحالات</option>
                    <option value="مكفول">مكفول</option>
                    <option value="غير مكفول">غير مكفول</option>
                </select>
                <button id="clearFilters" class="btn-outline btn-sm">مسح الفلاتر</button>
            </div>
        </div>
        
        <!-- جدول الأطفال -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>تاريخ الميلاد</th>
                            <th>الجنس</th>
                            <th>الحالة</th>
                            <th>المدرسة</th>
                            <th>المستوى</th>
                            <th>الصف</th>
                            <th>المعدل</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="childrenTableBody">
                        <tr><td colspan="9" class="text-center py-6 text-gray-400">جاري التحميل...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="childrenPagination" class="pagination py-3 border-t border-gray-100"></div>
        </div>
    `;
    
    // عرض البيانات
    await renderChildrenTable();
    
    // ربط الأحداث
    if (canEdit()) {
        document.getElementById('addChildBtn').onclick = () => showChildForm();
    }
    
    document.getElementById('importExcelBtn').onclick = () => document.getElementById('importExcelFile').click();
    document.getElementById('importExcelFile').onchange = async (e) => {
        if (e.target.files[0]) {
            await importFromExcel('children', e.target.files[0]);
            await renderChildrenTable();
            e.target.value = '';
        }
    };
    
    document.getElementById('importJSONBtn').onclick = () => document.getElementById('importJSONFile').click();
    document.getElementById('importJSONFile').onchange = async (e) => {
        if (e.target.files[0]) {
            await importFromJSON('children', e.target.files[0]);
            await renderChildrenTable();
            e.target.value = '';
        }
    };
    
    document.getElementById('exportExcelBtn').onclick = () => exportToExcel('children', 'الأطفال');
    document.getElementById('exportJSONBtn').onclick = () => exportToJSON('children', 'الأطفال');
    
    document.getElementById('searchChildren').oninput = () => renderChildrenTable();
    document.getElementById('filterStatus').onchange = () => renderChildrenTable();
    document.getElementById('clearFilters').onclick = () => {
        document.getElementById('searchChildren').value = '';
        document.getElementById('filterStatus').value = '';
        renderChildrenTable();
    };
}

/**
 * عرض جدول الأطفال مع البحث والفلترة و pagination.
 * @param {number} page - رقم الصفحة (يبدأ من 1)
 */
async function renderChildrenTable(page = 1) {
    const searchQuery = document.getElementById('searchChildren')?.value?.trim() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const rowsPerPage = 10;
    
    try {
        let children = await getAllRecords('children');
        
        // فلترة حسب البحث
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            children = children.filter(c => 
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.school && c.school.toLowerCase().includes(query)) ||
                (c.address && c.address.toLowerCase().includes(query))
            );
        }
        
        // فلترة حسب الحالة
        if (statusFilter) {
            children = children.filter(c => c.status === statusFilter);
        }
        
        // ترتيب حسب الاسم
        children.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        
        // Pagination
        const totalPages = Math.ceil(children.length / rowsPerPage) || 1;
        const start = (page - 1) * rowsPerPage;
        const pageItems = children.slice(start, start + rowsPerPage);
        
        // عرض الجدول
        const tbody = document.getElementById('childrenTableBody');
        if (tbody) {
            if (pageItems.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-10 text-gray-400">
                            <i class="fas fa-child text-3xl block mb-2 opacity-50"></i>
                            لا يوجد أطفال مطابقين للبحث
                        </td>
                    </tr>`;
            } else {
                tbody.innerHTML = pageItems.map(child => `
                    <tr>
                        <td class="font-medium">${child.name || '-'}</td>
                        <td>${child.birthDate || '-'}</td>
                        <td>${child.gender || '-'}</td>
                        <td>
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${child.status === 'مكفول' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                                ${child.status || '-'}
                            </span>
                        </td>
                        <td>${child.school || '-'}</td>
                        <td>${child.educationLevel || '-'}</td>
                        <td>${child.grade || '-'}</td>
                        <td>${child.gpa || '-'}</td>
                        <td>
                            <div class="flex gap-1 justify-center">
                                ${canEdit() ? `
                                    <button onclick="editChild(${child.id})" class="btn-outline btn-sm" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="deleteChild(${child.id})" class="btn-danger btn-sm" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                                <button onclick="printChildCardById(${child.id})" class="btn-outline btn-sm" title="بطاقة">
                                    <i class="fas fa-id-card"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        // عرض Pagination
        const paginationDiv = document.getElementById('childrenPagination');
        if (paginationDiv) {
            if (totalPages > 1) {
                let html = '';
                for (let i = 1; i <= totalPages; i++) {
                    html += `<button class="${i === page ? 'active' : ''}" onclick="renderChildrenTable(${i})">${i}</button>`;
                }
                paginationDiv.innerHTML = html;
            } else {
                paginationDiv.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('خطأ في عرض جدول الأطفال:', error);
        const tbody = document.getElementById('childrenTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-red-500 py-4">حدث خطأ في تحميل البيانات</td></tr>';
        }
    }
}

/**
 * عرض نموذج إضافة/تعديل طفل.
 * @param {object|null} child - بيانات الطفل للتعديل، أو null للإضافة
 */
function showChildForm(child = null) {
    const isEdit = child !== null;
    const title = isEdit ? 'تعديل بيانات طفل' : 'إضافة طفل جديد';
    
    const bodyHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label>الاسم الكامل <span class="text-red-500">*</span></label>
                <input type="text" id="childName" value="${child?.name || ''}" required>
            </div>
            <div>
                <label>تاريخ الميلاد</label>
                <input type="date" id="childBirthDate" value="${child?.birthDate || ''}">
            </div>
            <div>
                <label>الجنس</label>
                <select id="childGender">
                    <option value="ذكر" ${child?.gender === 'ذكر' ? 'selected' : ''}>ذكر</option>
                    <option value="أنثى" ${child?.gender === 'أنثى' ? 'selected' : ''}>أنثى</option>
                </select>
            </div>
            <div>
                <label>الحالة</label>
                <select id="childStatus">
                    <option value="غير مكفول" ${child?.status === 'غير مكفول' ? 'selected' : ''}>غير مكفول</option>
                    <option value="مكفول" ${child?.status === 'مكفول' ? 'selected' : ''}>مكفول</option>
                </select>
            </div>
            <div class="md:col-span-2">
                <label>العنوان</label>
                <input type="text" id="childAddress" value="${child?.address || ''}">
            </div>
            <div>
                <label>اسم المدرسة</label>
                <input type="text" id="childSchool" value="${child?.school || ''}">
            </div>
            <div>
                <label>المستوى الدراسي</label>
                <select id="childEducationLevel">
                    <option value="">-- اختر --</option>
                    <option value="ابتدائي" ${child?.educationLevel === 'ابتدائي' ? 'selected' : ''}>ابتدائي</option>
                    <option value="متوسط" ${child?.educationLevel === 'متوسط' ? 'selected' : ''}>متوسط</option>
                    <option value="ثانوي" ${child?.educationLevel === 'ثانوي' ? 'selected' : ''}>ثانوي</option>
                    <option value="جامعي" ${child?.educationLevel === 'جامعي' ? 'selected' : ''}>جامعي</option>
                </select>
            </div>
            <div>
                <label>الصف</label>
                <input type="text" id="childGrade" value="${child?.grade || ''}">
            </div>
            <div>
                <label>المعدل</label>
                <input type="number" id="childGpa" step="0.01" min="0" max="100" value="${child?.gpa || ''}">
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="childTutoring" ${child?.tutoring ? 'checked' : ''}>
                <label class="!mb-0">يحتاج دروس تقوية</label>
            </div>
        </div>
    `;
    
    openModal(title, bodyHTML, async () => {
        // جمع البيانات من النموذج
        const data = {
            name: document.getElementById('childName').value.trim(),
            birthDate: document.getElementById('childBirthDate').value,
            gender: document.getElementById('childGender').value,
            status: document.getElementById('childStatus').value,
            address: document.getElementById('childAddress').value.trim(),
            school: document.getElementById('childSchool').value.trim(),
            educationLevel: document.getElementById('childEducationLevel').value,
            grade: document.getElementById('childGrade').value.trim(),
            gpa: document.getElementById('childGpa').value,
            tutoring: document.getElementById('childTutoring').checked
        };
        
        // التحقق من الاسم
        if (!data.name) {
            throw new Error('الرجاء إدخال اسم الطفل');
        }
        
        if (isEdit) {
            data.id = child.id;
            data.updatedAt = new Date().toISOString();
            await updateRecord('children', data);
            showToast('تم تحديث بيانات الطفل بنجاح', 'success');
        } else {
            data.createdAt = new Date().toISOString();
            await addRecord('children', data);
            showToast('تم إضافة الطفل بنجاح', 'success');
        }
        
        await renderChildrenTable();
    }, isEdit ? 'تحديث' : 'إضافة');
}

/**
 * تعديل طفل - فتح النموذج مع بياناته الحالية.
 */
async function editChild(id) {
    try {
        const child = await getRecordById('children', id);
        if (child) {
            showChildForm(child);
        } else {
            showToast('الطفل غير موجود', 'error');
        }
    } catch (error) {
        showToast('حدث خطأ في جلب بيانات الطفل', 'error');
    }
}

/**
 * حذف طفل بعد التأكيد.
 */
async function deleteChild(id) {
    if (confirm('هل أنت متأكد من حذف هذا الطفل؟\nلا يمكن التراجع عن هذا الإجراء.')) {
        try {
            await deleteRecord('children', id);
            showToast('تم حذف الطفل بنجاح', 'success');
            await renderChildrenTable();
        } catch (error) {
            showToast('فشل حذف الطفل', 'error');
        }
    }
}

/**
 * طباعة بطاقة طفل من المعرف.
 */
async function printChildCardById(id) {
    try {
        const child = await getRecordById('children', id);
        if (child) {
            generateChildCard(child);
        } else {
            showToast('الطفل غير موجود', 'error');
        }
    } catch (error) {
        showToast('حدث خطأ في تحميل بيانات الطفل', 'error');
    }
}

// ==================== صفحات أخرى (مبسطة للتوسع المستقبلي) ====================

async function loadSponsorsPage() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">الكافلون</h2>
            <p class="text-gray-500 mt-1">إدارة بيانات الكافلين والمتبرعين</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 text-center">
            <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">قسم إدارة الكافلين قيد التطوير</p>
        </div>`;
}

async function loadSponsorshipsPage() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">الكفالات</h2>
            <p class="text-gray-500 mt-1">إدارة الكفالات ومتابعتها</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 text-center">
            <i class="fas fa-hand-holding-heart text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">قسم الكفالات قيد التطوير</p>
        </div>`;
}

async function loadDonationsPage() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">التبرعات</h2>
            <p class="text-gray-500 mt-1">إدارة التبرعات والمساهمات</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 text-center">
            <i class="fas fa-donate text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">قسم التبرعات قيد التطوير</p>
        </div>`;
}

async function loadVisitsPage() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">الزيارات</h2>
            <p class="text-gray-500 mt-1">تسجيل ومتابعة الزيارات الميدانية</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 text-center">
            <i class="fas fa-clipboard-check text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">قسم الزيارات قيد التطوير</p>
        </div>`;
}

async function loadSettingsPage() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">الإعدادات</h2>
            <p class="text-gray-500 mt-1">إدارة المستخدمين وإعدادات النظام</p>
        </div>
        
        <!-- بطاقات الإعدادات -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- إدارة المستخدمين -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 class="text-lg font-semibold mb-4">
                    <i class="fas fa-users-cog text-primary-600 ml-2"></i>
                    إدارة المستخدمين
                </h3>
                <div id="usersList" class="space-y-2 mb-4">
                    <p class="text-gray-400">جاري التحميل...</p>
                </div>
                ${currentUser?.role === ROLES.ADMIN ? `
                    <button onclick="showAddUserForm()" class="btn-primary w-full">
                        <i class="fas fa-user-plus ml-2"></i> إضافة مستخدم
                    </button>
                ` : ''}
            </div>
            
            <!-- نسخ احتياطي -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 class="text-lg font-semibold mb-4">
                    <i class="fas fa-database text-primary-600 ml-2"></i>
                    النسخ الاحتياطي
                </h3>
                <div class="space-y-3">
                    <button onclick="exportAllData()" class="btn-outline w-full">
                        <i class="fas fa-download ml-2"></i> تصدير نسخة احتياطية كاملة
                    </button>
                    <button id="importAllBtn" class="btn-outline w-full">
                        <i class="fas fa-upload ml-2"></i> استيراد نسخة احتياطية
                    </button>
                    <input type="file" id="importAllFile" accept=".json" class="hidden">
                </div>
            </div>
        </div>`;
    
    // تحميل قائمة المستخدمين
    await loadUsersList();
    
    // ربط أحداث النسخ الاحتياطي
    document.getElementById('importAllBtn').onclick = () => document.getElementById('importAllFile').click();
    document.getElementById('importAllFile').onchange = async (e) => {
        if (e.target.files[0]) {
            await importAllData(e.target.files[0]);
            e.target.value = '';
        }
    };
}

/**
 * تحميل وعرض قائمة المستخدمين في صفحة الإعدادات.
 */
async function loadUsersList() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    try {
        const users = await getUsers();
        container.innerHTML = users.map(u => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                    <p class="font-medium text-gray-800">${u.name}</p>
                    <p class="text-sm text-gray-500">${u.username} - ${u.role}</p>
                </div>
                ${currentUser?.role === ROLES.ADMIN ? `
                    <button onclick="deleteUserAccount(${u.id})" class="text-red-500 hover:text-red-700 p-1" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">فشل تحميل المستخدمين</p>';
    }
}

/**
 * حذف حساب مستخدم.
 */
async function deleteUserAccount(id) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        try {
            await deleteUser(id);
            showToast('تم حذف المستخدم بنجاح', 'success');
            await loadUsersList();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// ==================== صفحة تسجيل الدخول ====================

function showLoginPage() {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    
    // إخفاء شاشة البداية بعد فترة قصيرة
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }
    }, 800);
}

// ==================== تهيئة التطبيق ====================

/**
 * تهيئة التطبيق عند تحميل الصفحة.
 * يتم استدعاؤها مرة واحدة.
 */
async function initApp() {
    try {
        // فتح قاعدة البيانات
        await openDatabase();
        await initializeDefaultUser();
        console.log('تم تهيئة قاعدة البيانات بنجاح');
    } catch (error) {
        console.error('فشل تهيئة قاعدة البيانات:', error);
        showToast('تعذر الاتصال بقاعدة البيانات المحلية. الرجاء تحديث الصفحة.', 'error');
    }
    
    // استعادة الجلسة السابقة
    const savedUser = restoreSession();
    
    // إخفاء شاشة البداية
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                if (splash.parentElement) splash.remove();
            }, 500);
        }, 1200);
    }
    
    if (savedUser) {
        // مستخدم مسجل دخوله - إظهار التطبيق
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('login-page').classList.add('hidden');
        
        // تحديث معلومات المستخدم في الواجهة
        document.getElementById('user-name-display').textContent = savedUser.name;
        document.getElementById('user-role-display').textContent = savedUser.role;
        document.getElementById('user-avatar').textContent = savedUser.name.charAt(0);
        
        // التنقل للصفحة المطلوبة أو الافتراضية
        const hash = window.location.hash.slice(1) || 'dashboard';
        await navigateTo(hash);
    } else {
        // لا يوجد مستخدم - إظهار تسجيل الدخول
        showLoginPage();
    }
}

// ==================== أحداث عامة ====================

// حدث تغيير الرابط
window.addEventListener('hashchange', async () => {
    const page = window.location.hash.slice(1) || 'dashboard';
    if (currentUser) {
        await navigateTo(page);
    }
});

// زر القائمة الجانبية (للموبايل)
document.addEventListener('DOMContentLoaded', () => {
    // زر فتح القائمة
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebar-close-btn');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
            // إنشاء overlay إذا لم يوجد
            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                document.body.appendChild(overlay);
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('show');
                    overlay.classList.remove('show');
                });
            }
            overlay.classList.add('show');
        });
    }
    
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) overlay.classList.remove('show');
        });
    }
    
    // نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            
            if (!username || !password) {
                errorEl.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور';
                errorEl.classList.remove('hidden');
                return;
            }
            
            // تعطيل زر الدخول مؤقتاً
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse ml-2"></i> جاري الدخول...';
            
            try {
                const user = await login(username, password);
                
                if (user) {
                    errorEl.classList.add('hidden');
                    document.getElementById('login-page').classList.add('hidden');
                    document.getElementById('app-container').classList.remove('hidden');
                    
                    document.getElementById('user-name-display').textContent = user.name;
                    document.getElementById('user-role-display').textContent = user.role;
                    document.getElementById('user-avatar').textContent = user.name.charAt(0);
                    
                    showToast(`مرحباً ${user.name}`, 'success');
                    navigateTo('dashboard');
                } else {
                    errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
                    errorEl.classList.remove('hidden');
                }
            } catch (error) {
                errorEl.textContent = 'حدث خطأ في الاتصال بقاعدة البيانات';
                errorEl.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    // زر تسجيل الخروج
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('هل تريد تسجيل الخروج؟')) {
                logout();
                document.getElementById('app-container').classList.add('hidden');
                showLoginPage();
                showToast('تم تسجيل الخروج', 'info');
            }
        });
    }
    
    // زر تحديث البيانات
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('animate-spin');
            const hash = window.location.hash.slice(1) || 'dashboard';
            await navigateTo(hash);
            setTimeout(() => refreshBtn.classList.remove('animate-spin'), 1000);
            showToast('تم تحديث البيانات', 'info');
        });
    }
});

// النقر على روابط القائمة الجانبية
document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
        e.preventDefault();
        const page = navLink.dataset.page;
        if (page) {
            window.location.hash = page;
        }
    }
});

// بدء التطبيق
window.addEventListener('load', initApp);