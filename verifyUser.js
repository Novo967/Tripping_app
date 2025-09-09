const admin = require("firebase-admin");
const serviceAccount = require("./tripapp-f99f4-firebase-adminsdk-fbsvc-d1ee7aa7de.json"); // הנתיב לקובץ שהורדת

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "JB81sPLhNkQ1DYCxbJmbOYULkhP2"; // תחליף ל-UID של testuser מהקונסולה

admin.auth().updateUser(uid, {
  emailVerified: true,
})
  .then((userRecord) => {
    console.log("Successfully verified user:", userRecord.toJSON());
  })
  .catch((error) => {
    console.error("Error updating user:", error);
  });
