import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MapPin, Plus, Trash2, Search, CheckCircle, 
  AlertTriangle, RefreshCw, Layers, ChevronRight, X, Building2, Globe
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { defaultGeoHierarchy } from '../../data/default-geo-hierarchy';
import { locationDictionary } from '../../lib/location-translator';

type GeoHierarchy = Record<string, Record<string, string[]>>;

export const LocationsTab: React.FC = () => {
  const { isAdmin, hasPermission, logAction } = useAdmin();

  const [hierarchy, setHierarchy] = useState<GeoHierarchy>(defaultGeoHierarchy);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [selectedDivision, setSelectedDivision] = useState<string>('ঢাকা');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Adding Location
  const [level, setLevel] = useState<'division' | 'district' | 'upazila'>('upazila');
  const [formDivision, setFormDivision] = useState<string>('ঢাকা');
  const [formDistrict, setFormDistrict] = useState<string>('ঢাকা');
  const [nameBn, setNameBn] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');

  // Inline quick-add state for a specific district
  const [inlineDistrict, setInlineDistrict] = useState<string | null>(null);
  const [inlineUpazilaName, setInlineUpazilaName] = useState<string>('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Hierarchy from Firestore settings/locations
  const fetchLocationsHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'locations'));
      if (snap.exists() && snap.data()) {
        const raw = snap.data();
        const cleaned: GeoHierarchy = {};
        for (const [div, distMap] of Object.entries(raw)) {
          if (distMap && typeof distMap === 'object' && !Array.isArray(distMap)) {
            cleaned[div] = {};
            for (const [dist, upzList] of Object.entries(distMap as any)) {
              if (Array.isArray(upzList)) {
                cleaned[div][dist] = upzList.map((u: any) => String(u).trim()).filter(Boolean);
              }
            }
          }
        }
        if (Object.keys(cleaned).length > 0) {
          setHierarchy(cleaned);
        } else {
          setHierarchy(defaultGeoHierarchy);
        }
      } else {
        setHierarchy(defaultGeoHierarchy);
      }
    } catch (err: any) {
      console.error('Failed to load locations from settings/locations:', err);
      setHierarchy(defaultGeoHierarchy);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationsHierarchy();
  }, [fetchLocationsHierarchy]);

  // Keep selected division valid
  const divisionsList = useMemo(() => Object.keys(hierarchy), [hierarchy]);
  useEffect(() => {
    if (divisionsList.length > 0 && !hierarchy[selectedDivision]) {
      setSelectedDivision(divisionsList[0]);
    }
  }, [divisionsList, selectedDivision, hierarchy]);

  const districtsOfSelectedDivision = useMemo(() => {
    if (!hierarchy[selectedDivision]) return [];
    return Object.keys(hierarchy[selectedDivision]);
  }, [hierarchy, selectedDivision]);

  // Form Cascading Districts
  const formDistrictsList = useMemo(() => {
    if (!hierarchy[formDivision]) return [];
    return Object.keys(hierarchy[formDivision]);
  }, [hierarchy, formDivision]);

  useEffect(() => {
    if (formDistrictsList.length > 0 && !formDistrictsList.includes(formDistrict)) {
      setFormDistrict(formDistrictsList[0]);
    }
  }, [formDistrictsList, formDistrict]);

  // Stats calculation
  const stats = useMemo(() => {
    let distCount = 0;
    let upzCount = 0;
    for (const div of Object.values(hierarchy)) {
      distCount += Object.keys(div).length;
      for (const upzs of Object.values(div)) {
        upzCount += upzs.length;
      }
    }
    return {
      divisions: Object.keys(hierarchy).length,
      districts: distCount,
      upazilas: upzCount,
    };
  }, [hierarchy]);

  // 2. Save entire hierarchy to Firestore settings/locations
  const saveHierarchyToCloud = async (newHierarchy: GeoHierarchy, actionMsg: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'locations'), newHierarchy);
      setHierarchy(newHierarchy);
      showToast('success', actionMsg);
      await logAction('update_locations', actionMsg);
    } catch (err: any) {
      console.error('Error saving hierarchy to cloud:', err);
      showToast('error', 'সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // 3. Add Location Handler
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const bn = nameBn.trim();
    const en = nameEn.trim();
    if (!bn) {
      showToast('error', 'দয়া করে বাংলা নাম লিখুন');
      return;
    }

    const updated = JSON.parse(JSON.stringify(hierarchy)) as GeoHierarchy;

    if (level === 'division') {
      if (updated[bn]) {
        showToast('error', `বিভাগ "${bn}" ইতিমধ্যে বিদ্যমান!`);
        return;
      }
      updated[bn] = {};
      await saveHierarchyToCloud(updated, `নতুন বিভাগ "${bn}" যোগ করা হয়েছে`);
      setSelectedDivision(bn);
    } else if (level === 'district') {
      if (!formDivision || !updated[formDivision]) {
        showToast('error', 'দয়া করে একটি সঠিক বিভাগ নির্বাচন করুন');
        return;
      }
      if (updated[formDivision][bn]) {
        showToast('error', `জেলা "${bn}" ইতিমধ্যে "${formDivision}" বিভাগে রয়েছে!`);
        return;
      }
      updated[formDivision][bn] = [];
      await saveHierarchyToCloud(updated, `নতুন জেলা "${bn}" (${formDivision} বিভাগ) যোগ করা হয়েছে`);
      setSelectedDivision(formDivision);
    } else if (level === 'upazila') {
      if (!formDivision || !formDistrict || !updated[formDivision] || !updated[formDivision][formDistrict]) {
        showToast('error', 'দয়া করে সঠিক বিভাগ ও জেলা নির্বাচন করুন');
        return;
      }
      const existing = updated[formDivision][formDistrict];
      if (existing.includes(bn)) {
        showToast('error', `"${bn}" ইতিমধ্যে "${formDistrict}" জেলায় যোগ করা আছে!`);
        return;
      }
      updated[formDivision][formDistrict] = [...existing, bn];
      await saveHierarchyToCloud(updated, `নতুন উপজেলা/পৌরসভা "${bn}" (${formDistrict} জেলা) যোগ করা হয়েছে`);
      setSelectedDivision(formDivision);
    }

    // Also write to collection('locations') for backward compatibility
    try {
      await addDoc(collection(db, 'locations'), {
        name: en || bn,
        bnName: bn,
        level,
        parentDivision: formDivision,
        parentDistrict: level === 'upazila' ? formDistrict : null,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      // Non-critical, collection is auxiliary
    }

    setNameBn('');
    setNameEn('');
  };

  // 4. Quick Inline Add Upazila
  const handleInlineAddUpazila = async (district: string) => {
    const val = inlineUpazilaName.trim();
    if (!val) return;

    const updated = JSON.parse(JSON.stringify(hierarchy)) as GeoHierarchy;
    if (!updated[selectedDivision] || !updated[selectedDivision][district]) return;

    if (updated[selectedDivision][district].includes(val)) {
      showToast('error', `"${val}" ইতিমধ্যে এই জেলায় রয়েছে!`);
      return;
    }

    updated[selectedDivision][district] = [...updated[selectedDivision][district], val];
    setInlineDistrict(null);
    setInlineUpazilaName('');
    await saveHierarchyToCloud(updated, `উপজেলা/পৌরসভা "${val}" (${district} জেলা) সফলভাবে যুক্ত হয়েছে`);
  };

  // 5. Delete Upazila
  const handleDeleteUpazila = async (division: string, district: string, upazila: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${upazila}" লোকেশনটি মুছে ফেলতে চান?`)) return;

    const updated = JSON.parse(JSON.stringify(hierarchy)) as GeoHierarchy;
    if (!updated[division] || !updated[division][district]) return;

    updated[division][district] = updated[division][district].filter((u) => u !== upazila);
    await saveHierarchyToCloud(updated, `উপজেলা/পৌরসভা "${upazila}" মুছে ফেলা হয়েছে`);
  };

  // 6. Delete District
  const handleDeleteDistrict = async (division: string, district: string) => {
    if (!window.confirm(`সতর্কতা! আপনি কি জেলা "${district}" এবং এর অন্তর্ভুক্ত সকল উপজেলা মুছে ফেলতে চান?`)) return;

    const updated = JSON.parse(JSON.stringify(hierarchy)) as GeoHierarchy;
    if (!updated[division] || !updated[division][district]) return;

    delete updated[division][district];
    await saveHierarchyToCloud(updated, `জেলা "${district}" এবং এর অন্তর্ভুক্ত সকল এলাকা মুছে ফেলা হয়েছে`);
  };

  // 7. Delete Division
  const handleDeleteDivision = async (division: string) => {
    if (!window.confirm(`সতর্কতা! আপনি কি বিভাগ "${division}" এবং এর সকল জেলা ও উপজেলা মুছে ফেলতে চান?`)) return;

    const updated = JSON.parse(JSON.stringify(hierarchy)) as GeoHierarchy;
    if (!updated[division]) return;

    delete updated[division];
    await saveHierarchyToCloud(updated, `বিভাগ "${division}" মুছে ফেলা হয়েছে`);
  };

  // 8. One-click Cloud Seeder / Initializer
  const handleSeedOfficialData = async () => {
    if (!window.confirm('আপনি কি বাংলাদেশ সরকারের সকল ৮ বিভাগ, ৬৪ জেলা এবং ৫০০+ উপজেলার অফিসিয়াল ডেটা ক্লাউড ডেটাবেজে সিঙ্ক করতে চান?')) return;
    setSeeding(true);
    try {
      await setDoc(doc(db, 'settings', 'locations'), defaultGeoHierarchy);
      setHierarchy(defaultGeoHierarchy);
      showToast('success', 'সকল অফিসিয়াল ৮ বিভাগ ও ৬৪ জেলার ডেটা ক্লাউডে সফলভাবে সেভ হয়েছে!');
      await logAction('seed_locations', 'Initialized official Bangladesh administrative geo hierarchy in Firestore settings/locations');
    } catch (err: any) {
      showToast('error', 'সিঙ্ক ব্যর্থ হয়েছে: ' + (err.message || 'Unknown'));
    } finally {
      setSeeding(false);
    }
  };

  // Search filter
  const filteredDistricts = useMemo(() => {
    if (!hierarchy[selectedDivision]) return [];
    const distNames = Object.keys(hierarchy[selectedDivision]);
    if (!searchQuery.trim()) return distNames;

    const q = searchQuery.toLowerCase().trim();
    return distNames.filter((d) => {
      if (d.toLowerCase().includes(q)) return true;
      const upzs = hierarchy[selectedDivision][d] || [];
      return upzs.some((u) => u.toLowerCase().includes(q));
    });
  }, [hierarchy, selectedDivision, searchQuery]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all transform animate-bounce ${
            toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500 via-amber-500 to-primary p-6 rounded-3xl text-white shadow-lg shadow-orange-500/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <MapPin className="text-white" size={24} />
            </span>
            <h2 className="text-2xl font-black tracking-tight">লোকেশন ম্যানেজমেন্ট (Add / Manage Locations)</h2>
          </div>
          <p className="text-white/90 text-sm max-w-2xl font-medium">
            এখানে নতুন বিভাগ, জেলা, উপজেলা বা পৌরসভা যোগ বা বাদ দিলে তা রিয়েল-টাইমে অ্যাপ ও ওয়েবসাইটে স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLocationsHierarchy}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all backdrop-blur-md disabled:opacity-50"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>রিফ্রেশ</span>
          </button>

          <button
            onClick={handleSeedOfficialData}
            disabled={seeding || saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-extrabold shadow-sm transition-all"
            title="অফিসিয়াল ৬৪ জেলার ডেটা রিস্টোর / ক্লাউডে সেভ করুন"
          >
            <Globe size={15} />
            <span>{seeding ? 'সিঙ্ক হচ্ছে...' : 'অফিসিয়াল ডেটা সিঙ্ক'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">মোট বিভাগ (Divisions)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.divisions} টি</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-primary">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">মোট জেলা (Districts)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.districts} টি</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">মোট উপজেলা / থানা / পৌরসভা</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.upazilas} টি</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <MapPin size={22} />
          </div>
        </div>
      </div>

      {/* Add New Location Form */}
      {(isAdmin || hasPermission('locations')) && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-primary flex items-center justify-center font-bold">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">নতুন লোকেশন যোগ করুন (Add New Location)</h3>
              <p className="text-xs text-gray-500">বিভাগ, জেলা, অথবা উপজেলা/পৌরসভা যোগ করুন যা তাত্ক্ষণিকভাবে অ্যাপ ও ড্যাশবোর্ডে পাওয়া যাবে।</p>
            </div>
          </div>

          <form onSubmit={handleAddLocation} className="space-y-4">
            {/* Level Selector Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-max">
              <button
                type="button"
                onClick={() => setLevel('upazila')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  level === 'upazila' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                উপজেলা / পৌরসভা / থানা
              </button>
              <button
                type="button"
                onClick={() => setLevel('district')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  level === 'district' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                নতুন জেলা (District)
              </button>
              <button
                type="button"
                onClick={() => setLevel('division')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  level === 'division' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                নতুন বিভাগ (Division)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* If District or Upazila: Division Selector */}
              {(level === 'district' || level === 'upazila') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">বিভাগ নির্বাচন করুন *</label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  >
                    {divisionsList.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If Upazila: District Selector */}
              {level === 'upazila' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">জেলা নির্বাচন করুন *</label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  >
                    {formDistrictsList.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bengali Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  বাংলা নাম *
                </label>
                <input
                  required
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder={
                    level === 'division' ? 'যেমন: ঢাকা' : level === 'district' ? 'যেমন: কুমিল্লা' : 'যেমন: দেবিদ্বার পৌরসভা'
                  }
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              {/* English Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ইংরেজি নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={
                    level === 'division' ? 'e.g. Dhaka' : level === 'district' ? 'e.g. Comilla' : 'e.g. Debidwar'
                  }
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              {/* Submit Button */}
              <div className="w-full">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 h-[38px]"
                >
                  <Plus size={16} />
                  <span>{saving ? 'যুক্ত হচ্ছে...' : 'লোকেশন যোগ করুন'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Directory Explorer & Hierarchy Management */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-black text-gray-900">সকল লোকেশন ব্রাউজ ও ম্যানেজ করুন</h3>
            <p className="text-xs text-gray-500 mt-0.5">যেকোনো বিভাগ, জেলা বা উপজেলা সহজে সার্চ ও বাদ দিতে নিচে দেখুন।</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="জেলা বা উপজেলা খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary focus:bg-white font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Division Selection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {divisionsList.map((div) => {
            const isSelected = selectedDivision === div;
            const dists = hierarchy[div] ? Object.keys(hierarchy[div]).length : 0;
            return (
              <div key={div} className="relative group">
                <button
                  onClick={() => setSelectedDivision(div)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-md shadow-orange-500/20'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{div}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {dists} জেলা
                  </span>
                </button>

                {/* Delete Division Button */}
                {(isAdmin || hasPermission('locations')) && (
                  <button
                    onClick={() => handleDeleteDivision(div)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`বিভাগ ${div} মুছুন`}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Districts & Upazilas Grid for Selected Division */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <p className="text-xs font-semibold">লোকেশন ডেটা লোড হচ্ছে...</p>
          </div>
        ) : filteredDistricts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <MapPin size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold">কোনো জেলা বা উপজেলা পাওয়া যায়নি!</p>
            <p className="text-xs text-gray-400 mt-1">অনুসন্ধান ফিল্টার পরিবর্তন করুন বা নতুন লোকেশন যোগ করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDistricts.map((district) => {
              const upazilas = hierarchy[selectedDivision]?.[district] || [];
              const isAddingInline = inlineDistrict === district;

              return (
                <div
                  key={district}
                  className="bg-gray-50/70 hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-sm"
                >
                  <div>
                    {/* District Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-200/60">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        <h4 className="font-extrabold text-gray-900 text-sm">{district}</h4>
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {upazilas.length} এলাকা
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setInlineDistrict(isAddingInline ? null : district)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            isAddingInline
                              ? 'bg-primary text-white'
                              : 'text-gray-500 hover:text-primary hover:bg-white'
                          }`}
                          title="উপজেলা / পৌরসভা দ্রুত যোগ করুন"
                        >
                          <Plus size={14} />
                        </button>

                        {(isAdmin || hasPermission('locations')) && (
                          <button
                            onClick={() => handleDeleteDistrict(selectedDivision, district)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={`জেলা "${district}" মুছে ফেলুন`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick Add Input */}
                    {isAddingInline && (
                      <div className="mb-3 flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-primary shadow-sm">
                        <input
                          type="text"
                          autoFocus
                          value={inlineUpazilaName}
                          onChange={(e) => setInlineUpazilaName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInlineAddUpazila(district);
                            }
                          }}
                          placeholder="উপজেলা বা পৌরসভার নাম..."
                          className="flex-1 px-2 py-1 text-xs outline-none font-medium text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleInlineAddUpazila(district)}
                          className="px-2.5 py-1 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          যোগ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInlineDistrict(null);
                            setInlineUpazilaName('');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Upazilas / Thanas / Municipalities List */}
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {upazilas.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic py-2">কোনো এলাকা অন্তর্ভুক্ত নেই</p>
                      ) : (
                        upazilas.map((upz) => (
                          <span
                            key={upz}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-gray-200/70 text-xs font-semibold text-gray-700 shadow-2xs hover:border-orange-300 transition-colors group"
                          >
                            <span>{upz}</span>
                            {(isAdmin || hasPermission('locations')) && (
                              <button
                                onClick={() => handleDeleteUpazila(selectedDivision, district, upz)}
                                className="text-gray-300 hover:text-rose-600 transition-colors ml-0.5 opacity-60 group-hover:opacity-100"
                                title={`"${upz}" বাদ দিন`}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationsTab;
