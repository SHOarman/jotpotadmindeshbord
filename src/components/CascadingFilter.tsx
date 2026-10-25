import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { VehicleType } from '../types';
import { bdDivisions, bdDistricts } from '../data/bd-locations';

interface CascadingFilterProps {
  onFilterChange: (filters: any) => void;
  hideVehicleType?: boolean;
  requireUnion?: boolean;
  initialState?: any;
  compact?: boolean;
}

export const CascadingFilter: React.FC<CascadingFilterProps> = ({ onFilterChange, hideVehicleType, requireUnion, initialState, compact }) => {
  const { t, i18n } = useTranslation();
  const [divisions, setDivisions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [upazilas, setUpazilas] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [customLocations, setCustomLocations] = useState<any[]>([]);

  const [selected, setSelected] = useState({
    division: initialState?.division || '',
    district: initialState?.district || '',
    upazila: initialState?.upazila || '',
    union: initialState?.union || '',
    ward: initialState?.ward || '',
    vehicleType: initialState?.vehicleType || '',
  });

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setDivisions(bdDivisions);
        
        // Initialize districts and upazilas from initialState
        if (initialState?.division) {
          setDistricts(bdDistricts[initialState.division.toLowerCase()] || []);
        }
        if (initialState?.division && initialState?.district) {
          const loadedDistricts = bdDistricts[initialState.division.toLowerCase()] || [];
          const distData = loadedDistricts.find(d => d.district === initialState.district);
          if (distData && distData.upazilla) {
            setUpazilas(distData.upazilla);
          }
        }
      } catch (err) {
        setDivisions(bdDivisions);
      }
    };

    const fetchVehicleTypes = async () => {
      try {
        const q = query(collection(db, 'vehicleTypes'), where('isVisible', '==', true));
        const snap = await getDocs(q);
        const types = snap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleType));
        types.sort((a, b) => a.name.localeCompare(b.name));
        setVehicleTypes(types);
      } catch (err) {
        console.error("Error fetching vehicle types:", err);
      }
    };

    const fetchCustomLocations = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        setCustomLocations(snap.docs.map(d => d.data()));
      } catch (err) {
        console.error("Error fetching custom locations:", err);
      }
    };

    fetchLocations();
    fetchVehicleTypes();
    fetchCustomLocations();
  }, []);

  const handleSelect = async (level: string, value: string) => {
    const newSelected = { ...selected, [level]: value };
    
    // Reset lower levels
    if (level === 'division') {
      newSelected.district = '';
      newSelected.upazila = '';
      newSelected.union = '';
      newSelected.ward = '';
      setDistricts([]);
      setUpazilas([]);
      if (value) {
        setDistricts(bdDistricts[value.toLowerCase()] || []);
      }
    } else if (level === 'district') {
      newSelected.upazila = '';
      newSelected.union = '';
      newSelected.ward = '';
      setUpazilas([]);
      if (value) {
        const districtData = districts.find(d => d.district === value);
        if (districtData && districtData.upazilla) {
          setUpazilas(districtData.upazilla);
        }
      }
    } else if (level === 'upazila') {
      newSelected.union = '';
      newSelected.ward = '';
    } else if (level === 'union') {
      newSelected.ward = '';
    }

    setSelected(newSelected);
    onFilterChange(newSelected);
  };

  const handleInputChange = (level: string, value: string) => {
    const newSelected = { ...selected, [level]: value };
    setSelected(newSelected);
    onFilterChange(newSelected);
  };

  const renderSelect = (level: string, options: any[], label: string, valueKey: string, nameKeyEn: string, nameKeyBn?: string) => (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {t(`filter.${level}`)}
      </label>
      <select
        value={(selected as any)[level]}
        onChange={(e) => handleSelect(level, e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all w-full"
      >
        <option value="">{t('filter.select', { label })}</option>
        {options.map((opt) => {
          const isObj = typeof opt !== 'string';
          const val = isObj ? opt[valueKey] : opt;
          const nameEn = isObj ? opt[nameKeyEn] : opt;
          const nameBn = isObj && nameKeyBn ? opt[nameKeyBn] : nameEn;
          const displayName = i18n.language === 'bn' ? nameBn : nameEn;
          
          return (
            <option key={val} value={val}>
              {displayName}
            </option>
          );
        })}
      </select>
    </div>
  );

  const renderInput = (level: string, label: string, isRequired?: boolean) => {
    const listId = `list-${level}`;
    const suggestions = customLocations.filter(loc => loc.level === level);
    
    return (
      <div className="flex flex-col gap-1 w-full">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          list={listId}
          required={isRequired}
          value={(selected as any)[level]}
          onChange={(e) => handleInputChange(level, e.target.value)}
          placeholder={t('filter.select', { label })}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all w-full"
        />
        <datalist id={listId}>
          {suggestions.map((loc, idx) => (
            <option key={idx} value={i18n.language === 'bn' && loc.bnName ? loc.bnName : loc.name} />
          ))}
        </datalist>
      </div>
    );
  };

  let effectiveRequireUnion = requireUnion;
  if (requireUnion) {
    const isSadarDistrict = 
      (selected.division === 'Dhaka' && selected.district === 'Dhaka') ||
      (selected.division === 'Chattogram' && selected.district === 'Chattogram') ||
      (selected.division === 'Rajshahi' && selected.district === 'Rajshahi') ||
      (selected.division === 'Khulna' && selected.district === 'Khulna') ||
      (selected.division === 'Barishal' && selected.district === 'Barishal') ||
      (selected.division === 'Sylhet' && selected.district === 'Sylhet') ||
      (selected.division === 'Rangpur' && selected.district === 'Rangpur');
    
    if (isSadarDistrict) {
      effectiveRequireUnion = false;
    }
  }

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4"}>
      {!hideVehicleType && renderSelect('vehicleType', vehicleTypes, t('filter.vehicleType'), 'name', 'name', 'bnName')}
      {renderSelect('division', divisions, t('filter.division'), 'division', 'division', 'divisionbn')}
      {renderSelect('district', districts, t('filter.district'), 'district', 'district', 'districtbn')}
      {renderSelect('upazila', upazilas, t('filter.upazila'), '', '', '')}
      {!compact && renderInput('union', i18n.language === 'bn' ? 'ইউনিয়ন/পৌরসভা' : 'Union/Municipality', effectiveRequireUnion)}
      {!compact && renderInput('ward', t('filter.ward'))}
    </div>
  );
};
