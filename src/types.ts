export interface Location {
  id: string;
  name: string;
  bnName: string;
  level: 'division' | 'district' | 'upazila' | 'union' | 'ward';
  parentId?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleRegNumber?: string;
  capacity?: string;
  seatingCapacity?: string;
  isCovered?: boolean;
  vehicleLength?: string;
  isAirAmbulance?: boolean;
  isSelfDriving?: boolean;
  autoPay?: boolean;
  division: string;
  district: string;
  upazila: string;
  union: string;
  ward: string;
  expiryDate: any; // Firestore Timestamp
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface VehicleType {
  id: string;
  name: string;
  bnName: string;
  monthlyFee: number;
  isVisible: boolean;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'agent' | 'user' | 'employee';
  name?: string;
  phone?: string;
  details?: string;
  rules?: string;
  isActive?: boolean;
  notificationSoundEnabled?: boolean;
}

export interface Payment {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  durationDays: number;
  transactionId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  approvedByUid?: string;
  approvedByName?: string;
  rejectedByUid?: string;
  rejectedByName?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  baseSalary: number;
  joinDate: any;
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface Salary {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  month: string; // e.g., "2026-04"
  paymentDate: any;
  status: 'paid' | 'pending';
  createdAt: any;
}
