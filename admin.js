// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyA2iHrUt8_xxvB2m8-LftaE9sg_5JaiFk8",
  authDomain: "banty-live.firebaseapp.com",
  projectId: "banty-live",
  storageBucket: "banty-live.firebasestorage.app",
  messagingSenderId: "435477036444",
  appId: "1:435477036444:web:207931e07ea52ca3269c59",
  measurementId: "G-HXMVFK1E1C"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 1. LOGIN FIX
function adminLogin() {
    if(document.getElementById('a-pass').value === "admin123") {
        document.getElementById('login-ui').style.display = 'none';
        document.getElementById('dash-ui').style.display = 'block';
        loadAll();
    } else alert("Wrong Password");
}

// 2. TABS FIX
function openTab(t) {
    ['users','deps','ords','prods','notif'].forEach(x => {
        const el = document.getElementById('tab-'+x);
        if(el) el.style.display = 'none';
    });
    document.getElementById('tab-'+t).style.display = 'block';
}

// 3. LOAD DATA
function loadAll() {
    
    // USERS
    db.collection("users").onSnapshot(s => {
        let h = "";
        s.forEach(d => {
            const u = d.data();
            h += `
            <div class="adm-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="color:#fff; font-weight:bold;">${u.username}</span><br>
                    <small style="color:gray;">Bal: ₹${u.balance}</small>
                </div>
                <div>
                    <button class="btn btn-sec" style="width:auto; padding:5px 10px; font-size:10px;" onclick="openMsg('${d.id}','${u.username}')">MSG</button>
                    <button class="btn" style="width:auto; padding:5px 10px; font-size:10px; background:red;" onclick="editBal('${d.id}')">BAL</button>
                </div>
            </div>`;
        });
        document.getElementById('u-list').innerHTML = h;
    });

    // DEPOSITS
    db.collection("deposits").where("status","==","pending").onSnapshot(s => {
        let h = "";
        if(s.empty) h = "<p>No pending deposits</p>";
        s.forEach(d => {
            const data = d.data();
            h += `
            <div class="adm-card">
                <div style="color:var(--gold);">₹${data.amt}</div>
                <div style="font-size:12px; color:#aaa;">User: ${data.username} <br> UTR: ${data.utr}</div>
                <button class="btn" onclick="appDep('${d.id}','${data.uid}',${data.amt})">Approve</button>
            </div>`;
        });
        document.getElementById('d-list').innerHTML = h;
    });

    // ORDERS
    db.collection("orders").where("status","==","pending").onSnapshot(s => {
        let h = "";
        if(s.empty) h = "<p>No pending orders</p>";
        s.forEach(d => {
            const o = d.data();
            h += `
            <div class="adm-card">
                <div style="color:#fff; font-weight:bold;">${o.item}</div>
                <div style="font-size:12px; color:#aaa; margin:5px 0;">User: ${o.username}<br>Email: ${o.email}<br>UTR: ${o.utr}</div>
                <button class="btn" onclick="openRep('${o.uid}','${d.id}')">Deliver</button>
            </div>`;
        });
        document.getElementById('o-list').innerHTML = h;
    });

    // PRODUCTS
    db.collection("products").onSnapshot(s => {
        let h = "";
        s.forEach(d => {
            h += `<div class="adm-card" style="display:flex; justify-content:space-between;"><span>${d.data().title}</span> <span style="color:red; cursor:pointer;" onclick="db.collection('products').doc('${d.id}').delete()">X</span></div>`;
        });
        document.getElementById('p-list').innerHTML = h;
    });
}

// 4. MESSAGING SYSTEM (FIXED)
function openMsg(uid, name) {
    document.getElementById('tg-uid').value = uid;
    document.getElementById('tg-name').innerText = name;
    document.getElementById('msg-mod').style.display = 'flex';
}

function sendPrivate() {
    const uid = document.getElementById('tg-uid').value;
    const t = document.getElementById('m-tit').value;
    const m = document.getElementById('m-body').value;
    const img = document.getElementById('m-img').value;
    const lnk = document.getElementById('m-lnk').value;

    if(!t || !m) return alert("Title and Message required");

    db.collection("notifications").add({
        target: uid, // Sending to Specific UID
        title: t,
        msg: m,
        img: img,
        link: lnk,
        time: Date.now()
    }).then(() => {
        alert("Sent!");
        document.getElementById('msg-mod').style.display='none';
    });
}

function sendBroadcast() {
    db.collection("notifications").add({
        target: 'all', // Sending to All
        title: document.getElementById('bc-t').value,
        msg: document.getElementById('bc-m').value,
        time: Date.now()
    }).then(() => alert("Broadcast Sent!"));
}

// 5. ORDER DELIVERY
function openRep(uid, oid) {
    document.getElementById('r-uid').value = uid;
    document.getElementById('r-oid').value = oid;
    document.getElementById('rep-mod').style.display = 'flex';
}

function deliver() {
    const uid = document.getElementById('r-uid').value;
    const oid = document.getElementById('r-oid').value;
    
    db.collection("notifications").add({
        target: uid,
        title: document.getElementById('r-tit').value,
        msg: document.getElementById('r-msg').value,
        time: Date.now()
    });
    
    db.collection("orders").doc(oid).update({status: 'completed'});
    document.getElementById('rep-mod').style.display = 'none';
    alert("Delivered!");
}

// 6. ACTIONS
function appDep(did, uid, amt) {
    db.collection("deposits").doc(did).update({status:'success'});
    db.collection("users").doc(uid).get().then(u => {
        db.collection("users").doc(uid).update({balance: u.data().balance + amt});
        // Notify
        db.collection("notifications").add({target:uid, title:"Deposit Added", msg:`₹${amt} credited.`, time:Date.now()});
    });
}

function editBal(uid) {
    const amt = prompt("Enter Amount to ADD (use - for deduct):");
    if(amt) {
        db.collection("users").doc(uid).get().then(u => {
            db.collection("users").doc(uid).update({balance: u.data().balance + parseInt(amt)});
            alert("Updated");
        });
    }
}

function addProd() {
    db.collection("products").add({
        title: document.getElementById('p-t').value,
        price: parseInt(document.getElementById('p-p').value),
        img: document.getElementById('p-i').value,
        desc: document.getElementById('p-d').value
    });
    alert("Added");
}