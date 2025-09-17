// Utility for sending email verification and password reset
import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export async function sendVerification(user) {
  if (user) {
    const actionCodeSettings = {
      // After the user clicks the verification link in their email they will be
      // returned to the app's auth page.
      url: `${window.location.origin}/auth`,
      // This is not an in-app (mobile) flow, so leave handleCodeInApp false
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);
  }
}

export async function sendReset(email) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: false,
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}
