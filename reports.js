/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - التقارير PDF
 * ==========================================
 * يستخدم jsPDF و jspdf-autotable لإنشاء تقارير احترافية.
 * يدعم: بطاقة طفل، كشف كفالات، تقرير شهري، تقرير سنوي.
 */

/**
 * إنشاء بطاقة طفل بصيغة PDF.
 * تحتوي على بيانات الطفل كاملة مع إمكانية إضافة صورته.
 * @param {object} child - كائن يحتوي بيانات الطفل
 */
function generateChildCard(child) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // تفعيل دعم اللغة العربية
    doc.setR2L(true);
    
    // الخطوط والألوان
    const primaryColor = [15, 118, 110]; // Teal-700
    const secondaryColor = [100, 116, 139]; // Slate-500

    // خلفية رأسية بسيطة
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 35, 'F');

    // عنوان البطاقة
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('بطاقة طفل', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('مؤسسة رعاية الأيتام', 105, 25, { align: 'center' });

    // إطار الصورة
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(1.5);
    doc.rect(78, 45, 54, 54);

    // صورة الطفل (إن وجدت)
    if (child.image && child.image.startsWith('data:image')) {
        try {
            doc.addImage(child.image, 'JPEG', 80, 47, 50, 50);
        } catch (e) {
            // صورة افتراضية عند الفشل
            doc.setFontSize(35);
            doc.setTextColor(15, 118, 110);
            doc.text('👶', 107, 80, { align: 'center' });
        }
    } else {
        // أيقونة افتراضية
        doc.setFontSize(35);
        doc.setTextColor(15, 118, 110);
        doc.text('👶', 107, 80, { align: 'center' });
    }

    // بيانات الطفل
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    
    const fields = [
        { label: 'الاسم الكامل', value: child.name || '-' },
        { label: 'تاريخ الميلاد', value: child.birthDate || '-' },
        { label: 'الجنس', value: child.gender || '-' },
        { label: 'الحالة', value: child.status || '-' },
        { label: 'العنوان', value: child.address || '-' },
        { label: 'اسم المدرسة', value: child.school || '-' },
        { label: 'المستوى الدراسي', value: child.educationLevel || '-' },
        { label: 'الصف', value: child.grade || '-' },
        { label: 'المعدل', value: child.gpa || '-' },
        { label: 'يحتاج دروس تقوية', value: child.tutoring ? 'نعم' : 'لا' }
    ];

    let y = 110;
    const lineHeight = 10;
    const labelX = 130;
    const valueX = 80;

    fields.forEach(field => {
        // لون مختلف للعنوان والقيمة
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.text(field.label + ':', labelX, y);
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(11);
        doc.text(field.value, valueX, y);
        
        // خط فاصل خفيف
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(20, y + 3, 190, y + 3);
        
        y += lineHeight;
    });

    // تذييل البطاقة
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const printDate = new Date().toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`تاريخ الطباعة: ${printDate}`, 105, 275, { align: 'center' });
    doc.text('مؤسسة رعاية الأيتام - جميع الحقوق محفوظة', 105, 283, { align: 'center' });

    // حفظ الملف
    const fileName = `بطاقة_${child.name || 'طفل'}.pdf`;
    doc.save(fileName);
}

/**
 * إنشاء كشف كفالات PDF.
 * @param {Array} sponsorships - مصفوفة كائنات الكفالات مع أسماء الأطفال والكافلين
 */
function generateSponsorshipReport(sponsorships) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    doc.setR2L(true);
    
    // العنوان
    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110);
    doc.text('كشف الكفالات', 148, 15, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    const reportDate = new Date().toLocaleDateString('ar-SA');
    doc.text(`تاريخ التقرير: ${reportDate}`, 148, 25, { align: 'center' });

    // خط فاصل
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.8);
    doc.line(20, 30, 277, 30);

    // إعداد الجدول
    const columns = [
        { header: 'الطفل', dataKey: 'childName' },
        { header: 'الكافل', dataKey: 'sponsorName' },
        { header: 'قيمة الكفالة', dataKey: 'amount' },
        { header: 'تاريخ البداية', dataKey: 'startDate' },
        { header: 'تاريخ النهاية', dataKey: 'endDate' },
        { header: 'الحالة', dataKey: 'status' }
    ];

    const rows = sponsorships.map(s => ({
        childName: s.childName || '-',
        sponsorName: s.sponsorName || '-',
        amount: s.amount ? parseFloat(s.amount).toLocaleString('ar-SA') + ' ر.س' : '-',
        startDate: s.startDate || '-',
        endDate: s.endDate || '-',
        status: s.status || 'نشطة'
    }));

    doc.autoTable({
        columns,
        body: rows,
        startY: 38,
        styles: {
            halign: 'right',
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 5
        },
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [240, 253, 250]
        },
        margin: { left: 15, right: 15 }
    });

    // تذييل
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('مؤسسة رعاية الأيتام - نظام الإدارة', 148, finalY, { align: 'center' });

    doc.save(`كشف_الكفالات_${Date.now()}.pdf`);
}

/**
 * إنشاء تقرير شهري PDF.
 * @param {string} month - الشهر بصيغة 'YYYY-MM'
 * @param {object} data - بيانات التقرير { donationsTotal, sponsorshipsTotal, visitsCount, newChildren }
 */
function generateMonthlyReport(month, data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setR2L(true);

    // العنوان
    doc.setFontSize(22);
    doc.setTextColor(15, 118, 110);
    doc.text(`التقرير الشهري - ${month}`, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`, 105, 30, { align: 'center' });

    // ملخص المؤشرات
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    
    const summaryItems = [
        { label: 'إجمالي التبرعات', value: (data.donationsTotal || 0).toLocaleString('ar-SA') + ' ر.س' },
        { label: 'إجمالي الكفالات', value: (data.sponsorshipsTotal || 0).toLocaleString('ar-SA') + ' ر.س' },
        { label: 'عدد الزيارات الميدانية', value: data.visitsCount || 0 },
        { label: 'الأطفال المسجلين حديثاً', value: data.newChildren || 0 }
    ];

    let y = 50;
    summaryItems.forEach(item => {
        doc.setFontSize(13);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label + ':', 140, y);
        doc.setTextColor(15, 118, 110);
        doc.setFontSize(14);
        doc.text(String(item.value), 70, y);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(20, y + 5, 190, y + 5);
        y += 18;
    });

    // تذييل
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('مؤسسة رعاية الأيتام', 105, 280, { align: 'center' });

    doc.save(`تقرير_شهري_${month}.pdf`);
}

/**
 * إنشاء تقرير سنوي PDF.
 * @param {number} year - السنة
 * @param {object} summary - ملخص سنوي
 */
function generateAnnualReport(year, summary) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setR2L(true);

    // غلاف بسيط
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(30);
    doc.text(`التقرير السنوي`, 105, 100, { align: 'center' });
    doc.setFontSize(24);
    doc.text(`${year}`, 105, 120, { align: 'center' });
    doc.setFontSize(14);
    doc.text('مؤسسة رعاية الأيتام', 105, 145, { align: 'center' });

    // صفحة جديدة للملخص
    doc.addPage();
    doc.setR2L(true);
    
    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110);
    doc.text('ملخص السنة', 105, 25, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(51, 65, 85);
    
    const items = [
        { label: 'إجمالي الإيرادات', value: (summary.totalIncome || 0).toLocaleString('ar-SA') + ' ر.س' },
        { label: 'عدد الكافلين', value: summary.sponsorsCount || 0 },
        { label: 'عدد الأطفال المكفولين', value: summary.sponsoredChildren || 0 },
        { label: 'إجمالي الزيارات', value: summary.totalVisits || 0 },
        { label: 'أبرز الإنجازات', value: summary.achievements || 'لا يوجد' }
    ];

    let y = 50;
    items.forEach(item => {
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label + ':', 140, y);
        doc.setTextColor(15, 118, 110);
        doc.text(String(item.value), 70, y);
        y += 20;
    });

    doc.save(`تقرير_سنوي_${year}.pdf`);
}

/**
 * تحميل صفحة التقارير مع واجهة اختيار نوع التقرير.
 */
async function loadReportsPage() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">التقارير</h2>
            <p class="text-gray-500 mt-1">إنشاء وتصدير التقارير بصيغة PDF</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- بطاقة طفل -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                        <i class="fas fa-id-card text-2xl text-primary-600"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">بطاقة طفل</h3>
                        <p class="text-sm text-gray-500">طباعة بطاقة تعريفية لطفل محدد</p>
                    </div>
                </div>
                <div class="space-y-3">
                    <label class="text-sm">اختر الطفل</label>
                    <select id="reportChildSelect" class="w-full">
                        <option value="">-- اختر طفلاً --</option>
                    </select>
                    <button onclick="printSelectedChildCard()" class="btn-primary w-full">
                        <i class="fas fa-print ml-2"></i> طباعة البطاقة
                    </button>
                </div>
            </div>

            <!-- كشف كفالات -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center">
                        <i class="fas fa-hand-holding-heart text-2xl text-pink-600"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">كشف الكفالات</h3>
                        <p class="text-sm text-gray-500">تقرير بجميع الكفالات النشطة</p>
                    </div>
                </div>
                <button onclick="printSponsorshipReport()" class="btn-primary w-full">
                    <i class="fas fa-file-pdf ml-2"></i> تصدير كشف الكفالات
                </button>
            </div>

            <!-- تقرير شهري -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                        <i class="fas fa-calendar-alt text-2xl text-blue-600"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">تقرير شهري</h3>
                        <p class="text-sm text-gray-500">ملخص النشاط الشهري</p>
                    </div>
                </div>
                <div class="space-y-3">
                    <label class="text-sm">اختر الشهر</label>
                    <input type="month" id="reportMonth" class="w-full">
                    <button onclick="printMonthlyReport()" class="btn-primary w-full">
                        <i class="fas fa-file-pdf ml-2"></i> تصدير التقرير الشهري
                    </button>
                </div>
            </div>

            <!-- تقرير سنوي -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                        <i class="fas fa-chart-line text-2xl text-purple-600"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">تقرير سنوي</h3>
                        <p class="text-sm text-gray-500">تقرير شامل عن السنة</p>
                    </div>
                </div>
                <div class="space-y-3">
                    <label class="text-sm">اختر السنة</label>
                    <select id="reportYear" class="w-full">
                        ${generateYearOptions()}
                    </select>
                    <button onclick="printAnnualReport()" class="btn-primary w-full">
                        <i class="fas fa-file-pdf ml-2"></i> تصدير التقرير السنوي
                    </button>
                </div>
            </div>
        </div>
    `;

    // تحميل قائمة الأطفال في القائمة المنسدلة
    await populateChildSelect();
}

/**
 * ملء قائمة الأطفال المنسدلة في صفحة التقارير.
 */
async function populateChildSelect() {
    try {
        const children = await getAllRecords('children');
        const select = document.getElementById('reportChildSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- اختر طفلاً --</option>' +
            children.map(c => `<option value="${c.id}">${c.name || 'طفل بدون اسم'}</option>`).join('');
    } catch (error) {
        console.error('خطأ في تحميل قائمة الأطفال:', error);
    }
}

/**
 * توليد خيارات السنوات (من 2020 إلى السنة الحالية + 1).
 */
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '';
    for (let year = 2020; year <= currentYear + 1; year++) {
        const selected = year === currentYear ? 'selected' : '';
        options += `<option value="${year}" ${selected}>${year}</option>`;
    }
    return options;
}

// ==================== دوال الطباعة من صفحة التقارير ====================

async function printSelectedChildCard() {
    const select = document.getElementById('reportChildSelect');
    if (!select || !select.value) {
        showToast('الرجاء اختيار طفل أولاً', 'warning');
        return;
    }
    try {
        const child = await getRecordById('children', parseInt(select.value));
        if (child) {
            generateChildCard(child);
        } else {
            showToast('الطفل غير موجود', 'error');
        }
    } catch (error) {
        showToast('حدث خطأ في تحميل بيانات الطفل', 'error');
    }
}

async function printSponsorshipReport() {
    try {
        const [sponsorships, children, sponsors] = await Promise.all([
            getAllRecords('sponsorships'),
            getAllRecords('children'),
            getAllRecords('sponsors')
        ]);

        const childrenMap = {};
        children.forEach(c => { childrenMap[c.id] = c.name || 'غير معروف'; });
        const sponsorsMap = {};
        sponsors.forEach(s => { sponsorsMap[s.id] = s.name || 'غير معروف'; });

        const reportData = sponsorships.map(s => ({
            ...s,
            childName: childrenMap[s.childId] || 'غير معروف',
            sponsorName: sponsorsMap[s.sponsorId] || 'غير معروف'
        }));

        generateSponsorshipReport(reportData);
    } catch (error) {
        showToast('حدث خطأ في إعداد التقرير', 'error');
    }
}

async function printMonthlyReport() {
    const monthInput = document.getElementById('reportMonth');
    if (!monthInput || !monthInput.value) {
        showToast('الرجاء اختيار شهر', 'warning');
        return;
    }

    try {
        const [donations, sponsorships, visits, children] = await Promise.all([
            getAllRecords('donations'),
            getAllRecords('sponsorships'),
            getAllRecords('visits'),
            getAllRecords('children')
        ]);

        const month = monthInput.value;
        
        // تصفية البيانات للشهر المحدد
        const monthDonations = donations.filter(d => d.date && d.date.startsWith(month));
        const monthSponsorships = sponsorships.filter(s => s.startDate && s.startDate.startsWith(month));
        const monthVisits = visits.filter(v => v.date && v.date.startsWith(month));
        const monthChildren = children.filter(c => c.createdAt && c.createdAt.startsWith(month));

        const data = {
            donationsTotal: monthDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
            sponsorshipsTotal: monthSponsorships.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0),
            visitsCount: monthVisits.length,
            newChildren: monthChildren.length
        };

        generateMonthlyReport(month, data);
    } catch (error) {
        showToast('حدث خطأ في إعداد التقرير', 'error');
    }
}

async function printAnnualReport() {
    const yearSelect = document.getElementById('reportYear');
    if (!yearSelect || !yearSelect.value) {
        showToast('الرجاء اختيار سنة', 'warning');
        return;
    }

    try {
        const year = yearSelect.value;
        const [donations, sponsorships, visits, children, sponsors] = await Promise.all([
            getAllRecords('donations'),
            getAllRecords('sponsorships'),
            getAllRecords('visits'),
            getAllRecords('children'),
            getAllRecords('sponsors')
        ]);

        // تصفية حسب السنة
        const yearDonations = donations.filter(d => d.date && d.date.startsWith(year));
        const yearSponsorships = sponsorships.filter(s => s.startDate && s.startDate.startsWith(year));
        const yearVisits = visits.filter(v => v.date && v.date.startsWith(year));

        const summary = {
            totalIncome: yearDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) +
                        yearSponsorships.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0),
            sponsorsCount: sponsors.length,
            sponsoredChildren: children.filter(c => c.status === 'مكفول').length,
            totalVisits: yearVisits.length,
            achievements: ''
        };

        generateAnnualReport(parseInt(year), summary);
    } catch (error) {
        showToast('حدث خطأ في إعداد التقرير', 'error');
    }
}