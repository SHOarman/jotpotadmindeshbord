import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, getDocs, collection, query, orderBy, limit, onSnapshot, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { UserProfile, Location } from '../../types';
import { playNotificationSound } from '../../lib/notificationSound';
import { syncDriversSubscriptionStatus, SyncResult } from '../../lib/subscriptionSync';

interface GlobalSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string;
  siteTitle: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  aboutUs: string;
  privacyPolicy: string;
  primaryColor: string;
  secondaryColor: string;
  paymentInstructions: string;
  automatedPayment: boolean;
  paymentGatewayName: string;
  paymentGatewayUrl: string;
  paymentGatewayStoreId: string;
  paymentGatewaySecret: string;
  discount3Months: number;
  discount6Months: number;
  discount1Year: number;
  showLiveBanner: boolean;
  liveBannerText: string;
  liveBannerBgColor: string;
  liveBannerTextColor: string;
  liveBannerSpeed: number;
  showRegLiveBanner: boolean;
  regLiveBannerText: string;
  regLiveBannerBgColor: string;
  regLiveBannerTextColor: string;
  regLiveBannerSpeed: number;
  registrationEnabled?: boolean;
  addEntryEnabled?: boolean;
  requirePaymentOnRegistration?: boolean;
  revenueAdjustment?: number;
  allVehiclesFree?: boolean;

  // Dynamic Contact & Helpline Info
  contactAddress?: string;
  phone?: string;
  email?: string;

  // Dynamic Legal Policies & About Us
  privacyPolicyBn?: string;
  privacyPolicyEn?: string;
  termsConditionsBn?: string;
  termsConditionsEn?: string;
  aboutUsBn?: string;
  aboutUsEn?: string;
}

interface AdminContextType {
  user: any;
  profile: UserProfile | null;
  isAdmin: boolean;
  isAgent: boolean;
  hasPermission: (permission: string) => boolean;
  locations: Location[];
  vehicleTypes: any[];
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  notifications: any[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string, readBy: string[]) => Promise<void>;
  logAction: (action: string, description: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
  refreshVehicleTypes: () => Promise<void>;
  refreshGlobalSettings: () => Promise<void>;
  pendingDriversCount: number;
  loadingCore: boolean;
  playNotificationSound: () => void;
  triggerDriverSubscriptionSync: () => Promise<SyncResult | null>;
}

const defaultSettings: GlobalSettings = {
  maintenanceMode: false,
  maintenanceMessage: '',
  maintenanceEndTime: '',
  siteTitle: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  contactAddress: '',
  phone: '',
  email: '',
  aboutUs: '',
  aboutUsBn: '',
  aboutUsEn: '',
  privacyPolicy: '',
  privacyPolicyBn: '',
  privacyPolicyEn: '',
  termsConditionsBn: '',
  termsConditionsEn: '',
  primaryColor: '#FF8C00',
  secondaryColor: '#1a1a1a',
  paymentInstructions: '',
  automatedPayment: false,
  paymentGatewayName: 'aamarpay',
  paymentGatewayUrl: '',
  paymentGatewayStoreId: '',
  paymentGatewaySecret: '',
  discount3Months: 0,
  discount6Months: 0,
  discount1Year: 0,
  showLiveBanner: false,
  liveBannerText: '',
  liveBannerBgColor: '#dc2626',
  liveBannerTextColor: '#ffffff',
  liveBannerSpeed: 25,
  showRegLiveBanner: false,
  regLiveBannerText: '',
  regLiveBannerBgColor: '#dc2626',
  regLiveBannerTextColor: '#ffffff',
  regLiveBannerSpeed: 25,
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, isAgent } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingCore, setLoadingCore] = useState(true);

  const isInitialNotifRef = useRef(true);
  const prevPendingCountRef = useRef<number | null>(null);

  const hasPermission = useCallback((permission: string) => {
    if (isAdmin) return true;
    if (isAgent && profile?.rules) {
      const allowed = profile.rules.split(',').map((r) => r.trim());
      return allowed.includes(permission);
    }
    return false;
  }, [isAdmin, isAgent, profile]);

  const logAction = useCallback(async (action: string, description: string) => {
    try {
      await addDoc(collection(db, 'actionLogs'), {
        action,
        description,
        userId: user?.uid,
        userName: profile?.name || user?.email || 'Unknown',
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to log action:', e);
    }
  }, [user, profile]);

  const refreshLocations = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'locations'), orderBy('level')));
      setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  }, []);

  const [pendingDriversCount, setPendingDriversCount] = useState<number>(0);

  const refreshVehicleTypes = useCallback(async () => {
    try {
      let snap = await getDocs(collection(db, 'vehicleTypes'));
      if (snap.empty) {
        snap = await getDocs(collection(db, 'vehicle_types'));
      }
      setVehicleTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching vehicle types:', e);
    }
  }, []);

  const refreshGlobalSettings = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const d = snap.data();
        const p = d.contactPhone || d.phone || '';
        const em = d.contactEmail || d.email || '';
        const ad = d.contactAddress || d.address || '';
        setGlobalSettings((prev) => ({
          ...prev,
          ...d,
          contactPhone: p || prev.contactPhone || '',
          phone: p || prev.phone || '',
          contactEmail: em || prev.contactEmail || '',
          email: em || prev.email || '',
          contactAddress: ad || prev.contactAddress || '',
          address: ad || prev.address || '',
          privacyPolicyBn: d.privacyPolicyBn ?? prev.privacyPolicyBn ?? '',
          privacyPolicyEn: d.privacyPolicyEn ?? prev.privacyPolicyEn ?? '',
          termsConditionsBn: d.termsConditionsBn ?? prev.termsConditionsBn ?? '',
          termsConditionsEn: d.termsConditionsEn ?? prev.termsConditionsEn ?? '',
          aboutUsBn: d.aboutUsBn ?? prev.aboutUsBn ?? '',
          aboutUsEn: d.aboutUsEn ?? prev.aboutUsEn ?? '',
        }));
      }
    } catch (e) {
      console.error('Error fetching global settings:', e);
    }
  }, []);

  // Background driver subscription synchronization
  const triggerDriverSubscriptionSync = useCallback(async () => {
    try {
      const res = await syncDriversSubscriptionStatus(vehicleTypes, globalSettings.allVehiclesFree);
      if (res.deactivatedExpired > 0) {
        console.log(`[SubscriptionSync] Auto-deactivated ${res.deactivatedExpired} expired/unpaid drivers from app/web mode.`);
      }
      return res;
    } catch (e) {
      console.error('Failed to sync drivers subscription status:', e);
      return null;
    }
  }, [vehicleTypes, globalSettings.allVehiclesFree]);

  useEffect(() => {
    if (!isAdmin && !isAgent) {
      setLoadingCore(false);
      return;
    }

    Promise.all([refreshLocations(), refreshVehicleTypes(), refreshGlobalSettings()]).finally(() => {
      setLoadingCore(false);
    });

    // Real-time listener for global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const p = d.contactPhone || d.phone || '';
        const em = d.contactEmail || d.email || '';
        const ad = d.contactAddress || d.address || '';
        setGlobalSettings((prev) => ({
          ...prev,
          ...d,
          contactPhone: p || prev.contactPhone || '',
          phone: p || prev.phone || '',
          contactEmail: em || prev.contactEmail || '',
          email: em || prev.email || '',
          contactAddress: ad || prev.contactAddress || '',
          address: ad || prev.address || '',
          privacyPolicyBn: d.privacyPolicyBn ?? prev.privacyPolicyBn ?? '',
          privacyPolicyEn: d.privacyPolicyEn ?? prev.privacyPolicyEn ?? '',
          termsConditionsBn: d.termsConditionsBn ?? prev.termsConditionsBn ?? '',
          termsConditionsEn: d.termsConditionsEn ?? prev.termsConditionsEn ?? '',
          aboutUsBn: d.aboutUsBn ?? prev.aboutUsBn ?? '',
          aboutUsEn: d.aboutUsEn ?? prev.aboutUsEn ?? '',
        }));
      }
    }, (err) => {
      console.error('Error listening to global settings:', err);
    });

    // Real-time notifications listener with sound chime on new incoming notices
    const notifQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      if (isInitialNotifRef.current) {
        isInitialNotifRef.current = false;
      } else {
        const soundEnabled = profile?.notificationSoundEnabled ?? true;
        if (soundEnabled) {
          const hasNewUnread = snap.docChanges().some((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              return !data.readBy || !data.readBy.includes(profile?.uid || '');
            }
            return false;
          });
          if (hasNewUnread) {
            playNotificationSound();
          }
        }
      }
    }, (err) => {
      console.error('Error in notifications listener:', err);
    });

    // Real-time pending drivers listener with chime when new driver registers
    const pendingQuery = query(collection(db, 'drivers'), where('isActive', '==', false), limit(100));
    const unsubPending = onSnapshot(pendingQuery, (snap) => {
      const currentSize = snap.size;
      setPendingDriversCount(currentSize);

      if (prevPendingCountRef.current !== null && currentSize > prevPendingCountRef.current) {
        const soundEnabled = profile?.notificationSoundEnabled ?? true;
        if (soundEnabled) {
          playNotificationSound();
        }
      }
      prevPendingCountRef.current = currentSize;
    }, (err) => {
      console.error('Error in pending drivers listener:', err);
    });

    return () => {
      unsubSettings();
      unsubNotif();
      unsubPending();
    };
  }, [isAdmin, isAgent, refreshLocations, refreshVehicleTypes, refreshGlobalSettings, profile]);

  // Periodic background check to deactivate expired vehicles so they don't show in app/web mode
  useEffect(() => {
    if (!isAdmin && !isAgent) return;

    const timer = setTimeout(() => {
      triggerDriverSubscriptionSync();
    }, 4000);

    const interval = setInterval(() => {
      triggerDriverSubscriptionSync();
    }, 10 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isAdmin, isAgent, triggerDriverSubscriptionSync]);

  const markNotificationRead = useCallback(async (id: string, readBy: string[]) => {
    if (!profile?.uid || readBy.includes(profile.uid)) return;
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readBy: [...readBy, profile.uid],
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  }, [profile]);

  const unreadNotificationsCount = notifications.filter(
    (n) => !n.readBy?.includes(profile?.uid || '')
  ).length;

  return (
    <AdminContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isAgent,
        hasPermission,
        locations,
        vehicleTypes,
        globalSettings,
        setGlobalSettings,
        notifications,
        unreadNotificationsCount,
        pendingDriversCount,
        markNotificationRead,
        logAction,
        refreshLocations,
        refreshVehicleTypes,
        refreshGlobalSettings,
        loadingCore,
        playNotificationSound,
        triggerDriverSubscriptionSync,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
