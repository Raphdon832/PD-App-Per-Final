import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendVerification } from './email';

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // {displayName, ...}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u || !u.uid) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // Optionally, create the user doc if missing
          const userData = { uid: u.uid, email: u.email, displayName: u.displayName, role: 'customer' };
          await setDoc(ref, userData);
          setProfile(userData);
        }
      } catch (err) {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const signUp = async ({ email, password, displayName, address, lat, lon, phone, role }) => {
    // default role to 'customer' when not provided
    const assignedRole = role || 'customer';
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(user, { displayName });
    const userData = { uid: user.uid, email, displayName, role: assignedRole };
    if (address) userData.address = address;
    if (lat) userData.lat = lat;
    if (lon) userData.lon = lon;
    if (phone) userData.phone = phone;
    await setDoc(doc(db, 'users', user.uid), userData);
    await sendVerification(user);
    return { user, verificationSent: true };
  };

  const logout = () => signOut(auth);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, signIn, signUp, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}