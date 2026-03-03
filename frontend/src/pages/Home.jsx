import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdfService } from '../services/api';
import { useCredits } from '../utils/CreditContext';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import {
    ArrowUpTrayIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    TableCellsIcon,
    BanknotesIcon,
    BuildingLibraryIcon,
    CurrencyDollarIcon,
    ChartBarSquareIcon,
    ScaleIcon,
    ShieldCheckIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------
const EXTRACTION_SECTIONS = [
    {
        key: 'income_statement',
        title: 'Income Statement',
        shortTitle: 'Income',
        description: 'Revenue, expenses, and net profit/loss.',
        icon: BanknotesIcon,
        category: 'Financial Statements',
    },
    {
        key: 'balance_sheet',
        title: 'Financial Position',
        shortTitle: 'Balance Sheet',
        description: 'Assets, liabilities, and equity.',
        icon: BuildingLibraryIcon,
        category: 'Financial Statements',
    },
    {
        key: 'cash_flow',
        title: 'Cash Flow',
        shortTitle: 'Cash Flow',
        description: 'Operating, investing, and financing.',
        icon: CurrencyDollarIcon,
        category: 'Financial Statements',
    },
    {
        key: 'comprehensive_income',
        title: 'Comprehensive Income',
        shortTitle: 'OCI',
        description: 'Profit or loss plus OCI items.',
        icon: ChartBarSquareIcon,
        category: 'Financial Statements',
    },
    {
        key: 'changes_in_equity',
        title: 'Changes in Equity',
        shortTitle: 'Equity',
        description: 'Share capital, reserves, retained earnings.',
        icon: ScaleIcon,
        category: 'Financial Statements',
    },
    {
        key: 'auditors_report',
        title: "Auditor's Report",
        shortTitle: 'Audit',
        description: 'Audit opinion and key matters.',
        icon: ShieldCheckIcon,
        category: 'Financial Statements',
    },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Inline progress shown inside each card while extracting */
const CardProgress = ({ sectionTitle }) => {
    const [step, setStep] = useState(0);
    const timerRef = useRef(null);

    const labels = [
        'Preparing...',
        'Uploading to System',
        'Analysing document',
        `Extracting ${sectionTitle}`,
        'Parsing results',
    ];

    useEffect(() => {
        setStep(1);
        const delays = [2200, 4500, 6000, 40000];
        let i = 0;
        const next = () => {
            i++;
            if (i < labels.length) {
                setStep(i + 1);
                if (i < delays.length) timerRef.current = setTimeout(next, delays[i]);
            }
        };
        timerRef.current = setTimeout(next, delays[0]);
        return () => clearTimeout(timerRef.current);
    }, []);

    const pct = Math.min((step / labels.length) * 100, 100);

    return (
        <div className="mt-3 space-y-2">
            <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="space-y-1">
                {labels.map((l, idx) => {
                    const s = idx + 1;
                    const done = step > s;
                    const active = step === s;
                    return (
                        <div key={idx} className="flex items-center gap-2">
                            {done ? (
                                <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : active ? (
                                <span className="flex h-3.5 w-3.5 items-center justify-center shrink-0">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                </span>
                            ) : (
                                <span className="flex h-3.5 w-3.5 items-center justify-center shrink-0">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                </span>
                            )}
                            <span className={`text-[11px] leading-none ${done ? 'text-green-600' : active ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                                {l}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/** Statement data table */
const StatementTable = ({ section }) => {
    if (!section?.rows?.length) {
        return (
            <div className="py-10 text-center text-slate-400">
                <TableCellsIcon className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">No data found</p>
            </div>
        );
    }
    const headers = section.headers || [];
    return (
        <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {headers.map((h, i) => (
                            <th key={i} className={`px-3 py-2.5 font-medium text-slate-500 text-[11px] uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {section.rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{row.item}</td>
                            {(row.values || []).map((v, ci) => (
                                <td key={ci} className={`px-3 py-2 text-right font-mono text-slate-600 whitespace-nowrap ${v !== null && typeof v === 'number' && v < 0 ? 'text-red-500' : ''}`}>
                                    {v !== null && v !== undefined ? (typeof v === 'number' ? v.toLocaleString() : v) : '\u2014'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Home = () => {
    const navigate = useNavigate();
    const { credits, useCredit } = useCredits();
    const [phase, setPhase] = useState('upload'); // upload | extraction
    const [file, setFile] = useState(null);
    const [pdfId, setPdfId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const fileInputRef = useRef(null);

    const [sectionStates, setSectionStates] = useState({});
    const [activeSection, setActiveSection] = useState(null);
    const [extractingAll, setExtractingAll] = useState(false);
    const [exporting, setExporting] = useState(null);

    // -- Drag & Drop -------------------------------------------------------
    const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }, []);
    const onDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }, []);
    const onDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        const f = e.dataTransfer.files?.[0];
        f?.type === 'application/pdf' ? handleFileSelected(f) : setError('Please upload a PDF file.');
    }, []);
    const onFileInput = (e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); };

    // -- Upload -------------------------------------------------------------
    const handleFileSelected = async (selectedFile) => {
        // Check credits before allowing upload
        if (credits <= 0) {
            setShowCreditModal(true);
            return;
        }
        setFile(selectedFile); setError(null); setSectionStates({}); setActiveSection(null); setPdfId(null); setUploading(true);
        try {
            const res = await pdfService.uploadPDF(selectedFile);
            setPdfId(res.pdf_id);
            // Deduct 1 credit on successful upload
            useCredit();
            setPhase('extraction');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Upload failed');
            setFile(null);
        } finally { setUploading(false); }
    };

    // -- Extract single -----------------------------------------------------
    const handleExtractSection = async (key) => {
        if (!pdfId) return;
        setSectionStates(p => ({ ...p, [key]: { status: 'extracting', data: null, error: null } }));
        // Scroll to the card so user sees the progress
        setTimeout(() => {
            const el = document.getElementById(`card-${key}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
        try {
            const res = await pdfService.extractStatement(pdfId, key);
            setSectionStates(p => ({ ...p, [key]: { status: 'done', data: res.data, error: null } }));
            if (res.data) setActiveSection(key);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Extraction failed';
            setSectionStates(p => ({ ...p, [key]: { status: 'error', data: null, error: msg } }));
        }
    };

    // -- Extract all --------------------------------------------------------
    const handleExtractAll = async () => {
        if (!pdfId || extractingAll) return;
        setExtractingAll(true); setError(null);
        for (const sec of EXTRACTION_SECTIONS) {
            if (sectionStates[sec.key]?.status === 'done' && sectionStates[sec.key]?.data) continue;
            await handleExtractSection(sec.key);
            await new Promise(r => setTimeout(r, 400));
        }
        setExtractingAll(false);
    };

    // -- Export --------------------------------------------------------------
    const handleExport = async (fmt) => {
        if (!pdfId) return;
        setExporting(fmt); setError(null);
        try { await pdfService.exportData(pdfId, fmt); }
        catch (err) { setError(err.response?.data?.error || err.message || `Export (${fmt}) failed`); }
        finally { setExporting(null); }
    };

    // -- Reset ---------------------------------------------------------------
    const handleReset = () => {
        setFile(null); setPdfId(null); setSectionStates({}); setActiveSection(null);
        setError(null); setExporting(null); setExtractingAll(false); setPhase('upload');
    };

    // -- Derived values ------------------------------------------------------
    const rowCount = (s) => s?.rows?.length || 0;
    const totalRows = EXTRACTION_SECTIONS.reduce((n, s) => n + (sectionStates[s.key]?.data?.rows?.length || 0), 0);
    const doneCount = EXTRACTION_SECTIONS.filter(s => sectionStates[s.key]?.status === 'done').length;
    const anyBusy = EXTRACTION_SECTIONS.some(s => sectionStates[s.key]?.status === 'extracting');
    const hasResults = EXTRACTION_SECTIONS.some(s => sectionStates[s.key]?.data);
    const activeDef = EXTRACTION_SECTIONS.find(s => s.key === activeSection);
    const activeData = activeSection && sectionStates[activeSection]?.data;

    const exports = [
        { f: 'json', l: 'JSON' }, { f: 'xlsx', l: 'Excel' }, { f: 'csv', l: 'CSV' },
        { f: 'pdf', l: 'PDF' }, { f: 'docx', l: 'Word' },
    ];

    // =======================================================================
    // Render
    // =======================================================================
    return (
        <div className="max-w-6xl mx-auto px-4 py-6">

            {/* ---- Top bar ------------------------------------------------- */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-[22px] font-semibold text-slate-900 leading-tight">
                        {phase === 'upload' ? 'Annual Report Extractor' : file?.name?.replace(/\.pdf$/i, '')}
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                        {phase === 'upload' && 'Upload a PDF to extract structured financial data.'}
                        {phase === 'extraction' && doneCount > 0 && (
                            <>{(file?.size / 1024 / 1024).toFixed(1)} MB &middot; {doneCount}/{EXTRACTION_SECTIONS.length} extracted &middot; {totalRows} rows</>
                        )}
                        {phase === 'extraction' && doneCount === 0 && (
                            <>{(file?.size / 1024 / 1024).toFixed(1)} MB &middot; Select a statement to extract.</>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {phase === 'upload' && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                            <span className={`w-2 h-2 rounded-full ${credits > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className="text-[13px] text-slate-600 font-medium">{credits} credit{credits !== 1 ? 's' : ''}</span>
                            {credits === 0 && (
                                <button onClick={() => navigate('/pricing')} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium ml-1">Buy more</button>
                            )}
                        </div>
                    )}
                    {phase === 'extraction' && (
                        <button onClick={handleReset} className="text-[13px] text-slate-400 hover:text-slate-600 transition-colors">
                            New file
                        </button>
                    )}
                </div>
            </div>

            {/* ---- Error --------------------------------------------------- */}
            {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="flex-1 text-[13px] text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button>
                </div>
            )}

            {/* ================================================================
                UPLOAD
            ================================================================ */}
            {phase === 'upload' && (
                <div
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative rounded-xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer
                        ${uploading ? 'pointer-events-none opacity-60' : ''}
                        ${dragActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    <div className="py-20 px-6">
                        {uploading ? (
                            <div className="space-y-3">
                                <ArrowPathIcon className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                                <p className="text-sm text-slate-600 font-medium">Uploading {file?.name}...</p>
                                <p className="text-xs text-slate-400">{(file?.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-14 h-14 mx-auto rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                    <ArrowUpTrayIcon className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">
                                        {dragActive ? 'Drop your file' : 'Drop a PDF here or click to browse'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Annual reports up to 100 MB</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={onFileInput} className="hidden" />
                </div>
            )}

            {/* ================================================================
                EXTRACTION
            ================================================================ */}
            {phase === 'extraction' && (
                <div className="space-y-6">

                    {/* ---- Action row ---------------------------------------- */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-[13px] text-slate-600 font-medium truncate max-w-[220px]">{file?.name}</span>
                            <span className="text-[11px] text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                                Ready
                            </span>
                        </div>
                        <button
                            onClick={handleExtractAll}
                            disabled={extractingAll || anyBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white
                                hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {extractingAll
                                ? <><ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> Extracting...</>
                                : <><DocumentArrowDownIcon className="w-3.5 h-3.5" /> Extract All</>}
                        </button>
                    </div>

                    {/* ---- Cards by category --------------------------------- */}
                    {[...new Set(EXTRACTION_SECTIONS.map(s => s.category))].map(cat => (
                        <div key={cat}>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {EXTRACTION_SECTIONS.filter(s => s.category === cat).map(sec => {
                                    const st = sectionStates[sec.key];
                                    const status = st?.status || 'idle';
                                    const isExtracting = status === 'extracting';
                                    const isDone = status === 'done';
                                    const isErr = status === 'error';
                                    const rows = st?.data?.rows?.length || 0;
                                    const isActive = activeSection === sec.key;
                                    const Icon = sec.icon;

                                    const handleClick = () => {
                                        if (isExtracting) return;
                                        if (isDone && st.data) setActiveSection(p => p === sec.key ? null : sec.key);
                                        else handleExtractSection(sec.key);
                                    };

                                    return (
                                        <div
                                            key={sec.key}
                                            id={`card-${sec.key}`}
                                            onClick={handleClick}
                                            className={`rounded-xl border p-4 transition-all duration-150 select-none
                                                ${isExtracting ? 'border-indigo-200 bg-indigo-50/30 cursor-wait'
                                                    : isActive ? 'border-slate-900 bg-white shadow-sm cursor-pointer ring-1 ring-slate-900'
                                                    : isErr ? 'border-red-200 bg-red-50/30 cursor-pointer'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'}`}
                                        >
                                            {/* top row: icon + title + badge */}
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                                                    ${isActive ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="text-[13px] font-semibold text-slate-800 truncate">{sec.title}</h3>
                                                        {isExtracting && (
                                                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-100 rounded px-1.5 py-0.5">
                                                                <ArrowPathIcon className="w-3 h-3 animate-spin" /> Working
                                                            </span>
                                                        )}
                                                        {isDone && st.data && (
                                                            <span className="shrink-0 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                                                {rows} rows
                                                            </span>
                                                        )}
                                                        {isDone && !st.data && (
                                                            <span className="shrink-0 text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                                                                Not found
                                                            </span>
                                                        )}
                                                        {isErr && (
                                                            <span className="shrink-0 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                                                Error
                                                            </span>
                                                        )}
                                                        {status === 'idle' && (
                                                            <span className="shrink-0 text-[10px] text-slate-400">Click to extract</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{sec.description}</p>
                                                </div>
                                            </div>

                                            {/* Inline progress when extracting */}
                                            {isExtracting && <CardProgress sectionTitle={sec.shortTitle} />}

                                            {/* Error message */}
                                            {isErr && st.error && (
                                                <p className="mt-2 text-[11px] text-red-500 line-clamp-2">{st.error}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* ---- Data viewer --------------------------------------- */}
                    {activeSection && activeData && (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[15px] font-semibold text-slate-800">{activeDef?.title}</h2>
                                    {activeData.title && <p className="text-[11px] text-slate-500 mt-0.5">{activeData.title}</p>}
                                    {activeData.notes && <p className="text-[11px] text-slate-400 italic">{activeData.notes}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeData.page_numbers?.length > 0 && (
                                        <span className="text-[11px] text-slate-400">pg {activeData.page_numbers.join(', ')}</span>
                                    )}
                                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                        {rowCount(activeData)} rows
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleExtractSection(activeSection); }}
                                        className="text-[11px] text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                    >
                                        Re-extract
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 max-h-[520px] overflow-auto">
                                <StatementTable section={activeData} />
                            </div>
                        </div>
                    )}

                    {/* ---- Export bar ----------------------------------------- */}
                    {hasResults && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-1">Export:</span>
                            {exports.map(({ f, l }) => (
                                <button
                                    key={f}
                                    onClick={() => handleExport(f)}
                                    disabled={!!exporting}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5
                                        text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300
                                        disabled:opacity-40 transition-colors"
                                >
                                    {exporting === f
                                        ? <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                        : <ArrowDownTrayIcon className="w-3 h-3" />}
                                    {l}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Insufficient credits modal */}
            <InsufficientCreditsModal open={showCreditModal} onClose={() => setShowCreditModal(false)} />
        </div>
    );
};

export default Home;
