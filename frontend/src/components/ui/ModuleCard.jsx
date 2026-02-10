import React from 'react';
import { useNavigate } from 'react-router-dom';

const ModuleCard = ({ title, description, icon: Icon, route, status }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => route && navigate(route)}
      className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
          {Icon && <Icon className="w-5 h-5 text-slate-900" />}
        </div>
        {status && (
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {status}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-black transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>

      <div className="mt-5 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900 w-1/4 rounded-full transition-all duration-700 group-hover:w-1/2" />
      </div>
    </div>
  );
};

export default ModuleCard;
