
import React, { useEffect, useState, useMemo } from 'react';
import { Park, SurveyRecord } from '../types';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp, Building, DollarSign, PieChart, Bell, AlertTriangle, Info, CalendarClock, Activity, Crown, ThumbsUp } from 'lucide-react';

type DateRange = '6M' | '1Y' | 'YTD' | string; // string for specific years '2023', '2024'

const Dashboard: React.FC = () => {
  const [parks, setParks] = useState<Park[]>([]);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  // Chart Controls
  const [chartScope, setChartScope] = useState<'INDIVIDUAL' | 'MARKET'>('INDIVIDUAL');
  const [chartMetric, setChartMetric] = useState<'occupancy' | 'price' | 'vacancy'>('occupancy');
  const [dateRange, setDateRange] = useState<DateRange>('6M');

  useEffect(() => {
    setParks(StorageService.getParks());
    setSurveys(StorageService.getSurveys());
  }, []);

  // Constants
  const NEW_PARK_THRESHOLD_DAYS = 90;

  // Identify New Parks
  const newParks = useMemo(() => {
      const now = Date.now();
      return parks.filter(p => {
          if (!p.createdAt) return false;
          const diffDays = Math.ceil(Math.abs(now - p.createdAt) / (1000 * 60 * 60 * 24));
          return diffDays <= NEW_PARK_THRESHOLD_DAYS;
      });
  }, [parks]);
  
  // Identify Own Park
  const ownPark = useMemo(() => parks.find(p => p.isOwnPark), [parks]);

  // Available Years for dropdown
  const availableYears = useMemo(() => {
      const years = new Set<string>();
      surveys.forEach(s => {
          if (!s.date) return;
          const d = new Date(s.date);
          if(!isNaN(d.getTime())) {
            years.add(d.getFullYear().toString());
          }
      });
      return Array.from(years).sort().reverse();
  }, [surveys]);

  // Performance Analysis Logic
  const performanceStats = useMemo(() => {
    if (!ownPark) return null;
    
    // Get latest data
    const getLatestSurvey = (pid: string) => 
        surveys.filter(s => s.parkId === pid).sort((a,b) => b.timestamp - a.timestamp)[0];

    const ownLatest = getLatestSurvey(ownPark.id);
    if (!ownLatest) return null;

    const competitors = parks.filter(p => !p.isOwnPark);
    const compSurveys = competitors.map(p => getLatestSurvey(p.id)).filter(s => !!s);
    
    if (compSurveys.length === 0) return null;

    const avgCompOccupancy = compSurveys.reduce((acc, s) => acc + s.occupancyRate, 0) / compSurveys.length;
    const avgCompPrice = compSurveys.reduce((acc, s) => acc + (s.rentPrice || 0), 0) / compSurveys.length;

    const occDiff = ownLatest.occupancyRate - avgCompOccupancy;
    const priceDiff = (ownLatest.rentPrice || 0) - avgCompPrice;
    
    // Check if performing well (Higher Occupancy OR Higher Price)
    const isOccupancyBetter = occDiff > 0;
    const isPriceHigher = priceDiff > 0;

    return {
        isOccupancyBetter,
        isPriceHigher,
        occDiff: Math.abs(occDiff).toFixed(1),
        priceDiff: Math.abs(priceDiff).toFixed(1)
    };
  }, [ownPark, parks, surveys]);


  // Prepare Chart Data
  const chartData = useMemo(() => {
    // Determine start and end dates based on range
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    // let labelFormat = 'yyyy-MM'; 

    if (dateRange === '6M') {
        startDate.setMonth(now.getMonth() - 5); // 6 months inclusive
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
        // labelFormat = 'MM';
    }

    // Generate buckets (Months)
    const buckets = [];
    const current = new Date(startDate);
    current.setDate(1);
    
    // Safety break loop
    let loops = 0;
    while (current <= endDate && loops < 24) {
        // Effective end of this bucket month
        const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        
        // Label
        const label = dateRange.length === 4 
            ? `${current.getMonth() + 1}月`
            : `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        
        buckets.push({
            label,
            compareDate: endOfMonth
        });

        current.setMonth(current.getMonth() + 1);
        loops++;
    }

    return buckets.map(period => {
        const point: any = { date: period.label };
        
        // Find the valid survey state for EACH park at this point in time
        const parkStates = parks.map(p => {
            const validSurveys = surveys
                .filter(s => {
                    if (s.parkId !== p.id) return false;
                    const d = new Date(s.date);
                    return !isNaN(d.getTime()) && d <= period.compareDate;
                })
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return { park: p, survey: validSurveys[0] };
        });

        if (chartScope === 'INDIVIDUAL') {
            parkStates.forEach(item => {
                if (item.survey) {
                    // IMPORTANT: Use Park ID as key, NOT Name, to avoid Recharts crashing on special chars (dots, etc)
                    if (chartMetric === 'occupancy') point[item.park.id] = item.survey.occupancyRate;
                    if (chartMetric === 'price') point[item.park.id] = item.survey.rentPrice;
                    if (chartMetric === 'vacancy') {
                        const rate = (100 - item.survey.occupancyRate) / 100;
                        const area = item.park.totalArea || 0;
                        point[item.park.id] = Math.round(area * rate) || 0;
                    }
                }
            });
        } else {
            // MARKET AGGREGATE
            // Separate Own Park from Competitors
            let compTotalVal = 0;
            let compCount = 0;
            let compTotalVacancy = 0;

            let ownVal = 0;
            let ownVacancy = 0;
            let hasOwnData = false;

            parkStates.forEach(item => {
                if (item.survey) {
                    const isOwn = item.park.isOwnPark;
                    const val = chartMetric === 'occupancy' 
                        ? item.survey.occupancyRate 
                        : (chartMetric === 'price' ? item.survey.rentPrice : 0);
                    
                    if (isOwn) {
                        if (chartMetric === 'vacancy') {
                             const rate = (100 - item.survey.occupancyRate) / 100;
                             const area = item.park.totalArea || 0;
                             ownVacancy = (area * rate) || 0;
                        } else if (val) {
                             ownVal = val;
                        }
                        hasOwnData = true;
                    } else {
                        // Competitors
                        if (chartMetric === 'vacancy') {
                             const rate = (100 - item.survey.occupancyRate) / 100;
                             const area = item.park.totalArea || 0;
                             compTotalVacancy += ((area * rate) || 0);
                        } else if (val) {
                             compTotalVal += val;
                             compCount++;
                        }
                    }
                }
            });

            // Set Data Points
            if (chartMetric === 'vacancy') {
                point['竞品总量'] = Math.round(compTotalVacancy);
                if (hasOwnData) point['本方项目'] = Math.round(ownVacancy);
            } else {
                point['竞品平均'] = compCount > 0 ? Number((compTotalVal / compCount).toFixed(1)) : 0;
                if (hasOwnData) point['本方项目'] = ownVal;
            }
        }
        return point;
    });
  }, [parks, surveys, chartScope, chartMetric, dateRange]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const handleGenerateAnalysis = async () => {
    setLoadingAnalysis(true);
    const result = await GeminiService.generateMarketOverview(parks, surveys);
    setMarketAnalysis(result);
    setLoadingAnalysis(false);
  };

  // Stats Calculations (Current Snapshot)
  const latestParkSurveys = parks.map(p => {
    const pSurveys = surveys.filter(s => s.parkId === p.id).sort((a,b) => b.timestamp - a.timestamp);
    return { park: p, survey: pSurveys[0] };
  }).filter(item => item.survey);

  const avgOccupancy = latestParkSurveys.length > 0 
    ? Math.round(latestParkSurveys.reduce((acc, curr) => acc + curr.survey.occupancyRate, 0) / latestParkSurveys.length) 
    : 0;

  const surveysWithPrice = latestParkSurveys.filter(item => item.survey.rentPrice);
  const avgPrice = surveysWithPrice.length > 0
    ? (surveysWithPrice.reduce((acc, curr) => acc + (curr.survey.rentPrice || 0), 0) / surveysWithPrice.length).toFixed(1)
    : '0.0';

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

  // Stale Data Check (> 30 Days)
  const staleParks = parks.filter(p => {
      const pSurveys = surveys.filter(s => s.parkId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (pSurveys.length === 0) return true;
      const lastDate = new Date(pSurveys[0].date);
      const diffDays = Math.ceil(Math.abs(Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)); 
      return diffDays > 30;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">市场概览</h2>
        <div className="text-sm text-slate-500">最后更新: {new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      {staleParks.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <h3 className="font-bold text-red-800">数据预警：有 {staleParks.length} 个园区超过30天未更新</h3>
                <p className="text-sm text-red-700 mt-1">
                    请尽快核实以下园区的数据：{staleParks.map(p => p.name).join('、')}。
                    长期未更新的数据会影响市场分析的准确性。
                </p>
            </div>
          </div>
      )}

      {/* Performance Highlight Alert */}
      {performanceStats && (performanceStats.isOccupancyBetter || performanceStats.isPriceHigher) && (
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start shadow-sm">
             <ThumbsUp className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
             <div className="flex-1">
                <h3 className="font-bold text-indigo-800 flex items-center">
                    本方项目表现优异
                    <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-normal border border-indigo-200">
                        市场领先
                    </span>
                </h3>
                <p className="text-sm text-indigo-700 mt-1 leading-relaxed">
                    相比竞品平均水平，
                    {performanceStats.isOccupancyBetter && (
                        <span>本方园区<span className="font-semibold">出租率高出 {performanceStats.occDiff}%</span></span>
                    )}
                    {performanceStats.isOccupancyBetter && performanceStats.isPriceHigher && <span>，且</span>}
                    {performanceStats.isPriceHigher && (
                         <span><span className="font-semibold">租金溢价 {performanceStats.priceDiff} 元/天/㎡</span></span>
                    )}
                    。建议参考AI分析制定下一步的稳价或提价策略。
                </p>
             </div>
          </div>
      )}

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
          <div className="flex flex-col space-y-4 mb-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <CalendarClock className="w-5 h-5 mr-2 text-slate-500" />
                    市场趋势分析
                </h3>
                <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md p-1.5 outline-none focus:border-accent bg-slate-50"
                >
                    <option value="6M">近半年</option>
                    <option value="1Y">近一年</option>
                    <option value="YTD">今年 (YTD)</option>
                    <optgroup label="年度归档">
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年</option>
                        ))}
                    </optgroup>
                </select>
             </div>

             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                 <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start">
                    <button 
                        onClick={() => setChartScope('INDIVIDUAL')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartScope === 'INDIVIDUAL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        各园区
                    </button>
                    <button 
                        onClick={() => setChartScope('MARKET')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartScope === 'MARKET' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        综合对比
                    </button>
                 </div>

                 <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs font-medium border border-slate-200 self-start">
                    <button 
                        onClick={() => setChartMetric('occupancy')}
                        className={`px-3 py-1.5 rounded-md transition ${chartMetric === 'occupancy' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        出租率
                    </button>
                    <button 
                        onClick={() => setChartMetric('price')}
                        className={`px-3 py-1.5 rounded-md transition ${chartMetric === 'price' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        租金
                    </button>
                    <button 
                        onClick={() => setChartMetric('vacancy')}
                        className={`px-3 py-1.5 rounded-md transition ${chartMetric === 'vacancy' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        空置面积
                    </button>
                 </div>
             </div>
          </div>

          {/* New Park Impact Alert */}
          {chartScope === 'MARKET' && newParks.length > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start text-sm text-blue-800">
                  <Info className="w-4 h-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div>
                      <span className="font-bold">新增项目提示：</span> 
                      统计包含 {newParks.length} 个近期（90天内）入市项目（如：{newParks[0]?.name}）。
                      新项目的加入可能会影响市场平均值。
                  </div>
              </div>
          )}

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 12}} />
                <YAxis 
                    stroke="#64748b" 
                    tick={{fontSize: 12}} 
                    domain={chartMetric === 'occupancy' ? [0, 100] : ['auto', 'auto']}
                    width={50}
                    label={{
                         value: chartMetric === 'occupancy' ? '%' : (chartMetric === 'price' ? '元' : '㎡'),
                         angle: -90,
                         position: 'insideLeft',
                         style: { fill: '#94a3b8', fontSize: 10 }
                    }}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: 'none'}}
                />
                <Legend />
                {chartScope === 'INDIVIDUAL' ? (
                    parks.map((park, index) => (
                        <Line 
                            key={park.id}
                            type="monotone" 
                            dataKey={park.id} // Use ID to prevent crash on special characters
                            name={park.name}
                            stroke={park.isOwnPark ? '#2563eb' : colors[index % colors.length]} 
                            strokeWidth={park.isOwnPark ? 4 : 2}
                            dot={{r: 3}}
                            activeDot={{r: 5}}
                        />
                    ))
                ) : (
                    <>
                        {/* Market/Competitor Average */}
                        <Line 
                            type="monotone" 
                            dataKey={chartMetric === 'vacancy' ? '竞品总量' : '竞品平均'} 
                            name={chartMetric === 'occupancy' ? '竞品平均出租率' : (chartMetric === 'price' ? '竞品平均租金' : '竞品总空置面积')}
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{r: 4}}
                            activeDot={{r: 6}}
                        />
                        {/* Own Park Line - Only if exists */}
                        {ownPark && (
                            <Line 
                                type="monotone" 
                                dataKey="本方项目"
                                name="本方项目"
                                stroke="#2563eb"
                                strokeWidth={4}
                                dot={{r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff'}}
                                activeDot={{r: 7}}
                            />
                        )}
                        {!ownPark && (
                             <Line 
                                type="monotone" 
                                dataKey={chartMetric === 'vacancy' ? '市场总量' : '市场平均'} 
                                name={chartMetric === 'occupancy' ? '市场平均出租率' : (chartMetric === 'price' ? '市场平均租金' : '市场总空置面积')}
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={{r: 4}}
                                activeDot={{r: 6}}
                            />
                        )}
                    </>
                )}
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
                    AI 策略建议
                    </h3>
                    <button 
                        onClick={handleGenerateAnalysis}
                        disabled={loadingAnalysis}
                        className="text-xs bg-white/10 hover:bg-white/20 transition px-3 py-1 rounded-full disabled:opacity-50"
                    >
                        {loadingAnalysis ? '分析中...' : '生成策略'}
                    </button>
                </div>
                
                <div className="flex-1 bg-white/5 rounded-lg p-4 text-sm leading-relaxed text-slate-200 overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-600">
                    {marketAnalysis ? (
                        <p className="whitespace-pre-line">{marketAnalysis}</p>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                            <Activity className="w-8 h-8 mb-2 opacity-50" />
                            <p>点击“生成策略”获取基于本方园区与竞品对比的招商建议。</p>
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
                                const park = parks.find(p => p.id === event.parkId);
                                const parkName = park?.name || '未知园区';
                                return (
                                    <div key={event.id} className={`p-4 hover:bg-slate-50 transition ${park?.isOwnPark ? 'bg-blue-50/30' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-500 flex items-center">
                                                {park?.isOwnPark && <Crown className="w-3 h-3 mr-1 text-blue-500" />}
                                                {parkName}
                                            </span>
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
