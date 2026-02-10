import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SectionLayout from '../components/ui/SectionLayout';
import Tabs from '../components/ui/Tabs';
import Dropzone from '../components/ui/Dropzone';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import SlideOver from '../components/ui/SlideOver';
import {
  getSectionByKey,
  getMockExtractedData,
  REPORT_SECTIONS,
  SECTION_CATEGORIES,
} from '../features/report-sections/sectionConfig';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { key: 'extract', label: 'Extract' },
  { key: 'view', label: 'View' },
];

const columns = [
  { key: 'id', label: '#' },
  { key: 'field', label: 'Field' },
  { key: 'value', label: 'Extracted Value', render: (val) => (
    <span className="line-clamp-2">{val}</span>
  )},
  { key: 'page', label: 'Page' },
];

const ReportSectionPage = () => {
  const { sectionKey } = useParams();
  const navigate = useNavigate();
  const section = getSectionByKey(sectionKey);

  const [activeTab, setActiveTab] = useState('extract');
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [extractedData, setExtractedData] = useState([]);
  const [pageFrom, setPageFrom] = useState('');
  const [pageTo, setPageTo] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedYear, setSelectedYear] = useState('2024');

  // Placeholder extraction handler
  const handleExtract = useCallback(() => {
    setStatus('processing');
    setTimeout(() => {
      setStatus('done');
      setExtractedData(getMockExtractedData(sectionKey));
    }, 2000);
  }, [sectionKey]);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sectionKey}-${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const header = 'ID,Field,Value,Page\n';
    const rows = extractedData.map(r => `${r.id},"${r.field}","${r.value}",${r.page}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sectionKey}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!section) {
    return (
      <SectionLayout title="Section Not Found">
        <EmptyState
          title="Report section not found"
          description="The section you're looking for doesn't exist. Please select one from the sidebar."
          icon={InboxIcon}
        />
      </SectionLayout>
    );
  }

  return (
    <SectionLayout
      title={section.title}
      description={section.description}
      actions={
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400"
          >
            {['2025', '2024', '2023', '2022', '2021'].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {section.category}
          </span>
        </div>
      }
    >
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {/* === EXTRACT TAB === */}
        {activeTab === 'extract' && (
          <div className="space-y-6">
            {/* Upload */}
            <Dropzone onFileSelect={setSelectedFile} />

            {/* Page range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">From Page (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={pageFrom}
                  onChange={(e) => setPageFrom(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">To Page (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={pageTo}
                  onChange={(e) => setPageTo(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            </div>

            {/* Action + Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Extraction Status:</span>
                <StatusBadge status={status} />
              </div>
              <button
                onClick={handleExtract}
                disabled={status === 'processing'}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'processing' ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Extract Section'
                )}
              </button>
            </div>

            {/* Results preview */}
            {status === 'done' && extractedData.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-5">
                <p className="text-sm font-medium text-white">
                  ✓ Extraction complete — {extractedData.length} items extracted.{' '}
                  <button
                    onClick={() => setActiveTab('view')}
                    className="underline hover:text-slate-300"
                  >
                    View results →
                  </button>
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-slate-100 border border-slate-300 rounded-2xl p-5">
                <p className="text-sm font-medium text-slate-900">
                  ✕ Extraction failed. Please check the PDF file and try again.
                </p>
              </div>
            )}
          </div>
        )}

        {/* === VIEW TAB === */}
        {activeTab === 'view' && (
          <div className="space-y-5">
            {extractedData.length > 0 ? (
              <>
                {/* Actions bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {extractedData.length} extracted items for <span className="font-medium text-slate-700">{selectedYear}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      Export JSON
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Table */}
                <DataTable
                  columns={columns}
                  data={extractedData}
                  onRowClick={(row) => { setSelectedRow(row); setDrawerOpen(true); }}
                />
              </>
            ) : (
              <EmptyState
                title="No extracted data"
                description="Switch to the Extract tab to process a PDF section first."
                icon={DocumentTextIcon}
                action={() => setActiveTab('extract')}
                actionLabel="Go to Extract"
              />
            )}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <SlideOver
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedRow(null); }}
        title="Extracted Item Detail"
      >
        {selectedRow && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Field</label>
              <p className="text-sm text-slate-900 font-medium">{selectedRow.field}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Page</label>
              <p className="text-sm text-slate-700">Page {selectedRow.page}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Extracted Value</label>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-200">
                {selectedRow.value}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Section</label>
              <p className="text-sm text-slate-700">{section.title}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Year</label>
              <p className="text-sm text-slate-700">{selectedYear}</p>
            </div>
          </div>
        )}
      </SlideOver>
    </SectionLayout>
  );
};

export default ReportSectionPage;
