import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAgent: false,
  isEmployee: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const checkAndBootstrapSuberAdmin = async () => {
        const userEmailRaw = user?.email || '';
        const userEmailClean = userEmailRaw.toLowerCase().replace(/\./g, '');
        const isSuperAdminEmail = 
          userEmailClean === 'smanonto5@gmailcom' ||
          userEmailRaw.toLowerCase() === 's.m.anonto5@gmail.com';
        
        if (isSuperAdminEmail) {
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists() || docSnap.data()?.role !== 'admin') {
              await setDoc(docRef, {
                uid: user.uid,
                email: user.email,
                role: 'admin'
              }, { merge: true });
            }
          } catch(e) {
            console.error("Bootstrap admin error:", e);
          }
        }
      };
      checkAndBootstrapSuberAdmin();

      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        } else {
          // Default profile if not exists
          setProfile({
            uid: user.uid,
            email: user.email || '',
            role: 'user',
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Profile sync error:", error);
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  const isActiveUser = profile?.isActive !== false;
  const userEmailRaw = user?.email || '';
  const userEmailClean = userEmailRaw.toLowerCase().replace(/\./g, '');
  const isSuperAdminEmail = 
    userEmailClean === 'smanonto5@gmailcom' ||
    userEmailRaw === 's.m.anonto5@gmail.com' ||
    userEmailRaw === 'S.m.Anonto5@gmail.com';
  
  const isAdmin = isActiveUser && (profile?.role === 'admin' || isSuperAdminEmail);
  const isAgent = isActiveUser && (profile?.role === 'agent' || isAdmin);
  const isEmployee = isActiveUser && profile?.role === 'employee';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isAgent, isEmployee }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
