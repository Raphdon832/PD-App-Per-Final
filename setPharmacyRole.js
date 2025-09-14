const admin = require('firebase-admin');

// Initialize your app with the service account key
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

// Replace with your pharmacy user's UID
const uid = qYk8CMeTLMNPMtSQCwKZi73jIpo1;

admin.auth().setCustomUserClaims(uid, { role: 'pharmacy' })
  .then(() => {
    console.log('Custom claim set for user:', uid);
  })
  .catch(error => {
    console.error('Error setting custom claim:', error);
  });