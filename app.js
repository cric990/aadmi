// ==========================================
// BANTY STORE ELITE V21: CORE LOGIC
// ==========================================

const firebaseConfig = {
  // 🔴 Apni Firebase Config Yahan Paste Karein
  apiKey: "AIzaSyA2iHrUt8_xxvB2m8-LftaE9sg_5JaiFk8",
  authDomain: "banty-live.firebaseapp.com",
  projectId: "banty-live",
  storageBucket: "banty-live.firebasestorage.app",
  messagingSenderId: "435477036444",
  appId: "1:435477036444:web:207931e07ea52ca3269c59",
  measurementId: "G-HXMVFK1E1C"
};

// INIT
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// STATE
let user = null;
let tempItem = null;
let chatUnsub = null;

// SOUNDS
const snd = {
    success: document.getElementById('snd-success'),
    error: document.getElementById('snd-error')
};

function play(type) {
    try {
        snd[type].currentTime = 0;
        snd[type].play();
    } catch(e){}
}

// 1. STARTUP
document.addEventListener("DOMContentLoaded", () => {
    const uid = localStorage.getItem('bs_uid_v21');
    if(uid) {
        syncUser(uid);
    } else {
        document.getElementById('loader-overlay').style.display = 'none';
    }
});

// 2. AUTHENTICATION (Login/Register)
function handleAuth() {
    const u = document.getElementById('auth-u').value.trim();
    const p = document.getElementById('auth-p').value.trim();
    const ref = document.getElementById('auth-ref').value.trim();
    const btn = document.getElementById('btn-auth');

    if(u.length < 4 || p.length < 6) {
        play('error');
        return toast("Invalid Credentials", "err");
    }

    const oldTxt = btn.innerText;
    btn.innerText = "CHECKING...";
    btn.disabled = true;

    db.collection("users").where("username", "==", u).get().then(snap => {
        if(!snap.empty) {
            // LOGIN
            const d = snap.docs[0].data();
            if(d.banned) {
                btn.innerText = "BANNED";
                play('error');
                return toast("This account is BANNED.", "err");
            }
            if(d.password === p) {
                loginSuccess(snap.docs[0].id);
            } else {
                play('error');
                toast("Wrong Password", "err");
                btn.innerText = oldTxt;
                btn.disabled = false;
            }
        } else {
            // REGISTER
            const newUser = {
                username: u, password: p, balance: 0, earnings: 0,
                refCode: u, // Username is Code
                referredBy: ref || null,
                joined: Date.now(),
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}`,
                banned: false
            };
            db.collection("users").add(newUser).then(doc => loginSuccess(doc.id));
        }
    }).catch(e => {
        play('error');
        toast("Network Error", "err");
        btn.innerText = oldTxt;
        btn.disabled = false;
    });
}

function loginSuccess(uid) {
    localStorage.setItem('bs_uid_v21', uid);
    syncUser(uid);
}

function syncUser(uid) {
    db.collection("users").doc(uid).onSnapshot(doc => {
        if(!doc.exists) { logout(); return; }
        
        const d = doc.data();
        
        // BAN CHECK (Realtime)
        if(d.banned) {
            document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:red;flex-direction:column;text-align:center;">
                <i class="fas fa-ban" style="font-size:50px;margin-bottom:20px;"></i>
                <h2>YOU ARE BANNED</h2>
                <p>Contact Admin for support.</p>
                <button onclick="localStorage.clear();location.reload()" style="margin-top:20px;padding:10px;background:#333;color:#fff;border:none;">LOGOUT</button>
            </div>`;
            return;
        }

        user = { id: doc.id, ...d };
        
        // UI Updates
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('loader-overlay').style.display = 'none';
        
        updateUI();
        initModules();
    });
}

function updateUI() {
    document.getElementById('h-bal').innerText = user.balance;
    document.getElementById('w-bal').innerText = user.balance;
    document.getElementById('w-avail').innerText = user.earnings;
    document.getElementById('u-name').innerText = user.username;
    document.getElementById('u-id').innerText = "ID: " + user.id;
    document.getElementById('u-av').src = user.avatar;
    
    document.getElementById('my-ref-code').innerText = user.username;
    document.getElementById('ref-money').innerText = "₹" + user.earnings;
}

function logout() {
    localStorage.removeItem('bs_uid_v21');
    location.reload();
}

// 3. NAVIGATION
function nav(pid, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pid).classList.add('active');
    
    if(el) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
    }
    window.scrollTo(0,0);
}

function initModules() {
    loadProducts();
    loadHistory();
    loadRefStats();
    loadPoster();
    initNotifs();
}

// 4. PRODUCTS & PAYMENT
function loadProducts() {
    db.collection("products").onSnapshot(snap => {
        const g = document.getElementById('products-grid');
        g.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            g.innerHTML += `
            <div class="p-card">
                <div class="pc-img-box"><img src="${p.img}" class="pc-img"></div>
                <div class="pc-info">
                    <div class="pc-title">${p.title}</div>
                    <span class="pc-price">₹${p.price}</span>
                    <button class="pc-btn" onclick="initBuy('${p.title}', ${p.price})">BUY NOW</button>
                </div>
            </div>`;
        });
    });
}

function initBuy(t, p) {
    tempItem = { title: t, price: p };
    document.getElementById('buy-item').innerText = t;
    document.getElementById('buy-price').innerText = "₹" + p;
    openModal('mod-buy');
}

function payWallet() {
    const em = document.getElementById('buy-email').value;
    if(!em) { play('error'); return toast("Email Required", "err"); }

    if(user.balance < tempItem.price) {
        play('error');
        return toast("Insufficient Balance", "err");
    }

    if(confirm(`Pay ₹${tempItem.price} from Wallet?`)) {
        db.collection("users").doc(user.id).update({ balance: user.balance - tempItem.price });
        placeOrder(em, "Wallet");
    }
}

function payUPI() {
    const em = document.getElementById('buy-email').value;
    if(!em) { play('error'); return toast("Email Required First", "err"); }

    // 1. UPI LINK (Direct to bantikr@fam)
    const upiLink = `upi://pay?pa=bantikr@fam&pn=BantyStore&am=${tempItem.price}&tn=${tempItem.title}`;
    
    // 2. Open UPI App
    window.location.href = upiLink;

    // 3. Save Order in DB (Mark as UPI Pending)
    db.collection("orders").add({
        uid: user.id, username: user.username,
        item: tempItem.title, price: tempItem.price, email: em,
        payment: "UPI Direct", status: "pending", time: Date.now()
    });

    closeModal('mod-buy');
    toast("Order Placed! Check Email soon.");
}

function placeOrder(em, method) {
    db.collection("orders").add({
        uid: user.id, username: user.username,
        item: tempItem.title, price: tempItem.price, email: em,
        payment: method, status: "pending", time: Date.now()
    }).then(() => {
        closeModal('mod-buy');
        play('success');
        toast("Order Submitted!");
        nav('wallet');
    });
}

// 5. DEPOSIT & WITHDRAW
function genQR() {
    const a = document.getElementById('add-amt').value;
    if(a > 0) {
        document.getElementById('qr-area').style.display='block';
        document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=bantikr@fam%26am=${a}`;
    } else document.getElementById('qr-area').style.display='none';
}

function submitDeposit() {
    const a = parseInt(document.getElementById('add-amt').value);
    const u = document.getElementById('add-utr').value;
    if(!a || u.length < 8) { play('error'); return toast("Invalid Details", "err"); }

    db.collection("deposits").add({
        uid: user.id, username: user.username, amt: a, utr: u, status: "pending", time: Date.now()
    }).then(()=>{ closeModal('mod-add'); play('success'); toast("Deposit Sent"); });
}

function submitWithdraw() {
    const a = parseInt(document.getElementById('with-amt').value);
    const u = document.getElementById('with-upi').value;

    if(a > user.earnings) { play('error'); return toast("Low Earnings", "err"); }
    if(a < 50) { play('error'); return toast("Min Withdraw ₹50", "err"); }

    db.collection("withdrawals").add({
        uid: user.id, username: user.username, amt: a, details: u, status: "pending", time: Date.now()
    }).then(()=>{
        db.collection("users").doc(user.id).update({ earnings: user.earnings - a });
        closeModal('mod-with'); play('success'); toast("Withdrawal Sent");
    });
}

// 6. EXTRAS (Poster, History, Chat)
function loadPoster() {
    db.collection("settings").doc("promo").onSnapshot(doc => {
        if(doc.exists) {
            const d = doc.data();
            if(d.active && !sessionStorage.getItem('poster_closed')) {
                document.getElementById('poster-img').src = d.img;
                document.getElementById('poster-btn').onclick = () => window.open(d.link, '_blank');
                document.getElementById('poster-modal').style.display = 'flex';
            }
        }
    });
}
function closePoster() {
    document.getElementById('poster-modal').style.display = 'none';
    sessionStorage.setItem('poster_closed', 'true');
}

function loadHistory() {
    db.collection("orders").where("uid", "==", user.id).orderBy("time", "desc").limit(20).onSnapshot(snap => {
        const l = document.getElementById('txn-list');
        l.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            l.innerHTML += `
            <div class="txn-item">
                <div class="ti-left"><h4>${d.item}</h4><p>${new Date(d.time).toLocaleDateString()}</p></div>
                <div class="ti-right"><div class="ti-amt">-₹${d.price}</div><span class="ti-status">${d.status}</span></div>
            </div>`;
        });
    });
}

function loadRefStats() {
    db.collection("users").where("referredBy", "==", user.username).get().then(snap => {
        document.getElementById('ref-count').innerText = snap.size;
    });
}

function openChat() {
    openModal('mod-chat');
    if(chatUnsub) chatUnsub();
    const box = document.getElementById('chat-msgs');
    chatUnsub = db.collection("chats").doc(user.id).collection("messages").orderBy("time").onSnapshot(snap => {
        box.innerHTML = "";
        snap.forEach(doc => {
            const m = doc.data();
            const cls = m.sender === 'user' ? 'user' : 'admin';
            const txt = m.msg.match(/\.(jpg|png|gif)$/) ? `<img src="${m.msg}">` : m.msg;
            box.innerHTML += `<div class="c-msg ${cls}">${txt}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

function sendChat() {
    const t = document.getElementById('chat-txt');
    if(t.value) {
        db.collection("chats").doc(user.id).collection("messages").add({ sender: 'user', msg: t.value, time: Date.now() });
        db.collection("support").add({ uid: user.id, username: user.username, msg: t.value, time: Date.now() });
        t.value = "";
    }
}

function initNotifs() {
    db.collection("notifications").where("target", "in", ["all", user.id]).onSnapshot(snap => {
        const l = document.getElementById('notif-list');
        l.innerHTML = "";
        let n = 0;
        snap.forEach(doc => {
            if(Date.now() - doc.data().time < 86400000) {
                l.innerHTML += `<div class="n-card"><h4>${doc.data().title}</h4><p>${doc.data().msg}</p></div>`;
                n++;
            }
        });
        if(n>0) document.getElementById('n-dot').style.display='block';
    });
}

// UTILS
function toast(m, t='info') {
    const b = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.className = `toast ${t}`;
    d.innerHTML = t === 'err' ? `<i class="fas fa-times-circle"></i> ${m}` : `<i class="fas fa-check-circle"></i> ${m}`;
    b.appendChild(d);
    setTimeout(()=>d.remove(), 3000);
}
function copyCode() { navigator.clipboard.writeText(user.username); toast("Copied!"); }
function changeAvatar() {
    const r = Math.random();
    db.collection("users").doc(user.id).update({avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${r}`});
}
function openModal(id) { document.getElementById(id).style.display='flex'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }
function toggleNotif() {
    document.getElementById('notif-panel').classList.toggle('active');
    document.getElementById('n-dot').style.display='none';
}