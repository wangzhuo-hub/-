import React, { useState } from 'react';
import { Park, SurveyRecord } from '../types';
import { X, Upload, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface SurveyFormProps {
  park: Park;
  existingSurvey?: SurveyRecord | null;
  previousSurvey?: SurveyRecord;
  onSave: (record: SurveyRecord) => void;
  onClose: () => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ park, existingSurvey, previousSurvey, onSave, onClose }) => {
  const [buildingId, setBuildingId] = useState(existingSurvey?.buildingId || (park.buildings[0]?.id || ''));
  const [date, setDate] = useState(existingSurvey?.date || new Date().toISOString().split('T')[0]);
  const [occupancyRate, setOccupancyRate] = useState(existingSurvey?.occupancyRate || 0);
  const [rentPrice, setRentPrice] = useState<number | ''>(existingSurvey?.rentPrice || '');
  const [commission, setCommission] = useState(existingSurvey?.commission || '');
  const [deliveryStandard, setDeliveryStandard] = useState(existingSurvey?.deliveryStandard || '标准装修');
  const [responsiblePerson, setResponsiblePerson] = useState(existingSurvey?.responsiblePerson || '');
  const [marketAnalysis, setMarketAnalysis] = useState(existingSurvey?.marketAnalysis || '');
  const [significantEvents, setSignificantEvents] = useState(existingSurvey?.significantEvents || '');
  const [photos, setPhotos] = useState<string[]>(existingSurvey?.photos || []);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const generateAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await GeminiService.analyzeSurveyEntry(
        park.name, 
        { occupancyRate, rentPrice: Number(rentPrice), commission, deliveryStandard, significantEvents },
        previousSurvey
    );
    setMarketAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: SurveyRecord = {
      id: existingSurvey ? existingSurvey.id : `s-${Date.now()}`,
      parkId: park.id,
      buildingId,
      date,
      occupancyRate: Number(occupancyRate),
      rentPrice: Number(rentPrice),
      commission,
      deliveryStandard,
      responsiblePerson,
      photos,
      marketAnalysis,
      significantEvents,
      timestamp: existingSurvey ? existingSurvey.timestamp : Date.now(),
    };
    onSave(record);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-slate-800">
            {existingSurvey ? '编辑调研记录' : '新增市场调研'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">调研楼栋</label>
              <select 
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              >
                {park.buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">调研日期</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">更新负责人</label>
              <input 
                type="text"
                required
                placeholder="姓名"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">预计出租率 (%)</label>
              <input 
                type="number"
                min="0"
                max="100"
                required
                value={occupancyRate}
                onChange={(e) => setOccupancyRate(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">租金报价 (元/天/㎡)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="0.0"
                value={rentPrice}
                onChange={(e) => setRentPrice(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">中介费标准</label>
              <input 
                type="text"
                required
                placeholder="例如：1.5个月"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">交付标准</label>
              <select 
                value={deliveryStandard}
                onChange={(e) => setDeliveryStandard(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent outline-none"
              >
                <option>毛坯</option>
                <option>标准装修</option>
                <option>精装修</option>
                <option>定制装修</option>
                <option>其他</option>
              </select>
            </div>
          </div>

          {/* Significant Events */}
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">重大事件反馈</label>
             <textarea 
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent outline-none h-20 resize-none"
                value={significantEvents}
                onChange={(e) => setSignificantEvents(e.target.value)}
                placeholder="例如：新开通地铁口、引入总部企业、物业更换等..."
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">现场照片</label>
            <div className="grid grid-cols-4 gap-4 mb-2">
                {photos.map((p, i) => (
                    <div key={i} className="relative h-20 w-full rounded-lg overflow-hidden group">
                        <img src={p} alt="Site" className="h-full w-full object-cover" />
                        <button 
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition z-10"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                 <label className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:text-accent text-slate-400 transition">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs">上传照片</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            </div>
          </div>

          {/* Analysis */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
                    市场趋势分析
                </label>
                <button 
                    type="button" 
                    onClick={generateAnalysis}
                    disabled={isAnalyzing}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition flex items-center"
                >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {marketAnalysis ? '重新分析' : '智能分析'}
                </button>
            </div>
            <textarea 
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent outline-none h-24"
                value={marketAnalysis}
                onChange={(e) => setMarketAnalysis(e.target.value)}
                placeholder="手动输入分析内容或点击上方按钮进行AI生成..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
             <button 
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
            >
                取消
            </button>
            <button 
                type="submit"
                className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-blue-600 transition shadow-sm font-medium"
            >
                保存记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyForm;