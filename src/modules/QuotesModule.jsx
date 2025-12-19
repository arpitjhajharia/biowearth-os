import { useState, useMemo, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Button, Badge } from "../components/UI";
import { 
  Plus, Search, ArrowUp, ArrowDown, ChevronDown, Edit, Trash2, FileText, ExternalLink 
} from "lucide-react";

// --- HELPER: Filter Header ---
const FilterHeader = ({ label, sortKey, currentSort, onSort, filterType, filterValue, onFilter, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMultiSelect = (option) => {
    const current = Array.isArray(filterValue) ? filterValue : [];
    const updated = current.includes(option) ? current.filter(i => i !== option) : [...current, option];
    onFilter(updated);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 group select-none" onClick={() => onSort(sortKey)}>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-slate-300 group-hover:text-blue-500">
          {currentSort.key === sortKey ? (currentSort.dir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowDown className="w-3 h-3 opacity-0 group-hover:opacity-50"/>}
        </span>
      </div>
      
      {filterType === 'text' && (
        <input 
          className="w-full text-xs p-1 border border-slate-200 rounded font-normal focus:ring-1 focus:ring-blue-200 outline-none" 
          placeholder={`Filter...`}
          value={filterValue || ''} 
          onChange={e => onFilter(e.target.value)}
          onClick={e => e.stopPropagation()}
        />
      )}

      {filterType === 'multi-select' && (
        <div className="relative" ref={ref}>
          <div 
            className="w-full text-xs p-1 border border-slate-200 rounded font-normal bg-white cursor-pointer flex justify-between items-center"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          >
            <span className="truncate text-slate-600">
              {(!filterValue || filterValue.length === 0) ? 'All' : `${filterValue.length} selected`}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400"/>
          </div>
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
              <div className="mb-2 pb-2 border-b border-slate-100 flex justify-between">
                <button className="text-[10px] text-blue-600 hover:underline" onClick={()=>onFilter([])}>Clear</button>
                <button className="text-[10px] text-blue-600 hover:underline" onClick={()=>onFilter(options)}>Select All</button>
              </div>
              {options.map(opt => (
                <label key={opt} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-xs rounded">
                  <input 
                    type="checkbox" 
                    checked={(filterValue || []).includes(opt)} 
                    onChange={() => handleMultiSelect(opt)}
                    className="rounded text-blue-600 focus:ring-0 w-3 h-3 border-slate-300"
                  />
                  <span className="truncate text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function QuotesModule() {
  const [view, setView] = useState('sales'); // 'sales' or 'purchase'
  
  // Data
  const [quotesReceived, setQuotesReceived] = useState([]);
  const [quotesSent, setQuotesSent] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [skus, setSkus] = useState([]);

  // Sorting & Filtering State
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
  const [filters, setFilters] = useState({
    clientName: '',
    vendorName: '',
    skuName: '',
    status: [],
    quoteId: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

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

  const crud = {
    add: (col, data) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, col), { ...data, createdAt: serverTimestamp() }),
    update: (col, id, data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id), data),
    del: (col, id) => { if(confirm('Delete quote?')) deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id)); }
  };

  const formatMoney = (amount, currency='INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);

  // Filter Purchase Quotes for Base Cost Selection
  const availableBaseCosts = useMemo(() => {
    if (view === 'sales' && formData.skuId) {
      return quotesReceived.filter(q => q.skuId === formData.skuId);
    }
    return [];
  }, [view, formData.skuId, quotesReceived]);

  const formStats = useMemo(() => {
    if (view === 'sales') {
      const revenue = (formData.sellingPrice || 0) * (formData.moq || 0);
      const cost = (formData.baseCostPrice || 0) * (formData.moq || 0);
      return { revenue, margin: revenue - cost };
    }
    return {};
  }, [formData, view]);

  const handleSort = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const handleFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  // --- FILTERED DATA LOGIC ---
  const filteredData = useMemo(() => {
    const rawData = view === 'sales' ? quotesSent : quotesReceived;
    
    return rawData.map(q => {
        // Enrich data for filtering/sorting
        const client = view === 'sales' ? clients.find(c => c.id === q.clientId) : null;
        const vendor = view === 'purchase' ? vendors.find(v => v.id === q.vendorId) : null;
        const sku = skus.find(s => s.id === q.skuId);
        
        // Calcs for Sales
        const totalValue = view === 'sales' ? (q.sellingPrice * q.moq) : (q.price * q.moq);
        const marginAmt = view === 'sales' ? (totalValue - ((q.baseCostPrice||0) * q.moq)) : 0;
        const marginPct = view === 'sales' && q.baseCostPrice ? ((q.sellingPrice - q.baseCostPrice)/q.baseCostPrice)*100 : 0;

        return {
            ...q,
            clientName: client?.companyName || '',
            vendorName: vendor?.companyName || '',
            skuName: sku?.name || '',
            totalValue,
            marginAmt,
            marginPct
        };
    }).filter(item => {
        if(filters.quoteId && !item.quoteId?.toLowerCase().includes(filters.quoteId.toLowerCase())) return false;
        if(filters.skuName && !item.skuName?.toLowerCase().includes(filters.skuName.toLowerCase())) return false;
        
        if(view === 'sales') {
            if(filters.clientName && !item.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
            if(filters.status.length > 0 && !filters.status.includes(item.status)) return false;
        } else {
            if(filters.vendorName && !item.vendorName?.toLowerCase().includes(filters.vendorName.toLowerCase())) return false;
        }
        return true;
    }).sort((a,b) => {
        let valA = a[sort.key];
        let valB = b[sort.key];
        
        // String sort
        if(typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = (valB || '').toLowerCase();
            return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        // Number sort
        return sort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [quotesSent, quotesReceived, view, filters, sort, clients, vendors, skus]);

  const renderPurchaseTable = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm h-[calc(100vh-200px)] flex flex-col">
      <div className="overflow-auto scroller flex-1">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
                <th className="px-4 py-3 min-w-[100px]"><FilterHeader label="Quote ID" sortKey="quoteId" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.quoteId} onFilter={v=>handleFilter('quoteId',v)} /></th>
                <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="Vendor" sortKey="vendorName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.vendorName} onFilter={v=>handleFilter('vendorName',v)} /></th>
                <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="SKU" sortKey="skuName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.skuName} onFilter={v=>handleFilter('skuName',v)} /></th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('moq')}>MOQ {sort.key==='moq'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('price')}>Price {sort.key==='price'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('totalValue')}>Total {sort.key==='totalValue'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 text-center">Doc</th>
                <th className="px-4 py-3 text-right w-20"></th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredData.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{q.quoteId}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{q.vendorName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{q.skuName}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{q.moq}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatMoney(q.price, q.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-purple-700">{formatMoney(q.totalValue, q.currency)}</td>
                    <td className="px-4 py-3 text-center">
                        {q.driveLink ? <a href={q.driveLink} target="_blank" className="text-blue-500 hover:text-blue-700 inline-block"><FileText className="w-4 h-4"/></a> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormData(q); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => crud.del('quotesReceived', q.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
      </div>
    </div>
  );

  const renderSalesTable = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm h-[calc(100vh-200px)] flex flex-col">
      <div className="overflow-auto scroller flex-1">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
                <th className="px-4 py-3 min-w-[100px]"><FilterHeader label="ID" sortKey="quoteId" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.quoteId} onFilter={v=>handleFilter('quoteId',v)} /></th>
                <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="Client" sortKey="clientName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.clientName} onFilter={v=>handleFilter('clientName',v)} /></th>
                <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="SKU" sortKey="skuName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.skuName} onFilter={v=>handleFilter('skuName',v)} /></th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('sellingPrice')}>Rate (MOQ) {sort.key==='sellingPrice'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('totalValue')}>Total Sales {sort.key==='totalValue'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 min-w-[120px]"><FilterHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.status} onFilter={v=>handleFilter('status',v)} options={['Draft','Active','Closed','Lost']} /></th>
                <th className="px-4 py-3 text-left">Base Cost Context</th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-blue-600" onClick={()=>handleSort('marginAmt')}>Margin {sort.key==='marginAmt'&&(sort.dir==='asc'?'↑':'↓')}</th>
                <th className="px-4 py-3 text-center">Doc</th>
                <th className="px-4 py-3 text-right w-20"></th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filteredData.map(q => {
                const baseQuote = quotesReceived.find(bq => bq.id === q.baseCostId);
                const baseVendor = vendors.find(v => v.id === baseQuote?.vendorId);
                
                return (
                    <tr key={q.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{q.quoteId}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{q.clientName}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{q.skuName}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                            <div>{formatMoney(q.sellingPrice)}</div>
                            <div className="text-[10px] text-slate-400">({q.moq} u)</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-blue-700">{formatMoney(q.totalValue)}</td>
                        <td className="px-4 py-3"><Badge color={q.status === 'Active' ? 'green' : q.status === 'Closed' ? 'slate' : 'yellow'}>{q.status || 'Draft'}</Badge></td>
                        <td className="px-4 py-3">
                            {baseQuote ? (
                                <div className="text-xs wrap-text text-slate-500">
                                    <span className="font-medium text-slate-700">{baseVendor?.companyName || 'Unknown'}</span> @ {formatMoney(baseQuote.price)}
                                </div>
                            ) : <span className="text-xs text-red-300">No Base Link</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <div className={`text-sm font-bold ${q.marginAmt > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(q.marginAmt)}</div>
                            <div className={`text-[10px] ${q.marginAmt > 0 ? 'text-green-600' : 'text-red-600'}`}>({q.marginPct.toFixed(1)}%)</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                            {q.driveLink ? <a href={q.driveLink} target="_blank" className="text-blue-500 hover:text-blue-700 inline-block"><FileText className="w-4 h-4"/></a> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setFormData(q); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => crud.del('quotesSent', q.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                        </td>
                    </tr>
                );
            })}
            </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 rounded p-1">
          <button onClick={() => setView('sales')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${view==='sales' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Sales Quotes (Out)</button>
          <button onClick={() => setView('purchase')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${view==='purchase' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Purchase Quotes (In)</button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button icon={Plus} onClick={() => { setFormData({}); setIsModalOpen(true); }}>New Quote</Button>
        </div>
      </div>

      {view === 'purchase' ? renderPurchaseTable() : renderSalesTable()}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{formData.id ? 'Edit' : 'New'} {view === 'purchase' ? 'Purchase' : 'Sales'} Quote</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Quote ID (e.g. Q-1001)" className="p-2 border rounded" value={formData.quoteId||''} onChange={e=>setFormData({...formData, quoteId:e.target.value})}/>
                <input type="number" placeholder="MOQ" className="p-2 border rounded" value={formData.moq||''} onChange={e=>setFormData({...formData, moq:e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {view === 'purchase' ? (
                  <select className="p-2 border rounded" value={formData.vendorId||''} onChange={e=>setFormData({...formData, vendorId:e.target.value})}><option value="">Select Vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}</select>
                ) : (
                  <select className="p-2 border rounded" value={formData.clientId||''} onChange={e=>setFormData({...formData, clientId:e.target.value})}><option value="">Select Client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select>
                )}
                <select className="p-2 border rounded" value={formData.skuId||''} onChange={e=>setFormData({...formData, skuId:e.target.value})}><option value="">Select SKU...</option>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder={view==='purchase'?'Unit Price':'Selling Price'} className="p-2 border rounded" value={view==='purchase'?formData.price:formData.sellingPrice} onChange={e=>setFormData({...formData, [view==='purchase'?'price':'sellingPrice']:e.target.value})}/>
                <select className="p-2 border rounded" value={formData.currency||'INR'} onChange={e=>setFormData({...formData, currency:e.target.value})}><option value="INR">INR</option><option value="USD">USD</option></select>
              </div>
              
              <input placeholder="Drive Link to Quote Doc" className="w-full p-2 border rounded" value={formData.driveLink||''} onChange={e=>setFormData({...formData, driveLink:e.target.value})}/>

              {view === 'sales' && (
                <>
                  <div className="border-t pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Link Base Cost (Select Vendor Quote)</label>
                    {availableBaseCosts.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2 bg-slate-50">
                        {availableBaseCosts.map(bc => {
                          const v = vendors.find(ven => ven.id === bc.vendorId);
                          return (
                            <label key={bc.id} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                              <input 
                                type="radio" 
                                name="baseCost" 
                                checked={formData.baseCostId === bc.id}
                                onChange={() => setFormData({...formData, baseCostId: bc.id, baseCostPrice: bc.price})}
                                className="text-blue-600"
                              />
                              <span>
                                <span className="font-bold text-slate-700">{v?.companyName}</span>: {formatMoney(bc.price)} (MOQ: {bc.moq})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : <div className="text-xs text-slate-400 italic">No purchase quotes available for this SKU.</div>}
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold">Projected Margin</div>
                    <div className={`text-xl font-bold ${formStats.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatMoney(formStats.margin)}</div>
                  </div>

                  <select className="w-full p-2 border rounded" value={formData.status||'Draft'} onChange={e=>setFormData({...formData, status:e.target.value})}><option value="Draft">Draft</option><option value="Active">Active</option><option value="Closed">Closed</option></select>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={() => { const col = view === 'purchase' ? 'quotesReceived' : 'quotesSent'; if(formData.id) crud.update(col, formData.id, formData); else crud.add(col, formData); setIsModalOpen(false); }}>Save Quote</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}