import React, { useState } from 'react';
import {
  UploadCloud,
  FileVideo,
  Image as ImageIcon,
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CloudFog,
  Trash2,
  ArrowRight,
  Film,
  Eye
} from 'lucide-react';
import { uploadsApi } from '../services/api';
import IncidentModal from '../components/IncidentModal';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function UploadVideo() {
  const [file, setFile] = useState(null);
  const [modelChoice, setModelChoice] = useState('both');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const [uploadedMeta, setUploadedMeta] = useState(null);
  const [detectedIncidents, setDetectedIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const validExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.jpg', '.jpeg', '.png', '.webp', '.bmp'];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const fileExt = '.' + selected.name.split('.').pop().toLowerCase();
      if (!validExts.includes(fileExt)) {
        toast.warning(`Unsupported format '${fileExt}'. Supported formats: MP4, AVI, MOV, MKV, JPG, PNG, WEBP.`);
        return;
      }
      setFile(selected);
      setUploadedMeta(null);
      setDetectedIncidents([]);
      setErrorMsg(null);
      toast.info(`Selected: ${selected.name} (${(selected.size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  };

  const formatOffset = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.warning('Please select a video or image file to upload.');
      setErrorMsg('Please select a video or image file to upload.');
      return;
    }

    const toastId = toast.loading('Uploading media footage...');

    try {
      setErrorMsg(null);
      setIsUploading(true);
      setStatusMessage('Uploading media footage...');

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await uploadsApi.uploadFile(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      const meta = uploadRes.data;
      setUploadedMeta(meta);
      setIsUploading(false);
      setUploadProgress(100);

      setIsAnalyzing(true);
      const isImg = meta.is_image;
      setStatusMessage(isImg ? 'Scanning Image: Running AI hazard detectors...' : 'Processing Video: Scanning video frames for civic hazards...');
      toast.loading(isImg ? 'Analyzing image with AI detectors...' : 'Analyzing video frames with AI detectors...', { id: toastId });

      const analyzeRes = await uploadsApi.analyze({
        file_id: meta.file_id,
        model_choice: modelChoice,
      });

      const incidents = analyzeRes.data.incidents || [];
      setDetectedIncidents(incidents);
      setIsAnalyzing(false);
      const count = analyzeRes.data.incidents_count || 0;
      setStatusMessage(`Analysis complete. Found ${count} incident(s).`);

      if (count > 0) {
        toast.success(`Analysis complete: ${count} civic incident(s) detected and saved to Cloudinary.`, { id: toastId });
      } else {
        toast.info('Analysis complete: No incidents detected in this media.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Media processing failed. Please verify file format.';
      setErrorMsg(msg);
      toast.error(msg, { id: toastId });
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
          Uploaded Media Analysis
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Upload recorded CCTV footage or image files to extract incident context clips with precise timestamps and proof snapshots.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-6 text-sm flex items-center gap-2.5">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Container */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Upload Zone */}
        <div className="glass-panel p-6 lg:col-span-3">
          <h4 className="text-base font-bold mb-4 text-[var(--text-main)]">
            1. Select Video or Image Media
          </h4>

          <div
            onClick={() => document.getElementById('mediaFileInput').click()}
            className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--primary)] rounded-xl p-8 sm:p-12 text-center bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all"
          >
            <input
              id="mediaFileInput"
              type="file"
              accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm,image/jpeg,image/png,image/webp,image/bmp"
              onChange={handleFileChange}
              className="hidden"
            />

            <UploadCloud size={48} color="var(--primary)" className="mx-auto mb-4 opacity-80" />

            {file ? (
              <div>
                <strong className="text-base text-[var(--text-main)] block mb-1">{file.name}</strong>
                <span className="text-xs text-[var(--text-dim)]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for upload
                </span>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm sm:text-base text-[var(--text-main)] mb-1">
                  Click or drag and drop video or image file here
                </p>
                <p className="text-xs text-[var(--text-dim)]">
                  Supports MP4, AVI, MOV, MKV, JPG, PNG, WEBP
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {(isUploading || isAnalyzing) && (
            <div className="mt-5">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-[var(--text-muted)]">{statusMessage}</span>
                <span className="text-[var(--primary)] font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-cyan-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Model Selection and Action */}
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold mb-4 flex items-center gap-2 text-[var(--text-main)]">
              <Layers size={18} color="var(--primary)" />
              <span>2. Target Hazards</span>
            </h4>

            <div className="flex flex-col gap-2.5">
              {[
                { id: 'both', title: 'All Hazards (Recommended)', desc: 'Waste Overflow + Fire & Smoke' },
                { id: 'waste_bin', title: 'Waste Bin Overflow Only', desc: 'Sanitation violation scanning' },
                { id: 'fire_smoke', title: 'Fire & Smoke Only', desc: 'Flame and smoke hazard detection' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    modelChoice === opt.id
                      ? 'bg-[var(--bg-surface)] border-[var(--primary)]'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="analysis_model"
                    value={opt.id}
                    checked={modelChoice === opt.id}
                    onChange={(e) => setModelChoice(e.target.value)}
                    className="accent-[var(--primary)]"
                  />
                  <div>
                    <strong className="text-xs sm:text-sm text-[var(--text-main)] block">{opt.title}</strong>
                    <span className="text-[11px] text-[var(--text-dim)]">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleUploadAndAnalyze}
            disabled={!file || isUploading || isAnalyzing}
            className="btn-primary w-full justify-center mt-6 py-3 rounded-lg font-semibold text-sm flex items-center gap-2"
          >
            <span>{isUploading ? 'Uploading Media...' : isAnalyzing ? 'Processing Media...' : 'Upload & Start Analysis'}</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      {/* Analysis Results Section */}
      {statusMessage && !isUploading && !isAnalyzing && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[var(--text-main)]">Analysis Findings</h4>
              <span className="text-xs text-[var(--text-dim)]">
                Extracted incident details and proof media
              </span>
            </div>
            <span className="badge badge-upload">
              {detectedIncidents.length} Incident(s) Detected
            </span>
          </div>

          {detectedIncidents.length === 0 ? (
            <div className="text-center py-12 px-4 text-[var(--text-dim)]">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
              <h5 className="text-base font-semibold text-[var(--text-main)]">No Violations Found</h5>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                The media file was scanned completely. No waste overflows, fire outbreaks, or smoke clouds were detected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {detectedIncidents.map((inc) => {
                const isFire = inc.incident_type === 'FIRE';
                const isSmoke = inc.incident_type === 'SMOKE';
                const isImage = inc.source_type === 'UPLOADED_IMAGE';

                return (
                  <div
                    key={inc._id}
                    className="glass-panel p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:-translate-y-1 transition-transform"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`badge ${isFire ? 'badge-fire' : isSmoke ? 'badge-smoke' : 'badge-waste'} text-[11px]`}>
                        {isFire && <Flame size={13} />}
                        {isSmoke && <CloudFog size={13} />}
                        {!isFire && !isSmoke && <Trash2 size={13} />}
                        {inc.incident_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-emerald-500">
                        {Math.round((inc.confidence || 0) * 100)}%
                      </span>
                    </div>

                    <div className="w-full h-40 rounded-lg overflow-hidden bg-black mb-3 border border-[var(--border-subtle)] flex items-center justify-center relative">
                      {inc.snapshot_url ? (
                        <img src={inc.snapshot_url} alt="Incident preview" className="w-full h-full object-cover" />
                      ) : (
                        <Film size={24} className="text-[var(--text-dim)]" />
                      )}
                      <span className={`absolute top-2 right-2 badge ${isImage ? 'badge-upload' : 'badge-live'} text-[9px]`}>
                        {isImage ? 'IMAGE FILE' : 'VIDEO CLIP'}
                      </span>
                    </div>

                    {!isImage ? (
                      <div className="text-xs text-[var(--text-dim)] flex flex-col gap-1.5 mb-4">
                        <div className="flex justify-between">
                          <span>In-Video Position:</span>
                          <strong className="text-amber-400">
                            {formatOffset(inc.event_start_offset_seconds)} &rarr; {formatOffset(inc.event_end_offset_seconds)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Event Duration:</span>
                          <strong className="text-[var(--text-main)]">{inc.event_duration_seconds}s</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Extracted Clip:</span>
                          <strong className="text-[var(--text-main)]">
                            {formatOffset(inc.clip_start_offset_seconds)} &rarr; {formatOffset(inc.clip_end_offset_seconds)}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-dim)] flex flex-col gap-1.5 mb-4">
                        <div className="flex justify-between">
                          <span>Media Format:</span>
                          <strong className="text-[var(--text-main)] uppercase">{inc.original_filename?.split('.').pop()} Image</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>File Size:</span>
                          <strong className="text-[var(--text-main)]">{((inc.file_size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB</strong>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedIncident(inc)}
                      className="btn-outline w-full justify-center text-xs py-2"
                    >
                      {isImage ? <Eye size={14} /> : <Play size={14} />}
                      <span>{isImage ? 'Inspect Image Proof' : 'Inspect Extracted Clip'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedIncident && (
        <IncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}
