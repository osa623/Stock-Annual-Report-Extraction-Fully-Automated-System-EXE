import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../api/endpoints';
import {
  UserCircleIcon,
  ChevronDownIcon,
  ArrowLeftOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, login } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fallback: If context user is missing but we have data in localStorage, recover it.
  const [displayedUser, setDisplayedUser] = useState(user);

  useEffect(() => {
    const hydrateUser = async () => {
      // 1. If we have a user in context, use it.
      if (user) {
        setDisplayedUser(user);
        return;
      }

      // 2. If not, check local storage
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setDisplayedUser(parsedUser);
          // Update context if login function is available
          if (login) login(parsedUser);

          // Optional: Fetch fresh data from API if we have an ID
          if (parsedUser.id || parsedUser._id) {
            const id = parsedUser._id || parsedUser.id;
            try {
              const res = await fetch(API_ENDPOINTS.GET_ADMIN.replace(':id', id), {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json'
                }
              });
              if (res.ok) {
                const freshData = await res.json();
                setDisplayedUser(freshData);
                localStorage.setItem("user", JSON.stringify(freshData));
              }
            } catch (e) {
              console.warn("Failed to refresh user data", e);
            }
          }
        } catch (e) {
          console.error("Invalid stored user data", e);
        }
      } else if (storedToken) {
        // 3. Stale State: Token exists but no user details.
        setDisplayedUser({ email: "Administrator", isStale: true });
      } else {
        setDisplayedUser(null);
      }
    };

    hydrateUser();
  }, [user, login]);


  const pathNames = {
    '/home': 'Home Section',
    '/dashboard': 'Annual PDF Extractor',
    '/login': 'Login Section',
  };

  const currentSection = pathNames[location.pathname] || 'Unknown Section';

  const handleLogout = () => {
    logout();
    setDisplayedUser(null);
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm z-50 relative">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                <span className="text-white text-lg font-bold">BL</span>
              </div>
              <div>
                <h1 className="text-xl font-bold flex text-gray-900">
                  PDF Extractor
                  <div className='font-thin flex items-center px-2 hidden sm:flex'>
                    Panel ---
                    <h2 className='text-sm px-2 text-gray-500'>{currentSection}</h2>
                  </div>
                </h1>
                <span className="text-gray-500 text-xs">Admin Operations</span>
              </div>
            </div>
          </div>

          {/* Navigation / User Section */}
          <nav className="flex items-center space-x-6">
            {!displayedUser ? null : (
              <div className="flex items-center space-x-4">
                {/* Profile Link (Direct) */}
                <div
                  className={`flex items-center space-x-3 group p-1.5 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 ${displayedUser.isStale ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={() => !displayedUser.isStale && navigate(`/profile/${displayedUser._id || displayedUser.id}`)}
                  title={displayedUser.isStale ? "Session Incomplete" : "View Profile"}
                >
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-black">{displayedUser.email || "Admin"}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-700">Administrator</div>
                  </div>
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold shadow-sm group-hover:bg-black transition-colors">
                    {displayedUser.email ? displayedUser.email[0].toUpperCase() : <UserCircleIcon className="w-6 h-6" />}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign out"
                >
                  <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
