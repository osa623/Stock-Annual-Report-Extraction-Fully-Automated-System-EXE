import React, { useState } from 'react';
import SidebarNav from '../components/ui/SidebarNav';
import TopBar from '../components/ui/TopBar';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Sidebar */}
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="lg:ml-[272px] flex flex-col min-h-screen">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
