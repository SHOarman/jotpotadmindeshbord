import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Edit2, Trash2, UserPlus, Phone, Mail, DollarSign, Shield } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';

export const EmployeesTab: React.FC = () => {
  const { isAdmin, hasPermission, logAction } = useAdmin();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    baseSalary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    baseSalary: '',
    status: 'active',
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'employees'), orderBy('createdAt', 'desc')));
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const baseSalary = parseFloat(employeeForm.baseSalary) || 0;
      const docRef = await addDoc(collection(db, 'employees'), {
        ...employeeForm,
        baseSalary,
        status: 'active',
        joinDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setEmployees([
        {
          id: docRef.id,
          ...employeeForm,
          baseSalary,
          status: 'active',
          joinDate: new Date(),
          createdAt: new Date(),
        },
        ...employees,
      ]);

      await logAction('ADD_EMPLOYEE', `Added employee ${employeeForm.name} (${employeeForm.role})`);
      setEmployeeForm({ name: '', phone: '', email: '', role: '', baseSalary: '' });
    } catch (err) {
      console.error('Error adding employee:', err);
      alert('Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEditedEmployee = async (id: string) => {
    try {
      const baseSalary = parseFloat(editEmployeeForm.baseSalary) || 0;
      await setDoc(
        doc(db, 'employees', id),
        {
          ...editEmployeeForm,
          baseSalary,
        },
        { merge: true }
      );

      setEmployees(employees.map((e) => (e.id === id ? { ...e, ...editEmployeeForm, baseSalary } : e)));
      await logAction('UPDATE_EMPLOYEE', `Updated employee ${editEmployeeForm.name}`);
      setEditingEmployeeId(null);
    } catch (err) {
      console.error('Error updating employee:', err);
      alert('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!isAdmin && !hasPermission('employees')) {
      alert('You are not authorized to delete employees.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete employee "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'employees', id));
      setEmployees(employees.filter((e) => e.id !== id));
      await logAction('DELETE_EMPLOYEE', `Deleted employee ${name}`);
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('Failed to delete employee');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Employee Management</h3>
          <p className="text-sm text-gray-500 mt-1">Manage staff records, assigned roles, and base salary structures.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <span>Total Staff: {employees.length}</span>
        </div>
      </div>

      {/* Add Employee Form */}
      {(isAdmin || hasPermission('employees')) && (
        <form
          onSubmit={handleAddEmployee}
          className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end shadow-sm"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
            <input
              required
              type="text"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="e.g. Rafiqul Islam"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone</label>
            <input
              required
              type="tel"
              value={employeeForm.phone}
              onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="017XXXXXXXX"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email (Login)</label>
            <input
              required
              type="email"
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="staff@jotpot.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Role</label>
            <input
              required
              type="text"
              value={employeeForm.role}
              onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="e.g. Field Manager"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Base Salary (৳)</label>
            <input
              required
              type="number"
              min="0"
              value={employeeForm.baseSalary}
              onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
              placeholder="25000"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 h-[42px] flex items-center justify-center gap-2 shadow-sm"
          >
            <UserPlus size={18} />
            <span>{submitting ? 'Adding...' : 'Add Employee'}</span>
          </button>
        </form>
      )}

      {/* Employee Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Contact</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Role</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Base Salary</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-4 font-bold text-gray-600 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) =>
                editingEmployeeId === emp.id ? (
                  <tr key={emp.id} className="bg-orange-50/20">
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={editEmployeeForm.name}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, name: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-full text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        placeholder="Phone"
                        value={editEmployeeForm.phone}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, phone: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-full text-sm mb-1"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editEmployeeForm.email || ''}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, email: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-full text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={editEmployeeForm.role}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, role: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-full text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        value={editEmployeeForm.baseSalary}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, baseSalary: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary w-28 text-sm"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={editEmployeeForm.status}
                        onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, status: e.target.value })}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <button
                          onClick={() => setEditingEmployeeId(null)}
                          className="text-gray-500 font-bold text-xs hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditedEmployee(emp.id)}
                          className="bg-primary text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:opacity-90 shadow-sm"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900">{emp.name}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        <span>{emp.phone}</span>
                      </div>
                      {emp.email && (
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <Mail size={13} className="text-gray-400" />
                          <span>{emp.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-green-600 text-sm">৳{Number(emp.baseSalary || 0).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1',
                          emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", emp.status === 'active' ? "bg-green-500" : "bg-red-500")}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        <button
                          onClick={() => {
                            setEditingEmployeeId(emp.id);
                            setEditEmployeeForm({
                              name: emp.name,
                              phone: emp.phone,
                              email: emp.email || '',
                              role: emp.role,
                              baseSalary: emp.baseSalary?.toString() || '0',
                              status: emp.status || 'active',
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit employee"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {employees.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No employees found. Add your first employee using the form above.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    Loading employees...
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

export default EmployeesTab;
