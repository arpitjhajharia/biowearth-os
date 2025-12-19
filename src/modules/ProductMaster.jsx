import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Button, Badge } from "../components/UI";
import { Plus, Search, Package, Edit, Trash2, ChevronRight, ChevronDown } from "lucide-react";

// --- SKU MODAL ---
const SKUModal = ({ isOpen, onClose, product, initialData, settings }) => {
  if (!isOpen) return null;
  
  // FIX: Default packType to the first option (e.g., "Jar") or fallback
  const defaultPackType = settings.packTypes?.[0] || "Jar";
  const defaultUnit = settings.units?.[0] || "kg";

  const [form, setForm] = useState(initialData || { 
      variant: '', 
      packSize: '', 
      unit: defaultUnit, 
      packType: defaultPackType, 
      flavour: '' 
  });

  // FIX: Auto-generate Code (No Truncation)
  useEffect(() => {
      if(!initialData) {
          // Logic: NAME_SIZEunit_TYPE_FLAVOUR (e.g. ASHWA_60pcs_JAR_MINT)
          const pName = product?.name?.toUpperCase().replace(/\s+/g, '') || 'PROD';
          const size = form.packSize || '0';
          const unit = form.unit || '';
          const type = (form.packType || defaultPackType).toUpperCase();
          const flav = form.flavour ? `_${form.flavour.toUpperCase()}` : '';
          
          setForm(f => ({ ...f, name: `${pName}_${size}${unit}_${type}${flav}` }));
      }
  }, [form.variant, form.packSize, form.unit, form.packType, form.flavour, product]);

  const save = async () => {
      const col = collection(db, `artifacts/${APP_ID}/public/data`, 'skus');
      if(form.id) await updateDoc(doc(col, form.id), form);
      else await addDoc(col, { ...form, productId: product.id, createdAt: serverTimestamp() });
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <h3 className="font-bold text-lg mb-4">{form.id?'Edit':'New'} SKU for {product.name}</h3>
        <div className="space-y-3">
           <input placeholder="Variant Name (e.g. Sugar Free)" className="w-full p-2 border rounded" value={form.variant||''} onChange={e=>setForm({...form, variant:e.target.value})} autoFocus />
           <div className="grid grid-cols-2 gap-2">
               <input type="number" placeholder="Size" className="p-2 border rounded" value={form.packSize||''} onChange={e=>setForm({...form, packSize:e.target.value})} />
               {/* FIX: Admin Defined Units */}
               <select className="p-2 border rounded" value={form.unit||''} onChange={e=>setForm({...form, unit:e.target.value})}>
                   {(settings.units || ['kg', 'g', 'pcs', 'lbs']).map(u => <option key={u} value={u}>{u}</option>)}
               </select>
           </div>
           <div className="grid grid-cols-2 gap-2">
               {/* FIX: Admin Defined Pack Types */}
               <select className="p-2 border rounded" value={form.packType||''} onChange={e=>setForm({...form, packType:e.target.value})}>
                   {(settings.packTypes || ['Jar', 'Box', 'Pouch', 'Bottle']).map(t => <option key={t} value={t}>{t}</option>)}
               </select>
               <input placeholder="Flavour" className="p-2 border rounded" value={form.flavour||''} onChange={e=>setForm({...form, flavour:e.target.value})} />
           </div>
           <div>
               <label className="text-[10px] uppercase font-bold text-slate-400">Generated SKU Code</label>
               <input className="w-full p-2 border rounded bg-slate-50 font-mono text-sm" value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})} />
           </div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save SKU</Button></div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function ProductMaster() {
  const [products, setProducts] = useState([]);
  const [skus, setSkus] = useState([]);
  const [settings, setSettings] = useState({}); 
  
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("All");
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  const [skuModal, setSkuModal] = useState({ open: false, product: null, data: null });

  // Load Data
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const unsubs = [
        onSnapshot(collection(db, path, 'products'), s => setProducts(s.docs.map(d=>({id:d.id, ...d.data()})))),
        onSnapshot(collection(db, path, 'skus'), s => setSkus(s.docs.map(d=>({id:d.id, ...d.data()})))),
        onSnapshot(collection(db, path, 'settings'), s => {
            const temp = {};
            s.docs.forEach(d => temp[d.id] = d.data().list || []);
            setSettings(temp);
        })
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const createProduct = async () => {
      const name = prompt("Enter Product Name:");
      if(!name) return;
      await addDoc(collection(db, `artifacts/${APP_ID}/public/data`, 'products'), { 
          name, 
          format: settings.formats?.[0] || 'Powder', 
          createdAt: serverTimestamp() 
      });
  };

  const filteredProducts = products.filter(p => {
      if (filterFormat !== 'All' && p.format !== filterFormat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
  }).sort((a,b) => {
      const valA = (a[sort.key] || '').toLowerCase();
      const valB = (b[sort.key] || '').toLowerCase();
      return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <h2 className="font-bold text-lg text-slate-800 flex gap-2"><Package className="w-5 h-5 text-blue-600"/> Product Master</h2>
        <div className="flex gap-2">
          <div className="relative">
             <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"/>
             <input className="pl-9 p-2 border rounded text-sm w-48" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1 border-l pl-4 ml-2">
             <span className="text-xs text-slate-400">Filter:</span>
             <select className="text-sm border-none bg-transparent focus:ring-0 font-medium text-slate-600 cursor-pointer" onChange={e=>setFilterFormat(e.target.value)}>
                <option value="All">All Formats</option>
                {(settings.formats || ['Powder','Liquid']).map(f=><option key={f} value={f}>{f}</option>)}
             </select>
          </div>
          <div className="flex items-center gap-1 border-l pl-4 ml-2">
             <span className="text-xs text-slate-400">Sort:</span>
             <select className="text-sm border-none bg-transparent focus:ring-0 font-medium text-slate-600 cursor-pointer" onChange={e=>setSort(p=>({...p, key: e.target.value}))}>
                <option value="name">Name</option>
                <option value="format">Format</option>
             </select>
             <button onClick={()=>setSort(p=>({...p, dir: p.dir==='asc'?'desc':'asc'}))} className="text-slate-400 hover:text-blue-600">
                {sort.dir === 'asc' ? '↑' : '↓'}
             </button>
          </div>
          <Button size="sm" icon={Plus} onClick={createProduct}>New Product</Button>
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map(p => {
              const pSkus = skus.filter(s => s.productId === p.id);
              const isExpanded = expandedProduct === p.id;

              return (
                  <div key={p.id} className={`bg-white border transition-all overflow-hidden ${isExpanded ? 'rounded-xl shadow-md border-blue-200' : 'rounded-lg border-slate-200 hover:border-blue-300'}`}>
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {isExpanded ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                      <Badge color="blue">{p.format}</Badge>
                                      <span className="text-xs text-slate-400">{pSkus.length} SKUs</span>
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                              <select 
                                className="text-xs border rounded p-1 bg-slate-50"
                                value={p.format}
                                onChange={async (e) => await updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'products', p.id), { format: e.target.value })}
                              >
                                  {(settings.formats || ['Powder','Liquid']).map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <button onClick={() => deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'products', p.id))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      </div>

                      {/* SKUs Table (Expanded) */}
                      {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 p-4">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active SKUs</h4>
                                  <button onClick={()=>setSkuModal({open:true, product:p, data:null})} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline"><Plus className="w-3 h-3"/> Add SKU</button>
                              </div>
                              {pSkus.length > 0 ? (
                                  <table className="w-full text-sm text-left">
                                      <thead className="text-xs text-slate-400 font-medium border-b border-slate-200">
                                          <tr>
                                              <th className="pb-2 pl-2">Code</th>
                                              <th className="pb-2">Variant</th>
                                              <th className="pb-2">Pack</th>
                                              <th className="pb-2">Type</th>
                                              <th className="pb-2">Flavour</th>
                                              <th className="pb-2"></th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/50">
                                          {pSkus.map(s => (
                                              <tr key={s.id} className="group hover:bg-white transition-colors">
                                                  <td className="py-2 pl-2 font-mono text-xs font-bold text-slate-600">{s.name}</td>
                                                  <td className="py-2">{s.variant}</td>
                                                  <td className="py-2">{s.packSize} {s.unit}</td>
                                                  <td className="py-2">{s.packType}</td>
                                                  <td className="py-2">{s.flavour || '-'}</td>
                                                  <td className="py-2 text-right pr-2">
                                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                                          <button onClick={()=>setSkuModal({open:true, product:p, data:s})} className="text-blue-600"><Edit className="w-3 h-3"/></button>
                                                          <button onClick={()=>deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'skus', s.id))} className="text-red-600"><Trash2 className="w-3 h-3"/></button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              ) : <div className="text-center py-4 text-slate-400 italic text-sm">No SKUs added yet.</div>}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      <SKUModal 
        isOpen={skuModal.open} 
        onClose={()=>setSkuModal({open:false, product:null, data:null})} 
        product={skuModal.product} 
        initialData={skuModal.data}
        settings={settings}
      />
    </div>
  );
}