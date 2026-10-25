import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { DollarSign, Edit2, Trash2, Calendar, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';

export const SalariesTab: React.FC = () => {
  const { isAdmin, hasPermission, logAction } = useAdmin();
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7),
  });
  const [submittingSalary, setSubmittingSalary] = useState(false);

  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editSalaryForm, setEditSalaryForm] = useState({
    amount: '',
    month: '',
    status: 'paid',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empSnap, salSnap] = await Promise.all([
        getDocs(query(collection(db, 'employees'), orderBy('name', 'asc'))),
        getDocs(query(collection(db, 'salaries'), orderBy('createdAt', 'desc'))),
      ]);
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSalaries(salSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching salaries data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSalary(true);
    try {
      const employee = employees.find((emp) => emp.id === salaryForm.employeeId);
      if (!employee) return;

      const amount = parseFloat(salaryForm.amount) || 0;
      const docRef = await addDoc(collection(db, 'salaries'), {
        employeeId: employee.id,
        employeeName: employee.name,
        amount,
        month: salaryForm.month,
        status: 'paid',
        paymentDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setSalaries([
        {
          id: docRef.id,
          employeeId: employee.id,
          employeeName: employee.name,
          amount,
          month: salaryForm.month,
          status: 'paid',
          paymentDate: new Date(),
          createdAt: new Date(),
        },
        ...salaries,
      ]);

      await logAction('ADD_SALARY', `Recorded ৳${amount} salary for ${employee.name} (${salaryForm.month})`);
      setSalaryForm({ employeeId: '', amount: '', month: new Date().toISOString().slice(0, 7) });
    } catch (err) {
      console.error('Error adding salary:', err);
      alert('Failed to record salary.');
    } finally {
      setSubmittingSalary(false);
    }
  };

  const handleGenerateMonthlySalaries = async () => {
    if (!window.confirm('Are you sure you want to generate pending salaries for all active employees for this month?')) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const activeEmployees = employees.filter((e) => e.status === 'active');
    let addedCount = 0;

    for (const emp of activeEmployees) {
      const existing = salaries.find((s) => s.employeeId === emp.id && s.month === currentMonth);
      if (!existing) {
        const docRef = await addDoc(collection(db, 'salaries'), {
          employeeId: emp.id,
          employeeName: emp.name,
          amount: emp.baseSalary,
          month: currentMonth,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
        setSalaries((prev) => [
          {
            id: docRef.id,
            employeeId: emp.id,
            employeeName: emp.name,
            amount: emp.baseSalary,
            month: currentMonth,
            status: 'pending',
            createdAt: new Date(),
          },
          ...prev,
        ]);
        addedCount++;
      }
    }
    await logAction('GENERATE_SALARIES', `Generated ${addedCount} pending salary entries for ${currentMonth}`);
    alert(`Generated ${addedCount} new salary entries for ${currentMonth}.`);
  };

  const saveEditedSalary = async (id: string) => {
    try {
      const amount = parseFloat(editSalaryForm.amount) || 0;
      await setDoc(
        doc(db, 'salaries', id),
        {
          ...editSalaryForm,
          amount,
        },
        { merge: true }
      );

      setSalaries(salaries.map((s) => (s.id === id ? { ...s, ...editSalaryForm, amount } : s)));
      await logAction('UPDATE_SALARY', `Updated salary record #${id.substring(0, 6)}`);
      setEditingSalaryId(null);
    } catch (err) {
      console.error('Error updating salary:', err);
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!isAdmin && !hasPermission('salaries')) {
      alert('You are not authorized to delete salaries.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this salary record?')) return;

    try {
      await deleteDoc(doc(db, 'salaries', id));
      setSalaries(salaries.filter((s) => s.id !== id));
      await logAction('DELETE_SALARY', `Deleted salary record #${id.substring(0, 6)}`);
    } catch (err) {
      console.error('Error deleting salary:', err);
    }
  };

  const totalPaid = salaries
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Salary Management</h3>
          <p className="text-sm text-gray-500 mt-1">Disburse, review, and track monthly employee compensation.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50/70 border border-green-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-green-800 font-bold text-sm uppercase tracking-wider mb-1">Total Salaries Paid</h3>
            <p className="text-4xl font-black text-green-700">৳{totalPaid.toLocaleString()}</p>
          </div>
          <p className="text-xs text-green-600 mt-4 font-semibold">
            {salaries.filter((s) => s.status === 'paid').length} transactions recorded
          </p>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between items-start">
          <div>
            <h3 className="text-blue-900 font-bold text-sm uppercase tracking-wider mb-1">Automated Salary Invoicing</h3>
            <p className="text-sm text-blue-700 mb-4">
              Instantly create pending payroll vouchers for all currently active staff members for this calendar month.
            </p>
          </div>
          <button
            onClick={handleGenerateMonthlySalaries}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm shadow-sm flex items-center gap-2"
          >
            <Calendar size={16} />
            <span>Generate for {new Date().toISOString().slice(0, 7)}</span>
          </button>
        </div>
      </div>

      {/* Record Salary Form */}
      {(isAdmin || hasPermission('salaries')) && (
        <form
          onSubmit={handleAddSalary}
          className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end shadow-sm"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Employee</label>
            <select
              required
              value={salaryForm.employeeId}
              onChange={(e) => {
                const emp = employees.find((emp) => emp.id === e.target.value);
                setSalaryForm({
                  ...salaryForm,
                  employeeId: e.target.value,
                  amount: emp ? emp.baseSalary?.toString() || '' : '',
                });
              }}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
            >
              <option value="">-- Select Employee --</option>
              {employees
                .filter((e) => e.status === 'active')
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount (৳)</label>
            <input
              required
              type="number"
              min="0"
              value={salaryForm.amount}
              onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              placeholder="e.g. 25000"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Month</label>
            <input
              required
              type="month"
              value={salaryForm.month}
              onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={submittingSalary}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 h-[42px] flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span>{submittingSalary ? 'Recording...' : 'Record Salary'}</span>
          </button>
        </form>
      )}

      {/* Salary Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Employee</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Month</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {salaries.map((s) =>
                editingSalaryId === s.id ? (
                  <tr key={s.id} className="bg-orange-50/20">
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {s.paymentDate?.toDate ? s.paymentDate.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900">{s.employeeName}</td>
                    <td className="py-4 px-4">
                      <input
                        type="month"
                        value={editSalaryForm.month}
                        onChange={(e) => setEditSalaryForm({ ...editSalaryForm, month: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={editSalaryForm.amount}
                        onChange={(e) => setEditSalaryForm({ ...editSalaryForm, amount: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-28 text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={editSalaryForm.status}
                        onChange={(e) => setEditSalaryForm({ ...editSalaryForm, status: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <button
                          onClick={() => setEditingSalaryId(null)}
                          className="text-gray-500 font-bold text-xs hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditedSalary(s.id)}
                          className="bg-primary text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:opacity-90 shadow-sm"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {s.paymentDate?.toDate
                        ? s.paymentDate.toDate().toLocaleDateString()
                        : s.createdAt?.toDate
                        ? s.createdAt.toDate().toLocaleDateString()
                        : 'Recent'}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900 text-sm">{s.employeeName}</td>
                    <td className="py-4 px-4 text-gray-600 font-mono text-xs font-semibold">{s.month}</td>
                    <td className="py-4 px-4 font-bold text-green-600 text-sm">৳{Number(s.amount || 0).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1',
                          s.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        )}
                      >
                        <span
                          className={cn('w-1.5 h-1.5 rounded-full', s.status === 'paid' ? 'bg-green-500' : 'bg-orange-500')}
                        ></span>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <button
                          onClick={() => {
                            setEditingSalaryId(s.id);
                            setEditSalaryForm({
                              amount: s.amount?.toString() || '0',
                              month: s.month || '',
                              status: s.status || 'paid',
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit salary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSalary(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete salary"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {salaries.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No salary records found.
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

export default SalariesTab;
