import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Activity, RefreshCw, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ActivityLogsTab: React.FC = () => {
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'actionLogs'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      setActionLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching action logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-primary" size={24} />
            <span>Activity & Audit Logs</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">Immutable security log of administrative actions and system updates.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white border flex flex-col border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">Time</th>
                <th className="py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                <th className="py-3.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {actionLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap font-mono">
                    {log.timestamp?.toDate
                      ? log.timestamp.toDate().toLocaleString()
                      : log.timestamp
                      ? new Date(log.timestamp).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                        <User size={13} />
                      </div>
                      <div>
                        <span>{log.userName}</span>
                        <span className="text-[11px] text-gray-400 block font-normal font-mono">{log.userId?.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-gray-700 max-w-md whitespace-normal font-medium leading-relaxed">
                    {log.description}
                  </td>
                </tr>
              ))}
              {actionLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 text-sm">
                    No activity logs recorded yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 text-sm">
                    Loading activity records...
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

export default ActivityLogsTab;
