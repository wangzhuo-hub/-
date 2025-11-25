
import React, { useState, useEffect } from 'react';
import { Park, Building } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Trash2, Edit2, MapPin, ChevronRight, Briefcase, Info } from 'lucide-react';

interface ParkListProps {
  onSelectPark: (parkId: string) => void;
}

const ParkList: React.FC<ParkListProps> = ({ onSelectPark }) => {
  const [parks, setParks] = useState<Park[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingPark, setEditingPark] = useState<Park | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setParks(StorageService.getParks());
  }, []);

  const handleOpenModal = (park?: Park) => {
    if (park) {
        setEditingPark(park);
        setName(park.name);
        setAddress(park.address);
        setDescription(park.description || '');
    } else {
        setEditingPark(null);
        setName('');
        setAddress('');
        setDescription('');
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
        totalArea: editingPark ? editingPark.totalArea : 0, // Area is derived from buildings
        tags: editingPark?.tags || [],
        buildings: editingPark?.buildings || [], 
        createdAt: editingPark ? editingPark.createdAt : Date.now(),
    };
    StorageService.savePark(newPark);
    setParks(StorageService.getParks());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if(window.confirm('您确定要删除该园区及所有相关历史记录吗？')) {
        StorageService.deletePark(id);
        setParks(StorageService.getParks());
    }
  };

  const handleEditClick = (park: Park, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleOpenModal(park);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">园区档案</h2>
            <p className="text-slate-500 text-sm">管理周边竞品园区资料</p>
        </div>
        <button 
            onClick={() => handleOpenModal()}
            className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
        >
            <Plus className="w-4 h-4 mr-2" /> 新增园区
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parks.map(park => (
            <div 
                key={park.id} 
                onClick={() => onSelectPark(park.id)}
                className="group bg-white rounded-xl border border-slate-200 hover:border-accent shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden flex flex-col relative"
            >
                <div className="h-32 bg-slate-100 relative">
                     <img 
                        src={`https://picsum.photos/seed/${park.id}/400/200`} 
                        alt="Park cover" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                     />
                     <div className="absolute top-2 right-2 flex space-x-2 z-50" onClick={(e) => e.stopPropagation()}>
                        <button 
                            type="button"
                            onClick={(e) => handleEditClick(park, e)}
                            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-accent p-2 rounded-full shadow-sm border border-slate-100 transition-colors"
                            title="编辑"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleDelete(park.id, e)}
                            className="bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 p-2 rounded-full shadow-sm border border-slate-100 transition-colors"
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
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">
                        {park.description || '暂无描述信息。'}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {park.buildings.length} 栋楼宇
                        </span>
                        <div className="flex items-center text-accent text-sm font-medium">
                            查看详情 <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>
                </div>
            </div>
        ))}

        {parks.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                <p>暂无园区数据，请点击右上角新增园区。</p>
            </div>
        )}
      </div>

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
