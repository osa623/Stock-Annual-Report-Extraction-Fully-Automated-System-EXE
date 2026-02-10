import React from 'react';
import { useNavigate } from 'react-router-dom';
import SectionLayout from '../components/ui/SectionLayout';
import ModuleCard from '../components/ui/ModuleCard';
import {
  CircleStackIcon,
  PhotoIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const modules = [
  {
    title: 'PDF Data Handler',
    description: 'Save and manage extracted financial statement data — Income Statement, Financial Position, Cash Flow.',
    route: '/data-explorer',
    icon: CircleStackIcon,
    status: 'Active',
  },
  {
    title: 'Raw Image Extractor',
    description: 'Extract financial statements directly from raw image inputs with OCR processing.',
    route: '/image-extractor',
    icon: PhotoIcon,
    status: 'Active',
  },
  {
    title: 'Annual PDF Extractor',
    description: 'Automate full extraction of Income Statement, Financial Position, and Cash Flow from annual report PDFs.',
    route: '/dashboard',
    icon: DocumentArrowDownIcon,
    status: 'Active',
  },
  {
    title: 'Quarterly PDF Extractor',
    description: 'Extract quarterly financial statements from interim report PDFs.',
    route: '/*',
    icon: CalendarDaysIcon,
    status: 'Coming Soon',
  },
];

const ExtractionHub = () => {
  return (
    <SectionLayout
      title="Extraction Hub"
      description="All PDF extraction tools and data handlers in one place."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {modules.map((mod) => (
          <ModuleCard key={mod.title} {...mod} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total PDFs Processed</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
          <p className="text-xs text-slate-500 mt-1">Run an extraction to begin</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sections Extracted</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
          <p className="text-xs text-slate-500 mt-1">Across all report types</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Activity</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">—</p>
          <p className="text-xs text-slate-500 mt-1">No recent extractions</p>
        </div>
      </div>
    </SectionLayout>
  );
};

export default ExtractionHub;
