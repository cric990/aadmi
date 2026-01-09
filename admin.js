const AdminState = {
    activeTab: 'dashboard',
    activeChatUser: null,
    users: [],
    courses: []
};

const UI = {
    tabs: document.querySelectorAll('.admin-link'),
    panes: document.querySelectorAll('.tab-pane'),
    statUsers: document.getElementById('stat-users'),
    statCourses: document.getElementById('stat-courses'),
    statChats: document.getElementById('stat-chats'),
    courseTable: document.getElementById('course-table-body'),
    userTable: document.getElementById('user-table-body'),
    chatUserList: document.getElementById('chat-user-list'),
    chatWindow: document.getElementById('admin-chat-window'),
    chatInput: document.getElementById('admin-chat-field'),
    chatSendBtn: document.getElementById('admin-chat-send'),
    saveCourseBtn: document.getElementById('save-course-btn'),
    updatePosterBtn: document.getElementById('update-poster'),
    removePosterBtn: document.getElementById('remove-poster'),
    saveSettingsBtn: document.getElementById('save-global-settings')
};

const AdminApp = {
    init: function() {
        this.setupNavigation();
        this.syncDashboard();
        this.syncCourses();
        this.syncUsers();
        this.syncChats();
        this.loadSettings();
        this.setupActions();
    },

    setupNavigation: function() {
        UI.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                AdminState.activeTab = target;
                
                UI.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                UI.panes.forEach(p => p.classList.add('hidden'));
                document.getElementById(`tab-${target}`).classList.remove('hidden');
            });
        });
    },

    syncDashboard: function() {
        db.collection('XamIQ_Users').onSnapshot(snap => {
            UI.statUsers.innerText = snap.size;
        });
        db.collection('XamIQ_Courses').onSnapshot(snap => {
            UI.statCourses.innerText = snap.size;
        });
        db.collection('XamIQ_Chats').onSnapshot(snap => {
            const uniqueUsers = new Set();
            snap.forEach(doc => uniqueUsers.add(doc.data().userId));
            UI.statChats.innerText = uniqueUsers.size;
        });
    },

    syncCourses: function() {
        db.collection('XamIQ_Courses').orderBy('createdAt', 'desc').onSnapshot(snap => {
            UI.courseTable.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${data.thumb}" class="thumb-preview"></td>
                    <td style="font-weight:600;">${data.title}</td>
                    <td><span class="badge ${data.enabled ? 'badge-active' : 'badge-inactive'}">${data.enabled ? 'Active' : 'Hidden'}</span></td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-action btn-tog" onclick="AdminApp.toggleCourse('${doc.id}', ${data.enabled})">Toggle</button>
                            <button class="btn-action btn-del" onclick="AdminApp.deleteCourse('${doc.id}')">Delete</button>
                        </div>
                    </td>
                `;
                UI.courseTable.appendChild(tr);
            });
        });
    },

    syncUsers: function() {
        db.collection('XamIQ_Users').orderBy('joinedAt', 'desc').onSnapshot(snap => {
            UI.userTable.innerHTML = '';
            snap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:600;">${data.name}</td>
                    <td style="font-family:monospace; font-size:0.8rem; color:#636e72;">${doc.id}</td>
                    <td><span class="badge badge-active">Authorized</span></td>
                    <td>
                        <button class="btn-action btn-del" onclick="AdminApp.deleteUser('${doc.id}')">Ban</button>
                    </td>
                `;
                UI.userTable.appendChild(tr);
            });
        });
    },

    syncChats: function() {
        db.collection('XamIQ_Chats').orderBy('timestamp', 'desc').onSnapshot(snap => {
            const chatGroups = {};
            snap.forEach(doc => {
                const data = doc.data();
                if (!chatGroups[data.userId]) {
                    chatGroups[data.userId] = {
                        name: data.userName,
                        lastMsg: data.text,
                        userId: data.userId
                    };
                }
            });

            UI.chatUserList.innerHTML = '';
            Object.values(chatGroups).forEach(group => {
                const div = document.createElement('div');
                div.className = `user-chat-tab ${AdminState.activeChatUser === group.userId ? 'active' : ''}`;
                div.innerHTML = `
                    <div class="u-name">${group.name}</div>
                    <div class="u-last">${group.lastMsg}</div>
                `;
                div.onclick = () => this.loadUserChat(group.userId, group.name);
                UI.chatUserList.appendChild(div);
            });
        });
    },

    loadUserChat: function(userId, userName) {
        AdminState.activeChatUser = userId;
        this.syncChats();
        
        db.collection('XamIQ_Chats')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                if (AdminState.activeChatUser !== userId) return;
                UI.chatWindow.innerHTML = '';
                snap.forEach(doc => {
                    const m = doc.data();
                    const msgDiv = document.createElement('div');
                    const isAdmin = m.role === 'admin';
                    msgDiv.style.cssText = `
                        max-width: 80%;
                        padding: 12px 16px;
                        border-radius: 15px;
                        font-size: 0.9rem;
                        ${isAdmin ? 'align-self: flex-end; background: #ff8c00; color: white; border-bottom-right-radius: 2px;' : 'align-self: flex-start; background: #eee; color: #2d3436; border-bottom-left-radius: 2px;'}
                    `;
                    msgDiv.innerText = m.text;
                    UI.chatWindow.appendChild(msgDiv);
                });
                UI.chatWindow.scrollTop = UI.chatWindow.scrollHeight;
            });
    },

    setupActions: function() {
        UI.saveCourseBtn.addEventListener('click', () => {
            const title = document.getElementById('add-title').value;
            const thumb = document.getElementById('add-thumb').value;
            const url = document.getElementById('add-url').value;

            if (!title || !thumb || !url) return alert('Fill all fields');

            db.collection('XamIQ_Courses').add({
                title, thumb, url,
                enabled: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                document.getElementById('add-title').value = '';
                document.getElementById('add-thumb').value = '';
                document.getElementById('add-url').value = '';
            });
        });

        UI.chatSendBtn.addEventListener('click', () => {
            const text = UI.chatInput.value.trim();
            if (!text || !AdminState.activeChatUser) return;

            db.collection('XamIQ_Chats').add({
                userId: AdminState.activeChatUser,
                userName: "Admin",
                text: text,
                role: 'admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            UI.chatInput.value = '';
        });

        UI.updatePosterBtn.addEventListener('click', () => {
            const img = document.getElementById('poster-img').value;
            const link = document.getElementById('poster-link').value;
            if (!img || !link) return alert('Fill poster details');

            db.collection('XamIQ_Posters').doc('current').set({
                image: img,
                link: link,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => alert('Poster Updated Live'));
        });

        UI.removePosterBtn.addEventListener('click', () => {
            db.collection('XamIQ_Posters').doc('current').delete().then(() => alert('Poster Removed'));
        });

        UI.saveSettingsBtn.addEventListener('click', () => {
            const audio = document.getElementById('check-audio').checked;
            db.collection('XamIQ_Settings').doc('global').set({
                welcomeSound: audio
            }).then(() => alert('Settings Applied Globally'));
        });
    },

    toggleCourse: function(id, status) {
        db.collection('XamIQ_Courses').doc(id).update({ enabled: !status });
    },

    deleteCourse: function(id) {
        if(confirm('Delete permanently?')) db.collection('XamIQ_Courses').doc(id).delete();
    },

    deleteUser: function(id) {
        if(confirm('Ban this student?')) db.collection('XamIQ_Users').doc(id).delete();
    },

    loadSettings: function() {
        db.collection('XamIQ_Settings').doc('global').get().then(doc => {
            if (doc.exists) {
                document.getElementById('check-audio').checked = doc.data().welcomeSound;
            }
        });
    }
};

window.onload = () => AdminApp.init();