import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Button, Badge } from "../components/UI";
import { 
  Wallet, Plus, Search, FileText, ArrowRight, ExternalLink, 
  Trash2, Edit, TrendingUp, AlertCircle 
} from "lucide-react";

export default function QuotesModule() {
  const [view, setView] = useState('sales'); // 'sales' or 'purchase'
  const [search, setSearch] = useState("");
  
  // Data Collections
  const [quotesReceived, setQuotesReceived] = useState([]);
  const [quotesSent, setQuotesSent] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [skus, setSkus] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  // --- 1. LOAD ALL REQUIRED DATA ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const subs = [
      onSnapshot(collection(db, path, 'quotesReceived'), s => setQuotesReceived(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'quotesSent'), s => setQuotesSent(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'vendors'), s => setVendors(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'clients'), s => setClients(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'skus'), s => setSkus(s.docs.map(d => ({id:d.id, ...d.data()}))))
    ];
    return () => subs.forEach(fn => fn());
  }, []);

  // --- 2. HELPERS ---
  const crud = {
    add: (col, data) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, col), { ...data, createdAt: serverTimestamp() }),
    update: (col, id, data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id), data),
    del: (col, id) => { if(confirm('Delete quote?')) deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id)); }
  };

  const formatMoney = (amount, currency='INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
  };

  // --- 3. RENDERERS ---
  const renderPurchaseTable = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm animate-fade-in">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
          <tr>
            <th className="px-4 py-3">Quote ID</th>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3 text-right">Unit Price</th>
            <th className="px-4 py-3 text-right">MOQ</th>
            <th className="px-4 py-3 text-right">Total Inv.</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {quotesReceived.filter(q => q.quoteId?.includes(search)).map(q => {
            const v = vendors.find(x => x.id === q.vendorId);
            const s = skus.find(x => x.id === q.skuId);
            return (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{q.quoteId}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{v?.companyName || 'Unknown'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s?.name || 'Unknown SKU'}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatMoney(q.price, q.currency)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{q.moq}</td>
                <td className="px-4 py-3 text-right font-medium text-purple-700">{formatMoney(q.price * q.moq, q.currency)}</td>
                <td className="px-4 py-3 text-right flex justify-end gap-2">
                  <button onClick={() => { setFormData(q); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => crud.del('quotesReceived', q.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSalesTable = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm animate-fade-in">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3 text-right">Sell Price</th>
            <th className="px-4 py-3 text-right">Margin</th>
            <th className="px-4 py-3 text-right">Total Deal</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {quotesSent.filter(q => q.quoteId?.includes(search)).map(q => {
            const c = clients.find(x => x.id === q.clientId);
            const s = skus.find(x => x.id === q.skuId);
            const totalRevenue = q.sellingPrice * q.moq;
            const totalCost = (q.baseCostPrice || 0) * q.moq;
            const margin = totalRevenue - totalCost;
            
            return (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Badge color={q.status === 'Active' ? 'green' : 'slate'}>{q.status || 'Draft'}</Badge></td>
                <td className="px-4 py-3 font-medium text-slate-800">{c?.companyName || 'Unknown'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s?.name || 'Unknown SKU'}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatMoney(q.sellingPrice)}</td>
                <td className={`px-4 py-3 text-right font-bold ${margin > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatMoney(margin)}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-700">{formatMoney(totalRevenue)}</td>
                <td className="px-4 py-3 text-right flex justify-end gap-2">
                  <button onClick={() => { setFormData(q); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => crud.del('quotesSent', q.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // --- 4. MAIN RENDER ---
  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 rounded p-1">
          <button onClick={() => setView('sales')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${view==='sales' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Sales Quotes (Out)</button>
          <button onClick={() => setView('purchase')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${view==='purchase' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Purchase Quotes (In)</button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
            <input 
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 ring-blue-100 outline-none w-full md:w-64" 
              placeholder="Search Quote ID..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <Button icon={Plus} onClick={() => { setFormData({}); setIsModalOpen(true); }}>New Quote</Button>
        </div>
      </div>

      {view === 'purchase' ? renderPurchaseTable() : renderSalesTable()}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-lg mb-4">{formData.id ? 'Edit' : 'New'} {view === 'purchase' ? 'Purchase' : 'Sales'} Quote</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Quote ID (e.g. Q-1001)" className="p-2 border rounded" value={formData.quoteId||''} onChange={e=>setFormData({...formData, quoteId:e.target.value})}/>
                <input type="number" placeholder="MOQ" className="p-2 border rounded" value={formData.moq||''} onChange={e=>setFormData({...formData, moq:e.target.value})}/>
              </div>

              {/* Company & SKU Selectors */}
              <div className="grid grid-cols-2 gap-4">
                {view === 'purchase' ? (
                  <select className="p-2 border rounded" value={formData.vendorId||''} onChange={e=>setFormData({...formData, vendorId:e.target.value})}>
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                  </select>
                ) : (
                  <select className="p-2 border rounded" value={formData.clientId||''} onChange={e=>setFormData({...formData, clientId:e.target.value})}>
                    <option value="">Select Client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                )}
                <select className="p-2 border rounded" value={formData.skuId||''} onChange={e=>setFormData({...formData, skuId:e.target.value})}>
                  <option value="">Select SKU...</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder={view==='purchase'?'Unit Price':'Selling Price'} className="p-2 border rounded" value={view==='purchase'?formData.price:formData.sellingPrice} onChange={e=>setFormData({...formData, [view==='purchase'?'price':'sellingPrice']:e.target.value})}/>
                <select className="p-2 border rounded" value={formData.currency||'INR'} onChange={e=>setFormData({...formData, currency:e.target.value})}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <input placeholder="Drive Link to Quote Doc" className="w-full p-2 border rounded" value={formData.driveLink||''} onChange={e=>setFormData({...formData, driveLink:e.target.value})}/>

              {/* SALES ONLY: Base Cost & Status */}
              {view === 'sales' && (
                <>
                  <div className="border-t pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase">Base Cost Reference</label>
                    <input type="number" placeholder="Base Cost (Manual Override)" className="w-full p-2 border rounded mt-1" value={formData.baseCostPrice||''} onChange={e=>setFormData({...formData, baseCostPrice:e.target.value})}/>
                  </div>
                  <select className="w-full p-2 border rounded" value={formData.status||'Draft'} onChange={e=>setFormData({...formData, status:e.target.value})}>
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Lost">Lost</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { 
                const col = view === 'purchase' ? 'quotesReceived' : 'quotesSent';
                if(formData.id) crud.update(col, formData.id, formData);
                else crud.add(col, formData);
                setIsModalOpen(false); 
              }}>Save Quote</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}