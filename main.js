// main.js - Flutter Portfolio SPA Logic with Firebase Integration
document.addEventListener('DOMContentLoaded', () => {
    console.log('Flutter Portfolio Loaded');

    // --- FIREBASE INITIALIZATION ---
    let db, auth;
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            console.log("Firebase initialized successfully. Projects are ready to sync.");
        } else {
            console.error("Firebase SDK not loaded! Check index.html scripts.");
            loadMockData();
        }
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        loadMockData();
    }

    // --- DATA STATE ---
    let apps = [];
    let messages = [];

    // --- ROUTER SYSTEM ---
    window.router = {
        currentPage: 'home',
        navigate: (page, id = null) => {
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${page}`).classList.remove('hidden');
            window.scrollTo(0, 0);
            router.currentPage = page;

            if (page === 'details' && id) {
                renderDetails(id);
            }
            if (page === 'admin') {
                admin.checkLogin();
            }
        }
    };

    // --- DATA FETCHING (FIRESTORE) ---
    const fetchData = () => {
        if (!db) return loadMockData();

        // Listen to Apps
        db.collection('apps').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderHome();
            if (admin.isLoggedIn) admin.loadDashboard();
        });

        // Listen to Messages
        db.collection('messages').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (admin.isLoggedIn) admin.loadDashboard();
        });
    };

    const loadMockData = () => {
        apps = [
            { id: '1', name: 'تطبيق يَومية', desc: 'تطبيق لإدارة الحسابات والديون الشخصية بلمسة احترافية.', logo: 'https://via.placeholder.com/100', images: ['https://via.placeholder.com/300x600'], drive: '#' },
            { id: '2', name: 'لعبة الأرقام', desc: 'لعبة ذكاء وتحدي تم بناؤها باستخدام Flutter.', logo: 'https://via.placeholder.com/100', images: ['https://via.placeholder.com/300x600'], drive: '#' }
        ];
        renderHome();
    };

    // --- UTILS ---
    const uploadToImgBB = async (file) => {
        const apiKey = "52dd3b7cdcffd68ad3a2d7f93bb0f053"; // مفتاح تجريبي، يفضل تغييره لاحقاً
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error("ImgBB Upload Failed");
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    // --- UI RENDERING ---
    const renderHome = () => {
        const grid = document.getElementById('projects-grid');
        if (apps.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد تطبيقات معروضة حالياً.</div>';
            return;
        }
        grid.innerHTML = apps.map(app => `
            <div class="project-card" onclick="router.navigate('details', '${app.id}')">
                <img src="${app.logo || 'https://via.placeholder.com/100'}" class="project-logo" alt="${app.name}">
                <div class="project-info">
                    <div class="card-header">
                        <h3>${app.name}</h3>
                        <span class="status-badge ${app.isDownloadable !== false ? 'ready' : 'request'}">
                            ${app.isDownloadable !== false ? 'جاهز للتحميل' : 'اطلب التطبيق'}
                        </span>
                    </div>
                    <p>${app.desc ? app.desc.substring(0, 60) + '...' : ''}</p>
                </div>
            </div>
        `).join('');
    };

    const convertToDirectLink = (url) => {
        if (!url) return '#';
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/(.+?)\/(view|edit)/);
            if (match && match[1]) {
                return `https://drive.google.com/u/0/uc?id=${match[1]}&export=download`;
            }
        }
        return url;
    };

    const renderDetails = (id) => {
        const app = apps.find(a => a.id === id);
        const renderArea = document.getElementById('details-render');
        if (!app) return renderArea.innerHTML = "تطبيق غير موجود";

        const downloadUrl = convertToDirectLink(app.drive);

        renderArea.innerHTML = `
            <div class="detail-hero">
                <img src="${app.logo || 'https://via.placeholder.com/100'}" class="detail-logo" alt="${app.name}">
                <h2 class="details-title">${app.name}</h2>
                <div class="details-desc">${app.desc}</div>
            </div>
            
            <div class="detail-gallery">
                ${app.images ? app.images.map(img => `<img src="${img}" class="detail-img">`).join('') : ''}
            </div>

            <div class="download-link-wrap">
                ${app.isDownloadable !== false
                ? `<a href="${downloadUrl}" target="_blank" download class="download-btn">الحصول على التطبيق (تنزيل مباشر) <i class="fas fa-download"></i></a>`
                : `<a href="https://wa.me/967730383438?text=${encodeURIComponent('مرحباً خالد، أرغب في طلب تطبيق: ' + app.name)}" target="_blank" class="download-btn request-btn">اطلب التطبيق الآن <i class="fab fa-whatsapp"></i></a>`}
            </div>
        `;
    };

    // --- ADMIN SYSTEM ---
    window.admin = {
        isLoggedIn: false,
        editingId: null,
        checkLogin: () => {
            const adminLogin = document.getElementById('admin-login');
            const adminDashboard = document.getElementById('admin-dashboard');
            if (!admin.isLoggedIn) {
                adminLogin.classList.remove('hidden');
                adminDashboard.classList.add('hidden');
            } else {
                adminLogin.classList.add('hidden');
                adminDashboard.classList.remove('hidden');
                admin.loadDashboard();
            }
        },
        login: () => {
            const pass = document.getElementById('admin-pass').value;
            if (pass === '3124670000') {
                admin.isLoggedIn = true;
                admin.checkLogin();
                fetchData();
            } else {
                alert('كلمة مرور خاطئة');
            }
        },
        showTab: (tab) => {
            document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(`admin-${tab}`).classList.remove('hidden');
            event.target.classList.add('active');
        },
        loadDashboard: () => {
            const appsList = document.getElementById('admin-apps-list');
            appsList.innerHTML = apps.map(app => `
                <div class="admin-list-item">
                    <span>${app.name}</span>
                    <div class="item-actions">
                        <button class="edit-btn" onclick="admin.editApp('${app.id}')">تعديل</button>
                        <button class="delete-btn" onclick="admin.deleteApp('${app.id}')">حذف</button>
                    </div>
                </div>
            `).join('');

            const msgList = document.getElementById('admin-msg-list');
            msgList.innerHTML = messages.length
                ? messages.map(m => `
                    <div class="msg-item">
                        <div class="msg-content">
                            <p>${m.text}</p>
                            <span class="msg-date">${m.timestamp ? new Date(m.timestamp).toLocaleString('ar-EG') : ''}</span>
                        </div>
                        <button class="msg-delete-btn" onclick="admin.deleteMessage('${m.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')
                : "<p>لا توجد رسائل جديدة.</p>";
        },
        deleteMessage: async (id) => {
            if (confirm('هل تريد حذف هذه الرسالة؟')) {
                if (db) await db.collection('messages').doc(id).delete();
                else messages = messages.filter(m => m.id !== id);
                admin.loadDashboard();
            }
        },
        deleteAllMessages: async () => {
            if (confirm('هل أنت متأكد من حذف جميع الرسائل؟')) {
                if (db) {
                    const snapshot = await db.collection('messages').get();
                    const batch = firebase.firestore().batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } else {
                    messages = [];
                    admin.loadDashboard();
                }
            }
        },
        deleteApp: async (id) => {
            if (confirm('هل أنت متأكد من حذف هذا التطبيق؟')) {
                if (db) {
                    await db.collection('apps').doc(id).delete();
                } else {
                    apps = apps.filter(a => a.id !== id);
                    admin.loadDashboard();
                    renderHome();
                }
            }
        },
        editApp: (id) => {
            const app = apps.find(a => a.id === id);
            if (app) {
                admin.editingId = id;
                ui.showModal('تعديل التطبيق', app);
            }
        }
    };

    // --- MODAL & FORM CONTROLS ---
    window.ui = {
        currentImages: [], // To track images being edited
        showModal: (title, app = null) => {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('app-modal').classList.remove('hidden');
            
            const galleryPreview = document.getElementById('edit-gallery-preview');
            galleryPreview.innerHTML = '';
            ui.currentImages = app ? [...(app.images || [])] : [];
            
            if (app) {
                document.getElementById('app-name').value = app.name;
                document.getElementById('app-desc').value = app.desc;
                document.getElementById('app-drive').value = app.drive || '';
                document.getElementById('app-is-downloadable').checked = app.isDownloadable !== false;
                ui.renderEditGallery();
            }
        },
        renderEditGallery: () => {
            const galleryPreview = document.getElementById('edit-gallery-preview');
            galleryPreview.innerHTML = ui.currentImages.map((img, idx) => `
                <div class="edit-img-item">
                    <img src="${img}">
                    <button class="remove-img-btn" onclick="ui.removeImage(${idx})"><i class="fas fa-times"></i></button>
                </div>
            `).join('');
        },
        removeImage: (index) => {
            ui.currentImages.splice(index, 1);
            ui.renderEditGallery();
        },
        closeModal: () => {
            document.getElementById('app-modal').classList.add('hidden');
            admin.editingId = null;
            document.getElementById('upload-status').classList.add('hidden');
            document.querySelectorAll('#app-modal input[type="text"], #app-modal textarea').forEach(el => el.value = '');
            document.getElementById('app-logo-file').value = '';
            document.getElementById('app-images-files').value = '';
            document.getElementById('app-is-downloadable').checked = true;
        },
        showSuccess: () => {
            document.getElementById('success-modal').classList.remove('hidden');
        },
        closeSuccess: () => {
            document.getElementById('success-modal').classList.add('hidden');
        },
        saveApp: async () => {
            const statusBox = document.getElementById('upload-status');
            statusBox.classList.remove('hidden');
            
            try {
                const logoFile = document.getElementById('app-logo-file').files[0];
                const screenshotFiles = document.getElementById('app-images-files').files;
                const isDownloadable = document.getElementById('app-is-downloadable').checked;

                let logoUrl = null;
                let imageUrls = [];

                if (logoFile) {
                    statusBox.innerText = 'جاري رفع الشعار...';
                    logoUrl = await uploadToImgBB(logoFile);
                }

                if (screenshotFiles.length > 0) {
                    const totalFiles = screenshotFiles.length;
                    for (let i = 0; i < totalFiles; i++) {
                        statusBox.innerText = `جاري رفع الصور (${i + 1} من ${totalFiles})...`;
                        const url = await uploadToImgBB(screenshotFiles[i]);
                        if (url) imageUrls.push(url);
                    }
                }

                statusBox.innerText = 'جاري حفظ البيانات...';

                const currentApp = admin.editingId ? apps.find(a => a.id === admin.editingId) : null;
                // Combine existing (edited) images + new uploads
                const finalImages = [...ui.currentImages, ...imageUrls];

                const appData = {
                    name: document.getElementById('app-name').value,
                    desc: document.getElementById('app-desc').value,
                    logo: logoUrl || (currentApp ? currentApp.logo : ''),
                    images: finalImages,
                    drive: document.getElementById('app-drive').value,
                    isDownloadable: isDownloadable,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (db) {
                    if (admin.editingId) {
                        await db.collection('apps').doc(admin.editingId).update(appData);
                    } else {
                        await db.collection('apps').add(appData);
                    }
                }
                ui.closeModal();
            } catch (error) {
                console.error(error);
                statusBox.innerText = 'خطأ في الرفع! تحقق من الإعدادات.';
            }
        }
    };

    // Event Listeners
    document.getElementById('login-btn')?.addEventListener('click', () => admin.login());
    document.getElementById('add-app-btn')?.addEventListener('click', () => ui.showModal('إضافة تطبيق فلاتر'));
    document.getElementById('save-app-btn')?.addEventListener('click', () => ui.saveApp());
    document.getElementById('delete-all-msgs')?.addEventListener('click', () => admin.deleteAllMessages());
    document.getElementById('send-msg-btn')?.addEventListener('click', async () => {
        const msgText = document.getElementById('user-message').value;
        if (msgText) {
            const btn = document.getElementById('send-msg-btn');
            btn.disabled = true;
            btn.style.opacity = '0.5';

            const msgData = { text: msgText, timestamp: Date.now() };

            // 1. Clear input immediately
            document.getElementById('user-message').value = '';

            // 2. Immediate Visual Feedback (Optimistic)
            ui.showSuccess();

            try {
                if (db) {
                    console.log("Sending to Firestore...");
                    db.collection('messages').add(msgData).then(() => {
                        console.log("Firestore save successful");
                    }).catch(err => {
                        console.error("Firestore save failed:", err);
                    });
                } else {
                    messages.push(msgData);
                    console.log("Saved to local mock array");
                }
            } catch (e) {
                console.error("Critical error in message send:", e);
                // Fallback to old-school alert if anything exploded
                alert("حدث خطأ تقني، يرجى المحاولة لاحقاً");
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    });

    // Initial Load
    fetchData();
});
