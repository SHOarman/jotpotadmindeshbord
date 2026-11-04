import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import {
  Settings,
  ShieldCheck,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  ExternalLink,
  FileText,
  Copyright,
  BookOpen,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import { playNotificationSound } from '../../lib/notificationSound';
import toast from 'react-hot-toast';

export const SettingsTab: React.FC = () => {
  const { user, profile, isAdmin, hasPermission, globalSettings, setGlobalSettings, logAction } = useAdmin();

  // Local settings state
  const [saving, setSaving] = useState(false);
  const [togglingPayment, setTogglingPayment] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(globalSettings.registrationEnabled ?? false);
  const [addEntryEnabled, setAddEntryEnabled] = useState(globalSettings.addEntryEnabled ?? false);
  const [requirePaymentOnRegistration, setRequirePaymentOnRegistration] = useState(
    globalSettings.requirePaymentOnRegistration ?? false
  );

  // Auto-save toggle for Payment Method
  const handleTogglePaymentMethod = async () => {
    if (togglingPayment) return;
    const isAuto = !globalSettings.automatedPayment;

    // 1. Optimistic UI update
    setGlobalSettings((prev) => ({
      ...prev,
      automatedPayment: isAuto,
      paymentMethod: isAuto ? 'automated' : 'manual',
      bkashApiEnabled: isAuto,
    }));

    setTogglingPayment(true);
    try {
      const updatePayload: any = {
        automatedPayment: isAuto,
        paymentMethod: isAuto ? 'automated' : 'manual',
        bkashApiEnabled: isAuto,
        gatewayActive: isAuto,
        isAutomatedPayment: isAuto,
        automated_payment: isAuto,
      };

      await setDoc(doc(db, 'settings', 'global'), updatePayload, { merge: true });
      await logAction(
        'TOGGLE_PAYMENT_METHOD',
        `Switched payment method to ${isAuto ? 'Automated Gateway (bKash Direct API)' : 'Manual Payment'}`
      );

      toast.success(
        isAuto
          ? '✓ স্বয়ংক্রিয় bKash API গেটওয়ে চালু করা হয়েছে! লাইভ অ্যাপে bKash সিস্টেম কানেক্ট হয়েছে।'
          : '✓ ম্যানুয়াল পেমেন্ট অপশন সক্রিয় করা হয়েছে!',
        { duration: 4000 }
      );
    } catch (err) {
      console.error('Error saving payment toggle:', err);
      toast.error('পেমেন্ট স্টেটাস সেভ করতে সমস্যা হয়েছে।');
      // Revert on error
      setGlobalSettings((prev) => ({
        ...prev,
        automatedPayment: !isAuto,
        paymentMethod: !isAuto ? 'automated' : 'manual',
        bkashApiEnabled: !isAuto,
      }));
    } finally {
      setTogglingPayment(false);
    }
  };

  // Sync toggles when globalSettings updates
  useEffect(() => {
    if (globalSettings.registrationEnabled !== undefined) {
      setRegistrationEnabled(globalSettings.registrationEnabled);
    }
    if (globalSettings.addEntryEnabled !== undefined) {
      setAddEntryEnabled(globalSettings.addEntryEnabled);
    }
    if (globalSettings.requirePaymentOnRegistration !== undefined) {
      setRequirePaymentOnRegistration(globalSettings.requirePaymentOnRegistration);
    }
  }, [globalSettings.registrationEnabled, globalSettings.addEntryEnabled, globalSettings.requirePaymentOnRegistration]);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // WhatsApp Settings state
  const [waApiUrl, setWaApiUrl] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waOfficialNumber, setWaOfficialNumber] = useState('');
  const [waStatus, setWaStatus] = useState<'Connected' | 'Failed' | 'Not Configured'>('Not Configured');
  const [waLastChecked, setWaLastChecked] = useState('');
  const [waSaving, setWaSaving] = useState(false);
  const [waTesting, setWaTesting] = useState(false);

  // Fetch WhatsApp config on load
  useEffect(() => {
    const fetchWaConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'whatsapp'));
        if (snap.exists()) {
          const data = snap.data();
          setWaApiUrl(data.apiUrl || '');
          setWaAccessToken(data.accessToken || '');
          setWaOfficialNumber(data.officialNumber || '');
          setWaStatus(data.status || 'Not Configured');
          setWaLastChecked(data.lastChecked || '');
        }
      } catch (err) {
        console.error('Error fetching WhatsApp settings:', err);
      }
    };
    if (isAdmin || hasPermission('renewals.whatsapp')) {
      fetchWaConfig();
    }
  }, [isAdmin, hasPermission]);

  const handleUpdateContactField = (field: 'phone' | 'email' | 'address', value: string) => {
    setGlobalSettings((prev) => {
      const updated = { ...prev };
      if (field === 'phone') {
        updated.contactPhone = value;
        updated.phone = value;
      } else if (field === 'email') {
        updated.contactEmail = value;
        updated.email = value;
      } else if (field === 'address') {
        updated.contactAddress = value;
        updated.address = value;
      }
      return updated;
    });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const phoneVal = (globalSettings.contactPhone || globalSettings.phone || '').trim();
      const emailVal = (globalSettings.contactEmail || globalSettings.email || '').trim();
      const addressVal = (globalSettings.contactAddress || globalSettings.address || '').trim();

      const isAuto = Boolean(globalSettings.automatedPayment);
      const payload = {
        ...globalSettings,
        automatedPayment: isAuto,
        paymentMethod: isAuto ? 'automated' : 'manual',
        bkashApiEnabled: isAuto,
        gatewayActive: isAuto,
        isAutomatedPayment: isAuto,
        automated_payment: isAuto,
        paymentGatewayName: globalSettings.paymentGatewayName || 'bkash',
        paymentGatewayUrl: (globalSettings.paymentGatewayUrl || '').trim(),
        paymentGatewayStoreId: (globalSettings.paymentGatewayStoreId || '').trim(),
        paymentGatewaySecret: (globalSettings.paymentGatewaySecret || '').trim(),
        manualBkashNumber: (globalSettings.manualBkashNumber || '').trim(),
        manualNagadNumber: (globalSettings.manualNagadNumber || '').trim(),
        manualRocketNumber: (globalSettings.manualRocketNumber || '').trim(),
        manualPaymentNumber: (globalSettings.manualPaymentNumber || globalSettings.manualBkashNumber || '').trim(),
        manualAccountType: globalSettings.manualAccountType || 'Personal',
        paymentInstructions: (globalSettings.paymentInstructions || globalSettings.manualPaymentInstructions || '').trim(),
        manualPaymentInstructions: (globalSettings.manualPaymentInstructions || globalSettings.paymentInstructions || '').trim(),
        contactPhone: phoneVal,
        phone: phoneVal,
        contactEmail: emailVal,
        email: emailVal,
        contactAddress: addressVal,
        address: addressVal,
        footerCopyright: (globalSettings.footerCopyrightBn || globalSettings.footerCopyright || '').trim(),
        footerCopyrightBn: (globalSettings.footerCopyrightBn || globalSettings.footerCopyright || '').trim(),
        footerCopyrightEn: (globalSettings.footerCopyrightEn || '').trim(),
        footerAboutText: (globalSettings.footerAboutTextBn || globalSettings.footerAboutText || '').trim(),
        footerAboutTextBn: (globalSettings.footerAboutTextBn || globalSettings.footerAboutText || '').trim(),
        footerAboutTextEn: (globalSettings.footerAboutTextEn || '').trim(),
        privacyPolicyTitleBn: (globalSettings.privacyPolicyTitleBn || '').trim(),
        aboutUsTitleBn: (globalSettings.aboutUsTitleBn || '').trim(),
        termsConditionsTitleBn: (globalSettings.termsConditionsTitleBn || '').trim(),
        privacyPolicyBn: (globalSettings.privacyPolicyBn || '').trim(),
        privacyPolicyEn: (globalSettings.privacyPolicyEn || '').trim(),
        privacyPolicyCustomBn: (globalSettings.privacyPolicyBn || '').trim(),
        privacyPolicyCustomEn: (globalSettings.privacyPolicyEn || '').trim(),
        termsConditionsBn: (globalSettings.termsConditionsBn || '').trim(),
        termsConditionsEn: (globalSettings.termsConditionsEn || '').trim(),
        termsConditionsCustomBn: (globalSettings.termsConditionsBn || '').trim(),
        termsConditionsCustomEn: (globalSettings.termsConditionsEn || '').trim(),
        aboutUsBn: (globalSettings.aboutUsBn || '').trim(),
        aboutUsEn: (globalSettings.aboutUsEn || '').trim(),
        aboutUsCustomBn: (globalSettings.aboutUsBn || '').trim(),
        aboutUsCustomEn: (globalSettings.aboutUsEn || '').trim(),
        registrationEnabled,
        addEntryEnabled,
        requirePaymentOnRegistration,
      };

      await setDoc(doc(db, 'settings', 'global'), payload, { merge: true });
      await logAction('UPDATE_SETTINGS', 'Updated global site settings & helpline contacts');
      toast.success('যোগাযোগ ও সেটিংস সফলভাবে সেভ করা হয়েছে! রিয়েল-টাইমে আপডেট কার্যকর হয়েছে।', {
        duration: 4000,
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('সেটিংস সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !auth.currentUser) return;
    setPasswordUpdating(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      await logAction('UPDATE_PASSWORD', 'Updated administrator account password');
      alert('Password updated successfully!');
    } catch (err) {
      console.error('Error updating password:', err);
      alert('Error updating password. You may need to log out and re-authenticate.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleTestWhatsAppConnection = async () => {
    if (!isAdmin && !hasPermission('renewals.whatsapp')) return;

    const testNumber = prompt('Enter a phone number to send the test message to (e.g., 01XXXXXXXXX):');
    if (!testNumber) return;

    setWaTesting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp-test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: testNumber,
          apiUrl: waApiUrl,
          accessToken: waAccessToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWaStatus('Connected');
        setWaLastChecked(new Date().toISOString());
        alert('Test message sent successfully!');
      } else {
        setWaStatus('Failed');
        alert(`Failed to send test message: ${data.error || 'Check credentials'}`);
      }
    } catch (err) {
      console.error('Error testing WhatsApp connection:', err);
      setWaStatus('Failed');
      alert('Failed to test WhatsApp connection.');
    } finally {
      setWaTesting(false);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    if (!isAdmin && !hasPermission('renewals.whatsapp')) return;
    setWaSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'whatsapp'), {
        apiUrl: waApiUrl,
        accessToken: waAccessToken,
        officialNumber: waOfficialNumber,
        status: waStatus,
        lastChecked: waLastChecked,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid,
      });
      await logAction('UPDATE_WHATSAPP_CONFIG', 'Updated WhatsApp Cloud API credentials');
      alert('WhatsApp configuration saved successfully!');
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      alert('Error saving WhatsApp configuration');
    } finally {
      setWaSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-6xl">
      {/* Personal Settings */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Settings size={22} className="text-primary" />
          <span>Personal Preferences</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Volume2 size={16} className="text-primary" />
                <span>Notification Sound</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Audible chime on receiving incoming notices & registrations.</p>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  playNotificationSound();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
                title="সাউন্ড টেস্ট করুন (Play Chime)"
              >
                <Volume2 size={14} className="text-primary" />
                <span>শব্দ টেস্ট করুন</span>
              </button>
              <button
                onClick={async () => {
                  if (user) {
                    const newStatus = !(profile?.notificationSoundEnabled ?? true);
                    await setDoc(doc(db, 'users', user.uid), { notificationSoundEnabled: newStatus }, { merge: true });
                    if (newStatus) {
                      playNotificationSound();
                    }
                  }
                }}
                className="text-primary transition-transform active:scale-95"
                title={(profile?.notificationSoundEnabled ?? true) ? 'Disable Sound' : 'Enable Sound'}
              >
                {(profile?.notificationSoundEnabled ?? true) ? (
                  <ToggleRight size={44} />
                ) : (
                  <ToggleLeft size={44} className="text-gray-300" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Dark Mode</h3>
              <p className="text-xs text-gray-500 mt-0.5">Toggle high contrast dark theme.</p>
            </div>
            <button
              onClick={() => {
                const isDark = document.body.classList.contains('dark');
                if (isDark) {
                  document.body.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                } else {
                  document.body.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }
              }}
              className="text-primary transition-transform active:scale-95"
            >
              {typeof document !== 'undefined' && document.body.classList.contains('dark') ? (
                <ToggleRight size={44} />
              ) : (
                <ToggleLeft size={44} className="text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Helpline & Contact Information */}
      {(isAdmin || hasPermission('settings')) && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Phone className="text-primary" size={22} />
                <span>হেল্পলাইন ও যোগাযোগের তথ্য (Helpline & Contacts)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                এখানে ফোন নম্বর, ইমেইল বা ঠিকানা পরিবর্তন করার সাথে সাথেই মোবাইল অ্যাপ ও ওয়েবসাইটের ফুটার এবং কল বাটনে রিয়েল-টাইমে আপডেট হয়ে যাবে।
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>রিয়েল-টাইম সিঙ্ক সক্রিয়</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Site Title */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>সাইটের নাম / ব্র্যান্ড টাইটেল (Site Title)</span>
                  <span className="text-[10px] text-gray-400 font-normal">siteTitle</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={globalSettings.siteTitle || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, siteTitle: e.target.value })}
                    placeholder="JOTPOT - ঝটপট"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-semibold text-gray-900"
                  />
                </div>
              </div>

              {/* Helpline Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>হেল্পলাইন ফোন নম্বর (Phone)</span>
                  <span className="text-[10px] text-primary font-mono font-bold">contactPhone</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={globalSettings.contactPhone || globalSettings.phone || ''}
                    onChange={(e) => handleUpdateContactField('phone', e.target.value)}
                    placeholder="01677234252"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-semibold text-gray-900 font-mono"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  ফুটারের হেল্পলাইন ও নিচের ডানদিকের ফ্লোটিং কল/চ্যাট বাটনে এই নম্বরে ডায়াল হবে।
                </p>
              </div>

              {/* Support Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>অফিশিয়াল সাপোর্ট ইমেইল (Email)</span>
                  <span className="text-[10px] text-primary font-mono font-bold">contactEmail</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={globalSettings.contactEmail || globalSettings.email || ''}
                    onChange={(e) => handleUpdateContactField('email', e.target.value)}
                    placeholder="support@jotpot.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-semibold text-gray-900 font-mono"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  মোবাইল অ্যাপ ও ওয়েবসাইটের ফুটারে সাপোর্ট ইমেইল হিসেবে প্রদর্শিত হবে।
                </p>
              </div>

              {/* Office Address */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>অফিস ঠিকানা (Contact Address)</span>
                  <span className="text-[10px] text-primary font-mono font-bold">contactAddress</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={globalSettings.contactAddress || globalSettings.address || ''}
                    onChange={(e) => handleUpdateContactField('address', e.target.value)}
                    placeholder="Tangail / Dhaka, Bangladesh"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-semibold text-gray-900"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  অ্যাপ ও ওয়েবসাইটের ফুটারে অফিস বা প্রধান কার্যালয় হিসেবে দেখাবে।
                </p>
              </div>
            </div>

            {/* Live Mobile/Web Visual Mockup */}
            <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md border border-gray-700">
              <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-400" size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">লাইভ ডিসপ্লে প্রিভিউ</span>
                </div>
                <span className="text-[10px] bg-primary/20 text-orange-300 px-2.5 py-0.5 rounded-full font-bold">
                  App & Web
                </span>
              </div>

              <div className="py-4 flex flex-col gap-3.5">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">
                    📱 অ্যাপ ফুটারে যেভাবে দেখাবে:
                  </div>
                  <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-700/80 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Phone size={14} className="shrink-0 text-amber-400" />
                      <span className="truncate">{globalSettings.contactPhone || globalSettings.phone || '01677234252'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate">{globalSettings.contactEmail || globalSettings.email || 'support@jotpot.com'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate">{globalSettings.contactAddress || globalSettings.address || 'Tangail / Dhaka, Bangladesh'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">
                    🔘 নিচের ডানদিকের কল বাটন (FAB):
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-primary/15 rounded-xl border border-primary/30 text-xs">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm animate-bounce">
                      <Phone size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-300">ইউজার ক্লিক করলে ডায়াল হবে:</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {globalSettings.contactPhone || globalSettings.phone || '01677234252'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                <span>Firestore: <code>settings/global</code></span>
                <span className="text-emerald-400 font-bold">✓ সিঙ্ক সক্রিয়</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
            >
              <Save size={15} />
              <span>{saving ? 'সেভ হচ্ছে...' : 'যোগাযোগ তথ্য সেভ করুন (Save Contacts)'}</span>
            </button>
          </div>
        </div>
      )}


      {/* Global App Configuration (Feature Toggles, Gateway, Banner, Discounts) */}
      {(isAdmin || hasPermission('settings')) && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Settings size={22} className="text-primary" />
            <span>সিস্টেম কনফিগারেশন (System & Gateway Configuration)</span>
          </h2>

          {/* Maintenance Mode */}
          <div className="flex flex-col gap-4 p-6 bg-red-50/60 rounded-2xl border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-red-950 text-base">Emergency Maintenance Mode</h3>
                <p className="text-xs text-red-700 mt-0.5">
                  When active, public mobile and web apps display maintenance warnings. Admins can bypass this via /login.
                </p>
              </div>
              <button
                onClick={() =>
                  setGlobalSettings({ ...globalSettings, maintenanceMode: !globalSettings.maintenanceMode })
                }
                className="text-red-500 transition-transform active:scale-95 shrink-0"
              >
                {globalSettings.maintenanceMode ? (
                  <ToggleRight size={44} className="text-red-600" />
                ) : (
                  <ToggleLeft size={44} className="text-red-300" />
                )}
              </button>
            </div>

            {globalSettings.maintenanceMode && (
              <div className="flex flex-col gap-4 pt-4 border-t border-red-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-red-900 uppercase tracking-wider">Maintenance Message</label>
                  <textarea
                    value={globalSettings.maintenanceMessage}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, maintenanceMessage: e.target.value })}
                    className="w-full rounded-xl border border-red-200 bg-white p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="e.g. JOTPOT server maintenance in progress..."
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-red-900 uppercase tracking-wider">Expected End Time</label>
                  <input
                    type="datetime-local"
                    value={globalSettings.maintenanceEndTime}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, maintenanceEndTime: e.target.value })}
                    className="w-full rounded-xl border border-red-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Public Driver Registration</h4>
                <p className="text-xs text-gray-400">Allow self-registration</p>
              </div>
              <button
                onClick={() => setRegistrationEnabled(!registrationEnabled)}
                className="text-primary transition-transform active:scale-95"
              >
                {registrationEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Public Entry Addition</h4>
                <p className="text-xs text-gray-400">Community submissions</p>
              </div>
              <button
                onClick={() => setAddEntryEnabled(!addEntryEnabled)}
                className="text-primary transition-transform active:scale-95"
              >
                {addEntryEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-300" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Require Registration Payment</h4>
                <p className="text-xs text-gray-400">Mandate upfront fee</p>
              </div>
              <button
                onClick={() => setRequirePaymentOnRegistration(!requirePaymentOnRegistration)}
                className="text-primary transition-transform active:scale-95"
              >
                {requirePaymentOnRegistration ? (
                  <ToggleRight size={40} />
                ) : (
                  <ToggleLeft size={40} className="text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Live Marquee Banner */}
          <div className="flex flex-col gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showLiveBanner"
                checked={globalSettings.showLiveBanner}
                onChange={(e) => setGlobalSettings({ ...globalSettings, showLiveBanner: e.target.checked })}
                className="w-4 h-4 text-primary rounded"
              />
              <label htmlFor="showLiveBanner" className="text-sm font-bold text-gray-800 cursor-pointer">
                Show Live Breaking News / Notice Ticker Banner
              </label>
            </div>
            {globalSettings.showLiveBanner && (
              <div className="flex flex-col gap-4 mt-2">
                <textarea
                  value={globalSettings.liveBannerText}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerText: e.target.value })}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Enter ticker headline text..."
                  rows={2}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Banner Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={globalSettings.liveBannerBgColor || '#dc2626'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerBgColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-none"
                      />
                      <input
                        type="text"
                        value={globalSettings.liveBannerBgColor || '#dc2626'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerBgColor: e.target.value })}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={globalSettings.liveBannerTextColor || '#ffffff'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerTextColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-none"
                      />
                      <input
                        type="text"
                        value={globalSettings.liveBannerTextColor || '#ffffff'}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerTextColor: e.target.value })}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Scroll Speed (seconds)</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={globalSettings.liveBannerSpeed || 25}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, liveBannerSpeed: Number(e.target.value) })}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method & Gateway / Manual Payment Configuration */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">Payment Method & System (পেমেন্ট পদ্ধতি)</h3>
                  {globalSettings.automatedPayment ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                      স্বয়ংক্রিয় গেটওয়ে (bKash API) চালু
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      ম্যানুয়াল পেমেন্ট নম্বর চালু
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {globalSettings.automatedPayment
                    ? 'স্বয়ংক্রিয় bKash Direct API বা গেটওয়ে চালু। অ্যাপে ব্যবহারকারী রিনিউ করতে গেলে অটো গেটওয়ে ওপেন হবে, ম্যানুয়াল অপশন বন্ধ থাকবে।'
                    : 'স্বয়ংক্রিয় গেটওয়ে বন্ধ। অ্যাপে ব্যবহারকারীকে ম্যানুয়াল বিকাশ/নগদ নম্বর দেখানো হবে এবং ব্যবহারকারী টাকা পাঠিয়ে TrxID ও নম্বর সাবমিট করবেন।'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-gray-600">
                  {globalSettings.automatedPayment ? 'Automated Gateway' : 'Manual Payment'}
                </span>
                <button
                  type="button"
                  disabled={togglingPayment}
                  onClick={handleTogglePaymentMethod}
                  className="text-primary transition-transform active:scale-95 disabled:opacity-50"
                  title="Toggle between Automated Gateway and Manual Payment"
                >
                  {globalSettings.automatedPayment ? (
                    <ToggleRight size={44} className="text-primary" />
                  ) : (
                    <ToggleLeft size={44} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* AUTOMATED GATEWAY CONFIGURATION */}
            {globalSettings.automatedPayment ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <strong>✓ স্বয়ংক্রিয় গেটওয়ে সক্রিয়:</strong> অ্যাপ ও ওয়েবসাইটে ড্রাইভার/ইউজাররা রিনিউ করার সময় সরাসরি পেমেন্ট গেটওয়ের মাধ্যমে পে করবেন। ম্যানুয়াল পেমেন্ট অপশনটি তখন অ্যাপে আর দেখা যাবে না।
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gateway Provider</label>
                    <select
                      value={globalSettings.paymentGatewayName || 'bkash'}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayName: e.target.value })}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                    >
                      <option value="bkash">bKash Direct API (বিকাশ এপিআই)</option>
                      <option value="aamarpay">Aamarpay</option>
                      <option value="sslcommerz">SSLCommerz</option>
                      <option value="custom">Custom Webhook API</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gateway Endpoint URL</label>
                    <input
                      type="url"
                      value={globalSettings.paymentGatewayUrl || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayUrl: e.target.value })}
                      placeholder="https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Store ID / App Key</label>
                    <input
                      type="text"
                      value={globalSettings.paymentGatewayStoreId || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayStoreId: e.target.value })}
                      placeholder="Your bKash App Key / Store ID"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Secret / App Secret Key</label>
                    <input
                      type="password"
                      value={globalSettings.paymentGatewaySecret || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewaySecret: e.target.value })}
                      placeholder="Your bKash App Secret Key"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* MANUAL PAYMENT CONFIGURATION */
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>ℹ️ ম্যানুয়াল পেমেন্ট সক্রিয়:</strong> অটো গেটওয়ে বন্ধ থাকায় অ্যাপ ও ওয়েবসাইটে ড্রাইভার/ইউজারদের নিচের ম্যানুয়াল বিকাশ বা নগদ নম্বর দেখানো হবে। ইউজার নম্বর দেখে টাকা পাঠাবে এবং তার নম্বর ও TrxID সাবমিট করবে।
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ম্যানুয়াল বিকাশ নম্বর (bKash)
                    </label>
                    <input
                      type="tel"
                      value={globalSettings.manualBkashNumber || ''}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          manualBkashNumber: e.target.value,
                          manualPaymentNumber: e.target.value,
                        })
                      }
                      placeholder="01XXXXXXXXX"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ম্যানুয়াল নগদ নম্বর (Nagad)
                    </label>
                    <input
                      type="tel"
                      value={globalSettings.manualNagadNumber || ''}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, manualNagadNumber: e.target.value })}
                      placeholder="01XXXXXXXXX"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      অ্যাকাউন্টের ধরণ (Account Type)
                    </label>
                    <select
                      value={globalSettings.manualAccountType || 'Personal'}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, manualAccountType: e.target.value })}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                    >
                      <option value="Personal">Personal (পার্সোনাল - Send Money)</option>
                      <option value="Merchant">Merchant (মার্চেন্ট - Payment)</option>
                      <option value="Agent">Agent (এজেন্ট - Cash In)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-3">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    পেমেন্ট নির্দেশনাবলী (Instructions for App Users)
                  </label>
                  <textarea
                    rows={2}
                    value={globalSettings.manualPaymentInstructions || globalSettings.paymentInstructions || ''}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        manualPaymentInstructions: e.target.value,
                        paymentInstructions: e.target.value,
                      })
                    }
                    placeholder="যেমন: প্রদত্ত বিকাশ বা নগদ নম্বরে আপনার প্যাকেজ অনুযায়ী টাকা Send Money করুন এবং নিচের ঘরে আপনার প্রেরক নম্বর ও ট্রানজেকশন আইডি দিয়ে সাবমিট করুন।"
                    className="bg-white border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Policies, Legal & Footer Management (পলিসি, নির্দেশিকা ও ফুটার কন্ট্রোল) */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  <span>পলিসি, নির্দেশিকা ও ফুটার কন্ট্রোল (Policies & Footer Control)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  অ্যাপ ও ওয়েবসাইটের ফুটারের গোপনীয়তা নীতি, আমাদের সম্পর্কে, শর্তাবলী এবং নিচের কপিরাইট লেখা এখান থেকেই নিয়ন্ত্রণ করুন।
                </p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                Live Dynamic Footer
              </span>
            </div>

            {/* 1. Footer Copyright & About Text */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Copyright size={18} className="text-primary" />
                  <span>ফুটার পরিচিতি ও কপিরাইট কন্ট্রোল (বাংলা ও ইংরেজি)</span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">বাংলা ও ইংরেজি মোডে পরিবর্তনশীল</span>
              </div>

              {/* 1.1 Footer About Description (Bangla & English) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ফুটার পরিচিতি বর্ণনা (বাংলা)
                  </label>
                  <textarea
                    rows={3}
                    value={
                      globalSettings.footerAboutTextBn ??
                      globalSettings.footerAboutText ??
                      'ঝটপট হলো বাংলাদেশের সকল জেলার জন্য ভাড়ায় চালিত গাড়ির উন্মুক্ত ডিরেক্টরি। আপনার প্রয়োজনে সহজেই সরাসরি ড্রাইভারের সাথে যোগাযোগ করুন।'
                    }
                    onChange={(e) => setGlobalSettings({ ...globalSettings, footerAboutTextBn: e.target.value, footerAboutText: e.target.value })}
                    placeholder="ফুটারের লোগোর নিচে দেখানো বাংলা সংক্ষিপ্ত পরিচিতি..."
                    className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary text-xs leading-relaxed"
                  />
                  <span className="text-[11px] text-gray-400">
                    ইউজার যখন অ্যাপে বাংলা সিলেক্ট রাখবে তখন এটি দেখাবে।
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Footer About Description (English)
                  </label>
                  <textarea
                    rows={3}
                    value={
                      globalSettings.footerAboutTextEn ??
                      'Jotpot is Bangladesh\'s premier open directory for rental vehicles. Connect directly with trusted drivers across all districts.'
                    }
                    onChange={(e) => setGlobalSettings({ ...globalSettings, footerAboutTextEn: e.target.value })}
                    placeholder="Brief about description shown in English mode..."
                    className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary text-xs leading-relaxed font-sans"
                  />
                  <span className="text-[11px] text-gray-400">
                    ইউজার যখন অ্যাপে English সিলেক্ট করবে তখন এটি দেখাবে।
                  </span>
                </div>
              </div>

              {/* 1.2 Footer Copyright Text (Bangla & English) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    কপিরাইট লেখা (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={globalSettings.footerCopyrightBn ?? globalSettings.footerCopyright ?? '© ২০২৬ ঝটপট ডিরেক্টরি। সর্বস্বত্ব সংরক্ষিত।'}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, footerCopyrightBn: e.target.value, footerCopyright: e.target.value })}
                    placeholder="© ২০২৬ ঝটপট ডিরেক্টরি। সর্বস্বত্ব সংরক্ষিত।"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-xs font-semibold"
                  />
                  <span className="text-[11px] text-gray-400">
                    ফুটারের নিচের কপিরাইট লাইন (বাংলা মোডে)।
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Copyright Text (English)
                  </label>
                  <input
                    type="text"
                    value={globalSettings.footerCopyrightEn ?? '© 2026 Jotpot Directory. All rights reserved.'}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, footerCopyrightEn: e.target.value })}
                    placeholder="© 2026 Jotpot Directory. All rights reserved."
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-xs font-semibold font-sans"
                  />
                  <span className="text-[11px] text-gray-400">
                    Bottom copyright line in English mode.
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Privacy Policy, About Us, Terms & Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Privacy Policy Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h4 className="text-sm font-bold text-gray-800">১. গোপনীয়তা নীতি (Privacy Policy)</h4>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">ফুটার লিংক টাইটেল</label>
                  <input
                    type="text"
                    value={globalSettings.privacyPolicyTitleBn ?? 'গোপনীয়তা নীতি'}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, privacyPolicyTitleBn: e.target.value })}
                    placeholder="গোপনীয়তা নীতি"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">কাস্টম নীতিমালার বিবরণ (বাংলা)</label>
                  <textarea
                    rows={4}
                    value={globalSettings.privacyPolicyBn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, privacyPolicyBn: e.target.value })}
                    placeholder="ফাঁকা রাখলে ডিফল্ট স্ট্রাকচার্ড নীতিমালা দেখানো হবে। আপনি চাইলে এখানে কাস্টম নীতিমালা লিখে দিতে পারেন..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Policy Content (English)</label>
                  <textarea
                    rows={2}
                    value={globalSettings.privacyPolicyEn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, privacyPolicyEn: e.target.value })}
                    placeholder="Custom English privacy policy text (optional)..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* About Us Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h4 className="text-sm font-bold text-gray-800">২. আমাদের সম্পর্কে (About Us)</h4>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">ফুটার লিংক টাইটেল</label>
                  <input
                    type="text"
                    value={globalSettings.aboutUsTitleBn ?? 'আমাদের সম্পর্কে'}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, aboutUsTitleBn: e.target.value })}
                    placeholder="আমাদের সম্পর্কে"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">পরিচিতি ও লক্ষ্য (বাংলা)</label>
                  <textarea
                    rows={4}
                    value={globalSettings.aboutUsBn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, aboutUsBn: e.target.value })}
                    placeholder="আমাদের সম্পর্কে কাস্টম পরিচিতি, মিশন ও ভিশন লিখে দিতে পারেন..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">About Us Content (English)</label>
                  <textarea
                    rows={2}
                    value={globalSettings.aboutUsEn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, aboutUsEn: e.target.value })}
                    placeholder="Custom English about us text (optional)..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Terms & Conditions Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h4 className="text-sm font-bold text-gray-800">৩. শর্তাবলী ও নিয়মাবলী (Terms & Conditions)</h4>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">ফুটার লিংক টাইটেল</label>
                  <input
                    type="text"
                    value={globalSettings.termsConditionsTitleBn ?? 'শর্তাবলী ও নিয়মাবলী'}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, termsConditionsTitleBn: e.target.value })}
                    placeholder="শর্তাবলী ও নিয়মাবলী"
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">শর্তাবলীর বিবরণ (বাংলা)</label>
                  <textarea
                    rows={4}
                    value={globalSettings.termsConditionsBn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, termsConditionsBn: e.target.value })}
                    placeholder="ফাঁকা রাখলে ডিফল্ট স্ট্রাকচার্ড শর্তাবলী দেখানো হবে। আপনি চাইলে কাস্টম শর্তাবলী লিখতে পারেন..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Terms & Conditions (English)</label>
                  <textarea
                    rows={2}
                    value={globalSettings.termsConditionsEn ?? ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, termsConditionsEn: e.target.value })}
                    placeholder="Custom English terms & conditions (optional)..."
                    className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Discounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">3-Month Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={globalSettings.discount3Months}
                onChange={(e) => setGlobalSettings({ ...globalSettings, discount3Months: Number(e.target.value) })}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">6-Month Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={globalSettings.discount6Months}
                onChange={(e) => setGlobalSettings({ ...globalSettings, discount6Months: Number(e.target.value) })}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">1-Year Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={globalSettings.discount1Year}
                onChange={(e) => setGlobalSettings({ ...globalSettings, discount1Year: Number(e.target.value) })}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" />
          <span>Security & Authentication</span>
        </h2>
        <div className="p-6 bg-red-50/60 rounded-2xl border border-red-100 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-red-950 text-sm">Update Account Password</h4>
            <p className="text-xs text-red-700 mt-0.5">Set a strong new password for this administrative session.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Strong Password"
              className="flex-1 bg-white border border-red-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium"
            />
            <button
              onClick={handleUpdatePassword}
              disabled={passwordUpdating || !newPassword}
              className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              {passwordUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Cloud API Configuration */}
      {(isAdmin || hasPermission('renewals.whatsapp')) && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
          <div className="border-b border-gray-100 flex justify-between items-center pb-4 flex-wrap gap-4">
            <div>
              <h4 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <MessageCircle className="text-green-500" size={22} />
                <span>WhatsApp Cloud API Configuration</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">Configure automated WhatsApp messaging for renewals and direct support.</p>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5',
                  waStatus === 'Connected'
                    ? 'bg-green-100 text-green-700'
                    : waStatus === 'Failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    waStatus === 'Connected' ? 'bg-green-500' : waStatus === 'Failed' ? 'bg-red-500' : 'bg-gray-400'
                  )}
                ></span>
                {waStatus}
              </span>
              {waLastChecked && (
                <span className="text-[10px] text-gray-400 mt-1">
                  Last checked: {new Date(waLastChecked).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs">
            <p className="font-bold text-orange-950 mb-1">Webhook Configuration Parameters</p>
            <ul className="list-disc pl-5 text-orange-800 space-y-1">
              <li>
                <strong>Callback URL:</strong> <code>https://{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}/api/whatsapp/webhook</code>
              </li>
              <li>
                <strong>Verify Token:</strong> <code>jhotpot_wa_token_123</code>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">WhatsApp API URL</label>
              <input
                type="text"
                value={waApiUrl}
                onChange={(e) => setWaApiUrl(e.target.value)}
                placeholder="https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Meta Access Token</label>
              <input
                type="password"
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Official WhatsApp Number</label>
              <input
                type="text"
                value={waOfficialNumber}
                onChange={(e) => setWaOfficialNumber(e.target.value)}
                placeholder="8801XXXXXXXXX"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleTestWhatsAppConnection}
              disabled={waTesting || !waApiUrl || !waAccessToken || !waOfficialNumber}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
            >
              {waTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSaveWhatsAppConfig}
              disabled={waSaving || !waApiUrl || !waAccessToken}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-primary hover:opacity-90 transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              {waSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
