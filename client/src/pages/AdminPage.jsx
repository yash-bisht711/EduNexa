import React, { useState } from 'react';
import {
  Shield, Users, BookOpen, CreditCard, CheckCircle2,
  XCircle, Trash2, Search, SlidersHorizontal, ArrowUpRight
} from 'lucide-react';
import { useLoad, Heading, money, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('overview');

  const { data: overview, reload: reloadOverview } = useLoad('/admin/overview', {
    users: 0,
    courses: 0,
    enrollments: 0,
    paidPayments: 0
  });

  const { data: usersData, reload: reloadUsers } = useLoad('/admin/users', { users: [] });
  const { data: coursesData, reload: reloadCourses } = useLoad('/admin/courses', { courses: [] });
  const { data: paymentsData } = useLoad('/admin/payments', { payments: [] });

  const users = usersData.users || [];
  const courses = coursesData.courses || [];
  const payments = paymentsData.payments || [];

  const [userSearch, setUserSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      reloadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User removed');
      reloadUsers();
      reloadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete user');
    }
  };

  const handleTogglePublish = async (courseId, currentStatus) => {
    try {
      await api.patch(`/admin/courses/${courseId}/publish`, { published: !currentStatus });
      toast.success(`Course ${!currentStatus ? 'published' : 'unpublished'}`);
      reloadCourses();
      reloadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredCourses = courses.filter(c =>
    c.title?.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.category?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <>
      <Heading
        eyebrow="SUPERADMIN PORTAL"
        title="Platform Administration"
        sub="Control users, course visibility, content moderation, and financial transactions."
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {[
          ['overview', 'Platform Overview'],
          ['users', `Users (${users.length})`],
          ['courses', `Courses (${courses.length})`],
          ['payments', `Payments (${payments.length})`]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-3 px-4 text-xs font-extrabold transition border-b-2 -mb-px ${
              tab === key
                ? 'border-[#6d5dfc] text-[#6d5dfc]'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-5">
            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Total Users</span>
                <Users size={16} className="text-[#6d5dfc]" />
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{overview.users}</div>
              <div className="text-xs text-slate-400 mt-1">Learners & instructors</div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Active Courses</span>
                <BookOpen size={16} className="text-[#6d5dfc]" />
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{overview.courses}</div>
              <div className="text-xs text-slate-400 mt-1">In directory</div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Total Enrollments</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{overview.enrollments}</div>
              <div className="text-xs text-slate-400 mt-1">Course sign-ups</div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Paid Orders</span>
                <CreditCard size={16} className="text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">{overview.paidPayments}</div>
              <div className="text-xs text-slate-400 mt-1">Verified checkout</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {tab === 'users' && (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="field pl-9 text-xs"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <select
                        className="field py-1 px-2 text-xs font-semibold rounded-lg"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u._id, u.name)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COURSES */}
      {tab === 'courses' && (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="field pl-9 text-xs"
                placeholder="Search course title..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Course</th>
                  <th className="p-4">Instructor</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{c.title}</div>
                      <div className="text-[10px] text-slate-400">{c.category} • {c.lessons?.length || 0} lessons</div>
                    </td>
                    <td className="p-4 text-slate-600">{c.instructor?.name || 'EduNexa'}</td>
                    <td className="p-4 font-bold text-slate-900">{c.price ? money(c.price) : 'Free'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        c.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleTogglePublish(c._id, c.published)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                          c.published
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {c.published ? 'Unpublish' : 'Publish'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS */}
      {tab === 'payments' && (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-extrabold text-sm">Platform Financial Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="p-4 font-medium">{p.student?.name}</td>
                    <td className="p-4 text-slate-600">{p.course?.title}</td>
                    <td className="p-4 font-bold">{money(p.amount)}</td>
                    <td className="p-4 font-mono text-[10px] text-slate-400">{p.providerOrderId}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No payments on file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
