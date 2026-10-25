import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Download } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, addDoc, setDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import jsPDF from 'jspdf';

export const PaymentsTab: React.FC = () => {
  const { isAdmin, hasPermission, vehicleTypes, profile, user, logAction } = useAdmin();

  const [payments, setPayments] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    driverId: '',
    amount: '',
    durationDays: '30',
    transactionId: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    durationDays: '',
    createdAt: 0,
  });

  const fetchPaymentsAndDrivers = async () => {
    try {
      setLoading(true);
      const [paySnap, dSnap] = await Promise.all([
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'drivers'), limit(300))),
      ]);
      setPayments(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDrivers(dSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsAndDrivers();
  }, []);

  // Auto calculate amount when driver or duration changes
  useEffect(() => {
    if (paymentForm.driverId && paymentForm.durationDays) {
      const driver = drivers.find((d) => d.id === paymentForm.driverId);
      if (driver) {
        const vType = vehicleTypes.find((v) => v.name === driver.vehicleType);
        if (vType && vType.monthlyFee) {
          const duration = parseInt(paymentForm.durationDays) || 0;
          const calculatedAmount = Math.round((vType.monthlyFee / 30) * duration);
          setPaymentForm((prev) => ({ ...prev, amount: calculatedAmount.toString() }));
        }
      }
    }
  }, [paymentForm.driverId, paymentForm.durationDays, drivers, vehicleTypes]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.driverId || !paymentForm.amount) return;
    setSubmittingPayment(true);
    try {
      const driver = drivers.find((d) => d.id === paymentForm.driverId);
      if (!driver) return;
      const duration = parseInt(paymentForm.durationDays);

      const paymentRef = await addDoc(collection(db, 'payments'), {
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        amount: parseFloat(paymentForm.amount),
        durationDays: duration,
        transactionId: paymentForm.transactionId || null,
        status: 'approved',
        createdAt: serverTimestamp(),
      });

      let currentExpiry = driver.expiryDate?.toDate ? driver.expiryDate.toDate() : new Date();
      if (!driver.isActive || currentExpiry < new Date()) {
        currentExpiry = new Date();
      }
      const newExpiry = new Date(currentExpiry.getTime() + 1000 * 60 * 60 * 24 * duration);

      await setDoc(
        doc(db, 'drivers', driver.id),
        {
          isActive: true,
          expiryDate: newExpiry,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setPayments([
        {
          id: paymentRef.id,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          amount: parseFloat(paymentForm.amount),
          durationDays: duration,
          transactionId: paymentForm.transactionId || undefined,
          status: 'approved',
          createdAt: new Date(),
        },
        ...payments,
      ]);

      setPaymentForm({ driverId: '', amount: '', durationDays: '30', transactionId: '' });
      await logAction('add_payment', `Recorded ৳${paymentForm.amount} for ${driver.name}`);
      alert('Payment recorded successfully!');
    } catch (err) {
      console.error('Error adding payment:', err);
      alert('Failed to record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleApprovePayment = async (payment: any) => {
    try {
      const approverName = profile?.name || user?.email || 'Admin';

      await setDoc(
        doc(db, 'payments', payment.id),
        {
          status: 'approved',
          approvedByUid: profile?.uid || user?.uid || null,
          approvedByName: approverName,
        },
        { merge: true }
      );

      const driverRef = doc(db, 'drivers', payment.driverId);
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
        const driverData = driverSnap.data();
        let currentExpiry = driverData.expiryDate?.toDate ? driverData.expiryDate.toDate() : new Date();
        if (!driverData.isActive || currentExpiry < new Date()) {
          currentExpiry = new Date();
        }

        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + (payment.durationDays || 30));

        await setDoc(
          driverRef,
          {
            expiryDate: newExpiry,
            isActive: true,
          },
          { merge: true }
        );
      }

      setPayments(
        payments.map((p) =>
          p.id === payment.id ? { ...p, status: 'approved', approvedByName: approverName } : p
        )
      );
      await logAction('approve_payment', `Approved ৳${payment.amount} for ${payment.driverName}`);
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (payment: any) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    try {
      const rejecterName = profile?.name || user?.email || 'Admin';
      await setDoc(
        doc(db, 'payments', payment.id),
        {
          status: 'rejected',
          rejectedByUid: profile?.uid || user?.uid || null,
          rejectedByName: rejecterName,
        },
        { merge: true }
      );
      setPayments(
        payments.map((p) =>
          p.id === payment.id ? { ...p, status: 'rejected', rejectedByName: rejecterName } : p
        )
      );
      await logAction('reject_payment', `Rejected ৳${payment.amount} for ${payment.driverName}`);
    } catch (err) {
      console.error('Error rejecting payment:', err);
    }
  };

  const startEditingPayment = (p: any) => {
    setEditingPaymentId(p.id);
    setEditPaymentForm({
      amount: p.amount?.toString() || '',
      durationDays: p.durationDays?.toString() || '',
      createdAt: p.createdAt?.toDate
        ? p.createdAt.toDate().getTime()
        : new Date(p.createdAt).getTime(),
    });
  };

  const cancelEditingPayment = () => {
    setEditingPaymentId(null);
  };

  const saveEditedPayment = async (id: string) => {
    try {
      const amount = parseFloat(editPaymentForm.amount);
      const durationDays = parseInt(editPaymentForm.durationDays);
      const newDate = new Date(editPaymentForm.createdAt);

      await setDoc(
        doc(db, 'payments', id),
        {
          amount,
          durationDays,
          createdAt: newDate,
        },
        { merge: true }
      );

      setPayments(
        payments.map((p) =>
          p.id === id ? { ...p, amount, durationDays, createdAt: newDate } : p
        )
      );
      setEditingPaymentId(null);
    } catch (err) {
      console.error('Error updating payment:', err);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
      setPayments(payments.filter((p) => p.id !== id));
      await logAction('delete_payment', `Deleted payment record ${id}`);
    } catch (err) {
      console.error('Error deleting payment:', err);
    }
  };

  const generateReceiptDownload = (payment: any) => {
    const pdf = new jsPDF();
    pdf.setFillColor(249, 115, 22);
    pdf.rect(0, 0, 210, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('JOTPOT', 20, 23);
    pdf.setFontSize(11);
    pdf.text('MONEY RECEIPT', 150, 23);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.text(`Receipt ID: ${payment.id.substring(0, 8).toUpperCase()}`, 20, 50);
    pdf.text(
      `Date: ${
        payment.createdAt?.toDate
          ? payment.createdAt.toDate().toLocaleDateString()
          : new Date(payment.createdAt).toLocaleDateString()
      }`,
      150,
      50
    );

    pdf.setDrawColor(220, 220, 220);
    pdf.line(20, 55, 190, 55);

    pdf.setFontSize(11);
    pdf.text('Driver Information:', 20, 70);
    pdf.setFontSize(10);
    pdf.text(`Name: ${payment.driverName}`, 25, 80);
    pdf.text(`Phone: ${payment.driverPhone}`, 25, 88);

    pdf.setFontSize(11);
    pdf.text('Payment Details:', 20, 105);

    pdf.setFillColor(245, 245, 245);
    pdf.rect(20, 110, 170, 35, 'F');

    pdf.setFontSize(10);
    pdf.text('Description', 25, 120);
    pdf.text('Amount', 155, 120);
    pdf.line(20, 124, 190, 124);

    pdf.text(`Subscription (${payment.durationDays} days)`, 25, 134);
    pdf.text(`৳ ${payment.amount}`, 155, 134);

    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text('Thank you for choosing JotPot.', 105, 180, { align: 'center' });
    if (payment.approvedByName) {
      pdf.text(`Approved by: ${payment.approvedByName}`, 105, 188, { align: 'center' });
    }

    pdf.save(`Receipt_${payment.driverPhone}_${Date.now()}.pdf`);
  };

  const filteredPayments = payments.filter((p) => {
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
    if (paymentStartDate || paymentEndDate) {
      const pDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      if (paymentStartDate && pDate < new Date(paymentStartDate)) return false;
      if (paymentEndDate) {
        const endDate = new Date(paymentEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (pDate > endDate) return false;
      }
    }
    const q = paymentSearchQuery.toLowerCase();
    return (
      !q ||
      p.driverName?.toLowerCase().includes(q) ||
      p.driverPhone?.includes(q) ||
      p.transactionId?.toLowerCase().includes(q)
    );
  });

  const totalApproved = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="p-4 md:p-8">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Subscription Payments</h3>
          <p className="text-xs text-gray-500 mt-0.5">Track, approve, and record driver payments.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date range */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <span className="font-bold text-gray-400">From:</span>
            <input
              type="date"
              value={paymentStartDate}
              onChange={(e) => setPaymentStartDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700"
            />
            <span className="font-bold text-gray-400 ml-1">To:</span>
            <input
              type="date"
              value={paymentEndDate}
              onChange={(e) => setPaymentEndDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700"
            />
            {(paymentStartDate || paymentEndDate) && (
              <button
                onClick={() => {
                  setPaymentStartDate('');
                  setPaymentEndDate('');
                }}
                className="ml-1 text-[11px] text-red-500 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setPaymentStatusFilter(status)}
                className={cn(
                  'px-3 py-1 rounded-lg capitalize transition-all',
                  paymentStatusFilter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search driver, phone..."
              value={paymentSearchQuery}
              onChange={(e) => setPaymentSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Transactions</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{filteredPayments.length}</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Approved Revenue</p>
          <p className="text-2xl font-black text-green-900 mt-1">৳{totalApproved.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Pending Approvals</p>
          <p className="text-2xl font-black text-orange-900 mt-1">
            {payments.filter((p) => p.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Add Payment Form */}
      <form
        onSubmit={handleAddPayment}
        className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200/80 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Driver</label>
          <select
            required
            value={paymentForm.driverId}
            onChange={(e) => setPaymentForm({ ...paymentForm, driverId: e.target.value })}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Choose Driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount (BDT)</label>
          <input
            required
            type="number"
            min="0"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            placeholder="500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</label>
          <select
            required
            value={paymentForm.durationDays}
            onChange={(e) => setPaymentForm({ ...paymentForm, durationDays: e.target.value })}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="30">1 Month (30 days)</option>
            <option value="90">3 Months (90 days)</option>
            <option value="180">6 Months (180 days)</option>
            <option value="365">1 Year (365 days)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Transaction ID</label>
          <input
            type="text"
            value={paymentForm.transactionId}
            onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            placeholder="Optional Trx ID"
          />
        </div>

        <button
          type="submit"
          disabled={submittingPayment}
          className="bg-primary text-white py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 h-[38px] shadow-sm"
        >
          {submittingPayment ? 'Recording...' : '+ Record Payment'}
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-4 font-bold text-gray-500 text-xs w-12">#</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Date</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Driver</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Amount</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Duration</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Trx ID</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Status</th>
              {(isAdmin || hasPermission('payments.manage')) && (
                <th className="py-3 px-4 font-bold text-gray-500 text-xs text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPayments.map((p, index) => {
              const isEditing = editingPaymentId === p.id;

              return isEditing ? (
                <tr key={p.id} className="bg-orange-50/20">
                  <td className="py-3 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      value={
                        editPaymentForm.createdAt
                          ? new Date(editPaymentForm.createdAt).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setEditPaymentForm({
                          ...editPaymentForm,
                          createdAt: new Date(e.target.value).getTime(),
                        })
                      }
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="py-3 px-4 font-bold text-xs">{p.driverName}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={editPaymentForm.amount}
                      onChange={(e) =>
                        setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })
                      }
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-20"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={editPaymentForm.durationDays}
                      onChange={(e) =>
                        setEditPaymentForm({ ...editPaymentForm, durationDays: e.target.value })
                      }
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">365 days</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{p.transactionId || '-'}</td>
                  <td className="py-3 px-4 font-bold text-xs">{p.status}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditingPayment}
                        className="text-gray-400 font-bold text-xs hover:text-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditedPayment(p.id)}
                        className="text-primary font-bold text-xs hover:opacity-80"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {p.createdAt?.toDate
                      ? p.createdAt.toDate().toLocaleDateString()
                      : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-xs">{p.driverName}</div>
                    <div className="text-[11px] text-gray-400">{p.driverPhone}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-green-600 text-xs">৳{p.amount}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{p.durationDays} days</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-400">{p.transactionId || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold inline-block capitalize',
                        p.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {p.status || 'pending'}
                    </span>
                  </td>
                  {(isAdmin || hasPermission('payments.manage')) && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2.5 items-center">
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprovePayment(p)}
                              className="text-green-600 hover:text-green-700 font-bold text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(p)}
                              className="text-red-500 hover:text-red-600 font-bold text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === 'approved' && (
                          <button
                            onClick={() => generateReceiptDownload(p)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Receipt PDF"
                          >
                            <Download size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => startEditingPayment(p)}
                          className="text-gray-400 hover:text-primary"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400 text-xs font-semibold">
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default PaymentsTab;
