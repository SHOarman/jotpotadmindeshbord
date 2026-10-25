import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Monitor, Clock, UserCheck, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export const LiveMonitorTab: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch employees
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'employees'), orderBy('name', 'asc')));
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();

    // Fetch today's attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const fetchTodayAttendance = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', todayStr)));
        setTodayAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching today attendance:', err);
      }
    };
    fetchTodayAttendance();

    // Live Task feed listener
    const taskQuery = query(collection(db, 'employee_tasks'), orderBy('timestamp', 'desc'), limit(50));
    const unsubTasks = onSnapshot(
      taskQuery,
      (snap) => {
        setEmployeeTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error in employee_tasks listener:', err);
        setLoading(false);
      }
    );

    return () => unsubTasks();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor className="text-primary" size={24} />
            <span>Live Workspace Monitor</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">Real-time telemetry of active employee activities and daily presence.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Feed Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Task Feed */}
        <div className="bg-white border flex flex-col border-gray-100 rounded-3xl p-6 shadow-sm min-h-[500px]">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-primary" size={18} />
              <span>Live Work Diaries</span>
            </h4>
            <span className="text-xs text-gray-400 font-semibold">{employeeTasks.length} events logged</span>
          </div>
          <div className="flex flex-col gap-3 relative overflow-y-auto pr-2 max-h-[600px]">
            {employeeTasks.map((task) => {
              const emp = employees.find((e) => e.id === task.employeeId);
              return (
                <div
                  key={task.id}
                  className="relative flex flex-col gap-1 p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900 text-sm">{emp?.name || 'Unknown Staff'}</span>
                    <span className="text-xs text-gray-400 font-mono">
                      {task.timestamp?.toDate
                        ? task.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : task.timestamp
                        ? new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Now'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm font-medium">{task.description}</p>
                </div>
              );
            })}
            {employeeTasks.length === 0 && !loading && (
              <p className="text-gray-400 text-sm py-16 text-center">No staff work tasks recorded yet today.</p>
            )}
          </div>
        </div>

        {/* Today's Presence */}
        <div className="bg-white border flex flex-col border-gray-100 rounded-3xl p-6 shadow-sm h-max">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="text-primary" size={18} />
              <span>Today's Presence</span>
            </h4>
            <span className="text-xs text-gray-400 font-mono">{todayStr}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {employees.map((emp) => {
              const att = todayAttendance.find((a) => a.employeeId === emp.id);
              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3.5 border border-gray-100 rounded-2xl hover:bg-gray-50/60 transition-colors"
                >
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{emp.role}</p>
                  </div>
                  <div>
                    {!att ? (
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                        Not Checked In
                      </span>
                    ) : att.checkOutTime ? (
                      <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold uppercase tracking-wider">
                        Checked Out
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span>Online {att.locationType ? `(${att.locationType})` : ''}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {employees.length === 0 && !loading && (
              <p className="text-gray-400 text-sm py-12 text-center">No staff records available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitorTab;
