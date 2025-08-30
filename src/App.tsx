import React, { useState, useEffect } from 'react';
import { Users, DollarSign, ShoppingCart, Crown, Shield, Lock } from 'lucide-react';
import { LoginModal } from './components/LoginScreen';
import { MembersTab } from './components/MembersTab';
import { ExpendituresTab } from './components/ExpendituresTab';
import { OrdersTab } from './components/OrdersTab';
import { Toaster } from './components/ui/toaster';
import './styles/globals.css';

export type UserMode = 'admin' | 'viewer';

function App() {
  const [userMode, setUserMode] = useState<UserMode | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  const handleLogin = (mode: UserMode) => {
    setUserMode(mode);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUserMode(null);
    setShowLoginModal(true);
    setActiveTab('members');
  };
  const tabs = [
    { id: 'members', label: 'Gang Members', icon: Users },
    { id: 'expenditures', label: 'Money Moves', icon: DollarSign },
    { id: 'orders', label: 'Arsenal Orders', icon: ShoppingCart },
  ];

  const isAdmin = userMode === 'admin';

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Login Modal */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => {}} 
          onLogin={handleLogin} 
        />

      {/* Header */}
        {userMode && (
          <header className="bg-black/30 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">FYB Gang System</h1>
                  <p className="text-xs text-purple-300">Loyalty meets street</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-purple-600/20 rounded-full border border-purple-500/30">
                {isAdmin ? (
                  <>
                    <Shield className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Management</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-purple-300" />
                    <span className="text-sm font-medium text-purple-300">Lookout</span>
                  </>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg border border-red-500/30 transition-all duration-200"
                title="Don't snitch! 🕶️"
              >
                <Lock className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Dip Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
        )}

      {/* Navigation Tabs */}
        {userMode && (
          <nav className="bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-purple-200 hover:text-purple-300 hover:border-purple-500/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
        )}

      {/* Main Content */}
        {userMode && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'members' && (
          <MembersTab
            isAdmin={isAdmin}
          />
        )}
        
        {activeTab === 'expenditures' && (
          <ExpendituresTab
            isAdmin={isAdmin}
          />
        )}
        
        {activeTab === 'orders' && (
          <OrdersTab
            isAdmin={isAdmin}
          />
        )}
      </main>
        )}

      {/* Footer */}
        {/* Footer */}
      {userMode && (
        <footer className="bg-black/30 backdrop-blur-sm border-t border-purple-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center text-sm text-purple-300">
            <p>Loyalty meets street | Never give up 🔥 | StorymodeByChoice 💯💜</p>
            <p className="text-purple-400 text-right">
              Created By Tatya Vinchu <span className="text-purple-300">(@Om006)</span>
            </p>
          </div>
        </footer>
      )}
    </div>

      
      <Toaster />
    </>
  );
}

export default App;
