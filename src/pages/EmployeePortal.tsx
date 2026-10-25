import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { Clock, CalendarDays, Banknote, Briefcase, Play, Square, Building2, Home as HomeIcon, CheckCircle2, ChevronRight, Activity, PieChart, Info, User, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Employee, Salary } from '../types';
import toast from 'react-hot-toast';

export const EmployeePortal: React.FC = () => {
  const { user, profile, isEmployee, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('attendance');
  const [dbEmployeeId, setDbEmployeeId] = useState<string | null>(null);
  
  // Data
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Forms
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', type: 'sick', reason: '' });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [taskForm, setTaskForm] = useState({ description: '' });

  // Today's Check in status
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todaysAttendance = attendanceRecords.find(a => a.date === todayDate);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    // Map the authenticated user to an Employee document via email
    const fetchEmployee = async () => {
      try {
        const q = query(collection(db, 'employees'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setDbEmployeeId(snap.docs[0].id);
        }
      } catch (err) {
        console.error("Error fetching employee ID:", err);
      }
    };
    fetchEmployee();
  }, [user]);

  useEffect(() => {
    if (!dbEmployeeId) return;

    // Listen to Attendance
    const unsubAtt = onSnapshot(query(collection(db, 'attendance'), where('employeeId', '==', dbEmployeeId), orderBy('date', 'desc')), snap => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to Leaves
    const unsubLeave = onSnapshot(query(collection(db, 'leaves'), where('employeeId', '==', dbEmployeeId), orderBy('createdAt', 'desc')), snap => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to Salaries
    const unsubSal = onSnapshot(query(collection(db, 'salaries'), where('employeeId', '==', dbEmployeeId), orderBy('createdAt', 'desc')), snap => {
      setSalaries(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Salary));
    });

    // Listen to Tasks
    const unsubTasks = onSnapshot(query(collection(db, 'employee_tasks'), where('employeeId', '==', dbEmployeeId), orderBy('timestamp', 'desc')), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAtt(); unsubLeave(); unsubSal(); unsubTasks(); };
  }, [dbEmployeeId]);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  const handleCheckIn = async (locationType: 'office' | 'home') => {
    if (!dbEmployeeId) {
      toast.error("Employee profile not found.");
      return;
    }
    
    // Determine status based on time (e.g., late if after 9:30 AM)
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const isLate = (currentHour > 9 || (currentHour === 9 && currentMin > 30));
    
    try {
      await addDoc(collection(db, 'attendance'), {
        employeeId: dbEmployeeId,
        date: todayDate,
        status: isLate ? 'late' : 'present',
        checkInTime: new Date().toISOString(),
        locationType: locationType
      });
      toast.success("Checked in successfully!");
    } catch(e) {
      console.error(e);
      toast.error("Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    if (!todaysAttendance) return;
    try {
      await updateDoc(doc(db, 'attendance', todaysAttendance.id), {
        checkOutTime: new Date().toISOString()
      });
      toast.success("Checked out successfully!");
    } catch(e) {
      toast.error("Failed to check out");
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbEmployeeId) return;
    setSubmittingLeave(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        employeeId: dbEmployeeId,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        type: leaveForm.type,
        reason: leaveForm.reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Leave request submitted");
      setLeaveForm({ startDate: '', endDate: '', type: 'sick', reason: '' });
    } catch (err) {
      toast.error("Failed to submit leave request");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbEmployeeId || !taskForm.description.trim()) return;
    try {
      await addDoc(collection(db, 'employee_tasks'), {
        employeeId: dbEmployeeId,
        description: taskForm.description,
        timestamp: new Date().toISOString(),
      });
      setTaskForm({ description: '' });
      toast.success("Task updated");
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 pb-[76px] md:pb-0">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-t md:border-t-0 md:border-r border-gray-200 flex flex-row md:flex-col shrink-0 fixed bottom-0 left-0 z-50 md:static">
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center hidden md:flex">
          <h2 className="text-xl font-black text-gray-900 tracking-tighter">My<span className="text-primary">Portal</span></h2>
        </div>
        <nav className="flex-1 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible items-center md:items-stretch h-[76px] md:h-auto overflow-y-hidden md:overflow-y-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setActiveTab('attendance')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-sm transition-all md:justify-start flex-1 md:flex-none whitespace-nowrap ${activeTab === 'attendance' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Clock size={20} className="md:w-5 md:h-5 w-6 h-6" /> <span className="mt-0.5 md:mt-0">Attendance</span>
          </button>
          <button onClick={() => setActiveTab('leaves')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-sm transition-all md:justify-start flex-1 md:flex-none whitespace-nowrap ${activeTab === 'leaves' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <CalendarDays size={20} className="md:w-5 md:h-5 w-6 h-6" /> <span className="mt-0.5 md:mt-0">My Leaves</span>
          </button>
          <button onClick={() => setActiveTab('salaries')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-sm transition-all md:justify-start flex-1 md:flex-none whitespace-nowrap ${activeTab === 'salaries' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Banknote size={20} className="md:w-5 md:h-5 w-6 h-6" /> <span className="mt-0.5 md:mt-0">Salary</span>
          </button>
          <button onClick={() => setActiveTab('tasks')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-sm transition-all md:justify-start flex-1 md:flex-none whitespace-nowrap ${activeTab === 'tasks' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Activity size={20} className="md:w-5 md:h-5 w-6 h-6" /> <span className="mt-0.5 md:mt-0">Work Dairy</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 hidden md:block">
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-bold text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center sticky top-0 z-40">
           <h2 className="text-xl font-black text-gray-900 tracking-tighter">My<span className="text-primary">Portal</span></h2>
           <button onClick={handleLogout} className="text-gray-400 p-1.5"><LogOut size={20}/></button>
        </div>

        {activeTab === 'attendance' && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Today's Workspace</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Check in / Check out Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                {!todaysAttendance ? (
                  <>
                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                      <Clock size={40} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Ready to start your day?</h4>
                    <p className="text-gray-500 mb-8 text-sm">Select your work location to check in.</p>
                    <div className="flex gap-4">
                      <button onClick={() => handleCheckIn('office')} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm">
                        <Building2 size={18} /> Office Check-in
                      </button>
                      <button onClick={() => handleCheckIn('home')} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm">
                        <HomeIcon size={18} /> Home Check-in
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Checked In</h4>
                    <p className="text-gray-500 mb-2">Since {new Date(todaysAttendance.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Working from {todaysAttendance.locationType === 'office' ? 'Office' : 'Home'}</p>
                    
                    {todaysAttendance.checkOutTime ? (
                       <p className="text-lg font-bold text-orange-600 mt-4 bg-orange-50 px-6 py-2 rounded-xl">Checked out at {new Date(todaysAttendance.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    ) : (
                      <button onClick={handleCheckOut} className="mt-6 flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-8 py-3 rounded-xl font-bold hover:bg-red-100 transition-all">
                        <LogOut size={18} /> Check Out Now
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Recent Attendance */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="text-primary" size={20} /> Attendance History</h4>
                <div className="space-y-3">
                  {attendanceRecords.slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{format(new Date(record.date), 'MMMM d, yyyy')}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Building2 size={12}/> {record.locationType || 'office'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                           record.status === 'present' ? 'bg-green-100 text-green-700' :
                           record.status === 'late' ? 'bg-orange-100 text-orange-700' :
                           record.status === 'half-day' ? 'bg-blue-100 text-blue-700' :
                           'bg-red-100 text-red-700'
                        }`}>
                          {record.status}
                        </span>
                        {record.checkInTime && <p className="text-[11px] text-gray-500 mt-1 font-mono">{format(new Date(record.checkInTime), 'hh:mm a')}</p>}
                      </div>
                    </div>
                  ))}
                  {attendanceRecords.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No records found.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Leave Management</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Apply Form */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-max">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><CalendarDays className="text-primary" size={20} /> Apply for Request</h4>
                <form onSubmit={handleApplyLeave} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700">Start Date</label>
                      <input required type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-gray-50 uppercase" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-xs font-bold text-gray-700">End Date</label>
                       <input required type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-gray-50 uppercase" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Leave Type</label>
                    <select required value={leaveForm.type} onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-gray-50">
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="earned">Earned Leave</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Reason</label>
                    <textarea required placeholder="Explain why you need this leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value })} className="border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[100px] bg-gray-50 resize-y" />
                  </div>
                  <button type="submit" disabled={submittingLeave} className="bg-gray-900 text-white font-bold py-3 mt-2 rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                    {submittingLeave ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>

              {/* History */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-primary" size={20} /> My Leave History</h4>
                <div className="flex flex-col gap-3">
                  {leaveRequests.map(leave => (
                    <div key={leave.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{leave.type} Leave</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                           leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                           leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                           'bg-orange-100 text-orange-700'
                        }`}>{leave.status}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm mb-1">{leave.startDate} to {leave.endDate}</p>
                      <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100 mt-2">"{leave.reason}"</p>
                    </div>
                  ))}
                  {leaveRequests.length === 0 && <p className="text-sm text-gray-500 text-center py-4">You have not submitted any leave requests.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salaries' && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Salary & Payslips</h3>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-sm font-bold text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="pb-3 text-sm font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="pb-3 text-sm font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-sm font-bold text-gray-500 uppercase tracking-wider">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salaries.map(salary => (
                      <tr key={salary.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-bold text-gray-900">{salary.month}</td>
                        <td className="py-4 font-mono text-green-600 font-bold">৳{salary.amount?.toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                            salary.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {salary.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-gray-600">
                           {salary.paymentDate ? format(new Date(salary.paymentDate), 'MMM d, yyyy') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salaries.length === 0 && <p className="text-center text-gray-500 py-8">No salary records found.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
           <div className="p-4 md:p-8 max-w-5xl mx-auto">
             <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div>
                 <h3 className="text-2xl font-black text-gray-900">Work Diary</h3>
                 <p className="text-gray-500 text-sm mt-1">Log what you are currently working on.</p>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-1 border border-gray-200 rounded-3xl bg-gray-50 p-6 h-max">
                 <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Play size={16} className="text-primary"/> Current Task</h4>
                 <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                   <textarea
                     required
                     value={taskForm.description}
                     onChange={e => setTaskForm({description: e.target.value})}
                     placeholder="e.g., Working on user authentication flow..."
                     className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary text-sm min-h-[120px] resize-y"
                   />
                   <button type="submit" className="bg-primary text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity">Post Update</button>
                 </form>
               </div>

               <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                 <h4 className="font-bold text-lg text-gray-900 mb-4 border-b border-gray-100 pb-4">Recent Activity</h4>
                 <div className="flex flex-col gap-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                   {tasks.map(task => (
                     <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                       <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-gray-200 group-hover:bg-primary transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 ml-0 md:ml-auto"></div>
                       <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 transition-colors group-[.is-active]:bg-gray-50/50">
                          <div className="flex items-center justify-between mb-2">
                             <div className="font-bold text-gray-900 text-sm">Update Logged</div>
                             <time className="font-mono text-[10px] uppercase text-gray-400">{format(new Date(task.timestamp), 'h:mm a')}</time>
                          </div>
                          <div className="text-gray-600 text-sm">{task.description}</div>
                       </div>
                     </div>
                   ))}
                   {tasks.length === 0 && <p className="text-sm text-gray-500 text-center py-8 relative z-10 w-full bg-white">No tasks logged recently.</p>}
                 </div>
               </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};
