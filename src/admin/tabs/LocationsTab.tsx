import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';

export const LocationsTab: React.FC = () => {
  const { isAdmin, hasPermission, locations, refreshLocations, logAction } = useAdmin();

  const [newLocation, setNewLocation] = useState({
    name: '',
    bnName: '',
    level: 'division',
    parent: '',
  });

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.name || !newLocation.bnName) return;
    try {
      await addDoc(collection(db, 'locations'), newLocation);
      await refreshLocations();
      setNewLocation({ name: '', bnName: '', level: 'division', parent: '' });
      await logAction('add_location', `Added location ${newLocation.name} (${newLocation.level})`);
    } catch (err) {
      console.error('Error adding location:', err);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await deleteDoc(doc(db, 'locations', id));
      await refreshLocations();
      await logAction('delete_location', `Deleted location ID: ${id}`);
    } catch (err) {
      console.error('Error deleting location:', err);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Administrative Hierarchy</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage Divisions, Districts, Upazilas, Unions, and Wards.</p>
        </div>
      </div>

      {(isAdmin || hasPermission('locations')) && (
        <form
          onSubmit={handleAddLocation}
          className="mb-8 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end shadow-sm"
        >
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">English Name</label>
            <input
              required
              type="text"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Dhaka"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bengali Name</label>
            <input
              required
              type="text"
              value={newLocation.bnName}
              onChange={(e) => setNewLocation({ ...newLocation, bnName: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              placeholder="যেমন: ঢাকা"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Level</label>
            <select
              value={newLocation.level}
              onChange={(e) => setNewLocation({ ...newLocation, level: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="division">Division</option>
              <option value="district">District</option>
              <option value="upazila">Upazila</option>
              <option value="union">Union</option>
              <option value="ward">Ward</option>
            </select>
          </div>
          {(newLocation.level === 'union' || newLocation.level === 'ward') ? (
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Parent Upazila/Union</label>
              <input
                type="text"
                value={newLocation.parent}
                onChange={(e) => setNewLocation({ ...newLocation, parent: e.target.value })}
                placeholder="e.g. Mirpur"
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}
          <button
            type="submit"
            className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all h-[36px] shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5 w-full"
          >
            + Add Location
          </button>
        </form>
      )}

      {/* Locations List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locations.map((l: any) => (
          <div
            key={l.id}
            className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded block w-max mb-1">
                {l.level}
              </span>
              <h4 className="font-bold text-gray-900 text-sm">
                {l.name} <span className="text-gray-400 font-normal">({l.bnName})</span>
              </h4>
              {l.parent && <span className="text-[11px] text-gray-400 block mt-0.5">Under: {l.parent}</span>}
            </div>
            {(isAdmin || hasPermission('locations')) && (
              <button
                onClick={() => handleDeleteLocation(l.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Location"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default LocationsTab;
