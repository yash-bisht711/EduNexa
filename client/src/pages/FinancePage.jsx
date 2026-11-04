import React from 'react';
import {
  Wallet, TrendingUp, CreditCard, ArrowUpRight, DollarSign,
  Download, Calendar, Users
} from 'lucide-react';
import { useLoad, Heading, money, Empty } from '../components/shared';

export default function FinancePage() {
  const { data: earningsData, loading } = useLoad('/instructor/earnings', {
    totalRevenue: 0,
    transactions: [],
    courses: []
  });
  const { data: monthlyData } = useLoad('/instructor/earnings/monthly', { monthly: [] });

  const total = earningsData.totalRevenue || 0;
  const transactions = earningsData.transactions || [];
  const monthly = monthlyData.monthly || [];

  // Compute max for chart scaling
  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1000);

  return (
    <>
      <Heading
        eyebrow="REVENUE & PAYOUTS"
        title="Instructor Earnings"
        sub="Track your course sales, recurring income, and payout history in test/production mode."
      />

      {/* KPI Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        <div className="panel p-6 bg-gradient-to-br from-[#6d5dfc] to-[#4c3be8] text-white">
          <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
            <span>Total Gross Revenue</span>
            <Wallet size={18} />
          </div>
          <div className="text-3xl font-black mt-3">{money(total)}</div>
          <div className="text-xs text-violet-100/80 mt-2 flex items-center gap-1">
            <TrendingUp size={14} /> 100% test mode verification
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Orders</span>
            <CreditCard size={18} className="text-[#6d5dfc]" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">{transactions.length}</div>
          <div className="text-xs text-slate-400 mt-2">Paid course enrollments</div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Average Order Value</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">
            {transactions.length ? money(Math.round(total / transactions.length)) : money(0)}
          </div>
          <div className="text-xs text-slate-400 mt-2">Across all active courses</div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Revenue Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Monthly revenue aggregation</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-violet-50 text-[#6d5dfc] rounded-xl">
            Last 12 Months
          </span>
        </div>

        {monthly.length > 0 ? (
          <div className="h-64 flex items-end gap-3 pt-6 px-2">
            {monthly.map((item, idx) => {
              const heightPct = Math.max(10, Math.round((item.revenue / maxRevenue) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {money(item.revenue)}
                  </div>
                  <div
                    className="w-full bg-slate-100 group-hover:bg-[#6d5dfc] rounded-t-xl transition-all duration-300 relative"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute inset-0 bg-[#6d5dfc] opacity-0 group-hover:opacity-100 rounded-t-xl transition"></div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                    {item.month}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <Calendar size={28} className="text-slate-300 mb-2" />
            No monthly earnings recorded yet. New sales will plot here automatically.
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="panel overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900">Recent Transactions</h3>
          <span className="text-xs text-slate-400">{transactions.length} total sales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Course</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-800">
                    <div>{t.student?.name || 'Student'}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.student?.email}</div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{t.course?.title || 'Course'}</td>
                  <td className="p-4 font-black text-slate-900">{money(t.amount)}</td>
                  <td className="p-4 text-slate-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent'}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    No payment transactions yet. When learners checkout via Razorpay, they will be listed here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
