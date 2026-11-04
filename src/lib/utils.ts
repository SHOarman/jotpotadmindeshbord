import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VEHICLE_NAME_BN_MAP: Record<string, string> = {
  helicopter: 'হেলিকপ্টার',
  noah: 'নোয়া',
  microbus: 'মাইক্রোবাস',
  'micro bus': 'মাইক্রোবাস',
  hiace: 'হায়েস',
  hayes: 'হায়েস',
  bike: 'মোটরসাইকেল',
  motorcycle: 'মোটরসাইকেল',
  'motor cycle': 'মোটরসাইকেল',
  car: 'প্রাইভেট কার',
  'private car': 'প্রাইভেট কার',
  pickup: 'পিকআপ',
  'pick up': 'পিকআপ',
  truck: 'ট্রাক',
  cng: 'সিএনজি',
  auto: 'অটো',
  'easy bike': 'ইজি বাইক',
  tomtom: 'টমটম',
  ambulance: 'অ্যাম্বুলেন্স',
  'air ambulance': 'এয়ার অ্যাম্বুলেন্স',
  van: 'ভ্যান',
  'covered van': 'কাভার্ড ভ্যান',
  bus: 'বাস',
  minibus: 'মিনি বাস',
  'mini bus': 'মিনি বাস',
  leguna: 'লেগুনা',
  tractor: 'ট্রাক্টর',
  votvoti: 'ভটভটি',
  speedboat: 'স্পিডবোট',
  boat: 'নৌকা',
  launch: 'লঞ্চ',
  rickshaw: 'রিকশা',
  trolley: 'ট্রলি',
};

export function formatVehicleTypeBn(raw: string | undefined | null): string {
  if (!raw) return '';
  const clean = String(raw).trim();
  const lower = clean.toLowerCase();
  if (VEHICLE_NAME_BN_MAP[lower]) return VEHICLE_NAME_BN_MAP[lower];
  if (lower.includes('heli')) return 'হেলিকপ্টার';
  if (lower.includes('noah') || lower.includes('voxy')) return 'নোয়া';
  if (lower.includes('micro')) return 'মাইক্রোবাস';
  if (lower.includes('hiace') || lower.includes('hayes')) return 'হায়েস';
  if (lower.includes('bike') || lower.includes('motor')) return 'মোটরসাইকেল';
  if (lower.includes('car') || lower.includes('sedan')) return 'প্রাইভেট কার';
  if (lower.includes('pick')) return 'পিকআপ';
  if (lower.includes('truck')) return 'ট্রাক';
  if (lower.includes('cng')) return 'সিএনজি';
  if (lower.includes('ambu')) return 'অ্যাম্বুলেন্স';
  if (lower.includes('van')) return 'ভ্যান';
  if (lower.includes('bus')) return 'বাস';
  if (lower.includes('auto') || lower.includes('tomtom') || lower.includes('easy')) return 'ইজি বাইক';
  return clean;
}
