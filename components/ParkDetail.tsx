
import React, { useState, useEffect } from 'react';
import { Park, SurveyRecord, Building } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, Plus, Calendar, Percent, Tag, Building as BuildingIcon, Edit, Trash, DollarSign, AlertCircle, X, BarChart2, TrendingUp, Briefcase } from 'lucide-react';
import SurveyForm from './SurveyForm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface ParkDetailProps {
  parkId: string;
  onBack: () => void;
}

const ParkDetail: React.FC<ParkDetailProps> = ({ parkId, onBack }) => {
  const [park, setPark] = useState<Park | null>(null);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyRecord | null>(null);
  
  // Building Management State
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingArea, setNewBuildingArea] = useState<number | ''>('');

  // Chart State
  const [chartMetric, setChartMetric] = useState<'occupancy' | 'rent' | 'commission'>('occupancy');

  useEffect(() => {
    refreshData();
  }, [parkId]);

  const refreshData = () => {
    const p = StorageService.getParks().find(x => x.id === parkId);
    if (p) {
        setPark(p);
        setSurveys(StorageService.getSurveysByPark(parkId));
    }
  };

  // Building Handlers
  const handleSaveBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if(newBuildingName && park) {
        if (editingBuildingId) {
            StorageService.updateBuildingInPark(park.id, editingBuildingId, newBuildingName, Number(newBuildingArea) || 0);
        } else {
            StorageService.addBuildingToPark(park.id, newBuildingName, Number(newBuildingArea) || 0);
        }
        resetBuildingForm();
        refreshData();
    }
  }

  const handleEditBuilding = (building: Building) => {
    setEditingBuildingId(building.id);
    setNewBuildingName(building.name);
    setNewBuildingArea(building.area);
    setIsAddingBuilding(true);
  };

  const handleDeleteBuilding = (buildingId: string) => {
    if(window.confirm('确定要删除该楼栋吗？删除后园区总面积将重新计算。')) {
        StorageService.deleteBuildingFromPark(parkId, buildingId);
        refreshData();
    }
  }

  const resetBuildingForm = () => {
    setNewBuildingName('');
    setNewBuildingArea('');
    setEditingBuildingId(null);
    setIsAddingBuilding(false);
  }

  // Survey Handlers
  const handleDeleteSurvey = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if(window.confirm('确定要删除这条调研记录吗？')) {
        StorageService.deleteSurvey(id);
        refreshData();
    }
  }

  const handleSaveSurvey = (record: SurveyRecord) => {
    StorageService.saveSurvey(record);
    setIsSurveyModalOpen(false);
    refreshData();
  };

  // Chart Helpers
  const parseCommissionValue = (str: string): number => {
      const match = str.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
  };

  if (!park) return <div className="p-8">加载中...</div>;

  // Chart Data Preparation
  const chartData = surveys
    .slice(0, 10)
    .reverse()
    .map(s => ({
        date: s.date,
        occupancy: s.occupancyRate,
        rent: s.rentPrice || 0,
        commission: parseCommissionValue(s.commission)
    }));
  
  const latestSurvey = surveys[0];
  const vacantArea = latestSurvey && park.totalArea 
    ? Math.round(park.totalArea * (100 - latestSurvey.occupancyRate) / 100)
    : 0;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </button>

      {/* Header Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center">
                    {park.name}
                    {park.totalArea > 0 && <span className="ml-3 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">总建面: {park.totalArea.toLocaleString()}㎡</span>}
                </h1>
                <p className="text-slate-500 flex items-center mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium mr-2 text-slate-600 border border-slate-300">
                        {park.buildings.length} 栋楼宇
                    </span>
                    {park.address}
                </p>
            </div>
            <button 
                onClick={() => { setEditingSurvey(null); setIsSurveyModalOpen(true); }}
                className="mt-4 md:mt-0 bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition shadow-sm"
            >
                <Plus className="w-4 h-4 mr-2" /> 新增调研
            </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 text-slate-600 text-sm leading-relaxed">
                <h4 className="font-semibold text-slate-800 mb-2">园区简介</h4>
                {park.description}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <h4 className="font-semibold text-slate-800 mb-2 text-xs uppercase tracking-wide">最新核心数据</h4>
                 {latestSurvey ? (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">出租率</span>
                            <span className="font-bold text-slate-800 text-lg">{latestSurvey.occupancyRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">平均租金</span>
                            <span className="font-bold text-slate-800">{latestSurvey.rentPrice ? `¥${latestSurvey.rentPrice}/天/㎡` : 'N/A'}</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">预计空置面积</span>
                            <span className="font-medium text-amber-600">{vacantArea.toLocaleString()} ㎡</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                            <span className="text-slate-500 text-xs">更新日期</span>
                            <span className="text-xs font-medium text-slate-600">{latestSurvey.date}</span>
                        </div>
                    </div>
                 ) : (
                     <div className="text-sm text-slate-400 italic">暂无调研数据。</div>
                 )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            {surveys.length > 1 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-slate-800">历史数据走势</h3>
                         <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setChartMetric('occupancy')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartMetric === 'occupancy' ? 'bg-white shadow text-accent' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                出租率
                            </button>
                            <button 
                                onClick={() => setChartMetric('rent')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartMetric === 'rent' ? 'bg-white shadow text-accent' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                租金
                            </button>
                             <button 
                                onClick={() => setChartMetric('commission')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartMetric === 'commission' ? 'bg-white shadow text-accent' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                中介费
                            </button>
                         </div>
                    </div>
                    
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={12} 
                                    domain={chartMetric === 'occupancy' ? [0, 100] : ['auto', 'auto']}
                                    label={{ 
                                        value: chartMetric === 'occupancy' ? '%' : (chartMetric === 'rent' ? '元' : '数值'), 
                                        angle: -90, 
                                        position: 'insideLeft',
                                        style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }
                                    }}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}} 
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                />
                                <Bar 
                                    dataKey={chartMetric} 
                                    name={chartMetric === 'occupancy' ? '出租率' : (chartMetric === 'rent' ? '租金' : '中介费(估)')}
                                    fill={chartMetric === 'occupancy' ? '#3b82f6' : (chartMetric === 'rent' ? '#10b981' : '#f59e0b')} 
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">历史调研记录</h3>
                </div>
                <div>
                    {surveys.map((survey) => {
                        const buildingName = park.buildings.find(b => b.id === survey.buildingId)?.name || '未知楼栋';
                        return (
                            <div key={survey.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                            出租率 {survey.occupancyRate}%
                                        </div>
                                         <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                            ¥{survey.rentPrice || '-'}/天/㎡
                                        </div>
                                        <div className="text-slate-800 font-medium text-sm flex items-center">
                                            <BuildingIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            {buildingName}
                                        </div>
                                        <div className="text-slate-500 text-sm flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            {survey.date}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            type="button"
                                            onClick={() => { setEditingSurvey(survey); setIsSurveyModalOpen(true); }} 
                                            className="text-slate-400 hover:text-blue-600 bg-slate-100 p-1.5 rounded-md transition"
                                            title="编辑"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteSurvey(survey.id, e)} 
                                            className="text-slate-400 hover:text-red-600 bg-slate-100 p-1.5 rounded-md transition"
                                            title="删除"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {survey.significantEvents && (
                                     <div className="text-sm bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-100 mb-3 flex items-start">
                                        <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="font-semibold text-orange-900 mb-0.5">重大事件</div>
                                            {survey.significantEvents}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-3 bg-slate-50 p-3 rounded-lg">
                                    <div><span className="font-semibold text-slate-700">中介费:</span> {survey.commission}</div>
                                    <div><span className="font-semibold text-slate-700">交付标准:</span> {survey.deliveryStandard}</div>
                                    <div className="col-span-2"><span className="font-semibold text-slate-700">负责人:</span> {survey.responsiblePerson}</div>
                                </div>

                                {survey.marketAnalysis && (
                                    <div className="text-sm bg-purple-50 text-purple-800 p-3 rounded-lg border border-purple-100 mb-3">
                                        <div className="flex items-center font-semibold mb-1 text-purple-900">
                                            <Tag className="w-3 h-3 mr-1" /> 分析
                                        </div>
                                        {survey.marketAnalysis}
                                    </div>
                                )}

                                {survey.photos.length > 0 && (
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {survey.photos.map((photo, i) => (
                                            <img key={i} src={photo} alt="Survey" className="h-16 w-24 object-cover rounded border border-slate-200" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {surveys.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            暂无调研记录。请点击右上角新增。
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Sidebar - Buildings */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">楼栋管理</h3>
                    {!isAddingBuilding && (
                        <button 
                            onClick={() => { resetBuildingForm(); setIsAddingBuilding(true); }}
                            className="text-accent hover:bg-blue-50 p-1 rounded transition"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                {isAddingBuilding && (
                    <form onSubmit={handleSaveBuilding} className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase">
                            {editingBuildingId ? '编辑楼栋' : '新楼栋'}
                        </div>
                        <div className="space-y-2 mb-2">
                             <input 
                                autoFocus
                                type="text" 
                                placeholder="楼栋名称 (如 A座)"
                                value={newBuildingName}
                                onChange={(e) => setNewBuildingName(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-accent outline-none"
                            />
                            <input 
                                type="number" 
                                min="0"
                                placeholder="建筑面积 (㎡)"
                                value={newBuildingArea}
                                onChange={(e) => setNewBuildingArea(Number(e.target.value))}
                                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button 
                                type="button" 
                                onClick={resetBuildingForm} 
                                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                            >
                                取消
                            </button>
                            <button type="submit" className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-blue-600 transition">保存</button>
                        </div>
                    </form>
                )}

                <ul className="space-y-2">
                    {park.buildings.map(b => (
                        <li key={b.id} className="group flex justify-between items-center p-2 rounded hover:bg-slate-50 text-sm text-slate-700 transition">
                            <div className="flex items-center">
                                <BuildingIcon className="w-4 h-4 mr-2 text-slate-400" />
                                <span>{b.name}</span>
                                {b.area > 0 && <span className="ml-2 text-slate-400 text-xs">({b.area.toLocaleString()} ㎡)</span>}
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition space-x-1">
                                <button 
                                    onClick={() => handleEditBuilding(b)}
                                    className="text-slate-400 hover:text-accent p-1"
                                    title="编辑楼栋"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteBuilding(b.id)}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                    title="删除楼栋"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </li>
                    ))}
                    {park.buildings.length === 0 && (
                        <li className="text-xs text-slate-400 text-center py-2">暂无楼栋数据，请添加。</li>
                    )}
                </ul>
            </div>
        </div>
      </div>

      {isSurveyModalOpen && (
        <SurveyForm 
            park={park}
            existingSurvey={editingSurvey}
            previousSurvey={surveys[0]}
            onSave={handleSaveSurvey}
            onClose={() => setIsSurveyModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ParkDetail;
