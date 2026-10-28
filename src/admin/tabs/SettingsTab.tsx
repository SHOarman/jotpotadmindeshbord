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
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import { playNotificationSound } from '../../lib/notificationSound';
import toast from 'react-hot-toast';

export const SettingsTab: React.FC = () => {
  const { user, profile, isAdmin, hasPermission, globalSettings, setGlobalSettings, logAction } = useAdmin();

  // Local settings state
  const [saving, setSaving] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(globalSettings.registrationEnabled ?? false);
  const [addEntryEnabled, setAddEntryEnabled] = useState(globalSettings.addEntryEnabled ?? false);
  const [requirePaymentOnRegistration, setRequirePaymentOnRegistration] = useState(
    globalSettings.requirePaymentOnRegistration ?? false
  );

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

      const payload = {
        ...globalSettings,
        contactPhone: phoneVal,
        phone: phoneVal,
        contactEmail: emailVal,
        email: emailVal,
        contactAddress: addressVal,
        address: addressVal,
        privacyPolicyBn: '',
        privacyPolicyEn: '',
        privacyPolicy: '',
        termsConditionsBn: '',
        termsConditionsEn: '',
        aboutUsBn: '',
        aboutUsEn: '',
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

          {/* Payment Gateway Configuration */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Automated Payment Gateway</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Process mobile financial services and card checkouts automatically via API.
                </p>
              </div>
              <button
                onClick={() =>
                  setGlobalSettings({ ...globalSettings, automatedPayment: !globalSettings.automatedPayment })
                }
                className="text-primary transition-transform active:scale-95"
              >
                {globalSettings.automatedPayment ? (
                  <ToggleRight size={44} />
                ) : (
                  <ToggleLeft size={44} className="text-gray-300" />
                )}
              </button>
            </div>

            {globalSettings.automatedPayment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gateway Provider</label>
                  <select
                    value={globalSettings.paymentGatewayName}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayName: e.target.value })}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                  >
                    <option value="aamarpay">Aamarpay</option>
                    <option value="sslcommerz">SSLCommerz</option>
                    <option value="bkash">bKash Direct API</option>
                    <option value="custom">Custom Webhook API</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gateway Endpoint URL</label>
                  <input
                    type="url"
                    value={globalSettings.paymentGatewayUrl}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayUrl: e.target.value })}
                    placeholder="https://sandbox.aamarpay.com/request.php"
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Store ID / Merchant Key</label>
                  <input
                    type="text"
                    value={globalSettings.paymentGatewayStoreId}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewayStoreId: e.target.value })}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Secret / Signature Key</label>
                  <input
                    type="password"
                    value={globalSettings.paymentGatewaySecret}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, paymentGatewaySecret: e.target.value })}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
            )}
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
