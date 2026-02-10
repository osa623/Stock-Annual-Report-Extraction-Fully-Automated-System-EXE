import React from 'react';

const Tabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex gap-6 px-1" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
