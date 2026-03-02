import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  Bars3Icon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const YEARS = ['2025', '2024', '2023', '2022', '2021', '2020'];

const breadcrumbMap = {
  '/home': ['Home'],
  '/settings': ['Settings'],
};

const TopBar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [yearOpen, setYearOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [profileOpen, setProfileOpen] = useState(false);
  const yearRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build breadcrumb
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (breadcrumbMap[path]) return breadcrumbMap[path];
    if (path.startsWith('/profile/')) return ['Profile'];
    return ['Home'];
  };

  const crumbs = getBreadcrumbs();
  const pageTitle = crumbs[crumbs.length - 1];

  const displayedUser = user || (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <Bars3Icon className="w-5 h-5 text-slate-600" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 font-medium">PDF Extractor Panel</span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300" />
              <span className={i === crumbs.length - 1 ? 'text-slate-900 font-semibold' : 'text-slate-400 font-medium'}>
                {c}
              </span>
            </span>
          ))}
        </div>

        <span className="sm:hidden text-sm font-semibold text-slate-900">{pageTitle}</span>
      </div>

      {/* Right: search, year, notifications, profile */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 gap-2 w-56 focus-within:border-slate-400 focus-within:bg-white transition-colors">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full"
          />
        </div>

        {/* Year selector */}
        <div className="relative" ref={yearRef}>
          <button
            onClick={() => setYearOpen(!yearOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="hidden sm:inline text-slate-400">Year:</span>
            {selectedYear}
            <ChevronRightIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform ${yearOpen ? 'rotate-90' : ''}`} />
          </button>
          {yearOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[120px]">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => { setSelectedYear(y); setYearOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${y === selectedYear ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors relative">
          <BellIcon className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-900 rounded-full" />
        </button>

        {/* Profile */}
        {displayedUser && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold text-slate-900">{displayedUser.email || 'Admin'}</div>
                <div className="text-[10px] text-slate-400">Administrator</div>
              </div>
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {displayedUser.email ? displayedUser.email[0].toUpperCase() : <UserCircleIcon className="w-5 h-5" />}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[180px]">
                <button
                  onClick={() => { navigate(`/profile/${displayedUser._id || displayedUser.id}`); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  View Profile
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
