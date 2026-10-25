import React, { useState, useEffect, useMemo } from 'react';
import { Map, Search } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';

export const UpazilaStatsTab: React.FC = () => {
  const { vehicleTypes } = useAdmin();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'most_active' | 'least_active' | 'most_inactive' | 'least_inactive'>('most_active');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(query(collection(db, 'drivers'), limit(500)));
        setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching drivers for upazila stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  const upazilaStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        active: number;
        inactive: number;
        vehicles: Record<string, number>;
        inactiveVehicles: Record<string, number>;
      }
    > = {};

    drivers.forEach((d) => {
      const upa = d.upazila || 'Unknown';
      if (!stats[upa]) {
        stats[upa] = { total: 0, active: 0, inactive: 0, vehicles: {}, inactiveVehicles: {} };
      }

      const vTypeMatch = vehicleTypes.find((v) => v.name === d.vehicleType);
      const requiresPayment = vTypeMatch ? (vTypeMatch.monthlyFee || 0) > 0 : false;
      let isExpired = false;

      if (requiresPayment) {
        if (d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090) {
          isExpired = true;
        } else {
          isExpired = d.expiryDate?.toDate ? d.expiryDate.toDate() < new Date() : true;
        }
      }

      const isActive = d.isActive && !isExpired;

      stats[upa].total++;
      if (isActive) stats[upa].active++;
      else stats[upa].inactive++;

      const vType = d.vehicleType || 'Unknown';
      if (isActive) {
        if (!stats[upa].vehicles[vType]) stats[upa].vehicles[vType] = 0;
        stats[upa].vehicles[vType]++;
      } else {
        if (!stats[upa].inactiveVehicles[vType]) stats[upa].inactiveVehicles[vType] = 0;
        stats[upa].inactiveVehicles[vType]++;
      }
    });

    let result = Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
    }));

    if (search) {
      result = result.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    }

    result.sort((a, b) => {
      if (sort === 'most_active') return b.active - a.active;
      if (sort === 'least_active') return a.active - b.active;
      if (sort === 'most_inactive') return b.inactive - a.inactive;
      if (sort === 'least_inactive') return a.inactive - b.inactive;
      return 0;
    });

    return result;
  }, [drivers, vehicleTypes, search, sort]);

  const totalActive = upazilaStats.reduce((a, b) => a + b.active, 0);
  const totalInactive = upazilaStats.reduce((a, b) => a + b.inactive, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Metric summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Map className="text-primary" size={22} />
            <span>Upazila Analytics</span>
          </h3>
          <p className="text-gray-500 font-medium mt-0.5 text-xs">
            Track active and inactive vehicles across all upazilas. Monitor growth and distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search upazila..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>

          <select
            value={sort}
            onChange={(e: any) => setSort(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="most_active">Most Active</option>
            <option value="least_active">Least Active</option>
            <option value="most_inactive">Most Inactive</option>
            <option value="least_inactive">Least Inactive</option>
          </select>

          <div className="flex items-center gap-2">
            <div className="bg-green-50 border border-green-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="text-green-700 font-black text-sm">{totalActive}</span>
              <span className="text-green-800 text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
            <div className="bg-red-50 border border-red-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="text-red-600 font-black text-sm">{totalInactive}</span>
              <span className="text-red-800 text-[10px] font-bold uppercase tracking-wider">Inactive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table - Single Clean Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Upazila Name</th>
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Active</th>
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Inactive</th>
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Total</th>
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Active Vehicles</th>
                <th className="py-3 px-4 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Inactive Vehicles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {upazilaStats.map((stat, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900 text-xs">{stat.name}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold',
                        stat.active > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {stat.active}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold',
                        stat.inactive > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {stat.inactive}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-700 text-xs">{stat.total}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {Object.entries(stat.vehicles).length > 0 ? (
                        Object.entries(stat.vehicles).map(([vType, count]) => (
                          <span
                            key={vType}
                            className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded font-bold"
                          >
                            {vType} ({count})
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {Object.entries(stat.inactiveVehicles).length > 0 ? (
                        Object.entries(stat.inactiveVehicles).map(([vType, count]) => (
                          <span
                            key={vType}
                            className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded font-bold"
                          >
                            {vType} ({count})
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {upazilaStats.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 text-xs font-semibold">
                    No location or driver statistics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default UpazilaStatsTab;
