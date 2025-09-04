import React, { useState, useEffect } from 'react';
import { Users, DollarSign, ShoppingCart, Crown, Shield, Lock } from 'lucide-react';
import { LoginModal } from './components/LoginScreen';
import { MembersTab } from './components/MembersTab';
import { ExpendituresTab } from './components/ExpendituresTab';
import { OrdersTab } from './components/OrdersTab';
import { Toaster } from './components/ui/toaster';
import './styles/globals.css';

export type UserMode = 'admin' | 'gangmember' | 'viewer2';

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

  // Filter tabs based on user role - only show orders tab to admin and gangmember
  const getAllTabs = () => [
    { id: 'members', label: 'Gang Members', icon: Users },
    { id: 'expenditures', label: 'Money Moves', icon: DollarSign },
    { id: 'orders', label: 'Arsenal Orders', icon: ShoppingCart },
  ];

  const getVisibleTabs = () => {
    const allTabs = getAllTabs();
    if (userMode === 'admin' || userMode === 'gangmember') {
      return allTabs; // Show all tabs including orders
    } else {
      return allTabs.filter(tab => tab.id !== 'orders'); // Hide orders tab for viewer2
    }
  };

  const tabs = getVisibleTabs();

  const isAdmin = userMode === 'admin';

  return (
    <>
      <div
  className="min-h-screen bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage: "url('https://media.discordapp.net/attachments/1411285098438852728/1413154504790245426/FYB.webp?ex=68bae631&is=68b994b1&hm=3204f5ab817974572f1e6379e0cdd16c301129de9bec4cb11f343631b5d61bb2&=&format=webp&width=1349&height=758')"
  }}
>

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
<img
  src="https://media.discordapp.net/attachments/1411285098438852728/1413154504353906809/9AAE2F5A-8ACB-47B8-B481-6FC722588F40.webp?ex=68bae630&is=68b994b0&hm=52e3794431f6c522d2d4431ad9faa9164d6b3447333019a4d5a0042d41777001&=&format=webp&width=758&height=758"
  alt="FYB Logo"
  className="w-10 h-10 rounded-lg object-cover"
/>

                <div>
                  <h1 className="text-xl font-bold text-white">FYB Gang System</h1>
                  <p className="text-xs text-purple-300">Loyalty meets street</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-purple-600/20 rounded-full border border-purple-500/30">
                {userMode === 'admin' ? (
                  <>
                    <Shield className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">Leader</span>
                  </>
                ) : userMode === 'gangmember' ? (
                  <>
                    <Users className="w-4 h-4 text-purple-300" />
                    <span className="text-sm font-medium text-purple-300">Gang Member</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400">Guest Viewer</span>
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
        
        {activeTab === 'orders' && (userMode === 'admin' || userMode === 'gangmember') && (
          <OrdersTab
            userMode={userMode}
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
