import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ParkList from './components/ParkList';
import ParkDetail from './components/ParkDetail';
import { StorageService } from './services/storageService';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);

  useEffect(() => {
    StorageService.init();
  }, []);

  const handleSelectPark = (parkId: string) => {
    setSelectedParkId(parkId);
    setCurrentView(ViewState.PARK_DETAIL);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.PARK_LIST:
        return <ParkList onSelectPark={handleSelectPark} />;
      case ViewState.PARK_DETAIL:
        if (selectedParkId) {
            return (
                <ParkDetail 
                    parkId={selectedParkId} 
                    onBack={() => setCurrentView(ViewState.PARK_LIST)} 
                />
            );
        }
        return <ParkList onSelectPark={handleSelectPark} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
