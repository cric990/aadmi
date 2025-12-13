// ==========================================
// ELITE ADMIN LOGIC V21 (FINAL)
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

// INITIALIZE
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let chatSub = null;

// 1. AUTHENTICATION
function adminAuth() {
    const k = document.getElementById('adm-key').value;
    if(k === "admin123") {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-dash').style.display = 'block';
        initRealtime();
    } else {
        alert("Invalid Key!");
    }
}

// 2. NAVIGATION
function nav(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    event.target.classList.add('active');
}

// 3. REALTIME DATA LISTENERS
function initRealtime() {
    
    // --- A. ORDERS ---
    db.collection("orders").where("status", "==", "pending").onSnapshot(snap => {
        const l = document.getElementById('list-orders');
        l.innerHTML = "";
        document.getElementById('s-orders').innerText = snap.size;
        
        if(snap.empty) l.innerHTML = "<p style='color:#777; padding:10px;'>No pending orders.</p>";

        snap.forEach(doc => {
            const d = doc.data();
            l.innerHTML += `
            <div class="list-row">
                <div class="info">
                    <b>${d.item} <span style="color:var(--primary)">₹${d.price}</span></b>
                    <p>${d.username} | ${d.email} | Pay: ${d.payment}</p>
                </div>
                <div class="actions">
                    <button class="btn-success btn-sm" onclick="openDel('${doc.id}', '${d.uid}', ${d.price})">DELIVER</button>
                    <button class="btn-danger btn-sm" onclick="cancelOrd('${doc.id}')">CANCEL</button>
                </div>
            </div>`;
        });
    });

    // --- B. DEPOSITS ---
    db.collection("deposits").where("status", "==", "pending").onSnapshot(snap => {
        const l = document.getElementById('list-dep');
        l.innerHTML = "";
        document.getElementById('s-deps').innerText = snap.size;

        snap.forEach(doc => {
            const d = doc.data();
            l.innerHTML += `
            <div class="list-row">
                <div class="info">
                    <b>₹${d.amt} Deposit</b>
                    <p>${d.username} | UTR: ${d.utr}</p>
                </div>
                <div class="actions">
                    <button class="btn-success btn-sm" onclick="accDep('${doc.id}', '${d.uid}', ${d.amt})">ACCEPT</button>
                    <button class="btn-danger btn-sm" onclick="rejDep('${doc.id}')">REJECT</button>
                </div>
            </div>`;
        });
    });

    // --- C. WITHDRAWALS ---
    db.collection("withdrawals").where("status", "==", "pending").onSnapshot(snap => {
        const l = document.getElementById('list-with');
        l.innerHTML = "";
        
        snap.forEach(doc => {
            const d = doc.data();
            l.innerHTML += `
            <div class="list-row">
                <div class="info">
                    <b style="color:#ef4444">₹${d.amt} Payout</b>
                    <p>${d.username} | ${d.details}</p>
                </div>
                <button class="btn-success btn-sm" onclick="payWith('${doc.id}', '${d.uid}', ${d.amt})">MARK PAID</button>
            </div>`;
        });
    });

    // --- D. USERS & BAN SYSTEM ---
    db.collection("users").orderBy("joined", "desc").limit(50).onSnapshot(snap => {
        const l = document.getElementById('list-users');
        l.innerHTML = "";
        document.getElementById('s-users').innerText = snap.size;

        snap.forEach(doc => {
            const u = doc.data();
            const isBanned = u.banned ? true : false;
            const banBtn = isBanned 
                ? `<button class="btn-success btn-sm" onclick="toggleBan('${doc.id}', false)">UNBAN</button>`
                : `<button class="btn-danger btn-sm" onclick="toggleBan('${doc.id}', true)">BAN</button>`;
            
            const badge = isBanned ? '<span class="badge-ban">BANNED</span>' : '';

            l.innerHTML += `
            <div class="list-row">
                <div class="info">
                    <b>${u.username} ${badge}</b>
                    <p>Bal: ₹${u.balance} | Earn: ₹${u.earnings}</p>
                    <p style="font-size:10px; color:#555">RefBy: ${u.referredBy || 'None'}</p>
                </div>
                <div class="actions">
                    <button class="btn-main btn-sm" onclick="editBal('${doc.id}')">BAL</button>
                    ${banBtn}
                </div>
            </div>`;
        });
    });

    // --- E. PRODUCTS ---
    db.collection("products").onSnapshot(snap => {
        const l = document.getElementById('list-prod');
        l.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            l.innerHTML += `
            <div class="list-row">
                <div class="info">
                    <b>${p.title}</b>
                    <p>₹${p.price}</p>
                </div>
                <button class="btn-danger btn-sm" onclick="delProd('${doc.id}')">DEL</button>
            </div>`;
        });
    });

    // --- F. SUPPORT ---
    db.collection("support").orderBy("time", "desc").limit(10).onSnapshot(snap => {
        const l = document.getElementById('list-chat');
        l.innerHTML = "";
        snap.forEach(doc => {
            const s = doc.data();
            l.innerHTML += `
            <div class="list-row">
                <div class="info"><p><b>${s.username}:</b> ${s.msg}</p></div>
                <button class="btn-main btn-sm" onclick="openChat('${s.uid}')">REPLY</button>
            </div>`;
        });
    });

    // --- LOAD POSTER ---
    db.collection("settings").doc("promo").get().then(doc => {
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('po-img').value = d.img || "";
            document.getElementById('po-lnk').value = d.link || "";
        }
    });
}

// 4. LOGIC FUNCTIONS

// --- ORDER & REFERRAL ---
function openDel(oid, uid, price) {
    document.getElementById('mod-action').style.display = 'flex';
    document.getElementById('v-del').style.display = 'block';
    document.getElementById('v-chat').style.display = 'none';
    
    document.getElementById('ac-id').value = oid;
    document.getElementById('ac-uid').value = uid;
    document.getElementById('ac-ex').value = price;
}

function doDeliver() {
    const oid = document.getElementById('ac-id').value;
    const uid = document.getElementById('ac-uid').value;
    const price = parseInt(document.getElementById('ac-ex').value);
    const msg = document.getElementById('d-msg').value;

    if(!msg) return alert("Content Required");

    // 1. Complete Order
    db.collection("orders").doc(oid).update({ status: 'completed' });
    sendNotif(uid, "Order Delivered", msg);

    // 2. REFERRAL LOGIC
    db.collection("users").doc(uid).get().then(uDoc => {
        const u = uDoc.data();
        if(u.referredBy) {
            // Find referrer by Username
            db.collection("users").where("username", "==", u.referredBy).get().then(refSnap => {
                if(!refSnap.empty) {
                    const refDoc = refSnap.docs[0];
                    const refId = refDoc.id;
                    const rData = refDoc.data();

                    // Reward: ₹2 if >= 30, else ₹1
                    const reward = (price >= 30) ? 2 : 1;
                    const newEarn = (rData.earnings || 0) + reward;

                    db.collection("users").doc(refId).update({ earnings: newEarn });
                    sendNotif(refId, "Referral Bonus", `You earned ₹${reward} from ${u.username}'s purchase.`);
                }
            });
        }
    });

    document.getElementById('mod-action').style.display = 'none';
    alert("Delivered & Rewards Processed!");
}

function cancelOrd(id) {
    if(confirm("Cancel?")) db.collection("orders").doc(id).update({ status: 'cancelled' });
}

// --- DEPOSITS ---
function accDep(did, uid, amt) {
    if(confirm(`Approve ₹${amt}?`)) {
        db.collection("deposits").doc(did).update({ status: 'success' });
        db.collection("users").doc(uid).get().then(u => {
            const nb = (u.data().balance || 0) + amt;
            db.collection("users").doc(uid).update({ balance: nb });
            sendNotif(uid, "Deposit Approved", `₹${amt} added to wallet.`);
        });
    }
}
function rejDep(did) {
    if(confirm("Reject?")) db.collection("deposits").doc(did).update({ status: 'rejected' });
}

// --- WITHDRAWALS ---
function payWith(wid, uid, amt) {
    if(confirm("Mark Paid?")) {
        db.collection("withdrawals").doc(wid).update({ status: 'success' });
        sendNotif(uid, "Withdrawal Paid", `₹${amt} sent to your bank.`);
    }
}

// --- USERS & BAN ---
function toggleBan(uid, status) {
    const action = status ? "BAN" : "UNBAN";
    if(confirm(`${action} this user?`)) {
        db.collection("users").doc(uid).update({ banned: status });
    }
}

function editBal(uid) {
    const a = prompt("Add Amount (Use - to cut):");
    if(a) {
        db.collection("users").doc(uid).get().then(doc => {
            const nb = (doc.data().balance || 0) + parseInt(a);
            db.collection("users").doc(uid).update({ balance: nb });
            alert("Updated");
        });
    }
}

// --- PRODUCTS ---
function addProd() {
    const t = document.getElementById('p-t').value;
    const p = parseInt(document.getElementById('p-p').value);
    const i = document.getElementById('p-i').value;
    if(t && p) {
        db.collection("products").add({ title:t, price:p, img:i });
        alert("Added");
    }
}
function delProd(id) { if(confirm("Del?")) db.collection("products").doc(id).delete(); }

// --- POSTER ---
function savePoster(state) {
    const i = document.getElementById('po-img').value;
    const l = document.getElementById('po-lnk').value;
    db.collection("settings").doc("promo").set({
        active: state, img: i, link: l
    }).then(() => alert("Poster Updated"));
}

// --- CHAT REPLY ---
function openChat(uid) {
    document.getElementById('mod-action').style.display = 'flex';
    document.getElementById('v-del').style.display = 'none';
    document.getElementById('v-chat').style.display = 'block';
    document.getElementById('ac-uid').value = uid;

    const box = document.getElementById('chat-hist');
    if(chatSub) chatSub();

    chatSub = db.collection("chats").doc(uid).collection("messages").orderBy("time").onSnapshot(snap => {
        box.innerHTML = "";
        snap.forEach(doc => {
            const m = doc.data();
            const col = m.sender === 'admin' ? '#06b6d4' : '#fff';
            box.innerHTML += `<div style="color:${col}; margin-bottom:5px;"><b>${m.sender}:</b> ${m.msg}</div>`;
        });
        box.scrollTop = box.scrollHeight;
    });
}

function doReply() {
    const uid = document.getElementById('ac-uid').value;
    const txt = document.getElementById('c-rep').value;
    if(!txt) return;

    db.collection("chats").doc(uid).collection("messages").add({
        sender: 'admin', msg: txt, time: Date.now()
    });
    document.getElementById('c-rep').value = "";
    sendNotif(uid, "Admin Reply", "New message from support.");
}

// --- EXTRAS ---
function sendBroad() {
    const t = document.getElementById('br-t').value;
    const m = document.getElementById('br-m').value;
    if(t) {
        db.collection("notifications").add({ target: 'all', title:t, msg:m, time:Date.now() });
        alert("Sent");
    }
}

function sendNotif(uid, t, m) {
    db.collection("notifications").add({ target:uid, title:t, msg:m, time:Date.now() });
}

function filterUser() {
    // Basic Client Side Filter (Note: For large DB, use Firestore Query)
    const q = document.getElementById('search-u').value.toLowerCase();
    const rows = document.getElementById('list-users').children;
    for(let r of rows) {
        r.style.display = r.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    }
}