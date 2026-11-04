import React, { useState } from 'react';
import {
  Building2, Globe2, UsersRound, Plus, ShieldCheck, Mail, ArrowRight
} from 'lucide-react';
import { useLoad, Heading, Notice, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

export default function OrganizationsPage() {
  const toast = useToast();
  const { data, reload } = useLoad('/organizations', { organizations: [] });
  const organizations = data.organizations || [];

  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Create Org Form
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Add Member Form
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('learner');
  const [addingMember, setAddingMember] = useState(false);

  const selectOrg = async (org) => {
    setSelectedOrgId(org._id);
    setLoadingMembers(true);
    try {
      const res = await api.get(`/organizations/${org._id}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      toast.error('Failed to load organization members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setCreatingOrg(true);
    try {
      const res = await api.post('/organizations', {
        name: orgName,
        website: orgWebsite
      });
      toast.success(`Created organization "${res.data.organization.name}"`);
      setOrgName('');
      setOrgWebsite('');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create organization');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedOrgId) return;
    setAddingMember(true);
    try {
      await api.post(`/organizations/${selectedOrgId}/members`, {
        email: memberEmail,
        role: memberRole
      });
      toast.success('Member added to workspace');
      setMemberEmail('');
      // Reload members
      const res = await api.get(`/organizations/${selectedOrgId}/members`);
      setMembers(res.data.members || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add member');
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="ENTERPRISE & TEAMS"
        title="Organizations & Workspaces"
        sub="Manage cohort learning, team enrollments, and organizational workspaces."
      />

      <div className="grid xl:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Column: Create Org & List Orgs */}
        <div className="space-y-6">
          {/* Create Workspace Panel */}
          <div className="panel p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-[#6d5dfc] grid place-items-center mb-3">
              <Building2 size={20} />
            </div>
            <h3 className="font-extrabold text-base text-slate-800">Create Workspace</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              Launch a branded learning hub for your team, academy, or enterprise.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Organization Name
                <input
                  className="field mt-1 text-xs"
                  placeholder="e.g. NextGen Engineering Academy"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Website (optional)
                <input
                  type="url"
                  className="field mt-1 text-xs"
                  placeholder="https://example.com"
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={creatingOrg}
                className="btn-primary w-full py-2.5 text-xs flex justify-center items-center gap-2"
              >
                <Plus size={15} />
                {creatingOrg ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          </div>

          {/* Existing Organizations */}
          <div className="panel p-5">
            <h3 className="font-extrabold text-sm text-slate-800 mb-3">Your Workspaces</h3>
            <div className="space-y-2">
              {organizations.map((org) => {
                const isSelected = org._id === selectedOrgId;
                return (
                  <button
                    key={org._id}
                    onClick={() => selectOrg(org)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center gap-3 ${
                      isSelected
                        ? 'border-[#6d5dfc] bg-violet-50/70 text-[#6d5dfc]'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-[#6d5dfc] grid place-items-center shrink-0 shadow-sm">
                      <Globe2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{org.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {org.slug} • {org.membershipRole || 'member'}
                      </div>
                    </div>
                    <ArrowRight size={14} className={isSelected ? 'text-[#6d5dfc]' : 'text-slate-300'} />
                  </button>
                );
              })}

              {organizations.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">
                  No active workspaces found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Manage Selected Organization Members */}
        <div>
          {selectedOrgId ? (
            <div className="panel p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-[#6d5dfc] grid place-items-center">
                    <UsersRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Workspace Members</h3>
                    <p className="text-xs text-slate-400">Invite learners and assign team roles</p>
                  </div>
                </div>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleAddMember} className="grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
                <label className="block text-xs font-bold text-slate-700">
                  User Email
                  <input
                    type="email"
                    className="field mt-1 text-xs"
                    placeholder="account@edunexa.dev"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Role
                  <select
                    className="field mt-1 text-xs"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                  >
                    <option value="learner">Learner</option>
                    <option value="instructor">Instructor</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={addingMember}
                  className="btn-primary py-2.5 px-5 text-xs shrink-0"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </form>

              {/* Members List */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Workspace Roster ({members.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <div key={m._id} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-[#6d5dfc] font-black grid place-items-center text-[10px]">
                          {m.user?.name ? m.user.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{m.user?.name || 'Member'}</div>
                          <div className="text-[10px] text-slate-400">{m.user?.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 text-slate-700">
                        {m.role}
                      </span>
                    </div>
                  ))}
                  {members.length === 0 && !loadingMembers && (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No members enrolled in this workspace yet. Add a registered user above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-12 text-center">
              <div className="w-14 h-14 bg-violet-50 text-[#6d5dfc] rounded-2xl grid place-items-center mx-auto mb-4">
                <Building2 size={26} />
              </div>
              <h3 className="font-extrabold text-base text-slate-800">Select or Create a Workspace</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Choose an organization from the left panel to configure member roles, instructors, and learners.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
