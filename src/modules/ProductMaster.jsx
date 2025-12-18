import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Card, Button, Badge } from "../components/UI";
import { 
  Plus, Search, ChevronDown, ChevronRight, 
  Edit, Trash2, Link, Filter, X 
} from "lucide-react";

// --- NEW COMPONENT: Active Quotes Popup ---
const ActiveQuotesModal = ({ isOpen, onClose, product, skus, quotes, clients }) => {
  if (!isOpen || !product) return null;

  // Find all quotes for this product's SKUs that are "Active"
  const relevantSkuIds = skus.filter(s => s.productId === product.id).map(s => s.id);
  const activeQuotes = quotes.filter(q => relevantSkuIds.includes(q.skuId) && q.status === 'Active');

  const formatMoney = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Active Sales Quotes</h2>
            <p className="text-sm text-slate-500">Product: <span className="font-bold text-blue-600">{product.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-0 overflow-y-auto scroller">
          {activeQuotes.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Variant</th>
                  <th className="px-6 py-3 text-right">Selling Price</th>
                  <th className="px-6 py-3 text-right">Margin</th>
                  <th className="px-6 py-3 text-right">Total Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeQuotes.map(q => {
                  const client = clients.find(c => c.id === q.clientId);
                  const sku = skus.find(s => s.id === q.skuId);
                  const revenue = q.sellingPrice * q.moq;
                  const cost = (q.baseCostPrice || 0) * q.moq;
                  const margin = revenue - cost;
                  const marginPct = cost > 0 ? ((margin/cost)*100).toFixed(1) : 0;

                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{client?.companyName || 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium">{sku?.variant}</div>
                        <div className="text-xs text-slate-400">{sku?.packSize}{sku?.unit} • {sku?.packType}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{formatMoney(q.sellingPrice)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className={`font-bold ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(margin)}</div>
                        <div className="text-[10px] text-slate-400">{marginPct}%</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatMoney(revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center">
              <div className="bg-slate-100 p-4 rounded-full mb-3"><Search className="w-6 h-6 text-slate-300"/></div>
              <p>No active quotes found for this product.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ProductMaster() {
  const [products, setProducts] = useState([]);
  const [skus, setSkus] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotesReceived, setQuotesReceived] = useState([]);
  const [quotesSent, setQuotesSent] = useState([]);

  const [expandedProduct, setExpandedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); 
  const [formData, setFormData] = useState({});
  
  // Active Quotes Popup State
  const [activeQuotesView, setActiveQuotesView] = useState({ open: false, productId: null });

  // --- 1. DATA LOADING ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const subs = [
      onSnapshot(collection(db, path, 'products'), s => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'skus'), s => setSkus(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'vendors'), s => setVendors(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'clients'), s => setClients(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'quotesReceived'), s => setQuotesReceived(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'quotesSent'), s => setQuotesSent(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => subs.forEach(fn => fn());
  }, []);

  const crud = {
    add: (col, data) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, col), { ...data, createdAt: serverTimestamp() }),
    update: (col, id, data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id), data),
    del: (col, id) => { if(confirm('Delete record?')) deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, col, id)); }
  };

  useEffect(() => {
    if (modalType === 'sku' && !formData.id) {
      const { productName='PROD', variant='VAR', packSize='1', unit='KG', packType='BOX', flavour='PLAIN' } = formData;
      const skuCode = `${productName}-${variant}-${packSize}${unit}-${packType}-${flavour}`.toUpperCase().replace(/\s+/g,'-');
      setFormData(prev => ({...prev, name: skuCode}));
    }
  }, [formData.variant, formData.packSize, formData.unit, formData.packType, formData.flavour, modalType]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterFormat !== 'All' && p.format !== filterFormat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [products, search, filterFormat]);

  const formats = ['Powder','Liquid','Tablet','Capsule','Gummy','Sachet'];
  const units = ['g','kg','ml','L','pcs'];
  const packTypes = ['Jar','Pouch','Sachet','Bottle','Box'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
            <input className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 ring-blue-100 outline-none w-full md:w-64" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 w-4 h-4"/>
            <select className="text-sm border-none bg-transparent focus:ring-0 font-medium text-slate-600 cursor-pointer" onChange={e=>setFilterFormat(e.target.value)}>
              <option value="All">All Formats</option>
              {formats.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <Button icon={Plus} onClick={() => { setFormData({}); setModalType('product'); setIsModalOpen(true); }}>New Product</Button>
      </div>

      {/* PRODUCT LIST */}
      <div className="space-y-4">
        {filteredProducts.map(p => {
          const pSkus = skus.filter(s => s.productId === p.id);
          const isExpanded = expandedProduct === p.id;
          const skuIds = pSkus.map(s => s.id);
          const supplierIds = [...new Set(quotesReceived.filter(q => skuIds.includes(q.skuId)).map(q => q.vendorId))];
          const clientIds = [...new Set(quotesSent.filter(q => skuIds.includes(q.skuId)).map(q => q.clientId))];
          const activeQuotesCount = quotesSent.filter(q => skuIds.includes(q.skuId) && q.status === 'Active').length;

          return (
            <div key={p.id} className={`bg-white rounded-lg border border-slate-200 transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : 'hover:shadow-sm'}`}>
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedProduct(isExpanded ? null : p.id)}>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-slate-600 bg-slate-100">{p.name.charAt(0)}</div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-slate-800">{p.name}</h3>
                      <Badge color="slate">{p.format}</Badge>
                      {p.driveLink && <a href={p.driveLink} target="_blank" onClick={e=>e.stopPropagation()} className="text-blue-400 hover:text-blue-600"><Link className="w-4 h-4"/></a>}
                    </div>
                    {/* RICH FOOTER STATS */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{pSkus.length} Variants</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{supplierIds.length} Suppliers</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{clientIds.length} Clients</span>
                        {activeQuotesCount > 0 && (
                            <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveQuotesView({ open: true, productId: p.id }); }}
                                  className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                    {activeQuotesCount} Active Quotes
                                </button>
                            </>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => {e.stopPropagation(); setFormData(p); setModalType('product'); setIsModalOpen(true);}} className="text-slate-300 hover:text-blue-500"><Edit className="w-4 h-4"/></button>
                  {isExpanded ? <ChevronDown className="text-slate-400"/> : <ChevronRight className="text-slate-400"/>}
                </div>
              </div>

              {/* SKU TABLE */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">SKU Configuration</h4>
                    <Button size="sm" variant="secondary" onClick={() => { setFormData({ productId: p.id, productName: p.name }); setModalType('sku'); setIsModalOpen(true); }}>+ Add Variant</Button>
                  </div>
                  {pSkus.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                          <tr><th className="px-4 py-3 text-left">Variant</th><th className="px-4 py-3 text-left">Pack</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pSkus.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-700">{s.variant} {s.flavour && <span className="block text-xs text-slate-400 font-normal">{s.flavour}</span>}</td>
                              <td className="px-4 py-3 text-slate-600">{s.packSize}{s.unit} ({s.packType})</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.name}</td>
                              <td className="px-4 py-3 text-right flex justify-end gap-2">
                                <button onClick={() => { setFormData(s); setModalType('sku'); setIsModalOpen(true); }} className="p-1 hover:bg-blue-50 rounded text-blue-500"><Edit className="w-3 h-3"/></button>
                                <button onClick={() => crud.del('skus', s.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">No SKUs added yet.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACTIVE QUOTES POPUP */}
      <ActiveQuotesModal 
        isOpen={activeQuotesView.open} 
        onClose={() => setActiveQuotesView({open:false, productId:null})} 
        product={products.find(p => p.id === activeQuotesView.productId)}
        skus={skus}
        quotes={quotesSent}
        clients={clients}
      />

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-lg mb-4">{formData.id ? 'Edit' : 'New'} {modalType === 'product' ? 'Product' : 'SKU'}</h3>
            <div className="space-y-4">
              {modalType === 'product' ? (
                <>
                  <input placeholder="Product Name" className="w-full p-2 border rounded" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})}/>
                  <select className="w-full p-2 border rounded" value={formData.format||''} onChange={e=>setFormData({...formData, format:e.target.value})}><option value="">Select Format...</option>{formats.map(f=><option key={f} value={f}>{f}</option>)}</select>
                  <input placeholder="Drive Link" className="w-full p-2 border rounded" value={formData.driveLink||''} onChange={e=>setFormData({...formData, driveLink:e.target.value})}/>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4"><input placeholder="Variant" className="p-2 border rounded" value={formData.variant||''} onChange={e=>setFormData({...formData, variant:e.target.value})}/><input placeholder="Flavour" className="p-2 border rounded" value={formData.flavour||''} onChange={e=>setFormData({...formData, flavour:e.target.value})}/></div>
                  <div className="grid grid-cols-3 gap-2"><input type="number" placeholder="Size" className="p-2 border rounded" value={formData.packSize||''} onChange={e=>setFormData({...formData, packSize:e.target.value})}/><select className="p-2 border rounded" value={formData.unit||''} onChange={e=>setFormData({...formData, unit:e.target.value})}>{units.map(u=><option key={u} value={u}>{u}</option>)}</select><select className="p-2 border rounded" value={formData.packType||''} onChange={e=>setFormData({...formData, packType:e.target.value})}>{packTypes.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                  <input type="number" placeholder="Std MOQ" className="w-full p-2 border rounded" value={formData.standardMoq||''} onChange={e=>setFormData({...formData, standardMoq:e.target.value})}/>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={() => { const col = modalType === 'product' ? 'products' : 'skus'; if(formData.id) crud.update(col, formData.id, formData); else crud.add(col, formData); setIsModalOpen(false); }}>Save Changes</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}