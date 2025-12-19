import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Card } from "../components/UI";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, Users, Wallet, CheckCircle2, DollarSign, Package 
} from "lucide-react";

// --- HELPERS ---
const formatMoney = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const getDateObject = (timestamp) => {
    if (!timestamp) return new Date();
    return timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
};

const getMonthKey = (dateObj) => {
    return dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); // e.g., "Dec 25"
};

// Generate last 12 months (including current) for X-Axis consistency
const getLast12Months = () => {
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            name: getMonthKey(d),
            _date: d
        });
    }
    return months;
};

export default function Dashboard() {
  const [stats, setStats] = useState({ 
      clients: [], 
      products: [], 
      quotes: [], 
      orders: [],
      skus: [] 
  });

  // --- 1. LOAD ALL DATA ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const subs = [
      onSnapshot(collection(db, path, 'clients'), s => setStats(p => ({...p, clients: s.docs.map(d=>d.data())}))),
      onSnapshot(collection(db, path, 'products'), s => setStats(p => ({...p, products: s.docs.map(d=>({id:d.id, ...d.data()}))}))),
      onSnapshot(collection(db, path, 'skus'), s => setStats(p => ({...p, skus: s.docs.map(d=>({id:d.id, ...d.data()}))}))),
      onSnapshot(collection(db, path, 'orders'), s => setStats(p => ({...p, orders: s.docs.map(d=>d.data())}))),
      onSnapshot(query(collection(db, path, 'quotesSent'), where('status', '==', 'Active')), s => setStats(p => ({...p, quotes: s.docs.map(d=>d.data())}))),
    ];
    return () => subs.forEach(fn => fn());
  }, []);

  // --- 2. DATA PROCESSING FOR CHARTS ---

  // A. Pipeline Logic (Revenue & Margin) - Calculated from Active Quotes
  const pipelineMetrics = useMemo(() => {
      let revenue = 0;
      let margin = 0;
      const formatMap = {};

      stats.quotes.forEach(q => {
          const rev = (q.sellingPrice || 0) * (q.moq || 0);
          const cost = (q.baseCostPrice || 0) * (q.moq || 0);
          revenue += rev;
          margin += (rev - cost);

          // Format Breakdown for Pie Chart
          const sku = stats.skus.find(s => s.id === q.skuId);
          const prod = stats.products.find(p => p.id === sku?.productId);
          const format = prod?.format || 'Other';
          
          if(!formatMap[format]) formatMap[format] = 0;
          formatMap[format] += rev;
      });

      const pieData = Object.keys(formatMap).map(k => ({ name: k, value: formatMap[k] }));
      return { revenue, margin, pieData };
  }, [stats.quotes, stats.skus, stats.products]);

  // B. Leads Trend (Last 12 Months - Stacked by Source)
  const leadsBySourceData = useMemo(() => {
      const template = getLast12Months(); // Get empty 12 months skeleton
      const grouped = {};
      
      // Initialize skeleton
      template.forEach(m => {
          grouped[m.name] = { ...m }; 
      });

      const sources = new Set();

      stats.clients.forEach(c => {
          const dateObj = getDateObject(c.leadDate || c.createdAt);
          const month = getMonthKey(dateObj);
          
          // Only count if this month exists in our 12-month window
          if (grouped[month]) {
              const source = c.leadSource || 'Unknown';
              sources.add(source);
              if (!grouped[month][source]) grouped[month][source] = 0;
              grouped[month][source] += 1;
          }
      });

      return {
          data: Object.values(grouped).sort((a,b) => a._date - b._date),
          keys: Array.from(sources)
      };
  }, [stats.clients]);

  // C. Leads Trend (Last 12 Months - Stacked by Format Interest)
  const leadsByFormatData = useMemo(() => {
      const template = getLast12Months();
      const grouped = {};
      
      template.forEach(m => {
          grouped[m.name] = { ...m }; 
      });

      const allFormats = new Set();

      stats.clients.forEach(c => {
          const dateObj = getDateObject(c.leadDate || c.createdAt);
          const month = getMonthKey(dateObj);

          if (grouped[month]) {
              const formats = Array.isArray(c.productFormats) ? c.productFormats : [];
              
              if(formats.length === 0) {
                  const key = 'Undecided';
                  allFormats.add(key);
                  if(!grouped[month][key]) grouped[month][key] = 0;
                  grouped[month][key] += 1;
              } else {
                  formats.forEach(f => {
                      allFormats.add(f);
                      if (!grouped[month][f]) grouped[month][f] = 0;
                      grouped[month][f] += 1;
                  });
              }
          }
      });

      return {
          data: Object.values(grouped).sort((a,b) => a._date - b._date),
          keys: Array.from(allFormats)
      };
  }, [stats.clients]);

  // D. Sales Booked Trend (Last 12 Months)
  const salesTrendData = useMemo(() => {
      const template = getLast12Months();
      const grouped = {};
      
      template.forEach(m => {
          grouped[m.name] = { ...m, value: 0 }; 
      });

      stats.orders.forEach(o => {
          const dateObj = getDateObject(o.date || o.createdAt);
          const month = getMonthKey(dateObj);
          
          if (grouped[month]) {
              grouped[month].value += parseFloat(o.amount || 0);
          }
      });

      return Object.values(grouped).sort((a,b) => a._date - b._date);
  }, [stats.orders]);


  // --- 3. COMPONENT RENDER ---
  const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <Card className="p-6 flex items-start justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon className="w-6 h-6" />
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            title="Total Pipeline Revenue" 
            value={formatMoney(pipelineMetrics.revenue)} 
            subtext="Based on Active Quotes"
            icon={Wallet} 
            color="blue" 
        />
        <StatCard 
            title="Projected Margin" 
            value={formatMoney(pipelineMetrics.margin)} 
            subtext={`${pipelineMetrics.revenue ? ((pipelineMetrics.margin/pipelineMetrics.revenue)*100).toFixed(1) : 0}% Profitability`}
            icon={TrendingUp} 
            color="green" 
        />
        <StatCard 
            title="Sales Booked (L12M)" 
            value={formatMoney(salesTrendData.reduce((acc, curr) => acc + curr.value, 0))} 
            subtext={`${stats.orders.length} Confirmed Orders`}
            icon={CheckCircle2} 
            color="purple" 
        />
        <StatCard 
            title="Total Active Leads" 
            value={stats.clients.filter(c => c.status !== 'Churned' && c.status !== 'Blacklisted').length} 
            subtext="Potential Clients"
            icon={Users} 
            color="orange" 
        />
      </div>

      {/* ROW 1: LEADS ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 h-[400px] flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4">Leads by Source (Last 12 Months)</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsBySourceData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}
                            cursor={{fill: '#f8fafc'}}
                          />
                          <Legend wrapperStyle={{fontSize:'11px', paddingTop:'10px'}}/>
                          {leadsBySourceData.keys.map((key, index) => (
                              <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={index === leadsBySourceData.keys.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} barSize={20} />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </Card>

          <Card className="p-6 h-[400px] flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4">Leads by Product Interest (Last 12 Months)</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsByFormatData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}
                            cursor={{fill: '#f8fafc'}}
                          />
                          <Legend wrapperStyle={{fontSize:'11px', paddingTop:'10px'}}/>
                          {leadsByFormatData.keys.map((key, index) => (
                              <Bar key={key} dataKey={key} stackId="a" fill={COLORS[(index + 2) % COLORS.length]} radius={index === leadsByFormatData.keys.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} barSize={20} />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </Card>
      </div>

      {/* ROW 2: FINANCIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend */}
          <Card className="p-6 h-[350px] lg:col-span-2 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400"/> Sales Booked Trend (Last 12 Months)</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrendData}>
                          <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                          <Tooltip 
                             formatter={(value) => formatMoney(value)}
                             contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}
                          />
                          <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </Card>

          {/* Pipeline Breakdown */}
          <Card className="p-6 h-[350px] flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-slate-400"/> Pipeline by Format</h3>
              <div className="flex-1 w-full min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={pipelineMetrics.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {pipelineMetrics.pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(val) => formatMoney(val)} />
                          <Legend wrapperStyle={{fontSize:'11px'}} />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Centered Total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total</span>
                      <span className="text-sm font-bold text-slate-800">{formatMoney(pipelineMetrics.revenue)}</span>
                  </div>
              </div>
          </Card>
      </div>
    </div>
  );
}