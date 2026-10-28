import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { VehicleType } from '../types';

export interface SyncResult {
  totalDrivers: number;
  deactivatedExpired: number;
  reactivatedFree: number;
}

/**
 * Synchronizes driver active status in Firestore based on subscription expiry and vehicle pricing.
 * When a vehicle type requires monthly payment:
 * - If expiryDate is in the past (<= now) or placeholder (> 2090 from free mode without payment):
 *   The driver's `isActive` MUST BE false in Firestore so they do NOT appear in the user app / web mode.
 * - When all vehicles are free or a vehicle is free:
 *   Approved drivers are restored to `isActive: true`.
 */
export async function syncDriversSubscriptionStatus(
  cachedVehicleTypes?: VehicleType[],
  cachedAllFree?: boolean
): Promise<SyncResult> {
  try {
    // 1. Fetch vehicle types if not provided
    let vehicleTypes = cachedVehicleTypes;
    if (!vehicleTypes || vehicleTypes.length === 0) {
      let vSnap = await getDocs(collection(db, 'vehicleTypes'));
      if (vSnap.empty) {
        vSnap = await getDocs(collection(db, 'vehicle_types'));
      }
      vehicleTypes = vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VehicleType));
    }

    // 2. Fetch global settings for allVehiclesFree flag
    let isAllFree = cachedAllFree;
    if (isAllFree === undefined) {
      isAllFree =
        vehicleTypes.length > 0 &&
        vehicleTypes.every((v) => Number(v.monthlyFee || 0) === 0);
    }

    // 3. Fetch drivers
    const driversSnap = await getDocs(collection(db, 'drivers'));
    const now = Date.now();

    const updatesToMake: { id: string; data: any }[] = [];
    let deactivatedExpired = 0;
    let reactivatedFree = 0;

    driversSnap.docs.forEach((docSnap) => {
      const d = docSnap.data();
      const id = docSnap.id;

      // Skip explicitly deleted or rejected drivers
      if (d.isDeleted === true || d.status === 'deleted' || d.status === 'rejected') {
        return;
      }

      // Check vehicle type pricing
      const vType = vehicleTypes?.find((v) => v.name === d.vehicleType);
      const vehicleMonthlyFee = Number(vType?.monthlyFee ?? 0);
      const requiresPayment = !isAllFree && vehicleMonthlyFee > 0;

      // Parse expiry date
      let expiryTime: number | null = null;
      let expiryYear = 0;
      if (d.expiryDate?.toDate) {
        const dObj = d.expiryDate.toDate();
        expiryTime = dObj.getTime();
        expiryYear = dObj.getFullYear();
      } else if (d.expiryDate) {
        const dObj = new Date(d.expiryDate);
        if (!isNaN(dObj.getTime())) {
          expiryTime = dObj.getTime();
          expiryYear = dObj.getFullYear();
        }
      }

      if (requiresPayment) {
        // Subscription is required
        const isPlaceholderFreeDate = expiryYear > 2090;
        const isExpired = !expiryTime || expiryTime <= now || isPlaceholderFreeDate;

        if (isExpired && d.isActive === true) {
          // Driver has expired or not paid, but isActive is true in Firestore!
          // Must deactivate so app/web mode will hide the car
          updatesToMake.push({
            id,
            data: {
              isActive: false,
              subscriptionStatus: 'expired',
            },
          });
          deactivatedExpired++;
        }
      } else {
        // Vehicle is free (or all vehicles free)
        // If driver was previously deactivated solely due to expired subscription, re-activate them
        if (d.isActive === false && d.subscriptionStatus === 'expired' && d.status === 'approved') {
          updatesToMake.push({
            id,
            data: {
              isActive: true,
              subscriptionStatus: 'active',
            },
          });
          reactivatedFree++;
        }
      }
    });

    // Commit batch updates in chunks of 400
    if (updatesToMake.length > 0) {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < updatesToMake.length; i += CHUNK_SIZE) {
        const chunk = updatesToMake.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(({ id, data }) => {
          batch.update(doc(db, 'drivers', id), data);
        });
        await batch.commit();
      }
    }

    return {
      totalDrivers: driversSnap.size,
      deactivatedExpired,
      reactivatedFree,
    };
  } catch (error) {
    console.error('Error syncing driver subscription status:', error);
    throw error;
  }
}
