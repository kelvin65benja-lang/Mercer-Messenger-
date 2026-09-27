const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");

initializeApp();

exports.cleanupExpiredStatuses = onSchedule("every 60 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const snap = await db.collection("statuses").where("expiresAt", "<=", now).limit(500).get();
  if (snap.empty) return null;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return null;
});
