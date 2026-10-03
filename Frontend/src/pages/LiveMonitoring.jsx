import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  VideoOff,
  Play,
  Square,
  Flame,
  CloudFog,
  Trash2,
  AlertTriangle,
  Camera,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import IncidentModal from '../components/IncidentModal';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function LiveMonitoring() {
  const { user, token } = useAuth();

  const [webcamActive, setWebcamActive] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [modelChoice, setModelChoice] = useState('both');
  const [cameraName, setCameraName] = useState('Civic Camera Station 1');
  const [saveIncidentsToDb, setSaveIncidentsToDb] = useState(true);

  // Real-time detection states
  const [currentDetections, setCurrentDetections] = useState([]);
  const [activeIncidentTypes, setActiveIncidentTypes] = useState([]);
  const [lastSavedIncident, setLastSavedIncident] = useState(null);
  const [viewIncident, setViewIncident] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const wsRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const saveIncidentsToDbRef = useRef(saveIncidentsToDb);

  useEffect(() => {
    saveIncidentsToDbRef.current = saveIncidentsToDb;
  }, [saveIncidentsToDb]);

  // Initialize and maintain WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      let wsBase = (import.meta.env.VITE_WS_URL || '').trim();
      if (!wsBase && import.meta.env.VITE_API_URL) {
        const apiUrl = import.meta.env.VITE_API_URL.trim();
        wsBase = apiUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
      }
      const wsUrl = wsBase
        ? `${wsBase.replace(/\/+$/, '')}/api/ws/monitoring?token=${encodeURIComponent(token || '')}`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/monitoring?token=${encodeURIComponent(token || '')}`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({
          action: 'configure',
          model_choice: modelChoice,
          camera_name: cameraName,
          save_to_db: saveIncidentsToDb
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DETECTION_UPDATE') {
            setCurrentDetections(data.detections || []);
            setActiveIncidentTypes(data.active_incidents || []);
            drawBoundingBoxes(data.detections || []);
          } else if (data.type === 'INCIDENT_SAVED') {
            const inc = data.incident;
            setLastSavedIncident(inc);
            if (soundEnabled) {
              playAlertSound();
            }
            const typeLabel = inc?.incident_type?.replace(/_/g, ' ') || 'Incident';
            const confPercent = Math.round((inc?.confidence || 0) * 100);
            toast.warning(`⚠️ ${typeLabel} detected (${confPercent}%)`, {
              description: `Recorded on ${cameraName}. Media proof saved to Cloudinary.`,
            });
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
      };
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token]);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'configure',
        model_choice: modelChoice,
        camera_name: cameraName,
        save_to_db: saveIncidentsToDb
      }));
    }
  }, [modelChoice, cameraName, saveIncidentsToDb]);

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext blocked or unavailable
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamActive(true);
      toast.success('Live camera stream initiated.');
    } catch (err) {
      console.error('Failed to open camera:', err);
      toast.error('Unable to access webcam. Please check browser permissions.');
    }
  };

  const stopWebcam = () => {
    stopDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    clearOverlay();
    toast.info('Camera stream stopped.');
  };

  const startDetection = () => {
    if (!webcamActive) return;
    setDetectionActive(true);
    toast.success('Live AI monitoring analysis started.');

    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);

    sendIntervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 200); // 5 FPS transmission to detector
  };

  const stopDetection = () => {
    if (detectionActive) {
      toast.info('AI detection paused.');
    }
    setDetectionActive(false);
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'flush' }));
      } catch (err) {
        console.error('Error sending flush action:', err);
      }
    }
    setCurrentDetections([]);
    clearOverlay();
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 360;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

    wsRef.current.send(JSON.stringify({
      action: 'frame',
      data: dataUrl,
      save_to_db: saveIncidentsToDbRef.current
    }));
  };

  const drawBoundingBoxes = (detections) => {
    if (!overlayRef.current || !videoRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const v = videoRef.current;

    canvas.width = v.clientWidth;
    canvas.height = v.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const isFire = det.type === 'FIRE';
      const isSmoke = det.type === 'SMOKE';
      const color = isFire ? '#ef4444' : isSmoke ? '#94a3b8' : '#10b981';

      if (det.bbox) {
        const [x1, y1, x2, y2] = det.bbox;
        const scaleX = canvas.width / (det.orig_w || 640);
        const scaleY = canvas.height / (det.orig_h || 360);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);

        ctx.fillStyle = color;
        ctx.fillRect(x1 * scaleX, (y1 * scaleY) - 22, 160, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(`${det.label || det.type} ${Math.round(det.confidence * 100)}%`, (x1 * scaleX) + 6, (y1 * scaleY) - 6);
      }
    });
  };

  const clearOverlay = () => {
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Operational Status */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            Live Camera Surveillance
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time optical stream analysis with automatic incident clip extraction.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-outline text-xs py-1.5 px-3"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Alert Audio On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => {
              const nextVal = !saveIncidentsToDb;
              setSaveIncidentsToDb(nextVal);
              saveIncidentsToDbRef.current = nextVal;
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  action: 'configure',
                  model_choice: modelChoice,
                  camera_name: cameraName,
                  save_to_db: nextVal
                }));
              }
              toast.info(
                nextVal
                  ? 'Incident Recording to DB: ON (hazard clips will be saved)'
                  : 'Incident Recording to DB: OFF (boxes marked on live video only)'
              );
            }}
            className={`btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 transition-all ${
              saveIncidentsToDb
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-sm'
                : 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-semibold'
            }`}
            title={saveIncidentsToDb ? 'Auto-saves detected hazard clips into MongoDB database' : 'Preview only: marks bounding box on live video without saving to DB'}
          >
            <Database size={15} />
            <span>{saveIncidentsToDb ? 'Save Incidents: ON' : 'Save Incidents: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Incident Notification Banner (Only shown when incident is saved) */}
      {lastSavedIncident && (
        <div className="bg-gradient-to-r from-red-500/15 to-cyan-500/15 border border-red-500 rounded-xl p-4 sm:p-5 flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500 shrink-0" />
            <div>
              <strong className="text-sm sm:text-base font-bold text-[var(--text-main)] block">
                {lastSavedIncident.incident_type === 'FIRE' ? 'Fire Detected & Clip Saved' : lastSavedIncident.incident_type === 'SMOKE' ? 'Smoke Detected & Clip Saved' : 'Waste Bin Overflow Detected & Clip Saved'}
              </strong>
              <p className="text-xs text-[var(--text-muted)]">
                Recorded with context window and uploaded to incident archive.
              </p>
            </div>
          </div>

          <button
            onClick={() => setViewIncident(lastSavedIncident)}
            className="btn-primary text-xs py-2 px-3.5"
          >
            Inspect Incident Clip
          </button>
        </div>
      )}

      {/* Main Grid: Live Video Feed & Operational HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Live Video Canvas */}
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
            {/* Live indicator tag */}
            {webcamActive && (
              <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md py-1.5 px-3.5 rounded-full text-xs font-bold border border-white/10 shadow-lg">
                <span className={`pulse-dot ${detectionActive ? (saveIncidentsToDb ? 'pulse-red' : 'pulse-green') : 'pulse-cyan'}`} />
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${webcamActive ? 'block' : 'hidden'}`}
            />

            <canvas
              ref={overlayRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            />

            <canvas ref={canvasRef} className="hidden" />

            {!webcamActive && (
              <div className="text-center text-[var(--text-dim)] p-8">
                <Camera size={48} className="mx-auto mb-3 opacity-40" />
                <h4 className="text-base font-semibold text-[var(--text-muted)]">Camera Offline</h4>
                <p className="text-xs mt-1 max-w-xs mx-auto">
                  Click "Start Camera" below to connect your camera stream and begin surveillance.
                </p>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between mt-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {!webcamActive ? (
                <button onClick={startWebcam} className="btn-primary text-xs sm:text-sm py-2 px-4">
                  <Video size={17} />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button onClick={stopWebcam} className="btn-outline text-xs sm:text-sm py-2 px-4 text-red-400 border-red-500/30">
                  <VideoOff size={17} />
                  <span>Stop Camera</span>
                </button>
              )}

              {webcamActive && (
                !detectionActive ? (
                  <button
                    onClick={startDetection}
                    className="btn-primary text-xs sm:text-sm py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600"
                  >
                    <Play size={17} />
                    <span>Start Detection</span>
                  </button>
                ) : (
                  <button onClick={stopDetection} className="btn-danger text-xs sm:text-sm py-2 px-4">
                    <Square size={17} />
                    <span>Stop Detection</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-dim)]">Camera Label:</span>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                className="text-xs py-1.5 px-3 w-44 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                placeholder="Station Name"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Model Selection & Context Buffer */}
        <div className="flex flex-col gap-4">
          {/* Target Model Selection */}
          <div className="glass-panel p-5">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--text-main)]">
              <Layers size={16} color="var(--primary)" />
              <span>Surveillance Targets</span>
            </h4>

            <div className="flex flex-col gap-2">
              {[
                { id: 'both', label: 'All Hazards (Recommended)', desc: 'Waste Overflow + Fire & Smoke' },
                { id: 'waste_bin', label: 'Waste Bin Overflow Only', desc: 'Sanitation violation scanning' },
                { id: 'fire_smoke', label: 'Fire & Smoke Only', desc: 'Flame and smoke hazard detection' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    modelChoice === opt.id
                      ? 'bg-[var(--bg-surface)] border-[var(--primary)]'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="model_choice"
                    value={opt.id}
                    checked={modelChoice === opt.id}
                    onChange={(e) => setModelChoice(e.target.value)}
                    className="accent-[var(--primary)]"
                  />
                  <div>
                    <strong className="text-xs font-semibold block text-[var(--text-main)]">{opt.label}</strong>
                    <span className="text-[11px] text-[var(--text-dim)]">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      {viewIncident && (
        <IncidentModal
          incident={viewIncident}
          onClose={() => setViewIncident(null)}
        />
      )}
    </div>
  );
}
