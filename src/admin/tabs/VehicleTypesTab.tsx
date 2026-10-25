import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { addDoc, collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';

export const VehicleTypesTab: React.FC = () => {
  const { isAdmin, hasPermission, vehicleTypes, refreshVehicleTypes, logAction } = useAdmin();

  const [newVehicle, setNewVehicle] = useState({
    name: '',
    bnName: '',
    monthlyFee: 0,
    discountType: 'percentage',
    discountValue: 0,
  });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({
    name: '',
    bnName: '',
    monthlyFee: 0,
    discountType: 'percentage',
    discountValue: 0,
  });
  const [seedingVehicles, setSeedingVehicles] = useState(false);

  const defaultVehicles = [
    { name: 'Bike', bnName: 'বাইক', monthlyFee: 100 },
    { name: 'Car', bnName: 'প্রাইভেট কার', monthlyFee: 300 },
    { name: 'CNG', bnName: 'সিএনজি', monthlyFee: 200 },
    { name: 'Auto', bnName: 'অটো রিকশা', monthlyFee: 150 },
    { name: 'Ambulance', bnName: 'অ্যাম্বুলেন্স', monthlyFee: 0 },
    { name: 'Truck', bnName: 'ট্রাক', monthlyFee: 400 },
    { name: 'Pickup', bnName: 'পিকআপ', monthlyFee: 250 },
  ];

  const handleSeedVehicles = async () => {
    setSeedingVehicles(true);
    try {
      for (const v of defaultVehicles) {
        if (!vehicleTypes.some((existing) => existing.name.toLowerCase() === v.name.toLowerCase())) {
          await addDoc(collection(db, 'vehicle_types'), { ...v, isVisible: true });
        }
      }
      await refreshVehicleTypes();
      await logAction('seed_vehicles', 'Seeded default vehicle types');
      alert('Default vehicles seeded successfully!');
    } catch (err) {
      console.error('Error seeding vehicles:', err);
    } finally {
      setSeedingVehicles(false);
    }
  };

  const handleAddVehicleType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.name || !newVehicle.bnName) return;
    try {
      await addDoc(collection(db, 'vehicle_types'), { ...newVehicle, isVisible: true });
      await refreshVehicleTypes();
      setNewVehicle({ name: '', bnName: '', monthlyFee: 0, discountType: 'percentage', discountValue: 0 });
      await logAction('add_vehicle_type', `Added vehicle type ${newVehicle.name}`);
    } catch (err) {
      console.error('Error adding vehicle type:', err);
    }
  };

  const handleToggleVehicleType = async (id: string, currentStatus: boolean) => {
    try {
      await setDoc(doc(db, 'vehicle_types', id), { isVisible: !currentStatus }, { merge: true });
      await refreshVehicleTypes();
    } catch (err) {
      console.error('Error toggling vehicle type:', err);
    }
  };

  const startEditingVehicle = (v: any) => {
    setEditingVehicleId(v.id);
    setEditVehicleForm({
      name: v.name,
      bnName: v.bnName,
      monthlyFee: v.monthlyFee,
      discountType: v.discountType || 'percentage',
      discountValue: v.discountValue || 0,
    });
  };

  const saveEditedVehicle = async (id: string) => {
    try {
      await setDoc(doc(db, 'vehicle_types', id), editVehicleForm, { merge: true });
      setEditingVehicleId(null);
      await refreshVehicleTypes();
      await logAction('edit_vehicle_type', `Updated vehicle type ${editVehicleForm.name}`);
    } catch (err) {
      console.error('Error saving vehicle type:', err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle type?')) return;
    try {
      await deleteDoc(doc(db, 'vehicle_types', id));
      await refreshVehicleTypes();
      await logAction('delete_vehicle_type', `Deleted vehicle type ${id}`);
    } catch (err) {
      console.error('Error deleting vehicle type:', err);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Vehicle Types</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage supported vehicle categories and subscription fees.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSeedVehicles}
            disabled={seedingVehicles}
            className="bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {seedingVehicles ? 'Seeding...' : 'Seed Defaults'}
          </button>
        )}
      </div>

      {(isAdmin || hasPermission('vehicle-types')) && (
        <form
          onSubmit={handleAddVehicleType}
          className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200/80 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">English Name</label>
            <input
              required
              type="text"
              value={newVehicle.name}
              onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Rickshaw"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bengali Name</label>
            <input
              required
              type="text"
              value={newVehicle.bnName}
              onChange={(e) => setNewVehicle({ ...newVehicle, bnName: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              placeholder="যেমন: রিকশা"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Monthly Fee (৳)</label>
            <input
              required
              type="number"
              min="0"
              value={newVehicle.monthlyFee}
              onChange={(e) => setNewVehicle({ ...newVehicle, monthlyFee: Number(e.target.value) })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Discount Type</label>
            <select
              value={newVehicle.discountType}
              onChange={(e) => setNewVehicle({ ...newVehicle, discountType: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (৳)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Discount Value</label>
            <input
              type="number"
              min="0"
              value={newVehicle.discountValue}
              onChange={(e) => setNewVehicle({ ...newVehicle, discountValue: Number(e.target.value) })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-white py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all h-[38px] shadow-sm"
          >
            + Add Vehicle
          </button>
        </form>
      )}

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicleTypes.map((v) => (
          <div
            key={v.id}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"
          >
            {editingVehicleId === v.id ? (
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={editVehicleForm.name}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, name: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                  placeholder="English Name"
                />
                <input
                  type="text"
                  value={editVehicleForm.bnName}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, bnName: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                  placeholder="Bengali Name"
                />
                <input
                  type="number"
                  value={editVehicleForm.monthlyFee}
                  onChange={(e) =>
                    setEditVehicleForm({ ...editVehicleForm, monthlyFee: Number(e.target.value) })
                  }
                  className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                  placeholder="Monthly Fee"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setEditingVehicleId(null)}
                    className="text-xs font-bold text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEditedVehicle(v.id)}
                    className="text-xs font-bold text-primary"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{v.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">{v.bnName}</p>
                  </div>
                  <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    ৳{v.monthlyFee}/mo
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs">
                  <button
                    onClick={() => handleToggleVehicleType(v.id, v.isVisible ?? true)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-semibold"
                  >
                    {v.isVisible !== false ? (
                      <ToggleRight className="text-green-500" size={20} />
                    ) : (
                      <ToggleLeft className="text-gray-300" size={20} />
                    )}
                    <span>{v.isVisible !== false ? 'Active' : 'Hidden'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingVehicle(v)}
                      className="text-gray-400 hover:text-primary"
                    >
                      <Edit2 size={15} />
                    </button>
                    {(isAdmin || hasPermission('vehicle-types')) && (
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default VehicleTypesTab;
