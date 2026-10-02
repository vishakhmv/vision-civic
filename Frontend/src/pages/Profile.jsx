import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Phone,
  Shield,
  Clock,
  Key,
  Save,
  Pencil,
  X,
  UserCheck
} from 'lucide-react';
import { authApi } from '../services/api';
import { toast } from '../components/ui/sonner';

export default function Profile() {
  const { user, isAdmin, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Control visibility of edit section
  const [isEditing, setIsEditing] = useState(false);

  const [editName, setEditName] = useState(user?.name || '');
  const [editMobile, setEditMobile] = useState(user?.mobile_number || '');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const openEditor = () => {
    setEditName(user?.name || '');
    setEditMobile(user?.mobile_number || '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (editMobile && !/^\+?[0-9\s-]{7,15}$/.test(editMobile)) {
      toast.warning('Please enter a valid mobile number (7-15 digits).');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: editName.trim(),
        mobile_number: editMobile.trim(),
      });
      toast.success('Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match. Please re-enter.');
      return;
    }

    try {
      setChangingPassword(true);
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Profile & Account
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Personal credentials, access authorization, and security settings.
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={openEditor}
              className="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm"
            >
              <Pencil size={15} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={closeEditor}
              className="btn-outline text-xs sm:text-sm py-2 px-3.5"
            >
              <X size={15} />
              <span>Cancel Editing</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Info Overview Card */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                isAdmin
                  ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                  : 'bg-gradient-to-br from-cyan-600 to-teal-700'
              }`}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">{user?.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-user'} text-[11px]`}>
                  {isAdmin ? 'SYSTEM ADMINISTRATOR' : 'AUTHORIZED OPERATOR'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium ml-1">
                  <UserCheck size={13} />
                  Active Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-3">
            <Mail size={18} color="var(--primary)" />
            <div>
              <span className="text-xs text-[var(--text-dim)] block">Email Address</span>
              <strong className="text-sm text-[var(--text-main)]">{user?.email}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone size={18} color="var(--primary)" />
            <div>
              <span className="text-xs text-[var(--text-dim)] block">Mobile Number</span>
              <strong className="text-sm text-[var(--text-main)]">
                {user?.mobile_number || 'Not provided'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield size={18} color="var(--primary)" />
            <div>
              <span className="text-xs text-[var(--text-dim)] block">Assigned Role</span>
              <strong className="text-sm text-[var(--text-main)]">{user?.role}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock size={18} color="var(--primary)" />
            <div>
              <span className="text-xs text-[var(--text-dim)] block">Member Since</span>
              <strong className="text-sm text-[var(--text-main)]">{formatDate(user?.created_at)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sections: Only visible after clicking "Edit Profile" */}
      {isEditing && (
        <div className="space-y-6 transition-all duration-200">
          {/* Edit Personal Details Form */}
          <div className="glass-panel p-6 sm:p-8 border-2 border-[var(--primary)]/30">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h4 className="text-base font-bold text-[var(--text-main)]">
                  Update Profile Information
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Modify your display name and contact mobile number.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full text-sm py-2.5 px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full text-sm py-2.5 px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    placeholder="e.g. +1 555-0199 or 9876543210"
                  />
                  <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
                    Used for verified civic communications and system notifications.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="btn-outline text-xs sm:text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs sm:text-sm py-2 px-5"
                >
                  <Save size={15} />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          {!user?.is_oauth && (
            <div className="glass-panel p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-subtle)]">
                <Key size={18} color="var(--primary)" />
                <div>
                  <h4 className="text-base font-bold text-[var(--text-main)]">Change Password</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Ensure your account is using a long, random password to stay secure.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="flex flex-col gap-4 mt-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full text-sm py-2.5 px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full text-sm py-2.5 px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full text-sm py-2.5 px-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="btn-outline text-xs sm:text-sm py-2 px-5"
                  >
                    <Key size={15} />
                    <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
