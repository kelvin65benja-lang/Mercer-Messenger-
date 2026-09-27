
/* ---------- Mercer v8: offline resilience + real connectivity checks ---------- */
const $=id=>document.getElementById(id);
const netBannerEl=$("netBanner"),netBannerTextEl=$("netBannerText"),netRetryBtnEl=$("netRetryBtn"),bootGateEl=$("bootGate");
function isOnline(){return typeof navigator!=="undefined"?navigator.onLine!==false:true}
function friendlyOffline(){return"You're offline — connect to the internet to continue."}

// navigator.onLine only reflects "connected to a network", not "the internet actually works"
// (e.g. Wi-Fi with no internet, captive portals). This does a real, lightweight reachability check.
async function checkRealConnectivity(timeoutMs=5000){
 if(!isOnline())return false;
 try{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  await fetch("https://www.gstatic.com/generate_204",{mode:"no-cors",cache:"no-store",signal:ctrl.signal});
  clearTimeout(timer);return true;
 }catch(e){return false}
}

let netPollTimer=null;
function startNetPolling(){
 stopNetPolling();
 netPollTimer=setInterval(async()=>{
  const ok=await checkRealConnectivity(4000);
  if(ok)refreshNetBanner();
 },6000);
}
function stopNetPolling(){if(netPollTimer){clearInterval(netPollTimer);netPollTimer=null}}

function setNetBanner(kind){ // kind: "offline" | "ok" | null
 if(!netBannerEl)return;
 if(kind==="offline"){
  netBannerTextEl.textContent="You're offline — connect to the internet to send or receive messages";
  netBannerEl.classList.remove("ok");netBannerEl.classList.add("show");
  netRetryBtnEl?.classList.remove("hidden");
  startNetPolling();
 }else if(kind==="ok"){
  netBannerTextEl.textContent="Back online";netBannerEl.classList.add("ok","show");
  netRetryBtnEl?.classList.add("hidden");stopNetPolling();
  clearTimeout(setNetBanner._t);setNetBanner._t=setTimeout(()=>netBannerEl.classList.remove("show"),2200);
 }else{
  netBannerEl.classList.remove("show");netRetryBtnEl?.classList.add("hidden");stopNetPolling();
 }
}
async function manualRetryConnection(){
 if(!netRetryBtnEl)return;
 const original=netRetryBtnEl.textContent;
 netRetryBtnEl.disabled=true;netRetryBtnEl.textContent="Checking…";
 const ok=await checkRealConnectivity(5000);
 netRetryBtnEl.disabled=false;netRetryBtnEl.textContent=original;
 if(ok){refreshNetBanner();if(bootGateEl&&!bootGateEl.classList.contains("hidden"))boot()}
 else{netBannerEl.animate?.([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:260});showToast?.("Still can't reach the internet. Try again in a moment.")}
}
let wasOffline=!isOnline();
function refreshNetBanner(){if(!isOnline()){wasOffline=true;setNetBanner("offline")}else if(wasOffline){wasOffline=false;setNetBanner("ok")}else{setNetBanner(null)}}
window.addEventListener("online",refreshNetBanner);
window.addEventListener("offline",refreshNetBanner);
refreshNetBanner();

// Let the app shell (this page) be re-openable offline after the first successful visit.
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js", {scope:"./"}).catch(()=>{/* sw.js not deployed alongside this page yet — safe to ignore */})});
}

/* ================== OneSignal Web SDK — App ID Integration ==================
   Docs: https://documentation.onesignal.com/docs/web-sdk-setup
   👉 This is the ONLY place your OneSignal App ID needs to go. */
const ONESIGNAL_APP_ID="7e11a569-af19-49a5-a79f-07a48aded46c"; // <-- Mercer Messenger OneSignal App ID
/* ============================================================================= */
window.OneSignalDeferred=window.OneSignalDeferred||[];
let oneSignalReady=false,oneSignalInitStarted=false;
function initOneSignal(){
 if(oneSignalInitStarted)return;
 oneSignalInitStarted=true;
 OneSignalDeferred.push(async function(OneSignal){
  try{
   await OneSignal.init({
    appId:ONESIGNAL_APP_ID,
    // Our own sw.js already exists (it powers offline mode) — this tells OneSignal
    // to piggyback on that single file instead of registering a second worker.
    // sw.js must start with: importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js");
    serviceWorkerPath:"sw.js",
    serviceWorkerParam:{scope:"/"},
    notifyButton:{enable:false},
    allowLocalhostAsSecureOrigin:true
   });
   oneSignalReady=true;
   // If the user is already signed in by the time this loads, link this browser to their account.
   if(currentUser?.uid){try{await OneSignal.login(currentUser.uid)}catch(e){console.warn("OneSignal login deferred",e)}}
  }catch(e){console.warn("Mercer: push notifications unavailable",e)}
 });
}
// Ties this browser's push subscription to the signed-in Mercer account (OneSignal "External ID"),
// so your backend can target a specific user by their Firebase uid via the OneSignal API.
function linkOneSignalToUser(uid){
 if(!oneSignalReady||!uid)return;
 OneSignalDeferred.push(async OneSignal=>{try{await OneSignal.login(uid)}catch(e){console.warn("OneSignal login failed",e)}});
}
function unlinkOneSignalUser(){
 if(!oneSignalReady)return;
 OneSignalDeferred.push(async OneSignal=>{try{await OneSignal.logout()}catch(e){console.warn("OneSignal logout failed",e)}});
}

function showBootGate(message,opts={}){
 bootGateEl.classList.remove("hidden");
 bootGateEl.innerHTML=`<div class="boot-card">${opts.spinner?'<div class="boot-spin"></div>':'<div class="boot-icon">M</div>'}<h2>${opts.title||"Connect to the internet"}</h2><p>${message}</p>${opts.retry?'<button class="primary" style="width:100%" onclick="__mercerRetryBoot()">Try again</button>':""}</div>`;
 $("auth").classList.add("hidden");$("app").classList.add("hidden");
}
function hideBootGate(){bootGateEl.classList.add("hidden");bootGateEl.innerHTML=""}

let auth,db,storage,fb,database;
let initializeApp,getAuth,setPersistence,browserLocalPersistence,RecaptchaVerifier,signInWithPhoneNumber,onAuthStateChanged,signOut;
let getFirestore,initializeFirestore,persistentLocalCache,persistentSingleTabManager,doc,getDoc,getDocFromCache,setDoc,updateDoc,collection,addDoc,query,where,orderBy,onSnapshot,serverTimestamp,arrayUnion,arrayRemove,getDocs,deleteDoc;
let getStorage,ref,uploadBytes,getDownloadURL,deleteObject;
let getDatabase,rtdbRef,rtdbOnValue,rtdbOnDisconnect,rtdbSet,rtdbGet,rtdbServerTimestamp;

async function loadFirebaseSdk(){
 const [appMod,authMod,fsMod,storeMod,rtMod]=await Promise.all([
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js"),
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"),
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"),
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js"),
  import("https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js"),
 ]);
 ({initializeApp}=appMod);
 ({getAuth,setPersistence,browserLocalPersistence,RecaptchaVerifier,signInWithPhoneNumber,onAuthStateChanged,signOut}=authMod);
 ({getFirestore,initializeFirestore,persistentLocalCache,persistentSingleTabManager,doc,getDoc,getDocFromCache,setDoc,updateDoc,collection,addDoc,query,where,orderBy,onSnapshot,serverTimestamp,arrayUnion,arrayRemove,getDocs,deleteDoc,limit}=fsMod);
 ({getDatabase,ref:rtdbRef,onValue:rtdbOnValue,onDisconnect:rtdbOnDisconnect,set:rtdbSet,get:rtdbGet,serverTimestamp:rtdbServerTimestamp}=rtMod);
 ({getStorage,ref,uploadBytes,getDownloadURL,deleteObject}=storeMod);
}
function loadPeerJsLib(){
 return new Promise(res=>{
  if(window.Peer)return res(true);
  const s=document.createElement("script");
  s.src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
  s.onload=()=>res(true);
  s.onerror=()=>res(false); // calls simply stay unavailable — never blocks the rest of the app
  document.head.appendChild(s);
 });
}

window.__mercerRetryBoot=function(){boot()};

let firebaseReady=false;
async function boot(){
 if(!isOnline()){
  showBootGate("Mercer Messenger needs the internet the first time it opens on this device. Once you're connected, it'll keep working here — even offline — for viewing chats.",{retry:true});
  return;
 }
 // Keep the login screen visible and usable right away — just quietly disable
 // "Continue" until the connection to Mercer's servers is ready.
 hideBootGate();
 $("auth").classList.remove("hidden");
 const btn=$("sendCodeBtn");
 if(btn&&!firebaseReady){btn.disabled=true;btn.textContent="Loading…"}
 try{
  if(!firebaseReady){await loadFirebaseSdk();initFirebaseApp();firebaseReady=true;wireAuthUI()}
 }catch(e){
  console.error("Mercer: could not load required libraries",e);
  showBootGate("We couldn't reach Mercer Messenger's servers. Check your connection and try again.",{retry:true,title:"Trouble connecting"});
  return;
 }
 loadPeerJsLib(); // non-blocking; calling just won't be available until it loads
 initOneSignal(); // non-blocking; push notifications simply stay off until this resolves
 if(btn){btn.disabled=false;btn.textContent="Continue"}
}

function initFirebaseApp(){
 const firebaseConfig={apiKey:"AIzaSyBzC2e6MHn-y-zJhnajt-z6NwakhOZt6pI",authDomain:"mercer-messenger.firebaseapp.com",projectId:"mercer-messenger",storageBucket:"mercer-messenger.firebasestorage.app",messagingSenderId:"1063147526435",appId:"1:1063147526435:web:4918f00bcf1f4547b11496",measurementId:"G-2VYR8E3KTB"};
 fb=initializeApp(firebaseConfig);
 auth=getAuth(fb);auth.languageCode="en";
 try{
  db=initializeFirestore(fb,{localCache:persistentLocalCache({tabManager:persistentSingleTabManager()})});
 }catch(e){
  // Falls back to the plain client if persistent cache can't start (e.g. private browsing) — app still works online.
  console.warn("Mercer: offline chat cache unavailable in this browser",e);
  db=getFirestore(fb);
 }
 storage=getStorage(fb);
}
const phoneInputEl=$("phoneInput"),countryCodeEl=$("countryCode"),sendCodeBtnEl=$("sendCodeBtn"),phoneErrorEl=$("phoneError"),otpInputEl=$("otpInput"),otpErrorEl=$("otpError"),phoneStepEl=$("phoneStep"),otpStepEl=$("otpStep"),profileStepEl=$("profileStep"),profileErrorEl=$("profileError"),profileNameEl=$("profileName"),profileAboutEl=$("profileAbout"),profilePhotoEl=$("profilePhoto"),profilePreviewEl=$("profilePreview");
let authReady=false,authPersistencePromise=Promise.resolve();
let confirmationResult=null,currentUser=null,currentProfile=null,selectedConversation=null,selectedUser=null,conversations=[],messages=[],activeTab="chats",unsubConversations=null,unsubMessages=null,unsubConversation=null,typingTimer=null,replyingTo=null,profilePhotoFile=null,recorder=null,recordChunks=[],peer=null,peerReady=false,localStream=null,activeCall=null,incomingCall=null,userCache=new Map(),knownMessageIds=new Set(),knownMessageState=new Map(),firstMessageSnapshot=true,knownConversationState=new Map(),firstConversationSnapshot=true,contactsCache=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function initials(n){return (n||"M").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"M"}
function avatarHTML(u,size="",clickId=null){const inner=u?.photoURL?`<img src="${esc(u.photoURL)}" alt="">`:`${esc(initials(u?.displayName||"M"))}`;const clickAttr=clickId?` onclick="event.stopPropagation();openProfilePicture('${clickId}')" style="cursor:pointer" title="View profile"`:"";return `<div class="avatar ${size}"${clickAttr}>${inner}</div>`}
function findUserById(id){if(!id)return null;if(id===currentUser?.uid)return currentProfile;const c=contactsCache.find(u=>u.id===id);if(c)return c;const conv=conversations.find(cv=>cv.other?.id===id);if(conv)return conv.other;if(selectedUser?.id===id)return selectedUser;return null}
function openProfilePicture(id){
 const u=findUserById(id);
 if(!u)return showToast("Profile not available right now.");
 const isMe=id===currentUser?.uid;
 openModal(`<div class="modal-head"><strong>${isMe?"Your profile":"Profile"}</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div style="text-align:center">${u.photoURL?`<img src="${esc(u.photoURL)}" alt="${esc(u.displayName||"")}" style="width:100%;max-width:280px;aspect-ratio:1/1;object-fit:cover;border-radius:24px;margin:0 auto;display:block">`:`<div style="display:flex;justify-content:center">${avatarHTML(u,"large")}</div>`}<h2 style="margin-top:14px">${esc(u.displayName||"Mercer User")}</h2><p class="hint">${esc(u.phone||"")}</p>${u.about?`<p class="hint" style="margin-top:8px">${esc(u.about)}</p>`:""}</div>${isMe?`<div class="people-actions" style="margin-top:16px"><button class="primary" style="width:100%" onclick="closeModal();openProfileEditor()">✎ Edit profile</button></div>`:`<div class="people-actions" style="margin-top:16px;flex-wrap:wrap">${selectedUser?.id===id?`<button class="secondary" onclick="closeModal();openChatInfo()">Contact info</button>`:`<button class="secondary" onclick="closeModal();ensureConversationAndOpen('${id}')">💬 Message</button>`}</div>`}`);
}function tsMs(v){return v?.toMillis?v.toMillis():(v||0)}function fmtTime(v){const t=tsMs(v);return t?new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):""}function fmtDay(v){const t=tsMs(v);return t?new Date(t).toLocaleDateString([], {day:"numeric",month:"short",year:"numeric"}):"Today"}
function showToast(t){toast.textContent=t;toast.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove("show"),3000)}
function playSound(kind="receive"){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=kind==="send"?880:kind==="read"?1040:660;g.gain.setValueAtTime(0.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+0.01);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.14);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.16);setTimeout(()=>ctx.close().catch(()=>{}),300)}catch(e){}}
function notifyMessage(m,u){if(document.hidden||!document.hasFocus()){if("Notification" in window&&Notification.permission==="granted"){try{new Notification(u?.displayName||"New message",{body:m.type==="text"?m.text||"New message":messagePreview(m),tag:"mercer-"+m.id})}catch(e){}}}playSound("receive")}

function normalizePhone(){let raw=phoneInputEl.value.replace(/[\s()-]/g,"");if(raw.startsWith("+"))return raw;raw=raw.replace(/^0+/,"");return countryCodeEl.value+raw}
function userError(msg){const e=new Error(msg);e.code="mercer/validation";return e}
function firebaseError(e){
 console.error(e);
 const c=e?.code||"",msg=String(e?.message||e||"");
 // Our own, already-friendly validation messages (file too big, wrong format, etc.) pass straight through.
 if(c==="mercer/validation")return msg;
 // Network/offline problems next — never surface raw technical text to the user.
 if(!isOnline()||c.includes("network-request-failed")||c.includes("unavailable")||/failed to fetch|networkerror|load failed|err_internet|err_connection|err_name_not_resolved|net::/i.test(msg)){
  return friendlyOffline();
 }
 if(c.includes("invalid-phone-number"))return"Enter a valid phone number.";
 if(c.includes("too-many-requests"))return"Too many attempts. Try again later.";
 if(c.includes("invalid-verification-code"))return"The verification code is incorrect.";
 if(c.includes("code-expired"))return"The code expired. Request a new one.";
 if(c.includes("operation-not-allowed"))return"Sign-in with phone numbers isn't turned on for this app yet. Please contact support.";
 if(c.includes("unauthorized-domain"))return"Mercer Messenger isn't set up to run from this address yet. Please contact support.";
 if(c.includes("permission-denied"))return"You don't have permission to do that.";
 if(c.includes("not-found"))return"That couldn't be found. It may have been removed.";
 return"Something went wrong. Please try again.";
}
function resetRecaptcha(){try{window.recaptchaVerifier?.clear()}catch(e){}window.recaptchaVerifier=null;const host=$("recaptcha-container");if(host)host.innerHTML=""}
async function ensureRecaptcha(){if(window.recaptchaVerifier)return window.recaptchaVerifier;const host=$("recaptcha-container");if(!host)throw new Error("reCAPTCHA container is missing.");host.innerHTML="";const verifier=new RecaptchaVerifier(auth,"recaptcha-container",{size:"invisible",callback:()=>{},"expired-callback":()=>{resetRecaptcha()}});window.recaptchaVerifier=verifier;await verifier.render();return verifier}
async function sendVerificationCode(){phoneErrorEl.textContent="";if(!isOnline())return phoneErrorEl.textContent=friendlyOffline();const phone=normalizePhone();if(phone.length<10){phoneErrorEl.textContent="Enter a valid phone number.";phoneInputEl.focus();return}sendCodeBtnEl.disabled=true;sendCodeBtnEl.textContent="Sending…";try{await authPersistencePromise;const verifier=await ensureRecaptcha();confirmationResult=await signInWithPhoneNumber(auth,phone,verifier);$("otpPhone").textContent=phone;phoneStepEl.classList.add("hidden");otpStepEl.classList.remove("hidden");otpInputEl.focus()}catch(e){phoneErrorEl.textContent=firebaseError(e);resetRecaptcha()}finally{sendCodeBtnEl.disabled=false;sendCodeBtnEl.textContent="Continue"}}
async function verifyCode(){otpErrorEl.textContent="";const code=otpInputEl.value.trim();if(!/^\d{6}$/.test(code)){otpErrorEl.textContent="Enter the 6-digit code.";otpInputEl.focus();return}if(!confirmationResult){otpErrorEl.textContent="Please request a new verification code.";return}const btn=$("verifyCodeBtn");if(btn){btn.disabled=true;btn.textContent="Verifying…"}try{await confirmationResult.confirm(code)}catch(e){otpErrorEl.textContent=firebaseError(e)}finally{if(btn){btn.disabled=false;btn.textContent="Verify & continue"}}}
function backToPhone(){otpStepEl.classList.add("hidden");phoneStepEl.classList.remove("hidden");otpInputEl.value="";resetRecaptcha();confirmationResult=null;phoneInputEl.focus()}
function safeBind(id,evt,fn){const el=$(id);if(el){el.addEventListener(evt,fn)}else{console.warn("Mercer: skipped binding, missing #"+id)}}
function previewProfilePhoto(e){const f=e.target.files[0]||null;if(!f)return;if(isHeicFile(f)){e.target.value="";showToast("HEIC photos aren't supported — please choose a JPG or PNG photo instead.");return}profilePhotoFile=f;const url=URL.createObjectURL(profilePhotoFile);profilePreview.innerHTML=`<img src="${url}">`}
function isHeicFile(file){const type=(file?.type||"").toLowerCase();const name=(file?.name||"").toLowerCase();return type.includes("heic")||type.includes("heif")||/\.(heic|heif)$/.test(name)}
async function uploadProfilePhoto(file,uid){if(!file)return"";if(isHeicFile(file))throw userError("HEIC photos aren't supported — please choose a JPG or PNG photo instead.");if(!file.type.startsWith("image/"))throw userError("Profile photo must be an image.");if(file.size>5*1024*1024)throw userError("Profile photo must be under 5 MB.");const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const r=ref(storage,`profiles/${uid}/profile-${Date.now()}.${ext}`);await uploadBytes(r,file,{contentType:file.type,cacheControl:"public,max-age=3600"});return await getDownloadURL(r)}
async function saveFirstProfile(){profileErrorEl.textContent="";const name=profileNameEl.value.trim();if(name.length<2){profileErrorEl.textContent="Enter your name.";return}try{const photoURL=await uploadProfilePhoto(profilePhotoFile,currentUser.uid);const data={uid:currentUser.uid,phone:currentUser.phoneNumber||normalizePhone(),displayName:name,about:profileAboutEl.value.trim()||"Hey there! I am using Mercer Messenger.",photoURL,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),online:true,lastSeen:serverTimestamp()};await setDoc(doc(db,"users",currentUser.uid),data);currentProfile={...data,createdAt:Date.now(),updatedAt:Date.now(),lastSeen:Date.now()};await startApp()}catch(e){profileErrorEl.textContent=firebaseError(e)}}
function wireAuthUI(){
 authPersistencePromise=setPersistence(auth,browserLocalPersistence).then(()=>{authReady=true}).catch(e=>{console.warn("Auth persistence setup failed",e);authReady=true});
 safeBind("sendCodeBtn","click",sendVerificationCode);safeBind("verifyCodeBtn","click",verifyCode);
 phoneInputEl.addEventListener("keydown",e=>{if(e.key==="Enter")sendVerificationCode()});otpInputEl.addEventListener("keydown",e=>{if(e.key==="Enter")verifyCode()});
 onAuthStateChanged(auth,async u=>{try{await authPersistencePromise;currentUser=u;if(!u){$("auth").classList.remove("hidden");$("app").classList.add("hidden");phoneStepEl.classList.remove("hidden");otpStepEl.classList.add("hidden");profileStepEl.classList.add("hidden");return}const snap=await fetchDocMaybeOffline(doc(db,"users",u.uid));if(!snap||!snap.exists()){if(!isOnline()){showToast(friendlyOffline());$("auth").classList.remove("hidden");$("app").classList.add("hidden");return}phoneStepEl.classList.add("hidden");otpStepEl.classList.add("hidden");profileStepEl.classList.remove("hidden");return}currentProfile={id:snap.id,...snap.data()};await startApp()}catch(e){console.error("Auth state startup error",e);showToast(firebaseError(e));$("auth").classList.remove("hidden");$("app").classList.add("hidden")}});
}
async function fetchDocMaybeOffline(ref){
 // While offline, go straight to the local cache instead of waiting on a network timeout.
 if(!isOnline()){try{return await getDocFromCache(ref)}catch(e){return null}}
 try{return await getDoc(ref)}catch(e){try{return await getDocFromCache(ref)}catch(e2){throw e}}
}
async function startApp(){profileStep.classList.add("hidden");$("auth").classList.add("hidden");app.classList.remove("hidden");applyFontSize();try{await setDoc(doc(db,"users",currentUser.uid),pref("lastSeen",true)?{online:true,lastSeen:serverTimestamp(),updatedAt:serverTimestamp()}:{online:false,updatedAt:serverTimestamp()},{merge:true})}catch(e){console.warn("Mercer: presence update deferred (offline)",e)}updateMyUI();linkOneSignalToUser(currentUser.uid);listenConversations();listenStatuses();listenContacts();if(!window.Peer&&isOnline())await loadPeerJsLib();try{if(window.Peer)initPeer()}catch(e){console.warn("Mercer: call service unavailable right now",e)}renderChat();window.addEventListener("beforeunload",markOffline,{once:true})}
async function markOffline(){if(!currentUser)return;try{await updateDoc(doc(db,"users",currentUser.uid),pref("lastSeen",true)?{online:false,lastSeen:serverTimestamp()}:{online:false})}catch(e){}}
function updateMyUI(){myAvatar.innerHTML=avatarHTML(currentProfile,"",currentUser.uid);myName.textContent=currentProfile.displayName;myPhone.textContent=currentProfile.phone||currentUser.phoneNumber||""}
async function getUser(uid){if(!uid)return null;if(uid===currentUser.uid)return currentProfile;if(userCache.has(uid))return userCache.get(uid);const s=await getDoc(doc(db,"users",uid));if(!s.exists())return null;const u={id:s.id,...s.data()};userCache.set(uid,u);return u}
function convId(a,b){return[a,b].sort().join("_")}
async function ensureConversation(other){const oid=other.uid||other.id;const id=convId(currentUser.uid,oid),r=doc(db,"conversations",id),s=await getDoc(r);if(!s.exists())await setDoc(r,{members:[currentUser.uid,oid],createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastMessage:"",lastMessageAt:serverTimestamp(),lastSenderId:"",typing:{}});await updateDoc(doc(db,"users",currentUser.uid),{contactIds:arrayUnion(oid)}).catch(()=>{});await updateDoc(doc(db,"users",oid),{contactIds:arrayUnion(currentUser.uid)}).catch(()=>{});return id}
function listenConversations(){unsubConversations?.();const q=query(collection(db,"conversations"),where("members","array-contains",currentUser.uid));unsubConversations=onSnapshot(q,async snap=>{const arr=[];for(const d of snap.docs){const data=d.data(),otherId=data.members.find(x=>x!==currentUser.uid),other=await getUser(otherId);if(other)arr.push({id:d.id,...data,other});const prev=knownConversationState.get(d.id)||{};const lastAt=tsMs(data.lastMessageAt);const isMuted=(data.mutedBy||[]).includes(currentUser.uid);if(!firstConversationSnapshot&&data.lastSenderId&&data.lastSenderId!==currentUser.uid&&lastAt!==prev.lastAt&&selectedConversation?.id!==d.id&&!isMuted){playSound("receive");if("Notification" in window&&Notification.permission==="granted"&&document.hidden){try{new Notification(other?.displayName||"New message",{body:data.lastMessage||"New message",tag:"mercer-conversation-"+d.id})}catch(e){}}}}knownConversationState=new Map(arr.map(c=>[c.id,{lastAt:tsMs(c.lastMessageAt),lastSenderId:c.lastSenderId}]));firstConversationSnapshot=false;conversations=arr.sort((a,b)=>tsMs(b.lastMessageAt)-tsMs(a.lastMessageAt));renderSidebar()})}
function switchTab(t){activeTab=t;["Chats","People","Status"].forEach(x=>$("tab"+x).classList.toggle("active",x.toLowerCase()===t));renderSidebar()}
let showArchived=false;
function isUnread(c){if(!c.lastSenderId||c.lastSenderId===currentUser.uid)return false;const opened=tsMs(c.lastOpenedAt?.[currentUser.uid]||0);return tsMs(c.lastMessageAt)>opened}
function renderSidebar(){const q=(globalSearch.value||"").toLowerCase();if(activeTab==="status")return renderStatusSidebar(q);if(activeTab==="people")return renderPeople(q);
 let list=conversations.filter(c=>(c.other.displayName+" "+c.other.phone).toLowerCase().includes(q));
 const archivedCount=conversations.filter(c=>(c.archivedBy||[]).includes(currentUser.uid)).length;
 list=list.filter(c=>{const arch=(c.archivedBy||[]).includes(currentUser.uid);return showArchived?arch:!arch});
 list.sort((a,b)=>{const pa=(a.pinnedBy||[]).includes(currentUser.uid),pb=(b.pinnedBy||[]).includes(currentUser.uid);if(pa!==pb)return pa?-1:1;return tsMs(b.lastMessageAt)-tsMs(a.lastMessageAt)});
 let rows=list.map(c=>{const pinned=(c.pinnedBy||[]).includes(currentUser.uid);const muted=(c.mutedBy||[]).includes(currentUser.uid);const unread=isUnread(c);return `<div class="list-item ${selectedConversation?.id===c.id?"active":""}" style="display:flex;align-items:center;gap:10px" onclick="selectConversation('${c.id}')">${avatarHTML(c.other,"",c.other.id)}<div class="list-info"><div class="list-top"><strong>${esc(c.other.displayName)} ${pinned?"📌":""}${muted?"🔇":""}</strong><small>${fmtTime(c.lastMessageAt)}</small></div><div class="list-top"><div class="preview">${esc(c.lastMessage||"No messages yet")}</div>${unread?'<span class="unread-dot"></span>':""}</div></div><button class="icon-btn" title="Chat options" onclick="event.stopPropagation();openChatMenu('${c.id}')">⋮</button></div>`}).join("");
 sideList.innerHTML=`<div class="people-actions"><button class="primary" onclick="openNewChat()">＋ New chat</button><button class="secondary" onclick="switchTab('people')">People</button></div>`+(archivedCount?`<button class="list-item" style="justify-content:center;color:var(--muted)" onclick="showArchived=!showArchived;renderSidebar()">${showArchived?"‹ Back to chats":`🗄 Archived chats (${archivedCount})`}</button>`:"")+(rows||`<div class="empty-list">${showArchived?"No archived chats.":"No conversations yet.<br>Tap New chat and enter a phone number."}</div>`)}
function openChatMenu(id){const c=conversations.find(x=>x.id===id);if(!c)return;const pinned=(c.pinnedBy||[]).includes(currentUser.uid),muted=(c.mutedBy||[]).includes(currentUser.uid),archived=(c.archivedBy||[]).includes(currentUser.uid);openModal(`<div class="modal-head"><strong>${esc(c.other.displayName)}</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form"><button class="secondary" onclick="toggleConvoFlag('${id}','pinnedBy');closeModal()">📌 ${pinned?"Unpin chat":"Pin chat"}</button><button class="secondary" onclick="toggleConvoFlag('${id}','mutedBy');closeModal()">🔇 ${muted?"Unmute notifications":"Mute notifications"}</button><button class="secondary" onclick="toggleConvoFlag('${id}','archivedBy');closeModal()">🗄 ${archived?"Unarchive chat":"Archive chat"}</button><button class="secondary" onclick="closeModal();openStarredMessages('${id}')">⭐ Starred messages</button><button class="danger" onclick="closeModal();clearChat('${id}')">🗑 Clear chat</button></div>`)}
async function toggleConvoFlag(id,field){try{const c=conversations.find(x=>x.id===id);const has=(c?.[field]||[]).includes(currentUser.uid);await updateDoc(doc(db,"conversations",id),{[field]:has?arrayRemove(currentUser.uid):arrayUnion(currentUser.uid)});showToast(has?"Removed":"Updated")}catch(e){showToast(firebaseError(e))}}
function listenContacts(){onSnapshot(doc(db,"users",currentUser.uid),async snap=>{const ids=snap.data()?.contactIds||[];const arr=[];for(const id of ids){const u=await getUser(id);if(u)arr.push(u)}contactsCache=arr;renderSidebar()})}
function isBlockedPair(){const iBlockedThem=(currentProfile?.blockedIds||[]).includes(selectedUser?.id);const theyBlockedMe=(selectedUser?.blockedIds||[]).includes(currentUser.uid);return{iBlockedThem,theyBlockedMe,any:iBlockedThem||theyBlockedMe}}
async function toggleBlock(uid){const blocked=(currentProfile?.blockedIds||[]).includes(uid);if(!confirm(blocked?"Unblock this contact?":"Block this contact? They won't be able to message you."))return;try{await updateDoc(doc(db,"users",currentUser.uid),{blockedIds:blocked?arrayRemove(uid):arrayUnion(uid)});currentProfile.blockedIds=blocked?(currentProfile.blockedIds||[]).filter(x=>x!==uid):[...(currentProfile.blockedIds||[]),uid];showToast(blocked?"Contact unblocked":"Contact blocked");renderChat();closeModal()}catch(e){showToast(firebaseError(e))}}
function openBlockedContacts(){const blockedIds=currentProfile?.blockedIds||[];const blocked=contactsCache.filter(u=>blockedIds.includes(u.id));openDrawer("Blocked contacts",blocked.length?blocked.map(u=>`<div class="list-item">${avatarHTML(u,"small",u.id)}<div class="list-info"><strong>${esc(u.displayName)}</strong><div class="preview">${esc(u.phone||"")}</div></div><button class="secondary" onclick="toggleBlock('${u.id}');openBlockedContacts()">Unblock</button></div>`).join(""):`<div class="empty-list">You haven't blocked anyone.</div>`)}
async function deleteContact(uid){if(!confirm("Remove this contact from your contacts? The chat history will remain."))return;try{await updateDoc(doc(db,"users",currentUser.uid),{contactIds:arrayRemove(uid)});showToast("Contact removed");if(selectedUser?.id===uid)renderSidebar()}catch(e){showToast(firebaseError(e))}}
async function clearChat(conversationId){const id=conversationId||selectedConversation?.id;if(!id)return;if(!confirm("Delete this chat for you? This removes its messages for everyone in this version."))return;try{const snap=await getDocs(collection(db,"conversations",id,"messages"));for(const d of snap.docs)await deleteDoc(d.ref);await updateDoc(doc(db,"conversations",id),{lastMessage:"",lastMessageAt:serverTimestamp(),lastSenderId:""});if(selectedConversation?.id===id){messages=[];renderMessages()}showToast("Chat cleared")}catch(e){showToast(firebaseError(e))}}
function renderPeople(q){const rows=contactsCache.filter(u=>(u.displayName+" "+u.phone).toLowerCase().includes(q)).map(u=>{const blocked=(currentProfile?.blockedIds||[]).includes(u.id);return `<div class="list-item"><button style="display:flex;align-items:center;gap:10px;flex:1;background:none;border:0;color:inherit;text-align:left" onclick="ensureConversationAndOpen('${u.id}')">${avatarHTML(u,"",u.id)}<div class="list-info"><strong>${esc(u.displayName)} ${blocked?'<span class="mini-chip" style="background:rgba(255,85,119,.12);color:var(--danger)">Blocked</span>':""}</strong><div class="preview">${esc(u.phone||"")}</div></div><span>${u.online?"🟢":""}</span></button><button class="icon-btn" title="${blocked?"Unblock":"Block"}" onclick="event.stopPropagation();toggleBlock('${u.id}')">${blocked?"✅":"🚫"}</button><button class="icon-btn" title="Remove contact" onclick="event.stopPropagation();deleteContact('${u.id}')">🗑</button></div>`}).join("");sideList.innerHTML=`<div class="people-actions"><button class="primary" onclick="openNewChat()">＋ Find by phone</button></div><div class="section-title">Contacts</div>`+(rows||`<div class="empty-list">No contacts yet.</div>`)}
async function ensureConversationAndOpen(uid){const u=await getUser(uid);if(!u)return;const id=await ensureConversation(u);await selectConversation(id)}
function openNewChat(){openModal(`<div class="modal-head"><strong>New chat</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form"><p class="hint">Enter the phone number used on Mercer Messenger.</p><div class="phone-row"><select id="findCode" class="input"><option value="+254">🇰🇪 +254</option><option value="+255">🇹🇿 +255</option><option value="+256">🇺🇬 +256</option><option value="+250">🇷🇼 +250</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option></select><input id="findPhone" class="input" type="tel" placeholder="712 345 678"></div><div id="findError" class="error"></div><button class="primary" onclick="findUserByPhone()">Find user</button></div>`)}
async function findUserByPhone(){let raw=findPhone.value.replace(/[\s()-]/g,"");let phone=raw.startsWith("+")?raw:findCode.value+raw.replace(/^0+/,"");if(!isOnline())return findError.textContent=friendlyOffline();findError.textContent="Searching…";try{const qs=await getDocs(query(collection(db,"users"),where("phone","==",phone)));if(qs.empty)return findError.textContent="No Mercer Messenger account found with that number.";const d=qs.docs[0];if(d.id===currentUser.uid)return findError.textContent="That is your own number.";const u={id:d.id,...d.data()};userCache.set(d.id,u);const id=await ensureConversation({...u,uid:d.id});closeModal();await selectConversation(id)}catch(e){findError.textContent=firebaseError(e)}}
async function selectConversation(id){const c=conversations.find(x=>x.id===id)||((await getDoc(doc(db,"conversations",id))).exists()?{id,...(await getDoc(doc(db,"conversations",id))).data()}:null);if(!c)return;let other=c.other;if(!other){const oid=c.members.find(x=>x!==currentUser.uid);other=await getUser(oid)}selectedConversation={...c,other};selectedUser=other;document.body.classList.add("chat-open");knownMessageIds=new Set();knownMessageState=new Map();firstMessageSnapshot=true;listenMessages(id);listenConversationMeta(id);renderChat();updateDoc(doc(db,"conversations",id),{[`lastOpenedAt.${currentUser.uid}`]:serverTimestamp()}).catch(()=>{})}
function listenMessages(id){unsubMessages?.();const q=query(collection(db,"conversations",id,"messages"),orderBy("createdAt","asc"));unsubMessages=onSnapshot(q,async snap=>{const next=snap.docs.map(d=>({id:d.id,...d.data()}));if(!firstMessageSnapshot){for(const m of next){const prev=knownMessageState.get(m.id)||{};if(!knownMessageIds.has(m.id)&&m.senderId!==currentUser.uid){const u=await getUser(m.senderId);notifyMessage(m,u)}if(m.senderId===currentUser.uid&&!(prev.deliveredBy||[]).includes(selectedUser?.id)&&(m.deliveredBy||[]).includes(selectedUser?.id)){playSound("receive");showToast("Message delivered ✓✓")}if(m.senderId===currentUser.uid&&!(prev.readBy||[]).includes(selectedUser?.id)&&(m.readBy||[]).includes(selectedUser?.id)){playSound("read")}}}knownMessageIds=new Set(next.map(m=>m.id));knownMessageState=new Map(next.map(m=>[m.id,m]));firstMessageSnapshot=false;messages=next;renderMessages();markVisibleDelivered();markVisibleRead()})}
function listenConversationMeta(id){unsubConversation?.();unsubConversation=onSnapshot(doc(db,"conversations",id),d=>{if(!d.exists())return;selectedConversation={...selectedConversation,...d.data()};const t=d.data().typing||{};typing.textContent=t[selectedUser?.id||selectedUser?.uid]?`${selectedUser.displayName} is typing…`:""})}
function renderChat(){if(!selectedConversation||!selectedUser){composer.classList.add("hidden");audioBtn.classList.add("hidden");videoBtn.classList.add("hidden");chatInfoBtn.classList.add("hidden");chatBody.innerHTML=`<div class="empty"><div><div class="empty-icon">💬</div><h2>Mercer Messenger</h2><p>Select a conversation or start a new chat.</p></div></div>`;return}composer.classList.remove("hidden");audioBtn.classList.remove("hidden");videoBtn.classList.remove("hidden");chatInfoBtn.classList.remove("hidden");chatAvatar.innerHTML=avatarHTML(selectedUser,"",selectedUser.id);chatName.textContent=selectedUser.displayName;const blockInfo=isBlockedPair();const showLastSeen=pref("lastSeen",true);chatStatus.textContent=blockInfo.any?(blockInfo.iBlockedThem?"Blocked by you":"Unavailable"):!showLastSeen?"":selectedUser.online?"Online":`Last seen ${selectedUser.lastSeen?new Date(tsMs(selectedUser.lastSeen)).toLocaleString():"recently"}`;connText.textContent="Secure";connDot.className="dot on";applyWallpaper();renderMessages()}
function renderMessages(){if(!selectedConversation)return;if(!messages.length){chatBody.innerHTML=`<div class="empty"><div>${avatarHTML(selectedUser,"large")}<h2 style="margin-top:10px">${esc(selectedUser.displayName)}</h2><p style="margin-top:7px">Messages are stored in your Firebase project. Calls use peer-to-peer WebRTC.</p></div></div>`;return}let out="",last="";for(const m of messages){const day=fmtDay(m.createdAt||m.clientCreatedAt);if(day!==last){out+=`<div class="day"><span>${esc(day)}</span></div>`;last=day}const me=m.senderId===currentUser.uid;let body=m.deleted?`<i style="color:var(--muted)">This message was deleted</i>`:m.type==="image"?`<img class="msg-img" src="${esc(m.url)}" alt="Photo">`:m.type==="video"?`<video class="msg-video" src="${esc(m.url)}" controls></video>`:m.type==="audio"?`<audio class="msg-audio" src="${esc(m.url)}" controls></audio>`:m.type==="file"?`<div class="filebox">📎 <div><b>${esc(m.fileName||"File")}</b><div style="font-size:10px;color:var(--muted)">${Math.round((m.size||0)/1024)} KB</div></div><a class="text-btn" href="${esc(m.url)}" target="_blank" rel="noopener">Open</a></div>`:`<div class="msg-text">${esc(m.text||"")}</div>`;const delivered=(m.deliveredBy||[]).includes(selectedUser?.id)&&me;const read=(m.readBy||[]).includes(selectedUser?.id)&&me;const reacts=m.reactions?Object.values(m.reactions).join(" "):"";const starred=(m.starredBy||[]).includes(currentUser.uid);out+=`<div class="row ${me?"me":""}"><div class="bubble">${m.replyText?`<div style="font-size:10px;color:var(--muted);border-left:2px solid var(--a);padding-left:6px;margin-bottom:5px">${esc(m.replyText)}</div>`:""}${body}<div class="meta">${starred?"⭐":""} ${fmtTime(m.createdAt||m.clientCreatedAt)} ${me?`<span class="tick ${read?"read":delivered?"delivered":""}">${read?"✓✓":delivered?"✓✓":"✓"}</span>`:""}</div>${reacts?`<div class="reactions">${esc(reacts)}</div>`:""}<div class="actions">${!m.deleted?`<button onclick="replyMessage('${m.id}')">Reply</button><button onclick="reactMessage('${m.id}','❤️')">❤️</button><button onclick="reactMessage('${m.id}','👍')">👍</button><button onclick="starMessage('${m.id}')">${starred?"Unstar":"Star"}</button><button onclick="openForwardPicker('${m.id}')">Forward</button>`:""}${me&&!m.deleted?`<button onclick="deleteMessage('${m.id}')">Delete</button>`:""}</div></div></div>`}chatBody.innerHTML=out;chatBody.scrollTop=chatBody.scrollHeight}
async function starMessage(id,conversationId){const convId=conversationId||selectedConversation?.id;if(!convId)return;let m=messages.find(x=>x.id===id);try{if(!m){const snap=await getDoc(doc(db,"conversations",convId,"messages",id));if(!snap.exists())return;m={id:snap.id,...snap.data()}}const has=(m.starredBy||[]).includes(currentUser.uid);await updateDoc(doc(db,"conversations",convId,"messages",id),{starredBy:has?arrayRemove(currentUser.uid):arrayUnion(currentUser.uid)});showToast(has?"Removed from starred":"Message starred")}catch(e){showToast(firebaseError(e))}}
async function openStarredMessages(conversationId){const id=conversationId||selectedConversation?.id;if(!id)return showToast("Open a chat first.");const conv=conversations.find(x=>x.id===id);const otherName=conv?.other?.displayName||selectedUser?.displayName||"them";try{const snap=await getDocs(query(collection(db,"conversations",id,"messages"),where("starredBy","array-contains",currentUser.uid)));const starred=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>!m.deleted).sort((a,b)=>tsMs(a.createdAt||a.clientCreatedAt)-tsMs(b.createdAt||b.clientCreatedAt));openDrawer("Starred messages",starred.length?starred.map(m=>`<div class="status-card"><div class="status-time">${fmtTime(m.createdAt||m.clientCreatedAt)} • ${m.senderId===currentUser.uid?"You":esc(otherName)}</div><p style="margin-top:6px">${esc(messagePreview(m))}</p><button class="text-btn" onclick="starMessage('${m.id}','${id}');openStarredMessages('${id}')">Unstar</button></div>`).join(""):`<div class="empty-list">No starred messages in this chat yet.</div>`)}catch(e){showToast(firebaseError(e))}}
function openForwardPicker(id){const m=messages.find(x=>x.id===id);if(!m)return;const options=conversations.filter(c=>c.id!==selectedConversation?.id);openModal(`<div class="modal-head"><strong>Forward message</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form">${options.length?options.map(c=>`<button class="secondary" style="display:flex;align-items:center;gap:9px;text-align:left" onclick="forwardMessage('${id}','${c.id}')">${avatarHTML(c.other,"small")} ${esc(c.other.displayName)}</button>`).join(""):`<p class="hint">Start another chat first to forward messages.</p>`}</div>`)}
async function forwardMessage(id,targetId){const m=messages.find(x=>x.id===id);if(!m)return;try{const payload={senderId:currentUser.uid,type:m.type,text:m.text||"",url:m.url||"",fileName:m.fileName||"",mime:m.mime||"",size:m.size||0,forwarded:true,createdAt:serverTimestamp(),clientCreatedAt:Date.now(),readBy:[currentUser.uid],deliveredBy:[currentUser.uid]};await addDoc(collection(db,"conversations",targetId,"messages"),payload);await updateDoc(doc(db,"conversations",targetId),{lastMessage:"↪ "+messagePreview(m),lastMessageAt:serverTimestamp(),lastSenderId:currentUser.uid});closeModal();showToast("Message forwarded")}catch(e){showToast(firebaseError(e))}}
async function sendText(){if(!selectedConversation)return;const text=messageInput.value.trim();if(!text)return;if(!isOnline())return showToast(friendlyOffline());if(isBlockedPair().any)return showToast(isBlockedPair().iBlockedThem?"Unblock this contact to send messages.":"You can't message this contact.");const payload={senderId:currentUser.uid,type:"text",text,createdAt:serverTimestamp(),clientCreatedAt:Date.now(),readBy:[currentUser.uid],deliveredBy:[currentUser.uid],replyText:replyingTo?messagePreview(replyingTo):""};messageInput.value="";cancelReply();try{await addDoc(collection(db,"conversations",selectedConversation.id,"messages"),payload);await updateDoc(doc(db,"conversations",selectedConversation.id),{lastMessage:text,lastMessageAt:serverTimestamp(),lastSenderId:currentUser.uid,updatedAt:serverTimestamp()});playSound("send");setTyping(false)}catch(e){showToast(firebaseError(e))}}
function messagePreview(m){if(!m)return"";if(m.type==="text")return m.text||"";if(m.type==="image")return"📷 Photo";if(m.type==="video")return"🎥 Video";if(m.type==="audio")return"🎙 Voice message";return"📎 File"}
function messageKeydown(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText()}}async function setTyping(on){if(!selectedConversation)return;try{await updateDoc(doc(db,"conversations",selectedConversation.id),{[`typing.${currentUser.uid}`]:on})}catch(e){}}function handleTyping(){setTyping(true);clearTimeout(typingTimer);typingTimer=setTimeout(()=>setTyping(false),1200)}
function replyMessage(id){replyingTo=messages.find(x=>x.id===id);if(!replyingTo)return;replyBar.classList.remove("hidden");replyText.textContent=messagePreview(replyingTo);messageInput.focus()}function cancelReply(){replyingTo=null;replyBar.classList.add("hidden");replyText.textContent=""}
async function reactMessage(id,emoji){const m=messages.find(x=>x.id===id);if(!m)return;await updateDoc(doc(db,"conversations",selectedConversation.id,"messages",id),{[`reactions.${currentUser.uid}`]:emoji})}
async function deleteMessage(id){if(!confirm("Delete this message for everyone?"))return;await updateDoc(doc(db,"conversations",selectedConversation.id,"messages",id),{deleted:true,text:"",url:"",fileName:""})}
async function markVisibleDelivered(){if(!selectedConversation)return;for(const m of messages){if(m.senderId!==currentUser.uid&&!(m.deliveredBy||[]).includes(currentUser.uid)){updateDoc(doc(db,"conversations",selectedConversation.id,"messages",m.id),{deliveredBy:arrayUnion(currentUser.uid)}).catch(()=>{})}}}
async function markVisibleRead(){if(!selectedConversation||document.hidden)return;if(!pref("readReceipts",true))return;for(const m of messages){if(m.senderId!==currentUser.uid&&!(m.readBy||[]).includes(currentUser.uid)){updateDoc(doc(db,"conversations",selectedConversation.id,"messages",m.id),{readBy:arrayUnion(currentUser.uid)}).catch(()=>{})}}}
async function uploadChatFile(file){if(!file)throw userError("No file selected.");if(file.size>25*1024*1024)throw userError("File is larger than 25 MB.");const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);const path=`chat-media/${selectedConversation.id}/${Date.now()}-${currentUser.uid}-${safe}`;const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type||"application/octet-stream",cacheControl:"public,max-age=3600"});return await getDownloadURL(r)}
async function handleFiles(e){const files=[...e.target.files];e.target.value="";if(!selectedConversation)return showToast("Open a chat first.");if(!isOnline())return showToast(friendlyOffline());if(isBlockedPair().any)return showToast("You can't send media to this contact.");for(const file of files){if(isHeicFile(file)){showToast(`${file.name} is a HEIC photo, which isn't supported. Please convert it to JPG or PNG first.`);continue}if(file.size>25*1024*1024){showToast(`${file.name} is larger than 25 MB.`);continue}showToast(`Uploading ${file.name}…`);try{const url=await uploadChatFile(file),type=file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":"file";await addDoc(collection(db,"conversations",selectedConversation.id,"messages"),{senderId:currentUser.uid,type,url,fileName:file.name,mime:file.type,size:file.size,createdAt:serverTimestamp(),clientCreatedAt:Date.now(),readBy:[currentUser.uid],deliveredBy:[currentUser.uid]});await updateDoc(doc(db,"conversations",selectedConversation.id),{lastMessage:type==="image"?"📷 Photo":type==="video"?"🎥 Video":"📎 "+file.name,lastMessageAt:serverTimestamp(),lastSenderId:currentUser.uid});playSound("send");showToast("Sent")}catch(err){showToast(firebaseError(err))}}}
async function toggleRecording(){
if(recorder&&recorder.state==="recording"){recorder.stop();recordBtn.classList.remove("recording");return}
if(!selectedConversation)return showToast("Open a chat first.");
if(!isOnline())return showToast(friendlyOffline());
if(isBlockedPair().any)return showToast("You can't send voice notes to this contact.");
if(!navigator.mediaDevices?.getUserMedia)return showToast("Your browser does not support microphone recording.");
try{
 const conversationId=selectedConversation.id;
 const stream=await navigator.mediaDevices.getUserMedia({audio:true});
 recordChunks=[];
 const mimeCandidates=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
 const mime=mimeCandidates.find(x=>window.MediaRecorder?.isTypeSupported?.(x))||"";
 recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
 recorder.ondataavailable=e=>{if(e.data?.size)recordChunks.push(e.data)};
 recorder.onerror=e=>{stream.getTracks().forEach(t=>t.stop());recordBtn.classList.remove("recording");showToast("Voice recording failed.")};
 recorder.onstop=async()=>{
  try{
   stream.getTracks().forEach(t=>t.stop());
   const type=recorder.mimeType||"audio/webm";
   const blob=new Blob(recordChunks,{type});
   if(!blob.size)return showToast("No voice recorded.");
   showToast("Sending voice note…");
   const ext=type.includes("mp4")?"m4a":"webm";
   const r=ref(storage,`voice/${conversationId}/${Date.now()}-${currentUser.uid}.${ext}`);
   await uploadBytes(r,blob,{contentType:type});
   const url=await getDownloadURL(r);
   await addDoc(collection(db,"conversations",conversationId,"messages"),{senderId:currentUser.uid,type:"audio",url,size:blob.size,mime:type,createdAt:serverTimestamp(),clientCreatedAt:Date.now(),readBy:[currentUser.uid],deliveredBy:[currentUser.uid]});
   await updateDoc(doc(db,"conversations",conversationId),{lastMessage:"🎙 Voice message",lastMessageAt:serverTimestamp(),lastSenderId:currentUser.uid});
   playSound("send");showToast("Voice note sent");
  }catch(e){showToast(firebaseError(e))}
  finally{recorder=null;recordChunks=[]}
 };
 recorder.start(250);recordBtn.classList.add("recording");showToast("Recording… tap the microphone again to send");
}catch(e){recordBtn.classList.remove("recording");showToast(firebaseError(e))}}
function renderStatusSidebar(q){sideList.innerHTML=`<div class="people-actions"><button class="primary" onclick="createStatus()">＋ My status</button></div><div id="statusList"><div class="empty-list">Loading status updates…</div></div>`;renderCachedStatuses(q)}
let statuses=[];
function listenStatuses(){const since=new Date(Date.now()-86400000);onSnapshot(query(collection(db,"statuses"),where("expiresAt",">",since)),async snap=>{statuses=[];for(const d of snap.docs){const s={id:d.id,...d.data()},u=await getUser(s.ownerId);if(u)statuses.push({...s,owner:u})}if(activeTab==="status")renderCachedStatuses((globalSearch.value||"").toLowerCase())},()=>{if(activeTab==="status")statusList.innerHTML=`<div class="empty-list">Status requires a Firestore index/rule configuration.</div>`})}
function statusCardHTML(s,mine){const views=(s.viewedBy||[]).filter(x=>x!==s.ownerId);const seen=!mine&&views.includes(currentUser.uid);return `<div class="status-card" onclick="viewStatus('${s.id}')" style="cursor:pointer">
<div class="status-head">${avatarHTML(s.owner,"small",s.owner?.id)}<div style="flex:1"><strong>${esc(s.owner.displayName)}${mine?' <span class="mini-chip">You</span>':""}</strong><div class="status-time">${new Date(tsMs(s.createdAt)||Date.now()).toLocaleString()}${!mine&&seen?" • Viewed":""}</div></div>${mine?`<button class="icon-btn" title="Delete status" onclick="event.stopPropagation();deleteStatus('${s.id}')">🗑</button>`:""}</div>
${s.text?`<p style="margin-top:9px">${esc(s.text)}</p>`:""}
${s.url&&s.type==="image"?`<img class="status-media" src="${esc(s.url)}">`:""}
${s.url&&s.type==="video"?`<video class="status-media" src="${esc(s.url)}" controls onclick="event.stopPropagation()"></video>`:""}
${mine?`<div class="status-time">👁 ${views.length} view${views.length===1?"":"s"}</div>`:""}
</div>`}
function renderCachedStatuses(q){const el=$("statusList");if(!el)return;const arr=statuses.filter(s=>s.owner&&(s.owner.displayName+" "+s.owner.phone).toLowerCase().includes(q));const mineArr=arr.filter(s=>s.ownerId===currentUser.uid);const othersArr=arr.filter(s=>s.ownerId!==currentUser.uid);let out="";out+=`<div class="section-title">My status</div>`;out+=mineArr.length?mineArr.map(s=>statusCardHTML(s,true)).join(""):`<div class="status-empty"><div class="big">◉</div>Tap "＋ My status" to share an update.</div>`;out+=`<div class="section-title">Recent updates</div>`;out+=othersArr.length?othersArr.map(s=>statusCardHTML(s,false)).join(""):`<div class="status-empty"><div class="big">👀</div>No updates from your contacts yet.</div>`;el.innerHTML=out}
function viewStatus(id){const s=statuses.find(x=>x.id===id);if(!s)return;const mine=s.ownerId===currentUser.uid;if(!mine)markStatusViewed(id);const views=(s.viewedBy||[]).filter(x=>x!==s.ownerId);openModal(`<div class="modal-head">${avatarHTML(s.owner,"small")}<strong style="margin-left:9px">${esc(s.owner.displayName)}</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div style="text-align:center">${s.url&&s.type==="image"?`<img class="status-media" src="${esc(s.url)}" style="max-height:60vh">`:""}${s.url&&s.type==="video"?`<video class="status-media" src="${esc(s.url)}" controls autoplay style="max-height:60vh"></video>`:""}${s.text?`<p style="margin-top:12px;text-align:left">${esc(s.text)}</p>`:""}<div class="status-time" style="margin-top:10px">${new Date(tsMs(s.createdAt)||Date.now()).toLocaleString()}</div></div>${mine?`<div style="margin-top:14px"><div class="section-title" style="padding-left:0">👁 Viewed by (${views.length})</div>${views.length?`<div class="hint">${views.length} contact${views.length===1?"":"s"} viewed this status.</div>`:'<div class="hint">No views yet.</div>'}<div class="people-actions" style="margin-top:12px"><button class="danger" style="width:100%" onclick="deleteStatus('${s.id}');closeModal()">🗑 Delete status</button></div></div>`:""}`)}
async function markStatusViewed(id){try{await updateDoc(doc(db,"statuses",id),{viewedBy:arrayUnion(currentUser.uid)})}catch(e){}}
async function deleteStatus(id){if(!confirm("Delete this status update?"))return;try{const s=statuses.find(x=>x.id===id);await deleteDoc(doc(db,"statuses",id));if(s?.url){try{await deleteObject(ref(storage,s.url))}catch(e){}}showToast("Status deleted");closeModal()}catch(e){showToast(firebaseError(e))}}
function createStatus(){openModal(`<div class="modal-head"><strong>New status</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form"><textarea id="statusTextInput" class="input" rows="4" placeholder="What's happening?"></textarea><input id="statusMedia" class="input" type="file" accept="image/*,video/*"><button class="primary" onclick="publishStatus()">Post status</button></div>`)}
async function publishStatus(){if(!isOnline())return showToast(friendlyOffline());try{const text=$("statusTextInput")?.value.trim()||"",file=$("statusMedia")?.files?.[0]||null;if(!text&&!file)return showToast("Add text, a photo, or video.");let url="",type="text";if(file){if(!/^image\/|^video\//.test(file.type))return showToast("Choose an image or video.");if(isHeicFile(file))return showToast("HEIC photos aren't supported — please choose a JPG or PNG photo instead.");if(file.size>20*1024*1024)return showToast("Status media must be under 20 MB.");const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";const r=ref(storage,`status/${currentUser.uid}/status-${Date.now()}.${ext}`);await uploadBytes(r,file,{contentType:file.type,cacheControl:"public,max-age=3600"});url=await getDownloadURL(r);type=file.type.startsWith("video/")?"video":"image"}await addDoc(collection(db,"statuses"),{ownerId:currentUser.uid,text,url,type,viewedBy:[],createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000)});closeModal();showToast("Status posted")}catch(e){showToast(firebaseError(e))}}
function initPeer(){
 try{peer?.destroy()}catch(e){}
 peerReady=false;
 peer=new Peer("mercer-"+currentUser.uid,{debug:1});
 peer.on("open",()=>{peerReady=true;console.log("PeerJS ready")});
 peer.on("call",async call=>{incomingCall=call;const uid=String(call.peer).replace(/^mercer-/ ,"");const u=await getUser(uid)||{displayName:"Mercer user"};openModal(`<div class="modal-head"><strong>Incoming call</strong></div><div style="text-align:center">${avatarHTML(u,"large")}<h2 style="margin-top:9px">${esc(u.displayName)}</h2><p class="hint" style="margin:7px 0 15px">is calling you</p><div class="people-actions"><button class="danger" onclick="declineCall()">Decline</button><button class="primary" onclick="acceptCall()">Accept</button></div></div>`)});
 peer.on("error",e=>{console.error("PeerJS",e);if(activeCall)callState.textContent="Call connection failed";showToast(e?.type==="peer-unavailable"?"The other user is not reachable. Make sure they have Mercer Messenger open.":!isOnline()?friendlyOffline():"The call service ran into a problem. Please try again.")});
 peer.on("disconnected",()=>{peerReady=false;try{peer.reconnect()}catch(e){}});
}
async function startAudioCall(){startCall(false)}
async function startVideoCall(){startCall(true)}
async function startCall(video){
 if(!selectedUser)return showToast("Open a chat first.");
 if(!isOnline())return showToast(friendlyOffline());
 if(!peer||!peerReady)return showToast(window.Peer?"Call service is still connecting. Try again in a moment.":"Calls need an internet connection to set up. Please connect and try again.");
 if(!navigator.mediaDevices?.getUserMedia)return showToast("This browser doesn't support calling here — try Chrome or Edge.");
 try{
  localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:"user"}:false});
  localVideo.srcObject=localStream;localVideo.style.display=video?"block":"none";
  const target="mercer-"+(selectedUser.id||selectedUser.uid);
  activeCall=peer.call(target,localStream,{metadata:{from:currentUser.uid,video}});
  if(!activeCall)throw userError("Unable to create the call. Please try again.");
  setupCall(activeCall,selectedUser);showCallScreen(selectedUser,video?"Calling video…":"Calling…");
 }
 catch(e){console.error(e);localStream?.getTracks().forEach(t=>t.stop());localStream=null;showToast(e?.name==="NotAllowedError"?"Allow microphone/camera permission in Chrome settings.":e?.name==="NotFoundError"?"No microphone/camera was found on this device.":firebaseError(e))}
}
function setupCall(call,u){activeCall=call;call.on("stream",s=>{remoteVideo.srcObject=s;remoteAudio.srcObject=s;remoteVideo.style.display=s.getVideoTracks().length?"block":"none";remoteAudio.play?.().catch(()=>{});remoteVideo.play?.().catch(()=>{});callState.textContent="Connected"});call.on("close",()=>{if(activeCall===call)endCall()});call.on("error",e=>{console.error(e);callState.textContent="Call failed";showToast("Call connection failed.");setTimeout(()=>{if(activeCall===call)endCall()},800)})}
async function acceptCall(){if(!incomingCall)return;closeModal();try{const call=incomingCall;const video=!!call.metadata?.video;localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:"user"}:false});localVideo.srcObject=localStream;localVideo.style.display=video?"block":"none";call.answer(localStream);const uid=String(call.peer).replace(/^mercer-/ ,"");const u=await getUser(uid)||{displayName:"Mercer user"};setupCall(call,u);showCallScreen(u,video?"Connecting video…":"Connecting…")}catch(e){console.error(e);showToast(e?.name==="NotAllowedError"?"Allow microphone/camera permission to answer the call.":"Could not answer the call.");try{incomingCall?.close()}catch(x){}incomingCall=null}}
function declineCall(){try{incomingCall?.close()}catch(e){}incomingCall=null;closeModal()}
function showCallScreen(u,state){callName.textContent=u.displayName||"Mercer user";callState.textContent=state;callScreen.classList.add("open")}
function toggleMute(){localStream?.getAudioTracks().forEach(t=>t.enabled=!t.enabled)}
function toggleCamera(){localStream?.getVideoTracks().forEach(t=>t.enabled=!t.enabled)}
function endCall(){try{activeCall?.close()}catch(e){}try{incomingCall?.close()}catch(e){}localStream?.getTracks().forEach(t=>t.stop());localStream=null;activeCall=null;incomingCall=null;remoteVideo.srcObject=null;remoteAudio.srcObject=null;localVideo.srcObject=null;callScreen.classList.remove("open")}

function openChatInfo(){if(!selectedUser)return;const blocked=(currentProfile?.blockedIds||[]).includes(selectedUser.id);openModal(`<div class="modal-head"><strong>Contact</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div style="text-align:center">${avatarHTML(selectedUser,"large")}<h2 style="margin-top:10px">${esc(selectedUser.displayName)}</h2><p class="hint">${esc(selectedUser.phone||"")}</p><p class="hint" style="margin-top:8px">${esc(selectedUser.about||"")}</p><div class="people-actions" style="margin-top:18px;flex-wrap:wrap">${blocked?`<span class="mini-chip" style="background:rgba(255,85,119,.12);color:var(--danger)">Blocked</span>`:""}</div><div class="form" style="margin-top:12px"><button class="secondary" onclick="openStarredMessages();closeModal()">⭐ Starred messages</button><button class="secondary" onclick="deleteContact('${selectedUser.id}');closeModal()">🗑 Remove contact</button><button class="secondary" onclick="toggleBlock('${selectedUser.id}')">${blocked?"✅ Unblock contact":"🚫 Block contact"}</button><button class="danger" onclick="clearChat();closeModal()">Clear chat</button></div></div>`)}
function openProfileEditor(){closeDrawer();openModal(`<div class="modal-head"><strong>Edit profile</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form"><input id="editName" class="input" value="${esc(currentProfile.displayName)}" placeholder="Name"><textarea id="editAbout" class="input" rows="3" placeholder="About">${esc(currentProfile.about||"")}</textarea><input id="editPhoto" class="input" type="file" accept="image/*"><button class="primary" onclick="saveProfileEdit()">Save changes</button></div>`)}
async function saveProfileEdit(){try{let photoURL=currentProfile.photoURL||"";if(editPhoto.files[0])photoURL=await uploadProfilePhoto(editPhoto.files[0],currentUser.uid);const data={displayName:editName.value.trim()||currentProfile.displayName,about:editAbout.value.trim(),photoURL,updatedAt:serverTimestamp()};await updateDoc(doc(db,"users",currentUser.uid),data);currentProfile={...currentProfile,...data,updatedAt:Date.now()};userCache.delete(currentUser.uid);updateMyUI();closeModal();showToast("Profile updated")}catch(e){showToast(firebaseError(e))}}
function toggleTheme(){document.body.classList.toggle("light");localStorage.setItem("mercer_theme",document.body.classList.contains("light")?"light":"dark")}if(localStorage.getItem("mercer_theme")==="light")document.body.classList.add("light");document.body.classList.add("font-"+(localStorage.getItem("mercer_fontsize")||"md"));function requestNotifications(){playSound("send");if(!("Notification" in window))return showToast("Browser notifications are not supported in this browser.");Notification.requestPermission().then(p=>showToast(p==="granted"?"Notifications enabled":"Notifications not enabled"));if(oneSignalReady)OneSignalDeferred.push(async OneSignal=>{try{await OneSignal.Notifications.requestPermission()}catch(e){console.warn("OneSignal permission prompt failed",e)}})}async function logout(){if(!confirm("Log out of Mercer Messenger?"))return;await markOffline();try{peer?.destroy()}catch(e){}unlinkOneSignalUser();await signOut(auth);location.reload()}
function closeMobileChat(){document.body.classList.remove("chat-open")}function openDrawer(title,body){drawerTitle.textContent=title;drawerBody.innerHTML=body;drawer.classList.add("open")}function closeDrawer(){drawer.classList.remove("open")}function openModal(html){modalCard.innerHTML=html;modal.classList.add("open")}function closeModal(){modal.classList.remove("open")}function outsideModal(e){if(e.target===modal)closeModal()}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)markVisibleRead()});
function pref(key, fallback=false){const v=localStorage.getItem("mercer_"+key);return v===null?fallback:v==="true"}
function setPref(key,value){localStorage.setItem("mercer_"+key,String(value))}
function settingRow(icon,title,sub,control){return `<div class="setting"><div><strong>${icon} ${title}</strong><small>${sub}</small></div>${control}</div>`}
function toggleSetting(key){setPref(key,!pref(key));openSettings()}
const WALLPAPERS={none:"none",dark1:"linear-gradient(160deg,#0a1422,#0e1c2d)",teal:"linear-gradient(160deg,#052226,#073d49)",purple:"linear-gradient(160deg,#150c2e,#241147)",sunset:"linear-gradient(160deg,#2b1210,#4a1f1a)",forest:"linear-gradient(160deg,#0c2016,#123321)"};
function applyWallpaper(){const key=localStorage.getItem("mercer_wallpaper")||"none";const body=$("chatBody");if(!body)return;const bg=WALLPAPERS[key]||"none";body.style.backgroundImage=bg==="none"?"":bg}
function setWallpaper(key){localStorage.setItem("mercer_wallpaper",key);applyWallpaper();openWallpaperPicker()}
function openWallpaperPicker(){const current=localStorage.getItem("mercer_wallpaper")||"none";const swatches=Object.keys(WALLPAPERS).map(k=>`<div class="wallpaper-swatch ${k===current?"active":""}" title="${k}" style="background:${k==="none"?"repeating-linear-gradient(45deg,#33445533,#33445533 6px,transparent 6px,transparent 12px)":WALLPAPERS[k]}" onclick="setWallpaper('${k}')"></div>`).join("");openDrawer("Chat wallpaper",`<p class="hint">Choose a background for your chat windows.</p><div class="wallpaper-grid">${swatches}</div><button class="secondary" style="width:100%" onclick="openSettings()">‹ Back to settings</button>`)}
function applyFontSize(){const size=localStorage.getItem("mercer_fontsize")||"md";document.body.classList.remove("font-sm","font-md","font-lg");document.body.classList.add("font-"+size)}
function setFontSize(size){localStorage.setItem("mercer_fontsize",size);applyFontSize();openSettings()}
function exportChat(){if(!selectedConversation)return showToast("Open a chat first.");const lines=messages.map(m=>{const who=m.senderId===currentUser.uid?(currentProfile?.displayName||"You"):selectedUser.displayName;const time=new Date(tsMs(m.createdAt||m.clientCreatedAt)||Date.now()).toLocaleString();return `[${time}] ${who}: ${m.deleted?"(message deleted)":messagePreview(m)}`}).join("\n");const blob=new Blob([lines||"No messages yet."],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`mercer-chat-${selectedUser.displayName.replace(/[^a-z0-9]/gi,"_")}.txt`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Chat exported")}
async function clearAllChats(){if(!confirm("Delete messages from ALL your chats? This can't be undone."))return;try{for(const c of conversations){const snap=await getDocs(collection(db,"conversations",c.id,"messages"));for(const d of snap.docs)await deleteDoc(d.ref);await updateDoc(doc(db,"conversations",c.id),{lastMessage:"",lastMessageAt:serverTimestamp(),lastSenderId:""})}if(selectedConversation){messages=[];renderMessages()}showToast("All chats cleared")}catch(e){showToast(firebaseError(e))}}
function openStorageInfo(){const mediaCount=messages.filter(m=>["image","video","audio","file"].includes(m.type)).length;openDrawer("Storage & data",`<div class="stat-grid"><div><strong>${conversations.length}</strong><span>Total chats</span></div><div><strong>${contactsCache.length}</strong><span>Contacts</span></div><div><strong>${messages.length}</strong><span>Messages in open chat</span></div><div><strong>${mediaCount}</strong><span>Media in open chat</span></div></div><p class="hint">Mercer Messenger stores your chats and media in Firebase. Use Export chat to save a copy, or Clear all chats to free up space.</p><div class="form" style="margin-top:12px"><button class="secondary" onclick="exportChat()">⬇ Export current chat</button><button class="danger" onclick="clearAllChats()">🗑 Clear all chats</button></div>`)}
function openSettings(){const n=currentProfile?.displayName||"Mercer User";const photo=currentProfile?.photoURL||"";const notif=pref("notifications",false),sound=pref("sounds",true),enter=pref("enterSend",true),receipts=pref("readReceipts",true),lastSeen=pref("lastSeen",true);const fontSize=localStorage.getItem("mercer_fontsize")||"md";const blockedCount=(currentProfile?.blockedIds||[]).length;openDrawer("Settings",`<div style="text-align:center;margin-bottom:18px">${avatarHTML(currentProfile||{displayName:n,photoURL:photo},"large",currentUser.uid)}<h2 style="margin-top:8px">${esc(n)}</h2><p class="hint">${esc(currentProfile?.phone||currentUser?.phoneNumber||"")}</p><span class="mini-chip" style="margin-top:8px">Mercer account</span></div><button class="primary" style="width:100%;margin-bottom:15px" onclick="openProfileEditor()">✎ Edit profile</button><div class="settings-group"><div class="settings-label">Your account</div>${settingRow("👤","Profile","Name, photo and about","<button class=\"secondary\" onclick=\"openProfileEditor()\">Open</button>")}${settingRow("🚫","Blocked contacts",blockedCount?`${blockedCount} contact${blockedCount===1?"":"s"} blocked`:"No contacts blocked",`<button class="secondary" onclick="openBlockedContacts()">Manage</button>`)}${settingRow("🔐","Two-step verification","Add extra login security",`<button class="secondary" onclick="showToast('Two-step verification is coming in a future security update.')">Set up</button>`)}</div><div class="settings-group"><div class="settings-label">Privacy</div>${settingRow("✓✓","Read receipts","Let others see when you've read their messages",`<button class="switch ${receipts?"on":""}" onclick="toggleSetting('readReceipts')"></button>`)}${settingRow("🕐","Last seen & online","Share your online status with contacts",`<button class="switch ${lastSeen?"on":""}" onclick="toggleSetting('lastSeen')"></button>`)}</div><div class="settings-group"><div class="settings-label">Notifications</div>${settingRow("🔔","Message notifications","Browser alerts when supported",`<button class="switch ${notif?"on":""}" onclick="toggleSetting('notifications')"></button>`)}${settingRow("🔊","Message sounds","Play send and receive sounds",`<button class="switch ${sound?"on":""}" onclick="toggleSetting('sounds')"></button>`)}${settingRow("🛎","Request notifications","Enable browser permission",`<button class="secondary" onclick="requestNotifications()">Enable</button>`)}</div><div class="settings-group"><div class="settings-label">Chats</div>${settingRow("↵","Enter to send","Press Enter to send messages",`<button class="switch ${enter?"on":""}" onclick="toggleSetting('enterSend')"></button>`)}${settingRow("🖼","Chat wallpaper","Personalize your chat background",`<button class="secondary" onclick="openWallpaperPicker()">Change</button>`)}${settingRow("🔤","Font size",`Currently ${fontSize==="sm"?"small":fontSize==="lg"?"large":"medium"}`,`<div style="display:flex;gap:5px"><button class="secondary" onclick="setFontSize('sm')">S</button><button class="secondary" onclick="setFontSize('md')">M</button><button class="secondary" onclick="setFontSize('lg')">L</button></div>`)}${settingRow("🎨","Appearance","Switch between dark and light",`<button class="secondary" onclick="toggleTheme();openSettings()">${document.body.classList.contains("light")?"Dark mode":"Light mode"}</button>`)}${settingRow("⭐","Starred messages","View messages you've starred in this chat",`<button class="secondary" onclick="openStarredMessages()">View</button>`)}</div><div class="settings-group"><div class="settings-label">Storage & data</div>${settingRow("📊","Storage & data","Usage stats, export and clearing tools",`<button class="secondary" onclick="openStorageInfo()">Open</button>`)}</div><div class="settings-group"><div class="settings-label">App</div>${settingRow("❓","Help & FAQ","Guides for using Mercer Messenger",`<button class="secondary" onclick="showToast('Help center is coming soon — reach out to your Mercer admin for now.')">Open</button>`)}${settingRow("ℹ️","About Mercer","Messenger workspace v8",`<button class="secondary" onclick="showToast('Mercer Messenger • v8 — push notifications, tap-to-view profile pictures, and safer photo uploads.')">Details</button>`)}</div><div style="margin-top:18px"><button class="danger" style="width:100%" onclick="logout()">↪ Log out</button></div>`)}
function updateHomeStats(){const a=$("homeChatCount"),b=$("homePeopleCount");if(a)a.textContent=conversations.length;if(b)b.textContent=contactsCache.length}
const _renderSidebarV5=renderSidebar;renderSidebar=function(){_renderSidebarV5();updateHomeStats()}
const _sendTextV5=sendText;sendText=async function(){if(pref("sounds",true))return _sendTextV5();return _sendTextV5()}
const _messageKeydownV5=messageKeydown;messageKeydown=function(e){if(e.key==="Enter"&&!e.shiftKey&&pref("enterSend",true)){e.preventDefault();sendText()}}

Object.assign(window,{sendVerificationCode,verifyCode,backToPhone,previewProfilePhoto,saveFirstProfile,switchTab,renderSidebar,openNewChat,findUserByPhone,selectConversation,ensureConversationAndOpen,deleteContact,clearChat,sendText,messageKeydown,handleTyping,replyMessage,cancelReply,reactMessage,deleteMessage,handleFiles,markVisibleDelivered,toggleRecording,createStatus,publishStatus,startAudioCall,startVideoCall,acceptCall,declineCall,toggleMute,toggleCamera,endCall,openChatInfo,openSettings,openProfileEditor,saveProfileEdit,toggleTheme,requestNotifications,logout,closeMobileChat,closeDrawer,closeModal,outsideModal,
openChatMenu,toggleConvoFlag,viewStatus,deleteStatus,markStatusViewed,starMessage,openStarredMessages,openForwardPicker,forwardMessage,toggleBlock,openBlockedContacts,setWallpaper,openWallpaperPicker,applyWallpaper,setFontSize,applyFontSize,exportChat,clearAllChats,openStorageInfo,toggleSetting,showToast});

// Auto-retry startup the moment the connection comes back, if we're still stuck on the connect screen.
window.addEventListener("online",()=>{if(bootGateEl&&!bootGateEl.classList.contains("hidden"))boot()});

/* ================= Mercer Messenger v10.5.6 upgrade layer ================= */
const MERCER_VERSION = "10.5.6";
let presenceStop = null;
let presenceHeartbeat = null;
let selectedPresenceStop = null;
let ringtoneTimer = null;
let dialToneTimer = null;
let appLocked = false;

function stopTone(kind){
  const timer = kind==="incoming" ? ringtoneTimer : dialToneTimer;
  if(timer){ clearInterval(timer); if(kind==="incoming") ringtoneTimer=null; else dialToneTimer=null; }
}
function toneOnce(kind="incoming"){
  try{
    const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
    const ctx=new C();
    const notes=kind==="incoming" ? [[523.25,.16],[659.25,.16],[783.99,.24]] : [[440,.11],[554.37,.11]];
    let t=ctx.currentTime;
    notes.forEach(([f,d])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="sine";o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.075,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d+.02);t+=d+.025;
    });
    setTimeout(()=>ctx.close().catch(()=>{}),900);
  }catch(e){}
}
function startIncomingRingtone(){stopTone("incoming");toneOnce("incoming");ringtoneTimer=setInterval(()=>toneOnce("incoming"),1700)}
function startDialTone(){stopTone("dial");toneOnce("dial");dialToneTimer=setInterval(()=>toneOnce("dial"),900)}
function stopAllCallTones(){stopTone("incoming");stopTone("dial")}

function updatePresenceUI(online,lastSeen){
  if(!selectedUser)return;
  selectedUser={...selectedUser,online:!!online,lastSeen:lastSeen||selectedUser.lastSeen};
  if(selectedUser.id){
    const c=contactsCache.find(x=>x.id===selectedUser.id); if(c)Object.assign(c,selectedUser);
  }
  renderChat();
}
function startRealtimePresence(){
  if(!database||!currentUser)return;
  try{presenceStop?.();}catch(e){}
  if(presenceHeartbeat)clearInterval(presenceHeartbeat);
  const uid=currentUser.uid;
  const statusRef=rtdbRef(database,`status/${uid}`);
  const connectedRef=rtdbRef(database,".info/connected");
  presenceStop=rtdbOnValue(connectedRef,async snap=>{
    if(snap.val()!==true)return;
    const onlineState={online:true,last_changed:rtdbServerTimestamp()};
    try{
      const disc=rtdbOnDisconnect(statusRef);
      await disc.set({online:false,last_changed:rtdbServerTimestamp()});
      await rtdbSet(statusRef,onlineState);
      await updateDoc(doc(db,"users",uid),{online:true,lastSeen:serverTimestamp()}).catch(()=>{});
    }catch(e){console.warn("Mercer presence setup failed",e)}
  });
  presenceHeartbeat=setInterval(()=>{
    if(document.visibilityState!=="hidden" && isOnline()){
      rtdbSet(statusRef,{online:true,last_changed:rtdbServerTimestamp()}).catch(()=>{});
      updateDoc(doc(db,"users",uid),{online:true,lastSeen:serverTimestamp()}).catch(()=>{});
    }
  },20000);
  window.addEventListener("beforeunload",()=>{
    try{rtdbSet(statusRef,{online:false,last_changed:rtdbServerTimestamp()})}catch(e){}
  },{once:false});
}
function watchSelectedPresence(uid){
  try{selectedPresenceStop?.();}catch(e){}
  selectedPresenceStop=null;
  if(!database||!uid)return;
  try{
    selectedPresenceStop=rtdbOnValue(rtdbRef(database,`status/${uid}`),snap=>{
      const v=snap.val()||{};
      updatePresenceUI(v.online===true,v.last_changed||selectedUser?.lastSeen);
    });
  }catch(e){}
}
async function isRecipientOnline(uid){
  if(!uid)return false;
  try{
    if(database){
      const snap=await rtdbGet(rtdbRef(database,`status/${uid}`));
      if(snap.exists())return snap.val()?.online===true;
    }
  }catch(e){}
  const u=await getUser(uid).catch(()=>null);
  return !!u?.online;
}

async function deliverLatestForConversation(c){
  try{
    if(!c?.id||!c.other?.id||!(await isRecipientOnline(currentUser.uid)))return;
    const q=query(collection(db,"conversations",c.id,"messages"),orderBy("createdAt","desc"),limit(1));
    const snap=await getDocs(q);
    if(!snap.empty){
      const d=snap.docs[0],m=d.data();
      if(m.senderId!==currentUser.uid && !(m.deliveredBy||[]).includes(currentUser.uid)){
        await updateDoc(d.ref,{deliveredBy:arrayUnion(currentUser.uid)});
      }
    }
  }catch(e){}
}
function listenConversationsV10(){
  unsubConversations?.();
  const q=query(collection(db,"conversations"),where("members","array-contains",currentUser.uid));
  unsubConversations=onSnapshot(q,async snap=>{
    const arr=[];
    for(const d of snap.docs){
      const data=d.data(),otherId=data.members.find(x=>x!==currentUser.uid),other=await getUser(otherId);
      if(other)arr.push({id:d.id,...data,other});
      const prev=knownConversationState.get(d.id)||{};
      const lastAt=tsMs(data.lastMessageAt);
      const isMuted=(data.mutedBy||[]).includes(currentUser.uid);
      if(!firstConversationSnapshot&&data.lastSenderId&&data.lastSenderId!==currentUser.uid&&lastAt!==prev.lastAt&&!isMuted){
        if(selectedConversation?.id!==d.id)playSound("receive");
        if(document.hidden && "Notification" in window && Notification.permission==="granted"){
          try{new Notification(other?.displayName||"New message",{body:data.lastMessage||"New message",tag:"mercer-conversation-"+d.id})}catch(e){}
        }
      }
      if(other?.id)deliverLatestForConversation({id:d.id,...data,other});
    }
    knownConversationState=new Map(arr.map(c=>[c.id,{lastAt:tsMs(c.lastMessageAt),lastSenderId:c.lastSenderId}]));
    firstConversationSnapshot=false;
    conversations=arr.sort((a,b)=>tsMs(b.lastMessageAt)-tsMs(a.lastMessageAt));
    renderSidebar();
  },e=>console.warn("Conversation listener",e));
}
listenConversations=listenConversationsV10;

async function startCallV10(video){
  if(!selectedUser)return showToast("Open a chat first.");
  if(!isOnline())return showToast(friendlyOffline());
  if(!(await isRecipientOnline(selectedUser.id||selectedUser.uid)))return showToast("User is currently offline");
  if(!peer||!peerReady)return showToast("Call service is still connecting. Try again in a moment.");
  if(!navigator.mediaDevices?.getUserMedia)return showToast("This browser doesn't support calling here.");
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:"user"}:false});
    localVideo.srcObject=localStream;localVideo.style.display=video?"block":"none";
    const target="mercer-"+(selectedUser.id||selectedUser.uid);
    activeCall=peer.call(target,localStream,{metadata:{from:currentUser.uid,video}});
    if(!activeCall)throw userError("Unable to create the call.");
    setupCallV10(activeCall,selectedUser);
    showCallScreen(selectedUser,video?"Calling video…":"Calling…");
    startDialTone();
  }catch(e){
    stopAllCallTones(); localStream?.getTracks().forEach(t=>t.stop());localStream=null;
    showToast(e?.name==="NotAllowedError"?"Allow microphone/camera permission in browser settings.":e?.name==="NotFoundError"?"No microphone/camera was found on this device.":firebaseError(e));
  }
}
function setupCallV10(call,u){
  activeCall=call;
  call.on("stream",s=>{
    stopTone("dial");
    remoteVideo.srcObject=s;remoteAudio.srcObject=s;
    remoteVideo.style.display=s.getVideoTracks().length?"block":"none";
    remoteAudio.play?.().catch(()=>{});
    remoteVideo.play?.().catch(()=>{});
    callState.textContent="Connected";
  });
  call.on("close",()=>{if(activeCall===call)endCallV10()});
  call.on("error",e=>{
    console.error("Mercer call",e);stopAllCallTones();callState.textContent="Call failed";
    showToast("Call connection failed.");
    setTimeout(()=>{if(activeCall===call)endCallV10()},800);
  });
}
function initPeerV10(){
  try{peer?.destroy()}catch(e){}
  peerReady=false;
  if(!window.Peer||!currentUser)return;
  peer=new Peer("mercer-"+currentUser.uid,{debug:0});
  peer.on("open",()=>{peerReady=true});
  peer.on("call",async call=>{
    incomingCall=call;
    const uid=String(call.peer).replace(/^mercer-/,"");
    const u=await getUser(uid)||{displayName:"Mercer user"};
    startIncomingRingtone();
    openModal(`<div class="modal-head"><strong>Incoming call</strong></div><div style="text-align:center">${avatarHTML(u,"large")}<h2 style="margin-top:9px">${esc(u.displayName)}</h2><p class="hint" style="margin:7px 0 15px">${call.metadata?.video?"Video call":"Voice call"}</p><div class="people-actions"><button class="danger" onclick="declineCall()">Decline</button><button class="primary" onclick="acceptCall()">Accept</button></div></div>`);
  });
  peer.on("error",e=>{
    console.error("PeerJS",e);stopAllCallTones();
    if(activeCall)callState.textContent="Call connection failed";
    showToast(e?.type==="peer-unavailable"?"User is currently offline":!isOnline()?friendlyOffline():"The call service ran into a problem. Please try again.");
  });
  peer.on("disconnected",()=>{peerReady=false;try{peer.reconnect()}catch(e){}});
}
async function acceptCallV10(){
  if(!incomingCall)return;
  closeModal();stopTone("incoming");
  try{
    const call=incomingCall,video=!!call.metadata?.video;
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:"user"}:false});
    localVideo.srcObject=localStream;localVideo.style.display=video?"block":"none";
    call.answer(localStream);
    const uid=String(call.peer).replace(/^mercer-/,"");
    const u=await getUser(uid)||{displayName:"Mercer user"};
    setupCallV10(call,u);showCallScreen(u,video?"Connecting video…":"Connecting…");
  }catch(e){
    stopAllCallTones();showToast(e?.name==="NotAllowedError"?"Allow microphone/camera permission to answer the call.":"Could not answer the call.");
    try{incomingCall?.close()}catch(x){}incomingCall=null;
  }
}
function declineCallV10(){stopAllCallTones();try{incomingCall?.close()}catch(e){}incomingCall=null;closeModal()}
function endCallV10(){
  stopAllCallTones();try{activeCall?.close()}catch(e){}try{incomingCall?.close()}catch(e){}
  localStream?.getTracks().forEach(t=>t.stop());localStream=null;activeCall=null;incomingCall=null;
  remoteVideo.srcObject=null;remoteAudio.srcObject=null;localVideo.srcObject=null;callScreen.classList.remove("open");
}
initPeer=initPeerV10;
startAudioCall=()=>startCallV10(false);
startVideoCall=()=>startCallV10(true);
acceptCall=acceptCallV10;declineCall=declineCallV10;endCall=endCallV10;
setupCall=setupCallV10;

async function sha256(text){
  const data=new TextEncoder().encode(text),hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function setAppPin(){
  const p=prompt("Create a 6-digit Mercer app PIN:");
  if(!/^\d{6}$/.test(p||""))return showToast("PIN must contain exactly 6 digits.");
  const p2=prompt("Confirm your PIN:");
  if(p!==p2)return showToast("PINs do not match.");
  localStorage.setItem("mercer_pin_hash",await sha256(p));
  showToast("App PIN enabled on this device.");
  openSettings();
}
function clearAppPin(){localStorage.removeItem("mercer_pin_hash");localStorage.removeItem("mercer_webauthn_id");showToast("App lock disabled.");openSettings()}
function b64url(bytes){let s="";bytes=new Uint8Array(bytes);for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64urlBytes(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function setupBiometric(){
  if(!window.PublicKeyCredential||!navigator.credentials)return showToast("Biometric/device credentials aren't available in this browser.");
  try{
    const challenge=crypto.getRandomValues(new Uint8Array(32)),uid=crypto.getRandomValues(new Uint8Array(16));
    const cred=await navigator.credentials.create({publicKey:{
      challenge,rp:{name:"Mercer Messenger",id:location.hostname},
      user:{id:uid,name:currentUser?.phoneNumber||"Mercer user",displayName:currentProfile?.displayName||"Mercer user"},
      pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
      authenticatorSelection:{authenticatorAttachment:"platform",residentKey:"preferred",userVerification:"required"},
      timeout:60000,attestation:"none"
    }});
    if(!cred)return;
    localStorage.setItem("mercer_webauthn_id",b64url(cred.rawId));
    showToast("Biometric/device unlock enabled.");
    openSettings();
  }catch(e){showToast("Biometric setup was cancelled or isn't supported here.")}
}
async function unlockWithBiometric(){
  const id=localStorage.getItem("mercer_webauthn_id");
  if(!id||!navigator.credentials)return false;
  try{
    const cred=await navigator.credentials.get({publicKey:{
      challenge:crypto.getRandomValues(new Uint8Array(32)),
      rpId:location.hostname,
      allowCredentials:[{type:"public-key",id:b64urlBytes(id)}],
      userVerification:"required",timeout:60000
    }});
    return !!cred;
  }catch(e){return false}
}
function showLockScreen(){
  let el=$("appLock");
  if(!el){
    el=document.createElement("div");el.id="appLock";el.className="app-lock";
    el.innerHTML=`<div class="lock-card"><div class="logo-mark lock-logo">M</div><h2>Mercer Messenger</h2><p>App is locked</p><input id="unlockPin" class="input" inputmode="numeric" maxlength="6" placeholder="6-digit PIN" autocomplete="one-time-code"><div id="unlockError" class="error"></div><button class="primary" id="unlockPinBtn">Unlock</button><button class="secondary" id="unlockBioBtn">⌁ Use fingerprint / device credentials</button></div>`;
    document.body.appendChild(el);
    $("unlockPinBtn").onclick=unlockByPin;
    $("unlockBioBtn").onclick=async()=>{if(await unlockWithBiometric())unlockApp();else showToast("Biometric unlock failed or was cancelled.")};
    $("unlockPin").addEventListener("keydown",e=>{if(e.key==="Enter")unlockByPin()});
  }
  el.classList.add("open");appLocked=true;
  setTimeout(()=>$("unlockPin")?.focus(),50);
}
async function unlockByPin(){
  const p=$("unlockPin")?.value||"",hash=await sha256(p);
  if(hash!==localStorage.getItem("mercer_pin_hash")){ $("unlockError").textContent="Incorrect PIN.";return}
  unlockApp();
}
function unlockApp(){appLocked=false;$("appLock")?.classList.remove("open");$("unlockPin").value="";$("unlockError").textContent="";if(currentUser&&$("app").classList.contains("hidden")){_startAppV10Base().then(()=>{startRealtimePresence();if(selectedUser?.id)watchSelectedPresence(selectedUser.id)}).catch(e=>showToast(firebaseError(e)))}}
async function enforceAppLock(){
  const hasPin=!!localStorage.getItem("mercer_pin_hash"),hasBio=!!localStorage.getItem("mercer_webauthn_id");
  if(!hasPin&&!hasBio)return true;
  if(hasBio && !hasPin){ if(await unlockWithBiometric())return true; showLockScreen();return false; }
  showLockScreen();return false;
}
const _startAppV10Base=startApp;
startApp=async function(){
  if(!(await enforceAppLock()))return;
  const result=await _startAppV10Base();
  startRealtimePresence();
  if(selectedUser?.id)watchSelectedPresence(selectedUser.id);
  return result;
};

function applyWallpaperV10(){
  const body=$("chatBody");if(!body)return;
  const key=localStorage.getItem("mercer_wallpaper")||"none";
  const image=localStorage.getItem("mercer_wallpaper_image");
  if(image){body.style.backgroundImage=`url("${image}")`;return}
  const bg=WALLPAPERS[key]||"none";body.style.backgroundImage=bg==="none"?"":bg;
}
applyWallpaper=applyWallpaperV10;
async function setCustomWallpaperFile(file){
  if(!file||!file.type.startsWith("image/"))return showToast("Choose a valid image.");
  try{
    const bitmap=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const c=document.createElement("canvas");c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));
    c.getContext("2d").drawImage(bitmap,0,0,c.width,c.height);
    const data=c.toDataURL("image/jpeg",.78);
    localStorage.setItem("mercer_wallpaper_image",data);localStorage.setItem("mercer_wallpaper","custom");applyWallpaper();showToast("Custom wallpaper saved.");
    openWallpaperPicker();
  }catch(e){showToast("Couldn't use that image as wallpaper.")}
}
function setWallpaperV10(key){
  if(key!=="custom")localStorage.removeItem("mercer_wallpaper_image");
  if(key!=="color")localStorage.removeItem("mercer_wallpaper_color");
  localStorage.setItem("mercer_wallpaper",key);applyWallpaper();openWallpaperPicker();
}
setWallpaper=setWallpaperV10;
function openWallpaperPickerV10(){
  const current=localStorage.getItem("mercer_wallpaper")||"none";
  const swatches=Object.keys(WALLPAPERS).map(k=>`<div class="wallpaper-swatch ${k===current?"active":""}" title="${k}" style="background:${k==="none"?"repeating-linear-gradient(45deg,#33445533,#33445533 6px,transparent 6px,transparent 12px)":WALLPAPERS[k]}" onclick="setWallpaper('${k}')"></div>`).join("");
  openDrawer("Chat wallpaper",`<p class="hint">Choose a preset, a color, or upload a private wallpaper stored on this device.</p><div class="wallpaper-grid">${swatches}</div><div class="wallpaper-tools"><input id="wallpaperColor" type="color" value="#0a1422"><button class="secondary" onclick="setWallpaperColor()">Use color</button><label class="secondary upload-wallpaper">Upload image<input type="file" accept="image/*" hidden onchange="setCustomWallpaperFile(this.files[0])"></label></div><button class="secondary" style="width:100%;margin-top:8px" onclick="setWallpaper('none')">Remove custom background</button><button class="secondary" style="width:100%;margin-top:8px" onclick="openSettings()">‹ Back to settings</button>`);
}
openWallpaperPicker=openWallpaperPickerV10;
function setWallpaperColor(){
  const c=$("wallpaperColor")?.value||"#0a1422";
  localStorage.setItem("mercer_wallpaper_image","");localStorage.setItem("mercer_wallpaper_color",c);localStorage.setItem("mercer_wallpaper","color");applyWallpaperV10();openWallpaperPicker();
}
const _applyWallpaperColor=applyWallpaperV10;
applyWallpaper=function(){
  const body=$("chatBody");if(!body)return;
  const color=localStorage.getItem("mercer_wallpaper_color");
  const image=localStorage.getItem("mercer_wallpaper_image");
  if(image){body.style.backgroundImage=`url("${image}")`;return}
  if(color){body.style.backgroundImage="";body.style.backgroundColor=color;return}
  body.style.backgroundColor="";const key=localStorage.getItem("mercer_wallpaper")||"none",bg=WALLPAPERS[key]||"none";body.style.backgroundImage=bg==="none"?"":bg;
};

async function cleanupExpiredStatusesClient(){
  if(!db||!currentUser)return;
  try{
    const q=query(collection(db,"statuses"),where("expiresAt","<=",new Date()),where("ownerId","==",currentUser.uid));
    const snap=await getDocs(q);await Promise.all(snap.docs.map(d=>deleteDoc(d.ref)));
  }catch(e){}
}
const _listenStatusesV10Base=listenStatuses;
listenStatuses=function(){cleanupExpiredStatusesClient();_listenStatusesV10Base();};

function openHelpPanel(){
  openModal(`<div class="modal-head"><strong>Help & FAQ</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form"><div class="status-card"><b>How do I start a chat?</b><p class="hint">Open New chat, enter a registered phone number, then send a message.</p></div><div class="status-card"><b>Why do I see one tick?</b><p class="hint">One gray tick means the message was sent. Two gray ticks mean it reached the recipient's active Mercer session. Two green ticks mean it was opened/read.</p></div><div class="status-card"><b>How long do statuses last?</b><p class="hint">Statuses expire after 24 hours. Automatic server cleanup is included in the optional scheduled Firebase function.</p></div><div class="status-card"><b>Customer care</b><p class="hint">Phone: <a href="tel:0116142639">0116 142639</a><br>Email: <a href="mailto:kitsaokelvin2@gmail.com">kitsaokelvin2@gmail.com</a></p></div></div>`);
}
function openAboutPanel(){
  openModal(`<div class="modal-head"><strong>About Mercer Messenger</strong><button class="icon-btn" onclick="closeModal()">×</button></div><div style="text-align:center;padding:12px"><div class="logo-mark" style="margin:auto">M</div><h2 style="margin-top:12px">Mercer Messenger</h2><p class="hint">Private messaging, media sharing and voice/video calls.</p><span class="mini-chip" style="margin-top:10px">App Version ${MERCER_VERSION}</span></div>`);
}
function openSecurityPanel(){
  const pin=!!localStorage.getItem("mercer_pin_hash"),bio=!!localStorage.getItem("mercer_webauthn_id");
  openModal(`<div class="modal-head"><strong>Two-step verification & app lock</strong><button class="icon-btn" onclick="closeModal()">×</button></div><p class="hint">These controls protect this device after Mercer is opened. They do not replace Firebase account authentication.</p><div class="settings-group">${settingRow("🔢","6-digit app PIN","Require your PIN when the app opens",`<button class="secondary" onclick="setAppPin()">Set / change</button>`)}${settingRow("⌁","Fingerprint / device credentials",bio?"Enabled":"Not enabled",`<button class="secondary" onclick="setupBiometric()">Enable</button>`)}${pin||bio?`<button class="danger" style="width:100%;margin-top:8px" onclick="clearAppPin();closeModal()">Disable device lock</button>`:""}</div>`);
}
function openSettingsV10(){
  const n=currentProfile?.displayName||"Mercer User";
  const notif=pref("notifications",false),sound=pref("sounds",true),enter=pref("enterSend",true),receipts=pref("readReceipts",true),lastSeen=pref("lastSeen",true);
  const fontSize=localStorage.getItem("mercer_fontsize")||"md",blockedCount=(currentProfile?.blockedIds||[]).length;
  openDrawer("Settings",`<div style="text-align:center;margin-bottom:18px">${avatarHTML(currentProfile||{displayName:n},"large",currentUser.uid)}<h2 style="margin-top:8px">${esc(n)}</h2><p class="hint">${esc(currentProfile?.phone||currentUser?.phoneNumber||"")}</p><span class="mini-chip" style="margin-top:8px">Mercer Messenger ${MERCER_VERSION}</span></div><button class="primary" style="width:100%;margin-bottom:15px" onclick="openProfileEditor()">✎ Edit profile</button><div class="settings-group"><div class="settings-label">Security</div>${settingRow("🔐","Two-step verification","PIN and biometric/device unlock for this device",`<button class="secondary" onclick="openSecurityPanel()">Manage</button>`)}</div><div class="settings-group"><div class="settings-label">Privacy</div>${settingRow("✓✓","Read receipts","Let others see when you've read their messages",`<button class="switch ${receipts?"on":""}" onclick="toggleSetting('readReceipts')"></button>`)}${settingRow("🕐","Last seen & online","Share your online status with contacts",`<button class="switch ${lastSeen?"on":""}" onclick="toggleSetting('lastSeen')"></button>`)}</div><div class="settings-group"><div class="settings-label">Notifications</div>${settingRow("🔔","Message notifications","Browser alerts when supported",`<button class="switch ${notif?"on":""}" onclick="toggleSetting('notifications')"></button>`)}${settingRow("🔊","Message sounds","Play send and receive sounds",`<button class="switch ${sound?"on":""}" onclick="toggleSetting('sounds')"></button>`)}${settingRow("🛎","Request notifications","Enable browser permission",`<button class="secondary" onclick="requestNotifications()">Enable</button>`)}</div><div class="settings-group"><div class="settings-label">Chats</div>${settingRow("↵","Enter to send","Press Enter to send messages",`<button class="switch ${enter?"on":""}" onclick="toggleSetting('enterSend')"></button>`)}${settingRow("🖼","Chat wallpaper","Preset, color, or image",`<button class="secondary" onclick="openWallpaperPicker()">Change</button>`)}${settingRow("🔤","Font size",`Currently ${fontSize==="sm"?"small":fontSize==="lg"?"large":"medium"}`,`<div style="display:flex;gap:5px"><button class="secondary" onclick="setFontSize('sm')">S</button><button class="secondary" onclick="setFontSize('md')">M</button><button class="secondary" onclick="setFontSize('lg')">L</button></div>`)}</div><div class="settings-group"><div class="settings-label">App</div>${settingRow("🎨","Appearance","Switch between dark and light",`<button class="secondary" onclick="toggleTheme();openSettings()">${document.body.classList.contains("light")?"Dark mode":"Light mode"}</button>`)}${settingRow("❓","Help & FAQ","Customer care and common questions",`<button class="secondary" onclick="openHelpPanel()">Open</button>`)}${settingRow("ℹ️","About Mercer","Application metadata",`<button class="secondary" onclick="openAboutPanel()">Details</button>`)}</div><div class="settings-group"><div class="settings-label">Account</div>${settingRow("🚫","Blocked contacts",blockedCount?`${blockedCount} contact${blockedCount===1?"":"s"} blocked`:"No contacts blocked",`<button class="secondary" onclick="openBlockedContacts()">Manage</button>`)}${settingRow("📊","Storage & data","Usage stats, export and clearing tools",`<button class="secondary" onclick="openStorageInfo()">Open</button>`)}</div><div style="margin-top:18px"><button class="danger" style="width:100%" onclick="logout()">↪ Log out</button></div>`);
}
openSettings=openSettingsV10;

const _selectConversationV10=selectConversation;
selectConversation=async function(id){
  await _selectConversationV10(id);
  if(selectedUser?.id)watchSelectedPresence(selectedUser.id);
  applyWallpaper();
};

const _logoutV10=logout;
logout=async function(){
  try{
    if(database&&currentUser)await rtdbSet(rtdbRef(database,`status/${currentUser.uid}`),{online:false,last_changed:rtdbServerTimestamp()});
  }catch(e){}
  stopAllCallTones();
  if(presenceHeartbeat)clearInterval(presenceHeartbeat);
  try{presenceStop?.()}catch(e){};try{selectedPresenceStop?.()}catch(e){}
  return _logoutV10();
};

window.addEventListener("pagehide",()=>{try{if(database&&currentUser)rtdbSet(rtdbRef(database,`status/${currentUser.uid}`),{online:false,last_changed:rtdbServerTimestamp()})}catch(e){}});
window.addEventListener("pointerdown",()=>{try{if(window.AudioContext){}}catch(e){}},{once:true});

Object.assign(window,{setAppPin,clearAppPin,setupBiometric,unlockWithBiometric,openSecurityPanel,openHelpPanel,openAboutPanel,setCustomWallpaperFile,setWallpaperColor,openWallpaperPicker,applyWallpaper, startAudioCall,startVideoCall,acceptCall,declineCall,endCall});
/* ================= End v10.5.6 upgrade layer ================= */

boot();
