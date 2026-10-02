import React, { useState, useEffect } from 'react';
import {
  Shield,
  Trash,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  UserX,
  UserCog,
} from 'lucide-react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/ui/sonner';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Destructive action confirmation dialog states
  const [userToModifyRole, setUserToModifyRole] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.list();
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load user registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenRoleDialog = (user) => {
    setUserToModifyRole(user);
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleToggle = async () => {
    if (!userToModifyRole) return;
    const newRole = userToModifyRole.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      setRoleUpdating(true);
      await usersApi.updateRole(userToModifyRole.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userToModifyRole.id ? { ...u, role: newRole } : u))
      );
      toast.success(`Role for ${userToModifyRole.name} updated to ${newRole}.`);
      setRoleDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setRoleUpdating(false);
      setUserToModifyRole(null);
    }
  };

  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await usersApi.delete(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      toast.success(`User account for ${userToDelete.name} has been removed.`);
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setDeleting(false);
      setUserToDelete(null);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            System User Management
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Restricted administrative controls. Manage operational access, promote/demote roles, and audit registered accounts.
          </p>
        </div>

        <SimpleTooltip content="Refresh registered user accounts list">
          <button
            onClick={() => {
              fetchUsers();
              toast.info('User registry refreshed.');
            }}
            className="btn-outline text-xs sm:text-sm py-2 px-3.5"
          >
            <RefreshCw size={15} />
            <span>Reload Users</span>
          </button>
        </SimpleTooltip>
      </div>

      {/* User Table Card */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)] flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <span>Loading user registry from MongoDB...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] bg-[var(--bg-surface)]">
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Registered On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {users.map((u) => {
                  const isAdm = u.role === 'ADMIN';
                  const isCurrentAdmin = u.id === currentAdmin?.id;

                  return (
                    <tr key={u.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                              isAdm ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-cyan-600 to-teal-700'
                            }`}
                          >
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <strong className="block text-[var(--text-main)] text-sm">{u.name}</strong>
                            {isCurrentAdmin && (
                              <span className="text-[11px] text-[var(--primary)] font-medium">Active Session</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[var(--text-muted)] text-sm">
                        {u.email}
                      </td>

                      <td className="py-3 px-4 text-[var(--text-muted)] text-sm">
                        {u.mobile_number || <span className="text-[var(--text-dim)]">--</span>}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`badge ${isAdm ? 'badge-admin' : 'badge-user'} text-[11px]`}>
                          {isAdm ? <Shield size={12} /> : <UserCheck size={12} />}
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[var(--text-dim)] text-xs">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-2">
                          <SimpleTooltip
                            content={
                              isCurrentAdmin
                                ? 'Cannot modify your own active admin account'
                                : isAdm
                                ? 'Demote operator to standard USER'
                                : 'Promote operator to system ADMIN'
                            }
                          >
                            <button
                              onClick={() => handleOpenRoleDialog(u)}
                              disabled={isCurrentAdmin}
                              className={`btn-outline text-xs py-1 px-3 ${isCurrentAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              <UserCog size={13} className="mr-1" />
                              {isAdm ? 'Demote to USER' : 'Promote to ADMIN'}
                            </button>
                          </SimpleTooltip>

                          <SimpleTooltip
                            content={
                              isCurrentAdmin
                                ? 'Cannot delete your own active account'
                                : 'Permanently remove user account'
                            }
                          >
                            <button
                              onClick={() => handleOpenDeleteDialog(u)}
                              disabled={isCurrentAdmin}
                              className={`btn-outline text-xs py-1 px-2.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10 ${
                                isCurrentAdmin ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <Trash size={14} />
                            </button>
                          </SimpleTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Modification Confirmation Dialog */}
      <ConfirmDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        title={
          userToModifyRole?.role === 'ADMIN'
            ? 'Demote User to USER?'
            : 'Promote User to ADMIN?'
        }
        description={
          userToModifyRole?.role === 'ADMIN'
            ? `Are you sure you want to demote "${userToModifyRole?.name}"? They will lose access to system user management and administrative incident controls.`
            : `Are you sure you want to promote "${userToModifyRole?.name}" to ADMIN? They will gain access to all administrative privileges including user management and incident deletion.`
        }
        confirmText={
          userToModifyRole?.role === 'ADMIN' ? 'Yes, Demote User' : 'Yes, Promote User'
        }
        cancelText="Cancel"
        variant="warning"
        loading={roleUpdating}
        onConfirm={handleConfirmRoleToggle}
      />

      {/* Account Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete User Account?"
        description={`Are you sure you want to permanently delete the account for "${userToDelete?.name}" (${userToDelete?.email})? This action cannot be undone.`}
        confirmText="Yes, Delete User"
        cancelText="Cancel"
        variant="destructive"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
