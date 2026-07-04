/**
 * ==========================================
 * نظام إدارة مؤسسة الأيتام - Service Worker
 * ==========================================
 * يدعم التخزين المؤقت (Caching) للعمل دون اتصال.
 * استراتيجية: Cache First مع تحديث في الخلفية.
 */

// اسم الكاش ونسخته (تغيير الإصدار يمسح الكاش القديم)
const CACHE_NAME = 'orphanage-cache-v2';

// الملفات التي سيتم تخزينها مؤقتاً عند تثبيت Service Worker
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'app.js',
    'db.js',
    'auth.js',
    'dashboard.js',
    'reports.js',
    'import-export.js',
    'manifest.json',
    'sw.js'
];

// ==================== حدث التثبيت ====================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] جاري التثبيت...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] تخزين الملفات الأساسية');
                return cache.addAll(urlsToCache).catch(err => {
                    console.warn('[Service Worker] بعض الملفات فشل تخزينها:', err);
                });
            })
            .then(() => {
                console.log('[Service Worker] تم التثبيت بنجاح');
                // تفعيل Service Worker مباشرة دون انتظار إغلاق التبويبات
                return self.skipWaiting();
            })
    );
});

// ==================== حدث التفعيل ====================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] جاري التفعيل...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // حذف الكاش القديم (الإصدارات السابقة)
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] تم التفعيل بنجاح');
            // السيطرة على جميع التبويبات المفتوحة
            return self.clients.claim();
        })
    );
});

// ==================== حدث الجلب (Fetch) ====================
self.addEventListener('fetch', (event) => {
    // نتجاهل طلبات POST و PUT و DELETE (لا تخزن)
    if (event.request.method !== 'GET') {
        return;
    }
    
    // نتجاهل طلبات chrome-extension والطلبات الخارجية غير الآمنة
    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // نعيد النسخة المخزنة ونحدث الكاش في الخلفية
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        // نخزن النسخة الجديدة إذا كانت صالحة
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return networkResponse;
                    }).catch(() => {
                        // فشل التحديث - نكتفي بالنسخة المخزنة
                        console.log('[Service Worker] تعذر تحديث:', event.request.url);
                    });
                    
                    return cachedResponse;
                }
                
                // لا توجد نسخة مخزنة - نجلب من الشبكة
                return fetch(event.request).then((networkResponse) => {
                    // نخزن النسخة للاستخدام المستقبلي (فقط الطلبات الناجحة)
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    // فشل الاتصال ولا توجد نسخة مخزنة
                    console.log('[Service Worker] غير متصل ولا توجد نسخة مخزنة:', event.request.url);
                    
                    // للطلبات التي تطلب HTML، نعيد صفحة البداية
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/index.html');
                    }
                    
                    // لباقي الطلبات نعيد خطأ
                    return new Response('غير متصل بالإنترنت', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// ==================== حدث الرسائل ====================
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    // يمكن إضافة أوامر أخرى مثل تحديث الكاش يدوياً
    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[Service Worker] تم مسح الكاش يدوياً');
        });
    }
});

console.log('[Service Worker] تم تحميل ملف Service Worker');