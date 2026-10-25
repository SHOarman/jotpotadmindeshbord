import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, setDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { Clock, CheckCircle2, Download, Calendar, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';

export const AttendanceTab: React.FC = () => {
  const { logAction } = useAdmin();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Report State
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportEmployeeId, setReportEmployeeId] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'employees'), orderBy('name', 'asc')));
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching employees for attendance:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch Attendance by Date
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', attendanceDate)));
        setAttendanceRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [attendanceDate]);

  const handleMarkAttendance = async (employeeId: string, status: 'present' | 'absent' | 'half-day' | 'leave') => {
    try {
      const attendanceId = `${employeeId}_${attendanceDate}`;
      await setDoc(doc(db, 'attendance', attendanceId), {
        employeeId,
        date: attendanceDate,
        status,
        updatedAt: serverTimestamp(),
      });

      setAttendanceRecords((prev) => {
        const existing = prev.find((a) => a.employeeId === employeeId && a.date === attendanceDate);
        if (existing) {
          return prev.map((a) => (a.id === attendanceId ? { ...a, status } : a));
        } else {
          return [...prev, { id: attendanceId, employeeId, date: attendanceDate, status }];
        }
      });
    } catch (err) {
      console.error('Error marking attendance:', err);
      alert('Failed to mark attendance.');
    }
  };

  const handleMarkAllPresent = async () => {
    if (!window.confirm(`Mark all unmarked employees as Present for ${attendanceDate}?`)) return;

    const unmarked = employees.filter(
      (emp) => !attendanceRecords.find((a) => a.employeeId === emp.id && a.date === attendanceDate)
    );

    for (const emp of unmarked) {
      await handleMarkAttendance(emp.id, 'present');
    }
    await logAction('BULK_ATTENDANCE', `Marked ${unmarked.length} staff as Present for ${attendanceDate}`);
  };

  const handleGenerateAttendanceReport = async () => {
    setGeneratingReport(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '>=', reportMonth + '-01'),
        where('date', '<=', reportMonth + '-31')
      );

      const snap = await getDocs(q);
      const records = snap.docs.map((d) => d.data());

      let csv = 'Employee Name,Date,Status\n';
      records.forEach((r: any) => {
        if (reportEmployeeId && r.employeeId !== reportEmployeeId) return;
        const emp = employees.find((e) => e.id === r.employeeId);
        csv += `"${emp?.name || r.employeeId}","${r.date}","${r.status}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Report_${reportMonth}${
        reportEmployeeId ? '_' + (employees.find((e) => e.id === reportEmployeeId)?.name || 'Employee') : ''
      }.csv`;
      a.click();
      URL.revokeObjectURL(url);
      await logAction('DOWNLOAD_ATTENDANCE_REPORT', `Downloaded attendance report for ${reportMonth}`);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const presentCount = attendanceRecords.filter((a) => a.date === attendanceDate && a.status === 'present').length;
  const absentCount = attendanceRecords.filter((a) => a.date === attendanceDate && a.status === 'absent').length;
  const leaveCount = attendanceRecords.filter(
    (a) => a.date === attendanceDate && (a.status === 'leave' || a.status === 'half-day')
  ).length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Attendance Management</h3>
          <p className="text-sm text-gray-500 mt-1">Track daily employee attendance and export monthly presence audits.</p>
        </div>
      </div>

      {/* Smart Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-gray-900">{employees.length}</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total Staff</span>
        </div>
        <div className="bg-green-50/70 p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-green-700">{presentCount}</span>
          <span className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1">Present</span>
        </div>
        <div className="bg-red-50/70 p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-red-700">{absentCount}</span>
          <span className="text-xs text-red-600 font-bold uppercase tracking-wider mt-1">Absent</span>
        </div>
        <div className="bg-yellow-50/70 p-5 rounded-2xl shadow-sm border border-yellow-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-yellow-700">{leaveCount}</span>
          <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider mt-1">Leave / Half-Day</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Attendance Marking Table */}
        <div className="xl:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 flex-wrap gap-4">
            <h4 className="font-bold text-lg flex items-center gap-2 text-gray-900">
              <Clock className="text-primary" size={20} /> Daily Attendance Sheet
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleMarkAllPresent}
                className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={16} /> Mark All Present
              </button>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary shadow-sm bg-gray-50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="pb-3 px-2 font-bold">Employee</th>
                  <th className="pb-3 px-2 font-bold">Role</th>
                  <th className="pb-3 px-2 font-bold text-right">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => {
                  const record = attendanceRecords.find(
                    (a) => a.employeeId === emp.id && a.date === attendanceDate
                  );
                  const status = record?.status || 'unmarked';
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-2 font-bold text-gray-800 text-sm">{emp.name}</td>
                      <td className="py-3 px-2 text-xs text-gray-500">{emp.role}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'present')}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-lg font-bold transition-all',
                              status === 'present'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                            )}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'absent')}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-lg font-bold transition-all',
                              status === 'absent'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                            )}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'half-day')}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-lg font-bold transition-all',
                              status === 'half-day'
                                ? 'bg-yellow-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                            )}
                          >
                            Half Day
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(emp.id, 'leave')}
                            className={cn(
                              'px-2.5 py-1 text-xs rounded-lg font-bold transition-all',
                              status === 'leave'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                            )}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400 text-sm">
                      No employees registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Section */}
        <div className="xl:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 h-max">
          <h4 className="font-bold text-lg flex items-center gap-2 border-b border-gray-100 pb-4 text-gray-900">
            <Download className="text-primary" size={20} /> Attendance Report
          </h4>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 w-full">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Month</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary w-full bg-gray-50"
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter Employee (Optional)</label>
              <select
                value={reportEmployeeId}
                onChange={(e) => setReportEmployeeId(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary w-full bg-gray-50"
              >
                <option value="">All Employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerateAttendanceReport}
            disabled={generatingReport}
            className="bg-primary text-white font-bold py-3 mt-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
          >
            <Download size={18} />
            <span>{generatingReport ? 'Generating Report...' : 'Download CSV Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTab;
