import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Card, Badge } from "../components/UI";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  Package, Users, CheckSquare, Wallet, TrendingUp, AlertCircle 
} from "lucide-react";

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({ products: 0, clients: 0, tasks: 0, revenue: 0 });
  const [chartData, setChartData] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);

  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;

    // 1. Listen to counts and tasks
    const subs = [
      onSnapshot(collection(db, path, 'products'), s => 
        setStats(prev => ({...prev, products: s.size}))),
      
      onSnapshot(query(collection(db, path, 'clients'), where('status', '==', 'Active')), s => 
        setStats(prev => ({...prev, clients: s.size}))),

      onSnapshot(query(collection(db, path, 'tasks'), where('status', '!=', 'Completed')), s => {
        setStats(prev => ({...prev, tasks: s.size}));
        // Get urgent tasks for the list
        const tasks = s.docs.map(d => ({id:d.id, ...d.data()}))
                         .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
                         .slice(0, 5);
        setUrgentTasks(tasks);
      }),

      onSnapshot(collection(db, path, 'quotesSent'), s => {
        const quotes = s.docs.map(d => d.data());
        // Calculate Total Pipeline
        const total = quotes.reduce((acc, q) => acc + (parseFloat(q.sellingPrice || 0) * parseFloat(q.moq || 0)), 0);
        setStats(prev => ({...prev, revenue: total}));

        // Prepare Chart Data (Last 7 Quotes)
        const data = quotes.slice(0, 7).map(q => ({
          name: q.quoteId || 'Unknown',
          value: (parseFloat(q.sellingPrice || 0) * parseFloat(q.moq || 0))
        }));
        setChartData(data);
      })
    ];

    return () => subs.forEach(fn => fn());
  }, []);

  const formatMoney = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className="p-6 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon className="w-6 h-6" />
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Executive Overview</h2>
      
      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Products" value={stats.products} icon={Package} color="blue" />
        <StatCard title="Active Clients" value={stats.clients} icon={Users} color="green" />
        <StatCard title="Pending Tasks" value={stats.tasks} icon={CheckSquare} color="red" />
        <StatCard title="Pipeline Value" value={formatMoney(stats.revenue)} icon={Wallet} color="purple" />
      </div>

      {/* CHARTS & LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section */}
        <Card className="p-6 flex flex-col h-[400px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500"/> Recent Quote Value
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Urgent Tasks */}
        <Card className="p-6 h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500"/> Urgent Actions
            </h3>
            <button onClick={() => setActiveTab('tasks')} className="text-sm text-blue-600 hover:underline">View All</button>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2">
            {urgentTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'High' ? 'bg-red-500' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="font-mono">{t.dueDate}</span>
                    {t.assignee && <span>• {t.assignee}</span>}
                  </div>
                </div>
                <Badge size="xs" color="white" className="border">
                   {t.contextType === 'Internal' ? 'Internal' : 'External'}
                </Badge>
              </div>
            ))}
            {urgentTasks.length === 0 && (
              <div className="text-center py-10 text-slate-400">No pending tasks. Great job!</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}