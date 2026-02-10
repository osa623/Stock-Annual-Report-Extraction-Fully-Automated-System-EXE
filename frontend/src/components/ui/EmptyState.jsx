import React from 'react';
import { InboxIcon } from '@heroicons/react/24/outline';

const EmptyState = ({
  title = 'No data available',
  description = 'Extract a section from a PDF to see results here.',
  icon: Icon = InboxIcon,
  action,
  actionLabel = 'Get Started',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
