import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, XCircle, Plus, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';

export const LeavesTab: React.FC = () => {
  const { logAction } = useAdmin();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'sick',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [empSnap, leaveSnap] = await Promise.all([
          getDocs(query(collection(db, 'employees'), orderBy('name', 'asc'))),
          getDocs(query(collection(db, 'leaves'), orderBy('createdAt', 'desc'))),
        ]);
        setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLeaveRequests(leaveSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching leaves data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      const docRef = await addDoc(collection(db, 'leaves'), {
        ...leaveForm,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setLeaveRequests([
        { id: docRef.id, ...leaveForm, status: 'pending', createdAt: new Date() },
        ...leaveRequests,
      ]);

      const empName = employees.find((emp) => emp.id === leaveForm.employeeId)?.name || 'Employee';
      await logAction('SUBMIT_LEAVE', `Submitted leave request for ${empName} (${leaveForm.type})`);
      setLeaveForm({ employeeId: '', startDate: '', endDate: '', reason: '', type: 'sick' });
      alert('Leave request submitted!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit leave.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status, updatedAt: serverTimestamp() });
      setLeaveRequests(leaveRequests.map((l) => (l.id === id ? { ...l, status } : l)));
      await logAction('UPDATE_LEAVE', `Marked leave request #${id.substring(0, 6)} as ${status}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update leave status.');
    }
  };

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');
  const approvedLeaves = leaveRequests.filter((l) => l.status === 'approved');
  const rejectedLeaves = leaveRequests.filter((l) => l.status === 'rejected');

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Leave Requests</h3>
          <p className="text-sm text-gray-500 mt-1">Review staff leave applications and track leave records.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-orange-50/70 p-5 rounded-2xl shadow-sm border border-orange-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-orange-700">{pendingLeaves.length}</span>
          <span className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-1">Pending</span>
        </div>
        <div className="bg-green-50/70 p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-green-700">{approvedLeaves.length}</span>
          <span className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1">Approved</span>
        </div>
        <div className="bg-red-50/70 p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-red-700">{rejectedLeaves.length}</span>
          <span className="text-xs text-red-600 font-bold uppercase tracking-wider mt-1">Rejected</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-gray-900">{leaveRequests.length}</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total Leaves</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Leave Requests History */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
          <h4 className="font-bold text-lg flex items-center gap-2 border-b border-gray-100 pb-4 text-gray-900">
            <CalendarDays className="text-primary" size={20} /> Leave Applications History
          </h4>
          <div className="overflow-y-auto max-h-[600px] pr-2 flex flex-col gap-3">
            {leaveRequests.length === 0 && !loading && (
              <p className="text-gray-400 text-center py-12 text-sm">No leave requests found.</p>
            )}
            {leaveRequests.map((leave) => {
              const emp = employees.find((e) => e.id === leave.employeeId);
              return (
                <div
                  key={leave.id}
                  className="p-5 border border-gray-100 rounded-2xl hover:bg-gray-50/80 flex flex-col gap-2 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div>
                      <p className="font-bold text-gray-900 text-base">{emp?.name || 'Unknown Employee'}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider flex-wrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md font-bold',
                            leave.type === 'sick'
                              ? 'bg-orange-100 text-orange-700'
                              : leave.type === 'casual'
                              ? 'bg-blue-100 text-blue-700'
                              : leave.type === 'earned'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-700'
                          )}
                        >
                          {leave.type} Leave
                        </span>
                        <span>•</span>
                        <span>
                          {leave.startDate} to {leave.endDate}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-3 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100">
                        "{leave.reason}"
                      </p>
                    </div>
                    {leave.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')}
                          className="text-xs font-bold px-3 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 size={15} /> Approve
                        </button>
                        <button
                          onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')}
                          className="text-xs font-bold px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-bold px-3 py-1.5 rounded-xl border uppercase tracking-wider shadow-sm',
                          leave.status === 'approved'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        {leave.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Apply for Leave Form */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 h-max">
          <h4 className="font-bold text-lg flex items-center gap-2 border-b border-gray-100 pb-4 text-gray-900">
            <Plus className="text-primary" size={20} /> Apply for Leave
          </h4>
          <form onSubmit={handleAddLeave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Employee</label>
              <select
                required
                value={leaveForm.employeeId}
                onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary w-full shadow-sm bg-gray-50 font-medium"
              >
                <option value="">Select Employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Leave Type</label>
              <select
                required
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary w-full shadow-sm bg-gray-50 font-medium"
              >
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="earned">Earned Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Start Date</label>
                <input
                  required
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm bg-gray-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">End Date</label>
                <input
                  required
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm bg-gray-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reason</label>
              <textarea
                required
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm min-h-[90px] bg-gray-50"
                placeholder="Reason for leave request..."
              />
            </div>

            <button
              type="submit"
              disabled={submittingLeave}
              className="bg-gray-900 text-white font-bold py-3 mt-2 rounded-xl text-sm hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {submittingLeave ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeavesTab;
