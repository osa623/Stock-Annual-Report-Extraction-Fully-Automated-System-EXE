import React, { useState, useCallback, useRef, useEffect } from 'react';
import { pdfService } from '../services/api';
import { REPORT_SECTIONS, SECTION_CATEGORIES } from '../features/report-sections/sectionConfig';
import {
    ArrowUpTrayIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    TableCellsIcon,
    CalendarDaysIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';


/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

// ── Statement Table (for financial data display) ─────────────────────
const StatementTable = ({ section }) => {
    if (!section || !section.rows || section.rows.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <TableCellsIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No data found for this section</p>
            </div>
        );
    }

    const headers = section.headers || [];

    return (
        <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
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
                        <tr key={rowIdx} className="hover:bg-indigo-50/50 transition-colors">
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
    );
};


// ── Progress Stepper ─────────────────────────────────────────────────
const ProgressStepper = ({ currentStep, totalSteps, message }) => {
    const steps = [
        { step: 1, label: 'Validating PDF' },
        { step: 2, label: 'Uploading document' },
        { step: 3, label: 'Processing structure' },
        { step: 4, label: 'Extracting Income Statement' },
        { step: 5, label: 'Extracting Balance Sheet' },
        { step: 6, label: 'Extracting Cash Flow' },
        { step: 7, label: 'Combining results' },
        { step: 8, label: 'Finalizing' },
    ];

    const pct = totalSteps > 0 ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
            {/* Header with spinner */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative w-12 h-12 shrink-0">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Extracting Financial Data</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{message || 'Initializing...'}</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-8">
                <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Step list */}
            <div className="space-y-4">
                {steps.map((s, idx) => {
                    const isComplete = currentStep > s.step;
                    const isActive = currentStep === s.step;

                    return (
                        <div key={s.step} className="flex items-center gap-3">
                            {/* Connector line (not on first) */}
                            {idx > 0 && (
                                <div className="absolute ml-[13px] -mt-8 w-0.5 h-4"
                                    style={{ background: currentStep > s.step ? '#4f46e5' : '#e2e8f0' }}
                                />
                            )}

                            {/* Step icon */}
                            {isComplete ? (
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                    <CheckCircleIcon className="w-4.5 h-4.5 text-green-600" />
                                </div>
                            ) : isActive ? (
                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                                </div>
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                </div>
                            )}

                            {/* Label */}
                            <span className={`text-sm ${isComplete
                                    ? 'text-green-700 font-medium'
                                    : isActive
                                        ? 'text-indigo-700 font-semibold'
                                        : 'text-slate-400'
                                }`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-slate-400 mt-6 text-center">
                This may take 30–90 seconds depending on the PDF size.
            </p>
        </div>
    );
};


// ── Option Card ──────────────────────────────────────────────────────
const OptionCard = ({ title, description, icon: Icon, status, onClick, disabled }) => (
    <div
        onClick={disabled ? undefined : onClick}
        className={`group bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300
            ${disabled
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:shadow-lg hover:border-slate-300 cursor-pointer'
            }`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                {Icon && <Icon className="w-5 h-5 text-slate-900" />}
            </div>
            {status && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full
                    ${status === 'Active'
                        ? 'text-green-700 bg-green-50 border border-green-200'
                        : 'text-slate-400 bg-slate-100'
                    }`}>
                    {status}
                </span>
            )}
        </div>

        <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-black transition-colors">
            {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>

        <div className="mt-5 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700
                ${disabled ? 'bg-slate-200 w-0' : 'bg-slate-900 w-1/4 group-hover:w-1/2'}`}
            />
        </div>
    </div>
);


/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const Home = () => {
    // ── State ─────────────────────────────────────────────────────────
    const [phase, setPhase] = useState('upload');       // upload | options | extracting | results
    const [file, setFile] = useState(null);
    const [pdfId, setPdfId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);

    // Progress
    const [progressStep, setProgressStep] = useState(0);
    const [progressTotal, setProgressTotal] = useState(8);
    const [progressMessage, setProgressMessage] = useState('');

    // Results
    const [extractedData, setExtractedData] = useState(null);
    const [exporting, setExporting] = useState(null);

    const fileInputRef = useRef(null);
    const eventSourceRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    // ── Cleanup SSE on unmount ────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // ── Drag & Drop ──────────────────────────────────────────────────
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

    // ── Upload ───────────────────────────────────────────────────────
    const handleFileSelected = async (selectedFile) => {
        setFile(selectedFile);
        setError(null);
        setExtractedData(null);
        setPdfId(null);
        setUploading(true);
        setSelectedOption(null);

        try {
            const result = await pdfService.uploadPDF(selectedFile);
            setPdfId(result.pdf_id);
            setPhase('options');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Upload failed');
            setFile(null);
        } finally {
            setUploading(false);
        }
    };

    // ── Start Extraction ─────────────────────────────────────────────
    const handleSelectOption = async (option) => {
        if (option.status !== 'Active') return;
        if (!pdfId) return;

        setSelectedOption(option);
        setPhase('extracting');
        setError(null);
        setExtractedData(null);
        setProgressStep(0);
        setProgressMessage('Starting extraction...');

        // 1. Connect to SSE progress stream first
        const eventSource = pdfService.createProgressStream(pdfId, (data) => {
            if (data.step >= 0) {
                setProgressStep(data.step);
                setProgressTotal(data.total || 6);
                setProgressMessage(data.message);
            }
        });
        eventSourceRef.current = eventSource;

        // Small delay to ensure SSE channel is ready
        await new Promise(resolve => setTimeout(resolve, 150));

        // 2. Fire POST extraction
        try {
            const result = await pdfService.extractPDF(pdfId);
            setExtractedData(result.data);
            setPhase('results');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Extraction failed');
            setPhase('options');
        } finally {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        }
    };

    // ── Export ────────────────────────────────────────────────────────
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

    // ── Reset ────────────────────────────────────────────────────────
    const handleReset = () => {
        setFile(null);
        setPdfId(null);
        setExtractedData(null);
        setError(null);
        setExporting(null);
        setSelectedOption(null);
        setPhase('upload');
        setProgressStep(0);
        setProgressMessage('');
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────
    const rowCount = (section) => section?.rows?.length || 0;

    const exportFormats = [
        { format: 'json', label: 'JSON', color: 'bg-amber-500 hover:bg-amber-600' },
        { format: 'xlsx', label: 'Excel', color: 'bg-emerald-500 hover:bg-emerald-600' },
        { format: 'csv', label: 'CSV', color: 'bg-sky-500 hover:bg-sky-600' },
        { format: 'pdf', label: 'PDF', color: 'bg-red-500 hover:bg-red-600' },
        { format: 'docx', label: 'Word', color: 'bg-blue-600 hover:bg-blue-700' },
    ];

    // Build extraction option cards
    const allOptions = [
        {
            id: 'annual-report',
            title: 'Annual Report Extraction',
            description: 'Extract Income Statement, Balance Sheet, and Cash Flow Statement tables.',
            icon: DocumentArrowDownIcon,
            status: 'Active',
            category: 'Financial Statement Extraction',
        },
        {
            id: 'quarterly-report',
            title: 'Quarterly PDF Extractor',
            description: 'Extract quarterly financial statements from interim reports.',
            icon: CalendarDaysIcon,
            status: 'Coming Soon',
            category: 'Financial Statement Extraction',
        },
        ...REPORT_SECTIONS.map((sec) => ({
            id: sec.key,
            title: sec.title,
            description: sec.description,
            icon: DocumentTextIcon,
            status: 'Coming Soon',
            category: sec.category,
        })),
    ];

    const categories = [...new Set(allOptions.map(o => o.category))];


    // ═════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {phase === 'upload' && 'Welcome back'}
                        {phase === 'options' && 'Select Extraction Type'}
                        {phase === 'extracting' && 'Extraction in Progress'}
                        {phase === 'results' && 'Extraction Results'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {phase === 'upload' && 'Upload an annual report PDF to get started.'}
                        {phase === 'options' && 'Choose which data to extract from your PDF.'}
                        {phase === 'extracting' && `Processing ${file?.name}...`}
                        {phase === 'results' && 'Preview your extracted data and export in any format.'}
                    </p>
                </div>

                {phase !== 'upload' && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                        Start Over
                    </button>
                )}
            </div>

            {/* ── Error Banner ────────────────────────────────────────── */}
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


            {/* ═══════════════════════════════════════════════════════════
                PHASE 1: UPLOAD
            ═══════════════════════════════════════════════════════════ */}
            {phase === 'upload' && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-16
                        transition-all duration-300 text-center group
                        ${uploading ? 'pointer-events-none opacity-70' : ''}
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
                        {uploading ? (
                            <>
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Uploading PDF...</h3>
                                <p className="text-sm text-slate-500">{file?.name} ({(file?.size / 1024 / 1024).toFixed(2)} MB)</p>
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
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


            {/* ═══════════════════════════════════════════════════════════
                PHASE 2: EXTRACTION OPTIONS
            ═══════════════════════════════════════════════════════════ */}
            {phase === 'options' && (
                <div className="space-y-8">
                    {/* File info bar */}
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-indigo-50 rounded-xl">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                            <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-indigo-800 truncate">{file?.name}</p>
                            <p className="text-xs text-indigo-500">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                            <CheckCircleIcon className="w-4 h-4" />
                            Uploaded
                        </span>
                    </div>

                    {/* Option cards grouped by category */}
                    {categories.map((cat) => {
                        const categoryOptions = allOptions.filter(o => o.category === cat);
                        return (
                            <div key={cat}>
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{cat}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                                    {categoryOptions.map((opt) => (
                                        <OptionCard
                                            key={opt.id}
                                            title={opt.title}
                                            description={opt.description}
                                            icon={opt.icon}
                                            status={opt.status}
                                            disabled={opt.status !== 'Active'}
                                            onClick={() => handleSelectOption(opt)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* ═══════════════════════════════════════════════════════════
                PHASE 3: EXTRACTING (with progress)
            ═══════════════════════════════════════════════════════════ */}
            {phase === 'extracting' && (
                <div className="max-w-2xl mx-auto">
                    {/* File context */}
                    <div className="flex items-center gap-3 px-4 py-2 mb-6 bg-slate-50 rounded-xl text-sm text-slate-600">
                        <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium truncate">{file?.name}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">{selectedOption?.title}</span>
                    </div>

                    <ProgressStepper
                        currentStep={progressStep}
                        totalSteps={progressTotal}
                        message={progressMessage}
                    />
                </div>
            )}


            {/* ═══════════════════════════════════════════════════════════
                PHASE 4: RESULTS — SEPARATE STATEMENT TABLES
            ═══════════════════════════════════════════════════════════ */}
            {phase === 'results' && extractedData && (
                <div className="space-y-6">

                    {/* ── Toolbar ──────────────────────────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                        {/* Reprocess */}
                        <button
                            onClick={() => selectedOption && handleSelectOption(selectedOption)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
                                bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
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

                    {/* ── Summary bar ──────────────────────────────────── */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span className="font-medium">{file?.name}</span>
                        <span className="text-indigo-400">|</span>
                        <span className="text-indigo-500">
                            {rowCount(extractedData.income_statement) +
                                rowCount(extractedData.balance_sheet) +
                                rowCount(extractedData.cash_flow)} total rows extracted
                        </span>
                    </div>

                    {/* ── Income Statement ─────────────────────────────── */}
                    {extractedData.income_statement && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Income Statement</h2>
                                    {extractedData.income_statement.title && (
                                        <p className="text-xs text-slate-500 mt-0.5">{extractedData.income_statement.title}</p>
                                    )}
                                    {extractedData.income_statement.notes && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{extractedData.income_statement.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {extractedData.income_statement.page_numbers?.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                            Pages: {extractedData.income_statement.page_numbers.join(', ')}
                                        </span>
                                    )}
                                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {rowCount(extractedData.income_statement)} rows
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 max-h-[560px] overflow-auto">
                                <StatementTable section={extractedData.income_statement} />
                            </div>
                        </div>
                    )}

                    {/* ── Balance Sheet ────────────────────────────────── */}
                    {extractedData.balance_sheet && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Statement of Financial Position</h2>
                                    {extractedData.balance_sheet.title && (
                                        <p className="text-xs text-slate-500 mt-0.5">{extractedData.balance_sheet.title}</p>
                                    )}
                                    {extractedData.balance_sheet.notes && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{extractedData.balance_sheet.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {extractedData.balance_sheet.page_numbers?.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                            Pages: {extractedData.balance_sheet.page_numbers.join(', ')}
                                        </span>
                                    )}
                                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {rowCount(extractedData.balance_sheet)} rows
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 max-h-[560px] overflow-auto">
                                <StatementTable section={extractedData.balance_sheet} />
                            </div>
                        </div>
                    )}

                    {/* ── Cash Flow Statement ─────────────────────────── */}
                    {extractedData.cash_flow && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Cash Flow Statement</h2>
                                    {extractedData.cash_flow.title && (
                                        <p className="text-xs text-slate-500 mt-0.5">{extractedData.cash_flow.title}</p>
                                    )}
                                    {extractedData.cash_flow.notes && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{extractedData.cash_flow.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {extractedData.cash_flow.page_numbers?.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                            Pages: {extractedData.cash_flow.page_numbers.join(', ')}
                                        </span>
                                    )}
                                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {rowCount(extractedData.cash_flow)} rows
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 max-h-[560px] overflow-auto">
                                <StatementTable section={extractedData.cash_flow} />
                            </div>
                        </div>
                    )}

                    {/* ── Additional Sections ─────────────────────────── */}
                    {(extractedData.additional_sections || []).map((sec, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{sec.title || `Additional Section ${idx + 1}`}</h2>
                                    {sec.notes && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{sec.notes}</p>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                    {rowCount(sec)} rows
                                </span>
                            </div>
                            <div className="p-6 max-h-[560px] overflow-auto">
                                <StatementTable section={sec} />
                            </div>
                        </div>
                    ))}

                    {/* ── No data fallback ─────────────────────────────── */}
                    {!extractedData.income_statement && !extractedData.balance_sheet && !extractedData.cash_flow && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                            <TableCellsIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <h3 className="text-base font-semibold text-slate-700">No Financial Statements Found</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                The extraction did not find recognizable financial tables in this PDF.
                                Try a different file or reprocess.
                            </p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default Home;
