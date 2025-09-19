// Utility for sending password reset
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export async function sendReset(email) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth`,
    handleCodeInApp: false,
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}
