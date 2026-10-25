import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2 } from 'lucide-react';
import { collection, query, limit, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';

export const SubAdminTab: React.FC = () => {
  const { isAdmin, hasPermission, logAction } = useAdmin();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSubAdminEmail, setNewSubAdminEmail] = useState('');
  const [newSubAdminPassword, setNewSubAdminPassword] = useState('');
  const [creatingSubAdmin, setCreatingSubAdmin] = useState(false);
  const [subAdminError, setSubAdminError] = useState<string | null>(null);
  const [subAdminSuccess, setSubAdminSuccess] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    phone: '',
    details: '',
    rules: '',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'users'), limit(500)));
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSubAdmin(true);
    setSubAdminError(null);
    setSubAdminSuccess(false);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newSubAdminEmail,
        newSubAdminPassword
      );
      const newUid = userCredential.user.uid;

      const newUserProfile: UserProfile = {
        uid: newUid,
        email: newSubAdminEmail,
        role: 'agent',
      };
      await setDoc(doc(db, 'users', newUid), newUserProfile);
      await signOut(secondaryAuth);

      setUsers([...users, newUserProfile]);
      setNewSubAdminEmail('');
      setNewSubAdminPassword('');
      setSubAdminSuccess(true);
      await logAction('create_subadmin', `Created sub-admin account ${newSubAdminEmail}`);
      setTimeout(() => setSubAdminSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error creating sub-admin:', err);
      setSubAdminError(err.message || 'Failed to create sub-admin account.');
    } finally {
      setCreatingSubAdmin(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
      setUsers(users.map((u) => (u.uid === userId ? { ...u, role: newRole as any } : u)));
      await logAction('role_change', `Changed role of ${userId} to ${newRole}`);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update user role.');
    }
  };

  const handleToggleActiveStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await setDoc(doc(db, 'users', userId), { isActive: newStatus }, { merge: true });
      setUsers(users.map((u) => (u.uid === userId ? { ...u, isActive: newStatus } : u)));
    } catch (err) {
      console.error('Error updating active status:', err);
      alert('Failed to update user status.');
    }
  };

  const startEditingUser = (u: UserProfile) => {
    setEditingUserId(u.uid);
    setEditUserForm({
      name: u.name || '',
      phone: u.phone || '',
      details: u.details || '',
      rules: u.rules || '',
    });
  };

  const saveEditedUser = async (uid: string) => {
    try {
      await setDoc(doc(db, 'users', uid), editUserForm, { merge: true });
      setUsers(users.map((u) => (u.uid === uid ? { ...u, ...editUserForm } : u)));
      setEditingUserId(null);
      await logAction('edit_user', `Updated user details for ${uid}`);
    } catch (err) {
      console.error('Error saving user details:', err);
      alert('Failed to save user details.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter((u) => u.uid !== uid));
      await logAction('delete_user', `Deleted user ${uid}`);
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const ruleOptions = [
    { id: 'messages', label: 'Support Messages' },
    { id: 'drivers', label: 'View Drivers' },
    { id: 'drivers.edit', label: 'Manage Drivers (Add/Edit/Delete)' },
    { id: 'driver-registration', label: 'Driver Registration' },
    { id: 'vehicle-types', label: 'Manage Vehicle Types' },
    { id: 'users', label: 'Sub Admin Management' },
    { id: 'locations', label: 'Manage Locations' },
    { id: 'upazila-stats', label: 'Upazila Stats' },
    { id: 'payments', label: 'View Payments' },
    { id: 'payments.manage', label: 'Manage Payments (Approve/Reject)' },
    { id: 'renewals', label: 'View Renewals' },
    { id: 'renewals.whatsapp', label: 'Manage WhatsApp Config' },
    { id: 'employees', label: 'Employees' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'leaves', label: 'Leave Requests' },
    { id: 'salaries', label: 'Salaries' },
    { id: 'employeeMonitor', label: 'Live Monitor' },
    { id: 'settings', label: 'Settings' },
    { id: 'logs', label: 'Activity Logs' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sub Admin Management</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage permissions and delegate admin duties.</p>
        </div>
      </div>

      {(isAdmin || hasPermission('users')) && (
        <div className="mb-6 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200/80">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <UserPlus size={16} /> Create Sub-Admin Account
          </h4>
          <form onSubmit={handleCreateSubAdmin} className="flex flex-col sm:flex-row gap-3">
            <input
              required
              type="email"
              placeholder="Email Address"
              value={newSubAdminEmail}
              onChange={(e) => setNewSubAdminEmail(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary text-xs flex-1"
            />
            <input
              required
              type="password"
              placeholder="Password (min 6 chars)"
              value={newSubAdminPassword}
              onChange={(e) => setNewSubAdminPassword(e.target.value)}
              minLength={6}
              className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary text-xs flex-1"
            />
            <button
              type="submit"
              disabled={creatingSubAdmin || !newSubAdminEmail || newSubAdminPassword.length < 6}
              className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap shadow-sm"
            >
              {creatingSubAdmin ? 'Creating...' : '+ Create Account'}
            </button>
          </form>
          {subAdminError && <p className="text-red-500 text-xs mt-2 font-medium">{subAdminError}</p>}
          {subAdminSuccess && (
            <p className="text-green-600 text-xs mt-2 font-medium">✓ Sub-Admin account created successfully!</p>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-4 font-bold text-gray-500 text-xs w-12">#</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">User Info</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Details & Rules</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Role</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u, index) => {
              const isEditing = editingUserId === u.uid;
              const isSuperAdmin = u.email?.toLowerCase() === 's.m.anonto5@gmail.com';

              return isEditing ? (
                <tr key={u.uid} className="bg-orange-50/20">
                  <td className="py-3 px-4 font-mono text-xs text-gray-400 align-top">{index + 1}</td>
                  <td className="py-3 px-4 align-top">
                    <div className="text-xs font-medium text-gray-900 mb-1">{u.email}</div>
                    <input
                      type="text"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      placeholder="Name"
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs w-full mb-1"
                    />
                    <input
                      type="text"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      placeholder="Phone"
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs w-full"
                    />
                  </td>
                  <td className="py-3 px-4 align-top">
                    <textarea
                      value={editUserForm.details}
                      onChange={(e) => setEditUserForm({ ...editUserForm, details: e.target.value })}
                      placeholder="User notes / details..."
                      rows={2}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs w-full resize-none mb-2"
                    />
                    <span className="text-[11px] font-bold text-gray-700 block mb-1">
                      Assigned Permissions:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                      {ruleOptions.map((rule) => {
                        const rulesArr = editUserForm.rules
                          .split(',')
                          .map((r) => r.trim())
                          .filter(Boolean);
                        const isChecked = rulesArr.includes(rule.id);
                        return (
                          <label key={rule.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newRules = [...rulesArr];
                                if (e.target.checked) {
                                  if (!newRules.includes(rule.id)) newRules.push(rule.id);
                                } else {
                                  newRules = newRules.filter((r) => r !== rule.id);
                                }
                                setEditUserForm({ ...editUserForm, rules: newRules.join(', ') });
                              }}
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <span className="truncate">{rule.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      disabled={isSuperAdmin}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold uppercase"
                    >
                      <option value="user">User</option>
                      <option value="agent">Sub-Admin</option>
                      <option value="employee">Employee</option>
                      {isSuperAdmin && <option value="admin">Admin</option>}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="text-gray-400 font-bold text-xs hover:text-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditedUser(u.uid)}
                        className="text-primary font-bold text-xs hover:opacity-80"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-xs">{u.name || 'No Name'}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                    {u.phone && <div className="text-[11px] text-gray-400">{u.phone}</div>}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    {u.rules && (
                      <div className="flex flex-wrap gap-1">
                        {u.rules.split(',').map((r) => (
                          <span
                            key={r}
                            className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium"
                          >
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {!u.rules && <span className="text-xs text-gray-400 italic">No custom rules</span>}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      disabled={isSuperAdmin}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase outline-none',
                        u.role === 'admin'
                          ? 'bg-red-50 text-red-600'
                          : u.role === 'employee'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-blue-50 text-blue-600',
                        isSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      )}
                    >
                      <option value="user">User</option>
                      <option value="agent">Sub-Admin</option>
                      <option value="employee">Employee</option>
                      {isSuperAdmin && <option value="admin">Admin</option>}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2.5 items-center">
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleToggleActiveStatus(u.uid, u.isActive ?? true)}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                            u.isActive ?? true
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {(u.isActive ?? true) ? 'Active' : 'Inactive'}
                        </button>
                      )}
                      <button
                        onClick={() => startEditingUser(u)}
                        className="text-gray-400 hover:text-primary p-1"
                        title="Edit User"
                      >
                        <Edit2 size={15} />
                      </button>
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u.uid)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete User"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default SubAdminTab;
