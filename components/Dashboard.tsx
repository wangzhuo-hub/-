import React, { useEffect, useState } from 'react';
import { Park, SurveyRecord } from '../types';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp, Building, MapPin, DollarSign, PieChart, AlertCircle, Bell } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [parks, setParks] = useState<Park[]>([]);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [chartMetric, setChartMetric] = useState<'occupancy' | 'price'>('occupancy');

  useEffect(() => {
    setParks(StorageService.getParks());
    setSurveys(StorageService.getSurveys());
  }, []);

  // Prepare Chart Data
  const getChartData = () => {
    // Group surveys by date (month/year)
    const sortedSurveys = [...surveys].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dates = Array.from(new Set(sortedSurveys.map(s => s.date))).slice(-10); // Last 10 distinct dates
    
    return dates.map(date => {
        const entry: any = { date };
        parks.forEach(park => {
            // Find survey for this park on or before this date
            const parkSurveys = sortedSurveys.filter(s => s.parkId === park.id && s.date <= date);
            const latest = parkSurveys[parkSurveys.length - 1];
            if (latest) {
                entry[park.name] = chartMetric === 'occupancy' ? latest.occupancyRate : latest.rentPrice;
            }
        });
        return entry;
    });
  };

  const chartData = getChartData();
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleGenerateAnalysis = async () => {
    setLoadingAnalysis(true);
    const result = await GeminiService.generateMarketOverview(parks, surveys);
    setMarketAnalysis(result);
    setLoadingAnalysis(false);
  };

  // Stats Calculations
  const latestParkSurveys = parks.map(p => {
    const pSurveys = surveys.filter(s => s.parkId === p.id).sort((a,b) => b.timestamp - a.timestamp);
    return { park: p, survey: pSurveys[0] };
  }).filter(item => item.survey);

  // 1. Avg Occupancy
  const avgOccupancy = latestParkSurveys.length > 0 
    ? Math.round(latestParkSurveys.reduce((acc, curr) => acc + curr.survey.occupancyRate, 0) / latestParkSurveys.length) 
    : 0;

  // 2. Avg Rent Price
  const surveysWithPrice = latestParkSurveys.filter(item => item.survey.rentPrice);
  const avgPrice = surveysWithPrice.length > 0
    ? (surveysWithPrice.reduce((acc, curr) => acc + (curr.survey.rentPrice || 0), 0) / surveysWithPrice.length).toFixed(1)
    : '0.0';

  // 3. Total Vacancy
  const totalVacancyArea = latestParkSurveys.reduce((acc, curr) => {
    const area = curr.park.totalArea || 0;
    const vacancyRate = (100 - curr.survey.occupancyRate) / 100;
    return acc + (area * vacancyRate);
  }, 0);

  // Recent Significant Events
  const recentEvents = surveys
    .filter(s => s.significantEvents && s.significantEvents.trim().length > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">市场概览</h2>
        <div className="text-sm text-slate-500">最后更新: {new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center text-slate-500 mb-2">
            <Building className="w-5 h-5 mr-2" />
            <span className="font-medium">监控园区</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{parks.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center text-slate-500 mb-2">
            <TrendingUp className="w-5 h-5 mr-2" />
            <span className="font-medium">平均出租率</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{avgOccupancy}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center text-slate-500 mb-2">
            <DollarSign className="w-5 h-5 mr-2" />
            <span className="font-medium">平均租金</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">¥{avgPrice}</div>
          <div className="text-xs text-slate-500 mt-1">元/天/㎡</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center text-slate-500 mb-2">
            <PieChart className="w-5 h-5 mr-2" />
            <span className="font-medium">总空置面积</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{Math.round(totalVacancyArea).toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">平方米 (估算)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-800">市场趋势分析</h3>
             <div className="bg-slate-100 p-1 rounded-lg flex text-sm">
                <button 
                    onClick={() => setChartMetric('occupancy')}
                    className={`px-3 py-1.5 rounded-md transition ${chartMetric === 'occupancy' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    出租率
                </button>
                <button 
                    onClick={() => setChartMetric('price')}
                    className={`px-3 py-1.5 rounded-md transition ${chartMetric === 'price' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    租金价格
                </button>
             </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 12}} />
                <YAxis stroke="#64748b" tick={{fontSize: 12}} domain={chartMetric === 'occupancy' ? [0, 100] : ['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend />
                {parks.map((park, index) => (
                    <Line 
                        key={park.id}
                        type="monotone" 
                        dataKey={park.name} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2}
                        dot={{r: 4}}
                    />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: AI Analysis & Events */}
        <div className="flex flex-col space-y-6">
            {/* AI Analysis */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl shadow-lg text-white flex flex-col h-64">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                    AI 市场总结
                    </h3>
                    <button 
                        onClick={handleGenerateAnalysis}
                        disabled={loadingAnalysis}
                        className="text-xs bg-white/10 hover:bg-white/20 transition px-3 py-1 rounded-full disabled:opacity-50"
                    >
                        {loadingAnalysis ? '分析中...' : '刷新'}
                    </button>
                </div>
                
                <div className="flex-1 bg-white/5 rounded-lg p-4 text-sm leading-relaxed text-slate-200 overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600">
                    {marketAnalysis ? (
                        <p className="whitespace-pre-line">{marketAnalysis}</p>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <p>点击“刷新”以生成市场洞察。</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Significant Events Ticker */}
            <div className="bg-white p-0 rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center bg-orange-50/50">
                    <Bell className="w-5 h-5 mr-2 text-orange-500" />
                    <h3 className="font-bold text-slate-800">重大事件动态</h3>
                </div>
                <div className="overflow-y-auto p-0 flex-1 h-64">
                    {recentEvents.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {recentEvents.map((event, idx) => {
                                const parkName = parks.find(p => p.id === event.parkId)?.name || '未知园区';
                                return (
                                    <div key={event.id} className="p-4 hover:bg-slate-50 transition">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-500">{parkName}</span>
                                            <span className="text-xs text-slate-400">{event.date}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-snug">
                                            {event.significantEvents}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm p-4">
                            暂无重大事件反馈
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;