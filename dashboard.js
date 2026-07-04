/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - لوحة التحكم
 * ==========================================
 * يعرض الإحصائيات والرسوم البيانية وآخر العمليات.
 * يستخدم Chart.js للرسوم البيانية.
 */

// متغيرات لتخزين كائنات الرسوم البيانية (لتدميرها عند التحديث)
let childrenChart = null;
let donationsChart = null;

/**
 * تحميل وعرض محتوى لوحة التحكم كاملاً.
 * يتم استدعاؤها عند الانتقال إلى صفحة dashboard.
 */
async function loadDashboard() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
        <!-- عنوان الصفحة -->
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-800">لوحة التحكم</h2>
            <p class="text-gray-500 mt-1">نظرة عامة على أداء المؤسسة</p>
        </div>

        <!-- بطاقات الإحصائيات -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6" id="statsGrid">
            <!-- سيتم تعبئتها ديناميكياً -->
        </div>

        <!-- الرسوم البيانية -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- رسم بياني: حالة الأطفال (دائري) -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-chart-pie text-primary-600 ml-2"></i>
                    حالة الأطفال
                </h3>
                <div class="h-64">
                    <canvas id="childrenStatusChart"></canvas>
                </div>
            </div>
            
            <!-- رسم بياني: التبرعات الشهرية (أعمدة) -->
            <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-chart-bar text-primary-600 ml-2"></i>
                    التبرعات الشهرية (آخر 6 أشهر)
                </h3>
                <div class="h-64">
                    <canvas id="donationsMonthlyChart"></canvas>
                </div>
            </div>
        </div>

        <!-- آخر العمليات -->
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-history text-primary-600 ml-2"></i>
                آخر العمليات
            </h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>الوصف</th>
                            <th>القيمة</th>
                        </tr>
                    </thead>
                    <tbody id="recentActivitiesBody">
                        <tr>
                            <td colspan="4" class="text-center text-gray-400 py-6">
                                <i class="fas fa-spinner fa-pulse ml-2"></i>
                                جاري تحميل البيانات...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // تحديث البيانات
    await Promise.all([
        updateDashboardStats(),
        renderCharts(),
        loadRecentActivities()
    ]);
}

/**
 * تحديث بطاقات الإحصائيات العلوية.
 * تستخرج البيانات من جميع الجداول وتحسب المؤشرات.
 */
async function updateDashboardStats() {
    try {
        // جلب جميع البيانات المطلوبة
        const [children, sponsors, sponsorships, donations, visits] = await Promise.all([
            getAllRecords('children'),
            getAllRecords('sponsors'),
            getAllRecords('sponsorships'),
            getAllRecords('donations'),
            getAllRecords('visits')
        ]);

        // حساب الإحصائيات
        const totalChildren = children.length;
        const sponsoredChildren = children.filter(c => c.status === 'مكفول').length;
        const unsponsoredChildren = totalChildren - sponsoredChildren;
        const totalSponsors = sponsors.length;
        
        // حساب إجمالي التبرعات
        const totalDonations = donations.reduce((sum, d) => {
            return sum + (parseFloat(d.amount) || 0);
        }, 0);
        
        // حساب إجمالي الكفالات النشطة
        const activeSponsorships = sponsorships.filter(s => s.status === 'نشطة' || !s.status);
        const totalSponsorshipsAmount = activeSponsorships.reduce((sum, s) => {
            return sum + (parseFloat(s.amount) || 0);
        }, 0);
        
        // عدد الزيارات هذا الشهر
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const visitsThisMonth = visits.filter(v => v.date && v.date.startsWith(thisMonth)).length;

        // تعريف البطاقات
        const stats = [
            {
                icon: 'fa-child',
                iconBg: 'bg-primary-100',
                iconColor: 'text-primary-600',
                number: totalChildren,
                label: 'إجمالي الأطفال',
                change: null
            },
            {
                icon: 'fa-check-circle',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
                number: sponsoredChildren,
                label: 'الأطفال المكفولين',
                change: null
            },
            {
                icon: 'fa-exclamation-circle',
                iconBg: 'bg-yellow-100',
                iconColor: 'text-yellow-600',
                number: unsponsoredChildren,
                label: 'غير مكفولين',
                change: null
            },
            {
                icon: 'fa-users',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                number: totalSponsors,
                label: 'الكافلين',
                change: null
            },
            {
                icon: 'fa-donate',
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                number: totalDonations.toLocaleString('ar-SA') + ' ر.س',
                label: 'إجمالي التبرعات',
                change: null
            },
            {
                icon: 'fa-hand-holding-heart',
                iconBg: 'bg-pink-100',
                iconColor: 'text-pink-600',
                number: totalSponsorshipsAmount.toLocaleString('ar-SA') + ' ر.س',
                label: 'إجمالي الكفالات',
                change: null
            }
        ];

        // عرض البطاقات
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = stats.map(stat => `
                <div class="stat-card group">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">${stat.label}</p>
                            <p class="text-2xl font-bold text-gray-800">${stat.number}</p>
                        </div>
                        <div class="w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="fas ${stat.icon} ${stat.iconColor} text-xl"></i>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات:', error);
        showToast('حدث خطأ في تحميل الإحصائيات', 'error');
    }
}

/**
 * رسم المخططات البيانية باستخدام Chart.js.
 * - مخطط دائري لحالة الأطفال (مكفول / غير مكفول)
 * - مخطط أعمدة للتبرعات الشهرية
 */
async function renderCharts() {
    try {
        const [children, donations] = await Promise.all([
            getAllRecords('children'),
            getAllRecords('donations')
        ]);

        // --- مخطط حالة الأطفال (دائري) ---
        const sponsoredCount = children.filter(c => c.status === 'مكفول').length;
        const unsponsoredCount = children.filter(c => c.status !== 'مكفول').length;

        const ctxPie = document.getElementById('childrenStatusChart');
        if (ctxPie) {
            // تدمير المخطط القديم إذا وجد
            if (childrenChart) childrenChart.destroy();
            
            childrenChart = new Chart(ctxPie.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['مكفول', 'غير مكفول'],
                    datasets: [{
                        data: [sponsoredCount, unsponsoredCount],
                        backgroundColor: ['#14b8a6', '#f59e0b'],
                        borderColor: ['#ffffff', '#ffffff'],
                        borderWidth: 3,
                        hoverBorderWidth: 4,
                        hoverBorderColor: ['#0f766e', '#d97706']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: 'Tajawal', size: 13 },
                                padding: 20,
                                usePointStyle: true,
                                pointStyleWidth: 10
                            }
                        }
                    }
                }
            });
        }

        // --- مخطط التبرعات الشهرية (أعمدة) ---
        const monthlyData = getMonthlyDonations(donations, 6);
        const ctxBar = document.getElementById('donationsMonthlyChart');
        
        if (ctxBar) {
            // تدمير المخطط القديم إذا وجد
            if (donationsChart) donationsChart.destroy();
            
            donationsChart = new Chart(ctxBar.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: monthlyData.labels,
                    datasets: [{
                        label: 'التبرعات (ريال سعودي)',
                        data: monthlyData.values,
                        backgroundColor: [
                            'rgba(20, 184, 166, 0.8)',
                            'rgba(20, 184, 166, 0.7)',
                            'rgba(20, 184, 166, 0.6)',
                            'rgba(20, 184, 166, 0.5)',
                            'rgba(20, 184, 166, 0.4)',
                            'rgba(20, 184, 166, 0.3)'
                        ],
                        borderColor: '#0f766e',
                        borderWidth: 1,
                        borderRadius: 8,
                        hoverBackgroundColor: '#0f766e'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => value.toLocaleString('ar-SA')
                            }
                        },
                        x: {
                            ticks: {
                                font: { family: 'Tajawal', size: 11 }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('خطأ في رسم المخططات:', error);
    }
}

/**
 * تجميع التبرعات حسب الشهور الأخيرة.
 * @param {Array} donations - مصفوفة التبرعات
 * @param {number} monthsCount - عدد الأشهر المطلوبة (افتراضي 6)
 * @returns {object} { labels: مصفوفة أسماء الشهور, values: مصفوفة القيم }
 */
function getMonthlyDonations(donations, monthsCount = 6) {
    const months = [];
    const now = new Date();
    
    // إنشاء قائمة بالأشهر المطلوبة
    for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
        months.push({ key: monthKey, name: monthName, total: 0 });
    }

    // جمع التبرعات لكل شهر
    donations.forEach(donation => {
        if (donation.date) {
            const date = new Date(donation.date);
            if (!isNaN(date.getTime())) {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const month = months.find(m => m.key === key);
                if (month) {
                    month.total += parseFloat(donation.amount) || 0;
                }
            }
        }
    });

    return {
        labels: months.map(m => m.name),
        values: months.map(m => m.total)
    };
}

/**
 * تحميل آخر العمليات (كفالات، تبرعات، زيارات) ودمجها في قائمة واحدة.
 * تعرض آخر 10 عمليات مرتبة تنازلياً حسب التاريخ.
 */
async function loadRecentActivities() {
    try {
        const tbody = document.getElementById('recentActivitiesBody');
        if (!tbody) return;

        // جلب البيانات من الجداول المختلفة
        const [sponsorships, donations, visits, children, sponsors] = await Promise.all([
            getAllRecords('sponsorships'),
            getAllRecords('donations'),
            getAllRecords('visits'),
            getAllRecords('children'),
            getAllRecords('sponsors')
        ]);

        // إنشاء قاموس للأسماء للعرض
        const childrenMap = {};
        children.forEach(c => { childrenMap[c.id] = c.name || 'طفل'; });
        const sponsorsMap = {};
        sponsors.forEach(s => { sponsorsMap[s.id] = s.name || 'كافل'; });

        let activities = [];

        // إضافة الكفالات
        sponsorships.forEach(s => {
            activities.push({
                date: s.startDate || s.createdAt || '',
                type: 'كفالة',
                description: `كفالة ${childrenMap[s.childId] || 'طفل'} - ${sponsorsMap[s.sponsorId] || 'كافل'}`,
                value: parseFloat(s.amount) || 0
            });
        });

        // إضافة التبرعات
        donations.forEach(d => {
            activities.push({
                date: d.date || '',
                type: 'تبرع',
                description: `تبرع ${d.type || 'عام'} - ${d.name || 'متبرع'}`,
                value: parseFloat(d.amount) || 0
            });
        });

        // إضافة الزيارات
        visits.forEach(v => {
            activities.push({
                date: v.date || '',
                type: 'زيارة',
                description: `زيارة ${childrenMap[v.childId] || 'طفل'} - ${v.researcher || 'باحث'}`,
                value: 0
            });
        });

        // ترتيب تنازلي حسب التاريخ
        activities.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        // أخذ آخر 10 عمليات فقط
        activities = activities.slice(0, 10);

        // عرض العمليات في الجدول
        if (activities.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-gray-400 py-8">
                        <i class="fas fa-inbox text-2xl block mb-2"></i>
                        لا توجد عمليات حديثة
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = activities.map(a => {
                // تنسيق التاريخ
                let formattedDate = a.date;
                try {
                    const d = new Date(a.date);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString('ar-SA');
                    }
                } catch (e) {}
                
                // تحديد أيقونة النوع
                let typeIcon = '';
                let typeColor = '';
                switch (a.type) {
                    case 'كفالة':
                        typeIcon = 'fa-hand-holding-heart';
                        typeColor = 'text-pink-600';
                        break;
                    case 'تبرع':
                        typeIcon = 'fa-donate';
                        typeColor = 'text-purple-600';
                        break;
                    case 'زيارة':
                        typeIcon = 'fa-clipboard-check';
                        typeColor = 'text-blue-600';
                        break;
                }
                
                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>
                            <span class="inline-flex items-center gap-1">
                                <i class="fas ${typeIcon} ${typeColor}"></i>
                                ${a.type}
                            </span>
                        </td>
                        <td>${a.description}</td>
                        <td>${a.value > 0 ? a.value.toLocaleString('ar-SA') + ' ر.س' : '-'}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('خطأ في تحميل آخر العمليات:', error);
        const tbody = document.getElementById('recentActivitiesBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">حدث خطأ في تحميل البيانات</td></tr>';
        }
    }
}