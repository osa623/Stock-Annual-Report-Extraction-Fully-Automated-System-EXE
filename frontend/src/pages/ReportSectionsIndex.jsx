import React from 'react';
import { NavLink } from 'react-router-dom';
import SectionLayout from '../components/ui/SectionLayout';
import { REPORT_SECTIONS, SECTION_CATEGORIES } from '../features/report-sections/sectionConfig';
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const ReportSectionsIndex = () => {
  return (
    <SectionLayout
      title="Report Sections"
      description="Extract and view individual sections from annual reports beyond the core financial statements."
    >
      <div className="space-y-8">
        {SECTION_CATEGORIES.map((cat) => {
          const sections = REPORT_SECTIONS.filter((s) => s.category === cat);
          return (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sections.map((sec) => (
                  <NavLink
                    key={sec.key}
                    to={`/report-sections/${sec.key}`}
                    className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <DocumentTextIcon className="w-4.5 h-4.5 text-slate-500" />
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mt-3 group-hover:text-black transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{sec.description}</p>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionLayout>
  );
};

export default ReportSectionsIndex;
