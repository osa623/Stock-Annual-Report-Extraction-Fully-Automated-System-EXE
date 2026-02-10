import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleCard from '../components/ui/ModuleCard';
import {
    CircleStackIcon,
    PhotoIcon,
    DocumentArrowDownIcon,
    CalendarDaysIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Select a module to get started, or explore the sidebar for more options.
                </p>
            </div>

            {/* Extraction Modules */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Extraction Modules</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <ModuleCard
                        title="PDF Data Handler"
                        description="Save and manage extracted financial statement data."
                        icon={CircleStackIcon}
                        route="/data-explorer"
                        status="Active"
                    />
                    <ModuleCard
                        title="Annual PDF Extractor"
                        description="Automated extraction of Income Statement, Financial Position, Cash Flow."
                        icon={DocumentArrowDownIcon}
                        route="/dashboard"
                        status="Active"
                    />
                    <ModuleCard
                        title="Raw Image Extractor"
                        description="Extract financial statements from raw image inputs with OCR."
                        icon={PhotoIcon}
                        route="/image-extractor"
                        status="Active"
                    />
                    <ModuleCard
                        title="Quarterly PDF Extractor"
                        description="Extract quarterly financial statements from interim reports."
                        icon={CalendarDaysIcon}
                        route="/*"
                        status="Coming Soon"
                    />
                </div>
            </section>

            {/* Quick access */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Access</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div
                        onClick={() => navigate('/report-sections')}
                        className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                                <DocumentTextIcon className="w-5 h-5 text-slate-900" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 group-hover:text-black transition-colors">
                                    Report Sections
                                </h3>
                                <p className="text-sm text-slate-500">Extract 14 additional annual report sections — governance, risk, directors, and more.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats overview */}
            <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Overview</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { label: 'PDFs Processed', value: '—' },
                        { label: 'Sections Extracted', value: '—' },
                        { label: 'Data Points', value: '—' },
                        { label: 'Active Year', value: '2024' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
