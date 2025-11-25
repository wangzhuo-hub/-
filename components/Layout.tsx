
import React, { useRef } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Building2, Menu, Activity, Download, Upload } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const data = StorageService.getAllData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketscope_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if(window.confirm('恢复数据将覆盖当前所有数据，确定继续吗？')) {
                StorageService.importData(json);
                window.location.reload();
            }
        } catch (error) {
            alert('文件格式错误，无法导入。');
        }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        onChangeView(view);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
        currentView === view
          ? 'bg-accent text-white shadow-md'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white border-r border-slate-700">
        <div className="p-6 border-b border-slate-700 flex items-center">
            <Activity className="w-8 h-8 text-accent mr-2" />
            <h1 className="text-xl font-bold tracking-tight">MarketScope</h1>
        </div>
        <nav className="flex-1 p-4">
          <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="市场概览" />
          <NavItem view={ViewState.PARK_LIST} icon={Building2} label="园区档案" />
        </nav>
        
        {/* Data Management Section */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">数据管理</h3>
            <button 
                onClick={handleBackup}
                className="flex items-center w-full px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded transition mb-1"
            >
                <Download className="w-4 h-4 mr-2" /> 备份数据
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center w-full px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            >
                <Upload className="w-4 h-4 mr-2" /> 恢复数据
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleRestore} 
                className="hidden" 
                accept=".json" 
            />
        </div>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
            v1.1.0
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-primary text-white p-4 flex justify-between items-center shadow-md z-20">
           <div className="flex items-center">
            <Activity className="w-6 h-6 text-accent mr-2" />
            <h1 className="font-bold text-lg">MarketScope</h1>
           </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-800 text-white absolute top-16 left-0 w-full z-10 shadow-xl border-b border-slate-700">
            <nav className="p-4">
              <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="市场概览" />
              <NavItem view={ViewState.PARK_LIST} icon={Building2} label="园区档案" />
              
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">数据管理</h3>
                <button onClick={handleBackup} className="flex items-center w-full px-4 py-3 text-slate-300 hover:bg-slate-700">
                    <Download className="w-5 h-5 mr-3" /> 备份数据
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center w-full px-4 py-3 text-slate-300 hover:bg-slate-700">
                    <Upload className="w-5 h-5 mr-3" /> 恢复数据
                </button>
              </div>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
