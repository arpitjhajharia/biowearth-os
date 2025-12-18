import Dashboard from "./modules/Dashboard";
import AdminPanel from "./modules/AdminPanel";
import QuotesModule from "./modules/QuotesModule";
import CompanyMaster from "./modules/CompanyMaster";
import ProductMaster from "./modules/ProductMaster";
import TaskBoard from "./modules/TaskBoard";
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import LoginScreen from "./modules/LoginScreen";
import { 
  LayoutDashboard, Package, Factory, Users, 
  Wallet, CheckSquare, Shield, LogOut 
} from "lucide-react";
// Placeholder Components (We will build these next)
const Placeholder = ({ title }) => <div className="p-10 text-slate-400 text-xl font-bold">🚧 {title} Module Coming Soon</div>;

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // If not logged in, show Login Screen
  if (!user) return <LoginScreen />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'vendors', label: 'Vendors', icon: Factory },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'quotes', label: 'Quotes', icon: Wallet },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ];

  if (user.role === 'Admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      {/* HEADER */}
      <header className="fixed top-0 w-full h-16 bg-slate-900 text-white z-40 flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg">B</div>
          <span className="font-bold tracking-tight text-lg hidden md:block">Biowearth OS</span>
        </div>
        
        {/* DESKTOP NAV */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(i => (
            <button 
              key={i.id} 
              onClick={() => setActiveTab(i.id)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === i.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <i.icon className="w-4 h-4" /> {i.label}
            </button>
          ))}
        </nav>

        {/* USER PROFILE */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold">{user.name}</div>
            <div className="text-[10px] text-blue-400 uppercase tracking-wider">{user.role}</div>
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="pt-20 pb-24 lg:pt-20 lg:pb-8 px-4 lg:px-8 max-w-7xl mx-auto">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'products' && <ProductMaster />}
        {activeTab === 'vendors' && <CompanyMaster type="vendor" />}
        {activeTab === 'clients' && <CompanyMaster type="client" />}
        {activeTab === 'quotes' && <QuotesModule />}
        {activeTab === 'tasks' && <TaskBoard />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-40 flex justify-around py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map(i => (
          <button 
            key={i.id} 
            onClick={() => setActiveTab(i.id)} 
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === i.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{i.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;