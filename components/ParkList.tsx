
import React, { useState, useEffect, useMemo } from 'react';
import { Park, SurveyRecord, AppSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, Edit2, MapPin, ChevronRight, Briefcase, Info, LayoutGrid, Kanban, AlertTriangle, Calendar, TrendingUp, Target, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ParkListProps {
  onSelectPark: (parkId: string) => void;
}

type ViewMode = 'GRID' | 'KANBAN';

interface ParkCardProps {
    park: Park;
    status: { label: string; color: string };
    onSelect: (id: string) => void;
    onEdit: (park: Park, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

const ParkCard: React.FC<ParkCardProps> = ({ park, status, onSelect, onEdit, onDelete }) => {
    return (
        <div 
            onClick={() => onSelect(park.id)}
            className={`group bg-white rounded-xl border hover:border-accent shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden flex flex-col relative ${status.color.includes('red') ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'} ${park.isOwnPark ? 'ring-2 ring-blue-500/20' : ''}`}
        >
            <div className="h-32 bg-slate-100 relative">
                <img 
                    src={`https://picsum.photos/seed/${park.id}/400/200`} 
                    alt="Park cover" 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400/200';
                    }}
                />
                    {status.color.includes('red') && (
                    <div className="absolute top-2 left-2 flex items-center bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        需紧急更新
                    </div>
                )}
                {park.isOwnPark && (
                    <div className="absolute top-2 left-2 flex items-center bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                        <Crown className="w-3 h-3 mr-1" />
                        本方项目
                    </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-2 z-50" onClick={(e) => e.stopPropagation()}>
                    <button 
                        type="button"
                        onClick={(e) => onEdit(park, e)}
                        className="bg-white hover:bg-slate-50 text-slate-600 hover:text-accent p-2 rounded-full shadow-sm border border-slate-100 transition-colors z-50"
                        title="编辑"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => onDelete(park.id, e)}
                        className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 p-2 rounded-full shadow-sm border border-slate-100 transition-colors z-50"
                        title="删除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-slate-800">{park.name}</h3>
                    {park.totalArea > 0 && (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded whitespace-nowrap ml-2">
                            {park.totalArea.toLocaleString()} ㎡
                        </span>
                    )}
                </div>
                
                <div className="flex items-center text-sm text-slate-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="truncate">{park.address}</span>
                </div>

                <div className="mb-4">
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                    </span>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                    {park.description || '暂无描述信息。'}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {park.buildings?.length || 0} 栋楼宇
                    </span>
                    <div className="flex items-center text-accent text-sm font-medium">
                        查看详情 <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
            </div>
        </div>
     );
};

const ParkList: React.FC<ParkListProps> = ({ onSelectPark }) => {
  const [parks, setParks] = useState<Park[]>([]);
  const [allSurveys, setAllSurveys] = useState<SurveyRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [settings, setSettings] = useState<AppSettings>({ quarterlyTarget: 12 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Date Range State for Stats Chart
  const [dateRange, setDateRange] = useState<string>('6M');
  
  // Form State
  const [editingPark, setEditingPark] = useState<Park | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isOwnPark, setIsOwnPark] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setParks(StorageService.getParks());
    setAllSurveys(StorageService.getSurveys());
    setSettings(StorageService.getSettings());
  };

  const saveTargetSettings = (target: number) => {
      const newSettings = { ...settings, quarterlyTarget: target };
      setSettings(newSettings);
      StorageService.saveSettings(newSettings);
  };

  // Helper: Get Available Years for Selector
  const availableYears = useMemo(() => {
      const years = new Set<string>();
      allSurveys.forEach(s => {
        const d = new Date(s.date);
        if(!isNaN(d.getTime())) {
            years.add(d.getFullYear().toString());
        }
      });
      return Array.from(years).sort().reverse();
  }, [allSurveys]);

  // Split Parks
  const ownParks = useMemo(() => parks.filter(p => p.isOwnPark), [parks]);
  const competitorParks = useMemo(() => parks.filter(p => !p.isOwnPark), [parks]);

  // Helper: Check if park is stale (Tiered Warning)
  const getParkStatus = (parkId: string) => {
    const parkSurveys = allSurveys.filter(s => s.parkId === parkId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (parkSurveys.length === 0) return { label: '无记录', color: 'bg-slate-100 text-slate-500' };

    const lastDate = new Date(parkSurveys[0].date);
    if (isNaN(lastDate.getTime())) return { label: '日期错误', color: 'bg-slate-100 text-slate-500' };

    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays <= 7) {
        return { label: '数据新鲜', color: 'bg-green-100 text-green-700' };
    } else if (diffDays <= 14) {
        return { label: '一周未更', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
    } else if (diffDays <= 30) {
        return { label: '两周未更', color: 'bg-orange-100 text-orange-700 border border-orange-200' };
    } else {
        return { label: `超过30天未更新`, color: 'bg-red-100 text-red-600 border border-red-200' };
    }
  };

  // Helper: Group surveys by week for Kanban
  const kanbanData = useMemo(() => {
    const groups: { [key: string]: { dateRange: string, surveys: SurveyRecord[] } } = {};

    allSurveys.forEach(survey => {
        // Safety check: skip if park doesn't exist anymore
        if (!parks.find(p => p.id === survey.parkId)) return;

        const d = new Date(survey.date);
        if (isNaN(d.getTime())) return;

        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0,0,0,0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const key = monday.toISOString().split('T')[0];
        const label = `${monday.getMonth()+1}月${monday.getDate()}日 - ${sunday.getMonth()+1}月${sunday.getDate()}日`;

        if (!groups[key]) {
            groups[key] = { dateRange: label, surveys: [] };
        }
        groups[key].surveys.push(survey);
    });

    // Sort weeks descending
    return Object.entries(groups)
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        .map(([key, value]) => ({ weekStart: key, ...value }));
  }, [allSurveys, parks]);

  // Helper: Prepare Stats Data
  const statsData = useMemo(() => {
    // 1. Stacked Bar Chart Data (Filtered by Date Range)
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (dateRange === '6M') {
        startDate.setMonth(now.getMonth() - 5);
        startDate.setDate(1);
    } else if (dateRange === '1Y') {
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setDate(1);
    } else if (dateRange === 'YTD') {
        startDate = new Date(now.getFullYear(), 0, 1);
    } else {
        // Specific Year
        startDate = new Date(parseInt(dateRange), 0, 1);
        endDate = new Date(parseInt(dateRange), 11, 31);
    }
    startDate.setHours(0,0,0,0);
    
    // Generate buckets based on range
    const chartData = [];
    const current = new Date(startDate);
    current.setDate(1);

    // Limit iterations to prevent infinite loops on weird dates
    let loops = 0;
    while(current <= endDate && loops < 24) {
        const key = dateRange.length === 4 
            ? `${current.getMonth() + 1}月` 
            : `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
        
        const bucketStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const bucketEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        // Using park IDs as keys to prevent special character issues in Recharts
        const bucketObj: any = { name: key };
        parks.forEach(p => bucketObj[p.id] = 0);

        // Filter surveys for this bucket
        allSurveys.forEach(s => {
            const d = new Date(s.date);
            if (!isNaN(d.getTime()) && d >= bucketStart && d <= bucketEnd) {
                // Only count if park still exists
                if (parks.find(p => p.id === s.parkId)) {
                    bucketObj[s.parkId] = (bucketObj[s.parkId] || 0) + 1;
                }
            }
        });

        chartData.push(bucketObj);
        current.setMonth(current.getMonth() + 1);
        loops++;
    }

    // 2. Compliance Table Data (Always focused on Current Execution Status)
    // Calculate for Current Quarter
    const currentQuarterStart = new Date();
    currentQuarterStart.setMonth(Math.floor(currentQuarterStart.getMonth() / 3) * 3);
    currentQuarterStart.setDate(1);
    currentQuarterStart.setHours(0,0,0,0);

    // Calculate for Current Month
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0,0,0,0);
    
    const tableData = parks.map(p => {
        // Counts
        const thisMonthCount = allSurveys.filter(s => {
             const d = new Date(s.date);
             return s.parkId === p.id && d >= currentMonthStart;
        }).length;

        const quarterCount = allSurveys.filter(s => {
             const d = new Date(s.date);
             return s.parkId === p.id && d >= currentQuarterStart;
        }).length;

        const target = settings.quarterlyTarget || 12;
        const completionRate = Math.min(100, Math.round((quarterCount / target) * 100));

        // Weekly Frequency (Last 4 weeks)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const last4WeeksCount = allSurveys.filter(s => {
            const d = new Date(s.date);
            return s.parkId === p.id && d >= fourWeeksAgo;
        }).length;
        const weeklyFreq = (last4WeeksCount / 4).toFixed(1);

        return {
            id: p.id,
            name: p.name,
            thisMonthCount,
            quarterCount,
            target,
            completionRate,
            weeklyFreq
        };
    });

    return { chartData, tableData };
  }, [parks, allSurveys, settings.quarterlyTarget, dateRange]);


  const handleOpenModal = (park?: Park) => {
    if (park) {
        setEditingPark(park);
        setName(park.name);
        setAddress(park.address);
        setDescription(park.description || '');
        setIsOwnPark(park.isOwnPark || false);
    } else {
        setEditingPark(null);
        setName('');
        setAddress('');
        setDescription('');
        setIsOwnPark(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPark: Park = {
        id: editingPark ? editingPark.id : `p-${Date.now()}`,
        name,
        address,
        description,
        totalArea: editingPark ? editingPark.totalArea : 0, 
        tags: editingPark?.tags || [],
        buildings: editingPark?.buildings || [], 
        createdAt: editingPark ? editingPark.createdAt : Date.now(),
        isOwnPark: isOwnPark
    };
    StorageService.savePark(newPark);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if(window.confirm('您确定要删除该园区及所有相关历史记录吗？')) {
        StorageService.deletePark(id);
        loadData();
    }
  };

  const handleEditClick = (park: Park, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleOpenModal(park);
  };

  // Colors for stacked bar
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Title */}
      <div className="flex-shrink-0">
         <h2 className="text-2xl font-bold text-slate-800">园区档案</h2>
         <p className="text-slate-500 text-sm">管理周边竞品园区资料及调研进度</p>
      </div>

      {/* Stats Dashboard - Fixed at Top */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-1 h-60 flex flex-col">
                   <div className="flex justify-between items-center mb-3">
                       <h3 className="text-sm font-bold text-slate-700 flex items-center">
                           <TrendingUp className="w-4 h-4 mr-2 text-accent" />
                           新增信息总量
                       </h3>
                       <select 
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="text-xs border border-slate-300 rounded p-1 outline-none focus:border-accent bg-slate-50"
                        >
                            <option value="6M">近半年</option>
                            <option value="1Y">近一年</option>
                            <option value="YTD">今年</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                        </select>
                   </div>
                   <div className="flex-1 min-h-0">
                       <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statsData.chartData} margin={{top:5, right:5, bottom:5, left:-20}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                                <YAxis fontSize={10} stroke="#64748b" allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                {parks.map((p, idx) => (
                                    <Bar 
                                        key={p.id} 
                                        dataKey={p.id} 
                                        name={p.name}
                                        stackId="a" 
                                        fill={p.isOwnPark ? '#2563eb' : COLORS[idx % COLORS.length]} 
                                    />
                                ))}
                            </BarChart>
                       </ResponsiveContainer>
                   </div>
              </div>

              {/* Stats Table */}
              <div className="lg:col-span-2 overflow-auto">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center">
                            <Target className="w-4 h-4 mr-2 text-red-500" />
                            调研达标情况 (本季度)
                        </h3>
                        <div className="flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <span>目标:</span>
                            <input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={settings.quarterlyTarget || 12}
                                onChange={(e) => saveTargetSettings(Number(e.target.value))}
                                className="w-10 mx-1 text-center border border-slate-300 rounded focus:ring-accent focus:border-accent outline-none bg-white"
                            />
                            <span>次 / 季 / 园</span>
                        </div>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50/50">
                                <th className="py-2 px-2 font-medium">园区</th>
                                <th className="py-2 px-2 font-medium text-center">本月</th>
                                <th className="py-2 px-2 font-medium text-center">本季累计</th>
                                <th className="py-2 px-2 font-medium text-center">周频次</th>
                                <th className="py-2 px-2 font-medium text-center">季度进度</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statsData.tableData.slice(0, 5).map(row => (
                                <tr key={row.id} className="border-b border-slate-50 last:border-0 text-sm hover:bg-slate-50">
                                    <td className="py-2 px-2 text-slate-700 truncate max-w-[120px] flex items-center">
                                        {parks.find(p=>p.id === row.id)?.isOwnPark && <Crown className="w-3 h-3 mr-1 text-blue-600" />}
                                        {row.name}
                                    </td>
                                    <td className="py-2 px-2 text-center font-semibold text-slate-800">{row.thisMonthCount}</td>
                                    <td className="py-2 px-2 text-center text-slate-600">{row.quarterCount}</td>
                                    <td className="py-2 px-2 text-center text-slate-600">{row.weeklyFreq}</td>
                                    <td className="py-2 px-2">
                                        <div className="flex items-center justify-center">
                                            <div className="w-16 bg-slate-200 rounded-full h-1.5 mr-2 overflow-hidden">
                                                <div 
                                                className={`h-full rounded-full ${row.completionRate >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                style={{width: `${row.completionRate}%`}}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 w-6">{row.completionRate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {statsData.tableData.length > 5 && (
                        <div className="text-center text-xs text-slate-400 mt-2">
                            ... 共 {statsData.tableData.length} 个园区
                        </div>
                    )}
              </div>
          </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center flex-shrink-0 mt-4">
        <h3 className="text-lg font-bold text-slate-700">档案列表</h3>
        <div className="flex items-center space-x-3">
            <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                <button 
                    onClick={() => setViewMode('GRID')}
                    className={`p-2 rounded-md transition ${viewMode === 'GRID' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    title="网格视图"
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setViewMode('KANBAN')}
                    className={`p-2 rounded-md transition ${viewMode === 'KANBAN' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    title="看板视图"
                >
                    <Kanban className="w-5 h-5" />
                </button>
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm text-sm"
            >
                <Plus className="w-4 h-4 mr-2" /> 新增园区
            </button>
        </div>
      </div>

      {viewMode === 'GRID' && (
          <div className="overflow-y-auto pb-4 space-y-8">
            
            {/* Own Projects Section */}
            {ownParks.length > 0 && (
                <div className="relative">
                     <div className="flex items-center mb-4 text-blue-700 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg inline-flex border border-blue-100">
                        <Crown className="w-4 h-4 mr-2" />
                        本方核心项目
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ownParks.map(park => (
                            <ParkCard 
                                key={park.id} 
                                park={park} 
                                status={getParkStatus(park.id)} 
                                onSelect={onSelectPark} 
                                onEdit={handleEditClick} 
                                onDelete={handleDelete} 
                            />
                        ))}
                     </div>
                </div>
            )}

            {/* Competitors Section */}
            <div>
                 {ownParks.length > 0 && (
                    <div className="flex items-center mb-4 text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg inline-flex border border-slate-200">
                        <Briefcase className="w-4 h-4 mr-2" />
                        周边竞品园区
                    </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {competitorParks.map(park => (
                        <ParkCard 
                            key={park.id} 
                            park={park} 
                            status={getParkStatus(park.id)} 
                            onSelect={onSelectPark} 
                            onEdit={handleEditClick} 
                            onDelete={handleDelete} 
                        />
                    ))}
                 </div>
            </div>

            {parks.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                    <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                    <p>暂无园区数据，请点击右上角新增园区。</p>
                </div>
            )}
          </div>
      )}

      {viewMode === 'KANBAN' && (
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex space-x-6 min-w-max h-full">
                {kanbanData.length > 0 ? kanbanData.map((group) => (
                    <div key={group.weekStart} className="w-80 flex flex-col bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                         <div className="p-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center font-bold text-slate-700 text-sm">
                                <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                                {group.dateRange}
                            </div>
                            <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                {group.surveys.length}
                            </span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-400px)]">
                            {group.surveys.map(survey => {
                                const park = parks.find(p => p.id === survey.parkId);
                                if (!park) return null; // Safe guard for deleted parks

                                const buildingName = park.buildings?.find(b => b.id === survey.buildingId)?.name || '未知楼栋';
                                return (
                                    <div 
                                        key={survey.id} 
                                        onClick={() => park && onSelectPark(park.id)}
                                        className={`bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer flex flex-col ${park?.isOwnPark ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm font-bold text-slate-800 line-clamp-1" title={park?.name}>
                                                {park?.name || '未知园区'}
                                            </span>
                                            {park?.isOwnPark && <Crown className="w-3 h-3 text-blue-500" />}
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{survey.date.slice(5)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2 flex items-center">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-2">{buildingName}</span>
                                            <span>{survey.responsiblePerson}</span>
                                        </div>
                                        <div className="flex space-x-2 mb-3">
                                            <div className="flex-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold text-center">
                                                {survey.occupancyRate}% <span className="font-normal text-[10px] opacity-75">出租</span>
                                            </div>
                                            <div className="flex-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-semibold text-center">
                                                ¥{survey.rentPrice} <span className="font-normal text-[10px] opacity-75">单价</span>
                                            </div>
                                        </div>
                                        {survey.marketAnalysis && (
                                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                                                {survey.marketAnalysis}
                                            </div>
                                        )}
                                        {survey.significantEvents && (
                                            <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 flex items-center">
                                                <TrendingUp className="w-3 h-3 mr-1" /> 有重大动态
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                )) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        暂无调研记录，请切换至网格视图新增数据。
                    </div>
                )}
            </div>
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">{editingPark ? '编辑园区' : '新增园区'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">园区名称</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例如：未来科技产业园"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">地址</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="街道地址或区域"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">简介</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent outline-none h-24 resize-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="园区的简要概况..."
                        />
                    </div>

                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            id="isOwnPark"
                            checked={isOwnPark}
                            onChange={e => setIsOwnPark(e.target.checked)}
                            className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                        />
                        <label htmlFor="isOwnPark" className="ml-2 text-sm font-medium text-slate-700">
                            设为本方园区 (我的项目)
                        </label>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg flex items-start text-xs text-blue-700">
                        <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span>总建筑面积将根据您在“园区详情”中添加的楼栋数据自动加总计算。</span>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            取消
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-600 transition shadow-sm"
                        >
                            {editingPark ? '保存修改' : '创建园区'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ParkList;
