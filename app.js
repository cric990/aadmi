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

// STATE
let user = JSON.parse(localStorage.getItem('ps_user'));
let tempBuy = {};
const snd = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

// --- BOOT ---
window.onload = () => {
    // Session Resume - Login UI Skip
    setTimeout(() => {
        if(document.getElementById('splash-screen')) {
            document.getElementById('splash-screen').style.opacity = '0';
            setTimeout(()=>document.getElementById('splash-screen').style.display='none', 500);
        }
        
        if(user) loginId(user.id);
        else document.getElementById('auth-ui').style.display='flex';
    }, 1500);
};

// --- AUTH ---
function auth() {
    const u = document.getElementById('u-name').value;
    const p = document.getElementById('u-pass').value;
    if(u.length<4 || p.length<8) return alert("Invalid Input");

    const col = db.collection("users");
    col.where("username","==",u).get().then(s=>{
        if(s.empty) {
            col.add({username:u, password:p, balance:0, avatar:"https://api.dicebear.com/7.x/avataaars/svg?seed=King", joined:Date.now()})
            .then(d=>loginId(d.id));
        } else {
            if(s.docs[0].data().password===p) loginId(s.docs[0].id);
            else alert("Wrong Password");
        }
    });
}

function loginId(uid) {
    db.collection("users").doc(uid).onSnapshot(d=>{
        user={id:d.id, ...d.data()};
        localStorage.setItem('ps_user',JSON.stringify(user));
        document.getElementById('auth-ui').style.display='none';
        document.getElementById('app-ui').style.display='block';
        document.getElementById('u-bal').innerText=user.balance;
        document.getElementById('my-u').innerText=user.username;
        document.getElementById('my-av').src=user.avatar;
        
        loadProds(); loadHist(); checkN();
    });
}

function logout() { localStorage.removeItem('ps_user'); location.reload(); }

function nav(pg, el) {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('p-'+pg).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
    el.classList.add('active');
}

// --- PRODUCTS ---
function loadProds() {
    db.collection("products").onSnapshot(s=>{
        const g = document.getElementById('prod-grid'); g.innerHTML="";
        s.forEach(d=>{
            const p=d.data();
            g.innerHTML += `
            <div class="card">
                <img src="${p.img}" class="c-img">
                <div class="c-body">
                    <div class="c-title">${p.title}</div>
                    <div class="c-price">₹${p.price}</div>
                    <button class="btn" onclick="startBuy('${p.title}', ${p.price})">BUY</button>
                </div>
            </div>`;
        });
    });
}

function startBuy(i,p) {
    tempBuy={item:i, price:p};
    document.getElementById('pay-amt').innerText=p;
    document.getElementById('buy-mod').style.display='flex';
    document.getElementById('step1').style.display='block';
    document.getElementById('step2').style.display='none';
    document.getElementById('btn-w').style.display = user.balance>=p?'block':'none';
}

function payWallet() {
    if(confirm("Pay from Wallet?")) {
        db.collection("users").doc(user.id).update({balance: user.balance - tempBuy.price});
        placeOrder('Wallet', 'Wallet Pay');
    }
}

function payUPI() {
    window.location.href=`upi://pay?pa=bantikr@fam&pn=Store&am=${tempBuy.price}&cu=INR`;
    document.getElementById('step1').style.display='none';
    document.getElementById('step2').style.display='block';
    document.getElementById('p-utr').style.display='block';
}

function finOrd() {
    const em = document.getElementById('p-em').value;
    const utr = document.getElementById('p-utr').value;
    if(!em) return alert("Email required");
    placeOrder(utr, em);
}

function placeOrder(utr, email) {
    db.collection("orders").add({
        uid: user.id, username: user.username, item: tempBuy.item,
        price: tempBuy.price, email: email, utr: utr, status: 'pending', time: Date.now()
    });
    document.getElementById('buy-mod').style.display='none';
    showToast("Order Submitted!");
}

function closeMod() { document.getElementById('buy-mod').style.display='none'; }

// --- DEPOSIT ---
function genQR() {
    const a=document.getElementById('d-amt').value;
    if(a) {
        document.getElementById('qr-wrap').style.display='block';
        document.getElementById('qr-img').src=`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=bantikr@fam&pn=Store&am=${a}`;
    }
}
function submitDep() {
    const a=document.getElementById('d-amt').value;
    const u=document.getElementById('d-utr').value;
    if(a&&u) db.collection("deposits").add({uid:user.id, username:user.username, amt:parseInt(a), utr:u, status:'pending', time:Date.now()})
    .then(()=>{alert("Submitted"); nav('hist',document.querySelectorAll('.nav-item')[2]);});
}

// --- HISTORY ---
function loadHist() {
    db.collection("deposits").where("uid","==",user.id).orderBy("time","desc").onSnapshot(s=>{
        let h="";
        s.forEach(d=>h+=`<div class="hist-item"><div><b>Deposit</b><br><small>${d.data().utr}</small></div><span class="st st-${d.data().status}">₹${d.data().amt}</span></div>`);
        document.getElementById('h-list').innerHTML=h;
    });
}

// --- NOTIFICATION FIX (CLIENT SORTING) ---
function checkN() {
    const day = 86400000; // 24 Hrs
    
    // We listen to ANY notifications meant for 'all' OR 'my_id'
    db.collection("notifications")
      .where("target", "in", ['all', user.id])
      .onSnapshot(s => {
          const l = document.getElementById('np-list');
          l.innerHTML = "";
          let allN = [];

          s.forEach(d => {
              if(Date.now() - d.data().time < day) allN.push(d.data());
          });
          
          // Sort Newest First
          allN.sort((a, b) => b.time - a.time);

          if(allN.length > 0) {
              document.querySelector('.n-dot').style.display='block';
              allN.forEach(x => {
                 l.innerHTML += `
                 <div class="np-item">
                    <div>
                        <h4>${x.title}</h4>
                        <p>${x.msg}</p>
                        ${x.link ? `<a href="${x.link}" target="_blank" class="np-link">OPEN LINK</a>` : ''}
                        ${x.img ? `<img src="${x.img}" style="width:100%; height:100px; object-fit:cover; margin-top:5px; border-radius:5px;">` : ''}
                        <span class="np-time">${new Date(x.time).toLocaleTimeString()}</span>
                    </div>
                 </div>`;
                 
                 // Show Toast if New (10s)
                 if(Date.now() - x.time < 10000) showToast(x.title, x.msg);
              });
          }
      });
}

function showToast(t, m) {
    document.getElementById('t-head').innerText = t || 'Alert';
    document.getElementById('t-body').innerText = m;
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    snd.play().catch(()=>{});
    setTimeout(() => toast.classList.remove('show'), 5000);
}

function toggleNotif() {
    document.getElementById('notif-panel').classList.toggle('active');
    document.querySelector('.n-dot').style.display='none';
}

function updAv(u) { db.collection("users").doc(user.id).update({avatar:u}); }
function saveProf() { db.collection("users").doc(user.id).update({username:document.getElementById('new-name').value}); }
function sendHelp() { db.collection("support").add({uid:user.id, username:user.username, msg:document.getElementById('s-msg').value, time:Date.now()}); alert("Sent"); }