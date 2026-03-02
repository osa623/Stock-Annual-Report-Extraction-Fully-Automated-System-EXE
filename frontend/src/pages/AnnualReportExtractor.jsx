import React, { useState, useCallback, useRef } from 'react';
import { pdfService } from '../services/api';
import {
    ArrowUpTrayIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';

// ── Tab Button ────────────────────────────────────────────────────────
const TabBtn = ({ active, label, count, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2
      ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
    >
        {label}
        {count > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                {count}
            </span>
        )}
    </button>
);

// ── Data Table ────────────────────────────────────────────────────────
const DataTable = ({ section }) => {
    if (!section || !section.rows || section.rows.length === 0) {
        return (
            <div className="text-center py-16 text-slate-400">
                <TableCellsIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No data found for this section</p>
            </div>
        );
    }

    const headers = section.headers || [];
    const notes = section.notes || '';
    const pageNumbers = section.page_numbers || [];

    return (
        <div className="space-y-3">
            {/* Meta info */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
                {section.title && (
                    <span className="font-semibold text-slate-600">{section.title}</span>
                )}
                {pageNumbers.length > 0 && (
                    <span>Pages: {pageNumbers.join(', ')}</span>
                )}
                {notes && <span className="italic">{notes}</span>}
                <span>{section.rows.length} rows</span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm max-h-[560px]">
                <table className="w-full text-sm" id="extraction-result-table">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    className={`px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap
                    ${i === 0 ? 'text-left' : 'text-right'}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {section.rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="hover:bg-indigo-50/50 transition-colors"
                            >
                                <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                                    {row.item}
                                </td>
                                {(row.values || []).map((val, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className={`px-4 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap
                      ${val !== null && val < 0 ? 'text-red-500' : ''}`}
                                    >
                                        {val !== null && val !== undefined
                                            ? typeof val === 'number'
                                                ? val.toLocaleString()
                                                : val
                                            : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

const AnnualReportExtractor = () => {
    // ── State ─────────────────────────────────────────────────────────
    const [file, setFile] = useState(null);
    const [pdfId, setPdfId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [exporting, setExporting] = useState(null); // format string or null
    const [error, setError] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [activeTab, setActiveTab] = useState('income_statement');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // ── Drag & Drop ───────────────────────────────────────────────────
    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            handleFileSelected(droppedFile);
        } else {
            setError('Please upload a PDF file.');
        }
    }, []);

    const onFileInput = (e) => {
        const selected = e.target.files?.[0];
        if (selected) handleFileSelected(selected);
    };

    // ── Upload ────────────────────────────────────────────────────────
    const handleFileSelected = async (selectedFile) => {
        setFile(selectedFile);
        setError(null);
        setExtractedData(null);
        setPdfId(null);
        setUploading(true);

        try {
            const result = await pdfService.uploadPDF(selectedFile);
            setPdfId(result.pdf_id);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Upload failed');
            setFile(null);
        } finally {
            setUploading(false);
        }
    };

    // ── Extract ───────────────────────────────────────────────────────
    const handleExtract = async () => {
        if (!pdfId) return;
        setExtracting(true);
        setError(null);
        setExtractedData(null);

        try {
            const result = await pdfService.extractPDF(pdfId);
            setExtractedData(result.data);

            // Auto-select first tab with data
            if (result.data.income_statement) setActiveTab('income_statement');
            else if (result.data.balance_sheet) setActiveTab('balance_sheet');
            else if (result.data.cash_flow) setActiveTab('cash_flow');
            else if (result.data.additional_sections?.length > 0) setActiveTab('additional_0');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Extraction failed');
        } finally {
            setExtracting(false);
        }
    };

    // ── Export ─────────────────────────────────────────────────────────
    const handleExport = async (format) => {
        if (!pdfId) return;
        setExporting(format);
        setError(null);

        try {
            await pdfService.exportData(pdfId, format);
        } catch (err) {
            setError(err.response?.data?.error || err.message || `Export (${format}) failed`);
        } finally {
            setExporting(null);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────
    const handleReset = () => {
        setFile(null);
        setPdfId(null);
        setExtractedData(null);
        setError(null);
        setExporting(null);
        setExtracting(false);
        setUploading(false);
        setActiveTab('income_statement');
    };

    // ── Tab data helper ───────────────────────────────────────────────
    const getActiveSection = () => {
        if (!extractedData) return null;
        if (activeTab === 'income_statement') return extractedData.income_statement;
        if (activeTab === 'balance_sheet') return extractedData.balance_sheet;
        if (activeTab === 'cash_flow') return extractedData.cash_flow;
        if (activeTab.startsWith('additional_')) {
            const idx = parseInt(activeTab.split('_')[1], 10);
            return extractedData.additional_sections?.[idx] || null;
        }
        return null;
    };

    const rowCount = (section) => section?.rows?.length || 0;

    // ── Export buttons config ─────────────────────────────────────────
    const exportFormats = [
        { format: 'json', label: 'JSON', color: 'bg-amber-500 hover:bg-amber-600' },
        { format: 'xlsx', label: 'Excel', color: 'bg-emerald-500 hover:bg-emerald-600' },
        { format: 'csv', label: 'CSV', color: 'bg-sky-500 hover:bg-sky-600' },
        { format: 'pdf', label: 'PDF', color: 'bg-red-500 hover:bg-red-600' },
        { format: 'docx', label: 'Word', color: 'bg-blue-600 hover:bg-blue-700' },
    ];


    // ══════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Annual Report Extractor
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Upload a PDF annual report and extract financial tables with Gemini 2.0 AI
                    </p>
                </div>
                {file && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                        Start Over
                    </button>
                )}
            </div>

            {/* ── Error Banner ───────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Something went wrong</p>
                        <p className="text-sm text-red-600 mt-0.5">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}


            {/* ══════════════════════════════════════════════════════════════
          PHASE 1: UPLOAD
          ═══════════════════════════════════════════════════════════ */}
            {!file && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16
            transition-all duration-300 text-center group
            ${dragActive
                            ? 'border-indigo-400 bg-indigo-50 scale-[1.02]'
                            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                        }`}
                >
                    {/* Animated gradient ring */}
                    <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500
            ${dragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
            bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 blur-xl`}
                    />

                    <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-b from-indigo-100 to-indigo-50 rounded-2xl flex items-center justify-center
              group-hover:scale-110 transition-transform duration-300">
                            <ArrowUpTrayIcon className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            {dragActive ? 'Drop your PDF here' : 'Upload Annual Report PDF'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Drag & drop your PDF file here, or click to browse
                        </p>
                        <span className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl
              shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
                            Select PDF from Computer
                        </span>
                        <p className="text-xs text-slate-400 mt-4">Supports PDF files up to 100 MB</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={onFileInput}
                        className="hidden"
                    />
                </div>
            )}


            {/* ══════════════════════════════════════════════════════════════
          PHASE 2: FILE UPLOADED — EXTRACT
          ═══════════════════════════════════════════════════════════ */}
            {file && !extractedData && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                    {/* File info */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                            <DocumentTextIcon className="w-7 h-7 text-indigo-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-slate-800 truncate">{file.name}</p>
                            <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {pdfId && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                <CheckCircleIcon className="w-4 h-4" />
                                Uploaded
                            </span>
                        )}
                        {uploading && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                Uploading...
                            </span>
                        )}
                    </div>

                    {/* Extraction options */}
                    {pdfId && !extracting && (
                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">
                                Extraction Options
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={handleExtract}
                                    className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700
                    text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl
                    hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 text-left"
                                >
                                    <DocumentTextIcon className="w-6 h-6 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Annual Report Extraction</p>
                                        <p className="text-xs text-indigo-200 mt-0.5">
                                            Income Statement, Balance Sheet, Cash Flow
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Extracting state */}
                    {extracting && (
                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex flex-col items-center py-8">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                                </div>
                                <p className="text-base font-semibold text-slate-700">Extracting Financial Data...</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Gemini 2.0 is analyzing your PDF. This may take 30–90 seconds.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* ══════════════════════════════════════════════════════════════
          PHASE 3: RESULTS — PREVIEW & EXPORT
          ═══════════════════════════════════════════════════════════ */}
            {extractedData && (
                <div className="space-y-5">

                    {/* Toolbar */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                        {/* Reprocess */}
                        <button
                            onClick={handleExtract}
                            disabled={extracting}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
                bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
                            Reprocess
                        </button>

                        <div className="w-px h-6 bg-slate-200" />

                        {/* Export buttons */}
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Export:</span>
                        {exportFormats.map(({ format, label, color }) => (
                            <button
                                key={format}
                                onClick={() => handleExport(format)}
                                disabled={!!exporting}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg
                  transition-colors shadow-sm disabled:opacity-50 ${color}`}
                            >
                                {exporting === format ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                )}
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* File info bar */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span className="font-medium">{file?.name}</span>
                        <span className="text-indigo-400">•</span>
                        <span className="text-indigo-500">
                            {rowCount(extractedData.income_statement) +
                                rowCount(extractedData.balance_sheet) +
                                rowCount(extractedData.cash_flow)} total rows extracted
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                        <TabBtn
                            active={activeTab === 'income_statement'}
                            label="Income Statement"
                            count={rowCount(extractedData.income_statement)}
                            onClick={() => setActiveTab('income_statement')}
                        />
                        <TabBtn
                            active={activeTab === 'balance_sheet'}
                            label="Balance Sheet"
                            count={rowCount(extractedData.balance_sheet)}
                            onClick={() => setActiveTab('balance_sheet')}
                        />
                        <TabBtn
                            active={activeTab === 'cash_flow'}
                            label="Cash Flow"
                            count={rowCount(extractedData.cash_flow)}
                            onClick={() => setActiveTab('cash_flow')}
                        />
                        {(extractedData.additional_sections || []).map((sec, idx) => (
                            <TabBtn
                                key={idx}
                                active={activeTab === `additional_${idx}`}
                                label={sec.title || `Additional ${idx + 1}`}
                                count={rowCount(sec)}
                                onClick={() => setActiveTab(`additional_${idx}`)}
                            />
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <DataTable section={getActiveSection()} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnualReportExtractor;
