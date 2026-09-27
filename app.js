/* ============================================================
   MERCER MESSENGER - APP.JS (FULL FIXED VERSION)
   ============================================================ */

// Global State Variables
let currentUser = null;
let currentChatUid = null;
let currentChatUser = null;
let activeCall = null;
let localStream = null;
let remoteStream = null;
let peer = null;
let peerReady = false;
let incomingCall = null;
let isVideoCallActive = false;
let messagesListener = null;

// Audio Tones
const ringtone = new Audio("https://actions.google.com/sounds/v1/ringtones/incoming_call.ogg");
ringtone.loop = true;
const dialtone = new Audio("https://actions.google.com/sounds/v1/ringtones/outgoing_call.ogg");
dialtone.loop = true;

// Utility Functions
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isOnline() {
  return navigator.onLine;
}

function friendlyOffline() {
  return "You are currently offline. Check your internet connection.";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function openModal(contentHtml) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  if (!modal || !modalBody) return;
  modalBody.innerHTML = contentHtml;
  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("active");
}

function avatarHTML(user, size = "small") {
  const name = user?.displayName || "User";
  const initial = name.charAt(0).toUpperCase();
  const photo = user?.photoURL;
  if (photo) {
    return `<img src="${esc(photo)}" class="avatar ${size}" alt="${esc(name)}">`;
  }
  return `<div class="avatar ${size} placeholder">${initial}</div>`;
}

function stopAllCallTones() {
  try { ringtone.pause(); ringtone.currentTime = 0; } catch (e) {}
  try { dialtone.pause(); dialtone.currentTime = 0; } catch (e) {}
}

function startIncomingRingtone() {
  try { ringtone.play(); } catch (e) {}
}

function startOutgoingDialtone() {
  try { dialtone.play(); } catch (e) {}
}

// Database Helpers
async function getUser(uid) {
  try {
    const snap = await firebase.database().ref("users/" + uid).once("value");
    return snap.val();
  } catch (e) {
    console.error("Error fetching user:", e);
    return null;
  }
}

// Presence Tracker
function startRealtimePresence() {
  if (!currentUser) return;
  const userStatusRef = firebase.database().ref("users/" + currentUser.uid + "/status");
  const connectedRef = firebase.database().ref(".info/connected");

  connectedRef.on("value", (snap) => {
    if (snap.val() === false) return;
    userStatusRef.onDisconnect().set({
      state: "offline",
      last_changed: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      userStatusRef.set({
        state: "online",
        last_changed: firebase.database.ServerValue.TIMESTAMP
      });
    });
  });
}

// Call Handling Core
async function startCallV10(isVideo) {
  if (!currentChatUid) return;
  isVideoCallActive = isVideo;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true
    });
    
    startOutgoingDialtone();
    const call = peer.call("mercer-" + currentChatUid, localStream);
    activeCall = call;

    openModal(`
      <div class="modal-head"><strong>Calling...</strong></div>
      <div style="text-align:center">
        ${avatarHTML(currentChatUser, "large")}
        <h2 style="margin-top:9px">${esc(currentChatUser?.displayName || "User")}</h2>
        <p id="callState" class="hint" style="margin:7px 0 15px">Ringing...</p>
        <button class="danger" onclick="endCallV10()">End Call</button>
      </div>
    `);

    call.on("stream", (remoteStreamData) => {
      stopAllCallTones();
      remoteStream = remoteStreamData;
      // Handle active stream setup
    });

    call.on("close", () => {
      endCallV10();
    });

  } catch (err) {
    console.error("Media Error:", err);
    stopAllCallTones();
    showToast("Could not access camera/microphone.");
  }
}

function endCall() {
  stopAllCallTones();
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (activeCall) {
    try { activeCall.close(); } catch (e) {}
    activeCall = null;
  }
  closeModal();
}

// PeerJS Initialization & Call Handlers
function initPeerV10() {
  try { peer?.destroy(); } catch (e) {}
  peerReady = false;
  if (!window.Peer || !currentUser) return;

  peer = new Peer("mercer-" + currentUser.uid, { debug: 0 });

  peer.on("open", () => {
    peerReady = true;
  });

  peer.on("call", async (call) => {
    incomingCall = call;
    const uid = String(call.peer).replace(/^mercer-/, "");
    const u = (await getUser(uid)) || { displayName: "Mercer user" };

    startIncomingRingtone();

    openModal(`
      <div class="modal-head"><strong>Incoming call</strong></div>
      <div style="text-align:center">
        ${avatarHTML(u, "large")}
        <h2 style="margin-top:9px">${esc(u.displayName)}</h2>
        <p class="hint" style="margin:7px 0 15px">is calling you</p>
        <div class="people-actions">
          <button class="danger" onclick="declineCall()">Decline</button>
          <button class="primary" onclick="acceptCall()">Accept</button>
        </div>
      </div>
    `);
  });

  peer.on("error", (e) => {
    console.error("PeerJS Error:", e);
    stopAllCallTones();
    const callState = document.getElementById("callState");
    if (activeCall && callState) callState.textContent = "Call connection failed";
    showToast(
      e?.type === "peer-unavailable"
        ? "The other user is not reachable."
        : !isOnline()
        ? friendlyOffline()
        : "Call error"
    );
  });
}

// Overrides for Call Buttons
window.startAudioCall = () => startCallV10(false);
window.startVideoCall = () => startCallV10(true);

window.acceptCall = async () => {
  if (!incomingCall) return;
  stopAllCallTones();
  closeModal();

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    incomingCall.answer(localStream);
    activeCall = incomingCall;

    incomingCall.on("stream", (remoteStreamData) => {
      remoteStream = remoteStreamData;
    });

    incomingCall.on("close", () => {
      endCallV10();
    });
  } catch (err) {
    console.error("Accept Call Error:", err);
    showToast("Unable to access local media.");
  }
};

window.declineCall = () => {
  stopAllCallTones();
  try { incomingCall?.close(); } catch (e) {}
  incomingCall = null;
  closeModal();
};

window.endCallV10 = () => {
  stopAllCallTones();
  endCall();
};

// Application Startup
async function startApp() {
  console.log("Mercer Messenger Initialized.");
  // Basic Auth State Observer Example
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      startRealtimePresence();
      initPeerV10();
    } else {
      currentUser = null;
    }
  });
}

// Event Listener for DOM Load
document.addEventListener("DOMContentLoaded", () => {
  startApp();
});
