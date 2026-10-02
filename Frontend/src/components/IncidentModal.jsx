import React, { useState } from 'react';
import {
  X,
  Flame,
  CloudFog,
  Trash2,
  Video,
  FileVideo,
  Camera,
  Trash
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { incidentsApi } from '../services/api';
import { toast } from './ui/sonner';
import { ConfirmDialog } from './ui/confirm-dialog';

export default function IncidentModal({ incident, onClose, onDeleted }) {
  const { isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('video'); // 'video' or 'snapshot'
  const [errorMsg, setErrorMsg] = useState(null);

  if (!incident) return null;

  const isLive = incident.source_type === 'LIVE_CAMERA';
  const isFire = incident.incident_type === 'FIRE';
  const isSmoke = incident.incident_type === 'SMOKE';
  const isWaste = incident.incident_type === 'WASTE_BIN_OVERFLOW';

  const formatOffset = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return isoStr;
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await incidentsApi.delete(incident._id);
      toast.success('Incident record and Cloudinary assets removed successfully.');
      if (onDeleted) onDeleted(incident._id);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete incident.';
      setErrorMsg(msg);
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden bg-[var(--modal-bg)] border border-[var(--border-subtle)] shadow-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--modal-header-bg)]">
          <div className="flex items-center gap-3">
            <span className={`badge ${isFire ? 'badge-fire' : isSmoke ? 'badge-smoke' : 'badge-waste'} text-xs py-1 px-3`}>
              {isFire && <Flame size={15} />}
              {isSmoke && <CloudFog size={15} />}
              {isWaste && <Trash2 size={15} />}
              {incident.incident_type.replace(/_/g, ' ')}
            </span>
            <span className={`badge ${isLive ? 'badge-live' : 'badge-upload'} text-xs`}>
              {isLive ? <Video size={13} /> : <FileVideo size={13} />}
              {incident.source_type.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-4 text-xs sm:text-sm">
              {errorMsg}
            </div>
          )}

          {/* Media Player Container */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] overflow-hidden mb-6">
            {/* View Switcher Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <button
                onClick={() => setActiveTab('video')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'video'
                    ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--bg-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Incident Video Clip
              </button>
              <button
                onClick={() => setActiveTab('snapshot')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'snapshot'
                    ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--bg-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Keyframe Snapshot
              </button>
            </div>

            <div className="min-h-[300px] flex items-center justify-center bg-black">
              {activeTab === 'video' ? (
                incident.video_url ? (
                  <video
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full max-h-[420px] object-contain"
                    src={incident.video_url}
                  />
                ) : (
                  <div className="text-[var(--text-dim)] text-center p-8">
                    <Video size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No video clip available for this incident</p>
                  </div>
                )
              ) : (
                incident.snapshot_url ? (
                  <img
                    src={incident.snapshot_url}
                    alt="Incident Snapshot"
                    className="w-full max-h-[420px] object-contain"
                  />
                ) : (
                  <div className="text-[var(--text-dim)] text-center p-8">
                    <Camera size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No snapshot available</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Incident Source Specific Metadata Comparison */}
          {isLive ? (
            /* CASE 1: LIVE CAMERA */
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-2 mb-3.5">
                <Video size={18} className="text-cyan-400" />
                <h4 className="text-cyan-400 text-sm font-bold">
                  Live Camera Telemetry (Real-World Time)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Camera Source</span>
                  <strong className="text-sm text-[var(--text-main)]">{incident.camera_name || 'Webcam'}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Calendar Detection Time</span>
                  <strong className="text-sm text-[var(--text-main)]">{formatDate(incident.incident_detected_at)}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Incident Duration</span>
                  <strong className="text-sm text-[var(--text-main)]">{incident.duration_seconds ? `${incident.duration_seconds}s` : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Pre / Post Context</span>
                  <strong className="text-sm text-[var(--text-main)]">
                    -{incident.pre_event_seconds || 5}s / +{incident.post_event_seconds || 5}s
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">AI Confidence</span>
                  <strong className="text-sm text-emerald-400">{Math.round((incident.confidence || 0) * 100)}%</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Detection Model</span>
                  <strong className="text-sm text-[var(--text-main)]">{incident.model_type}</strong>
                </div>
              </div>
            </div>
          ) : (
            /* CASE 2: UPLOADED VIDEO */
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-2 mb-3.5">
                <FileVideo size={18} className="text-sky-400" />
                <h4 className="text-sky-400 text-sm font-bold">
                  Uploaded Video Offset & Analysis (In-File Position)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Original Filename</span>
                  <strong className="text-sm text-[var(--text-main)] truncate block">{incident.original_filename || 'video.mp4'}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Upload Date & Time</span>
                  <strong className="text-sm text-[var(--text-main)]">{formatDate(incident.uploaded_at)}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Event Position Inside Video</span>
                  <strong className="text-sm text-amber-400">
                    {formatOffset(incident.event_start_offset_seconds)} &rarr; {formatOffset(incident.event_end_offset_seconds)}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Event Duration</span>
                  <strong className="text-sm text-[var(--text-main)]">{incident.event_duration_seconds ? `${incident.event_duration_seconds}s` : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Clip Context Window</span>
                  <strong className="text-sm text-[var(--text-main)]">
                    {formatOffset(incident.clip_start_offset_seconds)} &rarr; {formatOffset(incident.clip_end_offset_seconds)}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Original Video Length</span>
                  <strong className="text-sm text-[var(--text-main)]">{incident.video_duration_seconds ? `${incident.video_duration_seconds}s` : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">Video Recording Metadata</span>
                  <strong className="text-sm text-[var(--text-main)]">
                    {incident.video_recorded_at ? formatDate(incident.video_recorded_at) : 'Not embedded in file'}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-dim)] block mb-0.5">AI Confidence</span>
                  <strong className="text-sm text-emerald-400">{Math.round((incident.confidence || 0) * 100)}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Cloud Storage IDs */}
          <div className="bg-[var(--bg-surface)] rounded-lg p-3.5 border border-[var(--border-subtle)] text-xs text-[var(--text-dim)] flex flex-wrap gap-4 justify-between">
            <div>
              <span>Cloudinary Video Asset: </span>
              <code className="text-[var(--text-main)] font-mono">{incident.video_public_id || 'None'}</code>
            </div>
            <div>
              <span>Cloudinary Snapshot: </span>
              <code className="text-[var(--text-main)] font-mono">{incident.snapshot_public_id || 'None'}</code>
            </div>
            <div>
              <span>MongoDB Document: </span>
              <code className="text-[var(--text-main)] font-mono">{incident._id}</code>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--modal-footer-bg)]">
          {isAdmin ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
              className="btn-danger text-xs sm:text-sm py-2 px-4"
            >
              <Trash size={15} />
              <span>{isDeleting ? 'Deleting Asset...' : 'Delete Incident (Admin)'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-primary text-xs sm:text-sm py-2 px-4"
            >
              Close
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showConfirmDelete}
          onOpenChange={setShowConfirmDelete}
          title="Delete Incident Record?"
          description="This action will permanently delete this incident, including the Cloudinary video proof clip and snapshot image. This cannot be undone."
          confirmText="Yes, Delete Incident"
          cancelText="Cancel"
          variant="destructive"
          loading={isDeleting}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
