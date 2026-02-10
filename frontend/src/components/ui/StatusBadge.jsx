import React from 'react';

const StatusBadge = ({ status = 'idle' }) => {
  const config = {
    idle: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Idle' },
    processing: { bg: 'bg-slate-200', text: 'text-slate-700', dot: 'bg-slate-900', label: 'Processing' },
    done: { bg: 'bg-slate-900', text: 'text-white', dot: 'bg-white', label: 'Done' },
    error: { bg: 'bg-slate-100', text: 'text-slate-900', dot: 'bg-slate-900', label: 'Error' },
  };

  const c = config[status] || config.idle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'processing' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
};

export default StatusBadge;
