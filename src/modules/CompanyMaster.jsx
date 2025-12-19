import { useState, useMemo, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Button, Badge } from "../components/UI";
import { 
  Factory, Users, Plus, MoreVertical, ChevronDown, ArrowUp, ArrowDown 
} from "lucide-react";
import DetailPanel from "./DetailPanel";

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

export default function CompanyMaster({ type }) { 
  const isVendor = type === 'vendor';
  const collectionName = isVendor ? 'vendors' : 'clients';
  
  // Data State
  const [data, setData] = useState([]);
  const [settings, setSettings] = useState({ leadSources: [], formats: [], leadStatuses: [] });
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [skus, setSkus] = useState([]);
  const [quotes, setQuotes] = useState([]);

  // Sorting & Filtering
  const [sort, setSort] = useState({ key: 'companyName', dir: 'asc' });
  const [filters, setFilters] = useState({
    companyName: '',
    status: [],
    leadSource: [],
    formats: [],
    productList: ''
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [detailView, setDetailView] = useState({ open: false, data: null });

  // --- 1. LOAD ALL DATA ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const quoteCol = isVendor ? 'quotesReceived' : 'quotesSent';

    const subs = [
      onSnapshot(collection(db, path, collectionName), (s) => setData(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'settings'), (s) => {
        const temp = {};
        s.docs.forEach(d => temp[d.id] = d.data().list || []);
        if(!temp.leadStatuses) temp.leadStatuses = ['Lead','Active','Negotiation','Churned'];
        if(!temp.formats) temp.formats = ['Powder', 'Liquid', 'Gummy'];
        if(!temp.leadSources) temp.leadSources = ['LinkedIn', 'Website'];
        setSettings(prev => ({...prev, ...temp}));
      }),
      onSnapshot(collection(db, path, 'tasks'), (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'products'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'skus'), (s) => setSkus(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, quoteCol), (s) => setQuotes(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => subs.forEach(u => u());
  }, [collectionName, isVendor]);

  // --- 2. HELPERS ---
  const crud = {
    add: (item) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, collectionName), { ...item, createdAt: serverTimestamp() }),
    update: (id, item) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, collectionName, id), item),
  };

  const formatMoney = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  const formatDate = (dateStr) => {
      if(!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  // --- 3. DERIVED DATA LOGIC ---
  const enrichedData = useMemo(() => {
    return data.map(item => {
      const openTasks = tasks.filter(t => 
        (t.relatedId === item.id || t.relatedClientId === item.id || t.relatedVendorId === item.id) 
        && t.status !== 'Completed'
      );

      const itemQuotes = quotes.filter(q => isVendor ? q.vendorId === item.id : q.clientId === item.id);
      const involvedSkuIds = [...new Set(itemQuotes.map(q => q.skuId))];
      const involvedSkus = skus.filter(s => involvedSkuIds.includes(s.id));
      const involvedProductIds = [...new Set(involvedSkus.map(s => s.productId))];
      
      const productList = products
        .filter(p => involvedProductIds.includes(p.id))
        .map(p => p.name);

      const derivedFormats = products
        .filter(p => involvedProductIds.includes(p.id))
        .map(p => p.format);
      
      const displayFormats = isVendor 
        ? [...new Set(derivedFormats)] 
        : [...new Set([...(item.productFormats || []), ...derivedFormats])]; 

      const potential = !isVendor ? itemQuotes.reduce((acc, q) => acc + (q.sellingPrice * q.moq), 0) : 0;

      return {
        ...item,
        openTaskCount: openTasks.length,
        nextTask: openTasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))[0],
        derivedProductList: productList,
        derivedFormats: displayFormats,
        salesPotential: potential
      };
    });
  }, [data, tasks, quotes, skus, products, isVendor]);

  // --- 4. FILTERING & SORTING ---
  const filteredData = useMemo(() => {
    return enrichedData.filter(item => {
      if (filters.companyName && !item.companyName?.toLowerCase().includes(filters.companyName.toLowerCase())) return false;
      if (filters.status.length > 0 && !filters.status.includes(item.status)) return false;
      if (filters.leadSource.length > 0 && !filters.leadSource.includes(item.leadSource)) return false;
      if (filters.formats.length > 0) {
         if (!item.derivedFormats.some(f => filters.formats.includes(f))) return false;
      }
      if (filters.productList) {
          if (!item.derivedProductList.some(p => p.toLowerCase().includes(filters.productList.toLowerCase()))) return false;
      }
      return true;
    }).sort((a,b) => {
      let valA = a[sort.key];
      let valB = b[sort.key];

      if(sort.key === 'salesPotential' || sort.key === 'openTaskCount') {
          valA = valA || 0;
          valB = valB || 0;
          return sort.dir === 'asc' ? valA - valB : valB - valA;
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [enrichedData, filters, sort]);

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const handleSort = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  // --- FIX: Use Settings for Filter Dropdown ---
  const statusOptions = isVendor ? [] : (settings.leadStatuses && settings.leadStatuses.length > 0 ? settings.leadStatuses : ['Lead', 'Active', 'Negotiation', 'Churned']);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isVendor ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
            {isVendor ? <Factory className="w-5 h-5"/> : <Users className="w-5 h-5"/>}
          </div>
          <h2 className="font-bold text-lg text-slate-800">{isVendor ? 'Vendor Directory' : 'Client Directory'}</h2>
        </div>
        <Button icon={Plus} onClick={() => { setFormData({ productFormats: [] }); setIsModalOpen(true); }}>New {isVendor ? 'Vendor' : 'Client'}</Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm h-[calc(100vh-220px)] flex flex-col">
        <div className="overflow-auto scroller flex-1">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 min-w-[200px] align-top">
                  <FilterHeader label="Company Name" sortKey="companyName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.companyName} onFilter={v => handleFilterChange('companyName', v)} />
                </th>
                {!isVendor && (
                  <th className="px-4 py-3 min-w-[130px] align-top">
                    <FilterHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.status} onFilter={v => handleFilterChange('status', v)} options={statusOptions} />
                  </th>
                )}
                <th className="px-4 py-3 min-w-[150px] align-top">
                  <FilterHeader label={isVendor ? "Supplied Formats" : "Format Interest"} sortKey="derivedFormats" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.formats} onFilter={v => handleFilterChange('formats', v)} options={settings.formats} />
                </th>
                {!isVendor && (
                   <th className="px-4 py-3 min-w-[180px] align-top">
                      <FilterHeader label="Pitched Products" sortKey="derivedProductList" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.productList} onFilter={v => handleFilterChange('productList', v)} />
                   </th>
                )}
                {!isVendor && (
                  <th className="px-4 py-3 min-w-[130px] align-top">
                    <FilterHeader label="Source" sortKey="leadSource" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.leadSource} onFilter={v => handleFilterChange('leadSource', v)} options={settings.leadSources} />
                  </th>
                )}
                {!isVendor && (
                   <th className="px-4 py-3 min-w-[100px] align-top">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 group" onClick={() => handleSort('leadDate')}>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Date</span>
                        {sort.key === 'leadDate' && <span className="text-[10px] text-blue-500">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                   </th>
                )}
                <th className="px-4 py-3 min-w-[120px] align-top">
                   <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600 group" onClick={() => handleSort('openTaskCount')}>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tasks</span>
                      {sort.key === 'openTaskCount' && <span className="text-[10px] text-blue-500">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                   </div>
                </th>
                {!isVendor && (
                   <th className="px-4 py-3 min-w-[120px] align-top text-right">
                      <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-blue-600 group" onClick={() => handleSort('salesPotential')}>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Potential</span>
                        {sort.key === 'salesPotential' && <span className="text-[10px] text-blue-500">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                   </th>
                )}
                <th className="px-4 py-3 align-top w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => setDetailView({ open: true, data: item })}>
                  <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${isVendor ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {item.companyName.charAt(0)}
                    </div>
                    {item.companyName}
                  </td>
                  {!isVendor && (
                    <td className="px-4 py-3">
                        <Badge color={['Active','Hot Lead'].includes(item.status)?'green':['Blacklisted','Churned'].includes(item.status)?'red':'blue'}>{item.status}</Badge>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.derivedFormats.slice(0, 2).map(f => <span key={f} className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px] text-slate-600">{f}</span>)}
                      {item.derivedFormats.length > 2 && <span className="text-[10px] text-slate-400">+{item.derivedFormats.length - 2}</span>}
                    </div>
                  </td>
                  {!isVendor && (
                    <>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                                {item.derivedProductList.slice(0, 2).map(p => <span key={p} className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-700">{p}</span>)}
                                {item.derivedProductList.length > 2 && <span className="text-[10px] text-slate-400">+{item.derivedProductList.length - 2}</span>}
                            </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.leadSource}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{formatDate(item.leadDate)}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                     {item.openTaskCount > 0 ? (
                        <div className="flex items-center gap-2">
                            <Badge color="red" size="xs">{item.openTaskCount}</Badge>
                            {item.nextTask && <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={item.nextTask.title}>{item.nextTask.title}</span>}
                        </div>
                     ) : <span className="text-slate-300 text-xs">-</span>}
                  </td>
                  {!isVendor && (
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{formatMoney(item.salesPotential)}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setFormData(item); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100"><MoreVertical className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailView.open && <DetailPanel type={type} data={detailView.data} onClose={() => setDetailView({ open: false, data: null })} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{formData.id ? 'Edit' : 'New'} {isVendor ? 'Vendor' : 'Client'}</h3>
            <div className="space-y-4">
              <input placeholder="Company Name" className="w-full p-2 border rounded" value={formData.companyName||''} onChange={e=>setFormData({...formData, companyName:e.target.value})}/>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Website" className="p-2 border rounded" value={formData.website||''} onChange={e=>setFormData({...formData, website:e.target.value})}/>
                <input placeholder="Country" className="p-2 border rounded" value={formData.country||''} onChange={e=>setFormData({...formData, country:e.target.value})}/>
              </div>
              <input placeholder="Drive Folder Link" className="w-full p-2 border rounded" value={formData.driveLink||''} onChange={e=>setFormData({...formData, driveLink:e.target.value})}/>
              
              {!isVendor && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Lead Details</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <select className="p-2 border rounded w-full" value={formData.status||''} onChange={e=>setFormData({...formData, status:e.target.value})}>
                            <option value="">Select Status...</option>
                            {(statusOptions).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="p-2 border rounded w-full" value={formData.leadSource||''} onChange={e=>setFormData({...formData, leadSource:e.target.value})}>
                            <option value="">Select Source...</option>
                            {(settings.leadSources || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Lead Date</label>
                        <input type="date" className="p-2 border rounded w-full" value={formData.leadDate||''} onChange={e=>setFormData({...formData, leadDate:e.target.value})}/>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Product Format Interest</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border p-2 rounded">
                        {(settings.formats || []).map(fmt => (
                            <label key={fmt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input 
                                    type="checkbox" 
                                    checked={(formData.productFormats || []).includes(fmt)}
                                    onChange={(e) => {
                                        const current = formData.productFormats || [];
                                        const updated = e.target.checked ? [...current, fmt] : current.filter(f => f !== fmt);
                                        setFormData({...formData, productFormats: updated});
                                    }}
                                    className="rounded text-blue-600 focus:ring-0"
                                />
                                {fmt}
                            </label>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { 
                if(formData.id) crud.update(formData.id, formData);
                else crud.add(formData);
                setIsModalOpen(false); 
              }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}