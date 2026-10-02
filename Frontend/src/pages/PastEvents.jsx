import React, { useState, useEffect } from 'react';
import {
  Flame,
  CloudFog,
  Trash2,
  Video,
  FileVideo,
  Filter,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Film
} from 'lucide-react';
import { incidentsApi } from '../services/api';
import IncidentModal from '../components/IncidentModal';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function PastEvents() {
  const { isAdmin } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('ALL');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        sort: sortOrder,
      };

      if (incidentTypeFilter !== 'ALL') params.incident_type = incidentTypeFilter;
      if (sourceTypeFilter !== 'ALL') params.source_type = sourceTypeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await incidentsApi.list(params);
      setIncidents(res.data.incidents || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, incidentTypeFilter, sourceTypeFilter, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const handleResetFilters = () => {
    setIncidentTypeFilter('ALL');
    setSourceTypeFilter('ALL');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSortOrder('desc');
    setPage(1);
    toast.info('Search filters reset to default.');
  };

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
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div>
      {/* Title */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            Past Incidents Archive
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Historical record of AI-confirmed civic violations across live camera feeds and uploaded videos.
          </p>
        </div>

        <button onClick={fetchIncidents} className="btn-outline text-xs sm:text-sm py-2 px-3.5">
          <RefreshCw size={15} />
          <span>Reload Archive</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-5 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          {/* Row 1: Search & Type filters */}
          <div className="flex flex-wrap gap-3.5 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="text"
                placeholder="Search camera, filename, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={incidentTypeFilter}
                onChange={(e) => { setIncidentTypeFilter(e.target.value); setPage(1); }}
                className="text-xs sm:text-sm py-2 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              >
                <option value="ALL">All Incident Types</option>
                <option value="FIRE">Fire</option>
                <option value="SMOKE">Smoke</option>
                <option value="WASTE_BIN_OVERFLOW">Waste-Bin Overflow</option>
              </select>

              <select
                value={sourceTypeFilter}
                onChange={(e) => { setSourceTypeFilter(e.target.value); setPage(1); }}
                className="text-xs sm:text-sm py-2 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              >
                <option value="ALL">All Sources</option>
                <option value="LIVE_CAMERA">Live Camera Only</option>
                <option value="UPLOADED_VIDEO">Uploaded Video Only</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
                className="text-xs sm:text-sm py-2 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Pickers and Action Buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-between border-t border-[var(--border-subtle)] pt-3.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-[var(--text-dim)]">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              />
              <span className="text-xs text-[var(--text-dim)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)]"
              />
              <button type="submit" className="btn-primary text-xs py-1.5 px-3.5">
                Filter
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </form>
      </div>

      {/* Incidents List Grid */}
      {loading ? (
        <div className="text-center py-16 text-[var(--text-dim)]">
          <div className="pulse-dot pulse-cyan w-3.5 h-3.5 mb-3 mx-auto" />
          <p className="text-sm">Querying MongoDB archive...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="glass-panel text-center py-16 px-6 text-[var(--text-dim)]">
          <Film size={44} className="mx-auto mb-3 opacity-40" />
          <h4 className="text-lg font-bold text-[var(--text-main)]">No Incidents Matched</h4>
          <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto mb-6">
            There are no recorded incidents matching the selected filters. Try broadening your criteria.
          </p>
          <button onClick={handleResetFilters} className="btn-outline text-xs py-2 px-4">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {incidents.map((inc) => {
            const isLive = inc.source_type === 'LIVE_CAMERA';
            const isFire = inc.incident_type === 'FIRE';
            const isSmoke = inc.incident_type === 'SMOKE';

            return (
              <div
                key={inc._id}
                className="glass-panel p-5 flex flex-col justify-between border border-[var(--border-subtle)] hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => setSelectedIncident(inc)}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`badge ${isFire ? 'badge-fire' : isSmoke ? 'badge-smoke' : 'badge-waste'} text-[11px]`}>
                      {isFire && <Flame size={13} />}
                      {isSmoke && <CloudFog size={13} />}
                      {!isFire && !isSmoke && <Trash2 size={13} />}
                      {inc.incident_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge ${isLive ? 'badge-live' : 'badge-upload'} text-[10px]`}>
                      {isLive ? 'LIVE CAMERA' : 'UPLOADED VIDEO'}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-[var(--bg-primary)] mb-4 border border-[var(--border-subtle)] relative flex items-center justify-center">
                    {inc.snapshot_url ? (
                      <img src={inc.snapshot_url} alt="snap" className="w-full h-full object-cover" />
                    ) : (
                      <Film size={28} className="text-[var(--text-dim)]" />
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/75 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-400">
                      {Math.round((inc.confidence || 0) * 100)}% Conf
                    </div>
                  </div>

                  {/* Core Telemetry Display: Clearly distinguishes Live vs Upload */}
                  {isLive ? (
                    <div className="text-xs flex flex-col gap-1.5 text-[var(--text-dim)]">
                      <div>
                        <span>Camera: </span>
                        <strong className="text-[var(--text-main)]">{inc.camera_name || 'Webcam'}</strong>
                      </div>
                      <div>
                        <span>Detection Date & Time: </span>
                        <strong className="text-[var(--primary)]">
                          {formatDate(inc.incident_detected_at || inc.created_at)}
                        </strong>
                      </div>
                      <div>
                        <span>Duration: </span>
                        <strong className="text-[var(--text-main)]">{inc.duration_seconds || 5}s</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs flex flex-col gap-1.5 text-[var(--text-dim)]">
                      <div className="truncate">
                        <span>File: </span>
                        <strong className="text-[var(--text-main)]">{inc.original_filename}</strong>
                      </div>
                      <div>
                        <span>In-Video Position: </span>
                        <strong className="text-[var(--upload-color)]">
                          {formatOffset(inc.event_start_offset_seconds)} &rarr; {formatOffset(inc.event_end_offset_seconds)}
                        </strong>
                      </div>
                      <div>
                        <span>Uploaded At: </span>
                        <span className="text-[var(--text-muted)]">{formatDate(inc.uploaded_at || inc.created_at)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="border-t border-[var(--border-subtle)] pt-3.5 mt-4 flex justify-between items-center text-xs">
                  <span className="text-[var(--text-dim)]">
                    Status: <strong className="text-emerald-400">{inc.status || 'CONFIRMED'}</strong>
                  </span>
                  <button className="btn-outline text-xs py-1 px-3 flex items-center gap-1.5">
                    <Eye size={14} />
                    <span>Inspect Clip</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline py-2 px-3.5 text-xs sm:text-sm"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span className="text-xs sm:text-sm text-[var(--text-muted)]">
            Page <strong>{page}</strong> of <strong>{pages}</strong> ({total} incidents)
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-outline py-2 px-3.5 text-xs sm:text-sm"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onDeleted={(id) => {
            setIncidents((prev) => prev.filter((i) => i._id !== id));
            setTotal((t) => Math.max(0, t - 1));
          }}
        />
      )}
    </div>
  );
}
