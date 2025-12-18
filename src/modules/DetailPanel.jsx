import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Badge } from "../components/UI";
import { 
  X, Edit, Phone, Mail, Linkedin, ExternalLink, Link, Plus, 
  Trash2, Box, CheckSquare, Package, Calendar 
} from "lucide-react";

// Helper: Date Format (dd-MMM-yy)
const formatDate = (dateStr) => {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

// --- NEW COMPONENT: Contact Modal ---
const ContactModal = ({ isOpen, onClose, companyId, initialData }) => {
  if(!isOpen) return null;
  const [form, setForm] = useState(initialData || { role: '', email: '', phone: '', linkedin: '' });

  const save = async () => {
    if(!form.name) return alert("Name is required");
    const col = collection(db, `artifacts/${APP_ID}/public/data`, 'contacts');
    if(form.id) await updateDoc(doc(col, form.id), form);
    else await addDoc(col, { ...form, companyId, createdAt: serverTimestamp() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <h3 className="font-bold text-lg mb-4">{form.id ? 'Edit' : 'Add'} Key Person</h3>
        <div className="space-y-3">
          <input placeholder="Name" className="w-full p-2 border rounded focus:ring-2 ring-blue-100 outline-none" value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})} autoFocus />
          <input placeholder="Role / Designation" className="w-full p-2 border rounded" value={form.role||''} onChange={e=>setForm({...form, role:e.target.value})} />
          <div className="relative"><Mail className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/><input placeholder="Email Address" className="w-full pl-9 p-2 border rounded" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/></div>
          <div className="relative"><Phone className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/><input placeholder="Phone Number" className="w-full pl-9 p-2 border rounded" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})}/></div>
          <div className="relative"><Linkedin className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/><input placeholder="LinkedIn Profile URL" className="w-full pl-9 p-2 border rounded" value={form.linkedin||''} onChange={e=>setForm({...form, linkedin:e.target.value})}/></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save Contact</Button></div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: Task Modal (Matches your screenshot) ---
const InlineTask = ({ task, users }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  
  const update = (data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'tasks', task.id), data);
  const handleBlur = () => { setIsEditing(false); if(title !== task.title) update({ title }); };

  return (
    <div className="group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-all mb-2">
      <div className="flex gap-3 items-start">
        <input type="checkbox" checked={task.status === 'Completed'} onChange={(e) => update({ status: e.target.checked ? 'Completed' : 'Pending' })} className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            {isEditing ? (
              <input className="w-full text-sm border-b border-blue-500 outline-none pb-1" value={title} autoFocus onChange={(e)=>setTitle(e.target.value)} onBlur={handleBlur} onKeyDown={(e)=>e.key==='Enter'&&handleBlur()}/>
            ) : (
              <div onDoubleClick={() => setIsEditing(true)} className={`text-sm font-medium ${task.status==='Completed'?'line-through text-slate-400':'text-slate-800'}`}>{task.title}</div>
            )}
          </div>
          
          {/* Controls Row */}
          <div className="flex items-center gap-2">
            {/* Date Picker Interface */}
            <div className="relative group/date">
                <input 
                    type="date" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={task.dueDate || ''}
                    onChange={(e) => update({ dueDate: e.target.value })}
                />
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 group-hover/date:border-blue-200 group-hover/date:text-blue-600">
                    <Calendar className="w-3 h-3"/>
                    {task.dueDate ? formatDate(task.dueDate) : 'Set Date'}
                </div>
            </div>

            {/* Assignee Dropdown Interface */}
            <div className="relative group/user">
                <select 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={task.assignee || ''}
                    onChange={(e) => update({ assignee: e.target.value })}
                >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 group-hover/user:border-blue-200 group-hover/user:text-blue-600">
                    <div className="w-4 h-4 rounded-full bg-slate-200 text-[9px] flex items-center justify-center font-bold">
                        {task.assignee ? task.assignee.charAt(0) : '?'}
                    </div>
                    <span className="max-w-[80px] truncate">{task.assignee || 'Assign'}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- UPDATED ORDER MODAL ---
const REQUIRED_DOCS_LIST = ["CoA", "MSDS", "Health Certificate", "Organic", "FSSAI", "FDA", "GMP", "Halal", "Kosher"];

const OrderModal = ({ isOpen, onClose, companyId, orderToEdit }) => {
  if (!isOpen) return null;
  const [form, setForm] = useState(orderToEdit || { paymentTerms: [], docRequirements: {} });
  const [skus, setSkus] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `artifacts/${APP_ID}/public/data`, 'skus'), s => setSkus(s.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const qty = parseFloat(form.qty) || 0;
    const rate = parseFloat(form.rate) || 0;
    const taxRate = parseFloat(form.taxRate) || 0;
    const base = qty * rate;
    const tax = (base * taxRate) / 100;
    setForm(f => ({ ...f, amount: base + tax, taxAmount: tax }));
  }, [form.qty, form.rate, form.taxRate]);

  const save = async () => {
    const col = collection(db, `artifacts/${APP_ID}/public/data`, 'orders');
    const data = { ...form, companyId, createdAt: serverTimestamp() };
    if(form.id) await updateDoc(doc(col, form.id), data); else await addDoc(col, data);
    onClose();
  };

  const addTerm = () => setForm({...form, paymentTerms: [...(form.paymentTerms||[]), { label: '', percent: 0, status: 'Pending' }]});
  
  const updateTerm = (idx, field, val) => {
    const newTerms = [...(form.paymentTerms||[])];
    newTerms[idx][field] = val;
    setForm({...form, paymentTerms: newTerms});
  };

  const toggleDocReq = (docName) => {
    const current = form.docRequirements || {};
    if (current[docName]) {
        const next = {...current};
        delete next[docName];
        setForm({...form, docRequirements: next});
    } else {
        setForm({...form, docRequirements: {...current, [docName]: { required: true, received: false, link: '' }}});
    }
  };

  const totalPercent = (form.paymentTerms || []).reduce((acc, t) => acc + (parseFloat(t.percent)||0), 0);
  const isPercentValid = Math.abs(totalPercent - 100) < 0.1;

  const formatMoney = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">{form.id ? 'Edit' : 'New'} Order</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><input type="date" className="p-2 border rounded" value={form.date||''} onChange={e=>setForm({...form, date:e.target.value})} /><input placeholder="Order ID (#)" className="p-2 border rounded" value={form.orderId||''} onChange={e=>setForm({...form, orderId:e.target.value})} /></div>
          <select className="w-full p-2 border rounded" value={form.skuId||''} onChange={e=>setForm({...form, skuId:e.target.value})}><option value="">Select Product/SKU...</option>{skus.map(s => <option key={s.id} value={s.id}>{s.name} ({s.variant})</option>)}</select>
          <div className="grid grid-cols-3 gap-2"><input type="number" placeholder="Qty" className="p-2 border rounded" value={form.qty||''} onChange={e=>setForm({...form, qty:e.target.value})} /><input type="number" placeholder="Rate" className="p-2 border rounded" value={form.rate||''} onChange={e=>setForm({...form, rate:e.target.value})} /><div className="relative"><input type="number" placeholder="Tax %" className="p-2 border rounded w-full" value={form.taxRate||''} onChange={e=>setForm({...form, taxRate:e.target.value})} /><span className="absolute right-2 top-2 text-slate-400 text-sm">%</span></div></div>
          
          <div className="bg-slate-50 p-3 text-right rounded border border-slate-100">
            <div className="text-2xl font-bold text-slate-800">{formatMoney(form.amount)}</div>
            <div className="text-xs text-slate-500">Includes Tax: {formatMoney(form.taxAmount)}</div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
               <label className="text-sm font-bold">Payment Milestones</label>
               <div className="flex gap-2 items-center">
                 <span className={`text-xs font-bold ${isPercentValid ? 'text-green-600' : 'text-red-600'}`}>Total: {totalPercent}%</span>
                 <button onClick={addTerm} className="text-xs text-blue-600 hover:underline">+ Add Milestone</button>
               </div>
            </div>
            {(form.paymentTerms||[]).map((t, i) => (
               <div key={i} className="flex gap-2 mb-2 items-center">
                 <input placeholder="Label" className="p-1 text-xs border rounded flex-1" value={t.label} onChange={e=>updateTerm(i, 'label', e.target.value)}/>
                 <input type="number" placeholder="%" className="p-1 text-xs border rounded w-12 text-center" value={t.percent} onChange={e=>updateTerm(i, 'percent', parseFloat(e.target.value))}/>
                 <div className="w-20 text-right text-xs font-mono text-slate-500">{formatMoney((form.amount * t.percent) / 100)}</div>
                 <button onClick={()=>{const n=[...form.paymentTerms];n.splice(i,1);setForm({...form, paymentTerms:n})}} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
               </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <label className="text-sm font-bold mb-2 block">Required Documents Configuration</label>
            <div className="grid grid-cols-2 gap-2">
                {REQUIRED_DOCS_LIST.map(doc => (
                    <label key={doc} className={`flex items-center gap-2 text-xs p-1 border rounded cursor-pointer ${form.docRequirements?.[doc] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={!!form.docRequirements?.[doc]} onChange={()=>toggleDocReq(doc)} className="rounded text-blue-600 focus:ring-0"/>
                        {doc}
                    </label>
                ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save Order</Button></div>
      </div>
    </div>
  );
};

export default function DetailPanel({ type, data, onClose }) {
  if (!data) return null;
  const isVendor = type === 'vendor';
  const { user, usersList } = useAuth(); // <--- Get Users List Here
  
  const [contacts, setContacts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [skus, setSkus] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [contactModal, setContactModal] = useState({ open: false, data: null });
  const [editOrder, setEditOrder] = useState(null);

  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const quoteCol = isVendor ? 'quotesReceived' : 'quotesSent';
    const quoteField = isVendor ? 'vendorId' : 'clientId';

    const unsubs = [
      onSnapshot(query(collection(db, path, 'contacts'), where('companyId', '==', data.id)), s => setContacts(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, path, 'orders'), where('companyId', '==', data.id)), s => setOrders(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, path, 'tasks'), where('relatedId', '==', data.id)), s => setTasks(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(query(collection(db, path, quoteCol), where(quoteField, '==', data.id)), s => setQuotes(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'skus'), s => setSkus(s.docs.map(d=>({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'products'), s => setProducts(s.docs.map(d=>({id:d.id, ...d.data()})))),
    ];
    return () => unsubs.forEach(u => u());
  }, [data.id, isVendor]);

  const addContact = async () => {
    const name = prompt("Contact Name:");
    if(name) await addDoc(collection(db, `artifacts/${APP_ID}/public/data`, 'contacts'), { companyId: data.id, name, role: 'Staff' });
  };
  
  // Use Modal instead of prompt
  const addTask = () => setIsTaskModalOpen(true);

  const togglePaymentStatus = async (order, idx) => {
      const newTerms = [...order.paymentTerms];
      newTerms[idx].status = newTerms[idx].status === 'Paid' ? 'Pending' : 'Paid';
      await updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'orders', order.id), { paymentTerms: newTerms });
  };

  const formatMoney = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  
  const potentialValue = quotes.reduce((acc, q) => {
    const val = isVendor ? (q.price * q.moq) : (q.sellingPrice * q.moq);
    return acc + (val || 0);
  }, 0);
  
  const totalOrderValue = orders.reduce((acc, o) => acc + (parseFloat(o.amount)||0), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl animate-slide-in flex flex-col">
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <div className="flex justify-between items-start">
             <div>
               <div className="flex items-center gap-2 mb-2">
                 <Badge color={isVendor?'purple':'green'}>{isVendor?'VENDOR':'CLIENT'}</Badge>
                 <span className="text-slate-400 text-sm flex items-center gap-1"> {data.country}</span>
               </div>
               <h1 className="text-3xl font-bold">{data.companyName}</h1>
               <div className="flex gap-8 mt-4">
                  <div><div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Potential Value</div><div className="text-xl font-medium text-purple-300">{formatMoney(potentialValue)}</div></div>
                  <div><div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Orders</div><div className="text-xl font-medium text-blue-300">{formatMoney(totalOrderValue)}</div></div>
               </div>
               <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                  {data.website && <a href={data.website} target="_blank" className="hover:text-white flex gap-1"><ExternalLink className="w-4 h-4"/> Website</a>}
                  {data.driveLink && <a href={data.driveLink} target="_blank" className="hover:text-white flex gap-1"><Link className="w-4 h-4"/> Drive</a>}
               </div>
             </div>
             <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><X className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="space-y-6">
                 <Card className="p-4 max-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 text-sm uppercase flex gap-2"><CheckSquare className="w-4 h-4"/> Tasks</h3><button onClick={addTask} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100">+ Add</button></div>
                    <div className="flex-1 overflow-y-auto scroller pr-2">
                       {/* Pass Users List to InlineTask */}
                       {tasks.map(t => <InlineTask key={t.id} task={t} users={usersList} />)}
                    </div>
                 </Card>
                 <Card className="p-4">
                    <h3 className="font-bold text-slate-700 text-sm uppercase mb-4 flex gap-2"><Phone className="w-4 h-4"/> Key People</h3>
                    <div className="space-y-2">
                       {contacts.map(c => (
                         <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                   <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                                   <div className="text-xs text-slate-500 font-medium">{c.role || 'No Role'}</div>
                                </div>
                                <button onClick={() => setContactModal({ open: true, data: c })} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity"><Edit className="w-3 h-3"/></button>
                            </div>
                            <div className="flex gap-2 mt-2">
                                {c.email && <a href={`mailto:${c.email}`} title={c.email} className="p-1.5 bg-slate-50 text-slate-500 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors"><Mail className="w-3.5 h-3.5"/></a>}
                                {c.phone && <a href={`tel:${c.phone}`} title={c.phone} className="p-1.5 bg-slate-50 text-slate-500 rounded hover:bg-green-50 hover:text-green-600 transition-colors"><Phone className="w-3.5 h-3.5"/></a>}
                                {c.linkedin && <a href={c.linkedin} target="_blank" title="LinkedIn Profile" className="p-1.5 bg-slate-50 text-slate-500 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors"><Linkedin className="w-3.5 h-3.5"/></a>}
                            </div>
                         </div>
                       ))}
                       <button onClick={() => setContactModal({ open: true, data: null })} className="w-full mt-2 py-2 text-xs border border-dashed border-slate-300 rounded text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-1">
                         <Plus className="w-3 h-3"/> Add Contact
                       </button>
                    </div>
                 </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                 {/* ORDERS SECTION */}
                 <Card className="p-5 border-blue-100 bg-blue-50/30">
                    <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 text-lg flex gap-2"><Box className="w-5 h-5 text-blue-600"/> Order History</h3><Button size="sm" onClick={() => { setEditOrder(null); setIsOrderModalOpen(true); }}>+ New Order</Button></div>
                    <div className="space-y-4">
                       {orders.length > 0 ? orders.map(o => (
                          <div key={o.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 group">
                             <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-2">
                                <div>
                                   <div className="flex gap-2 mb-1"><span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">#{o.orderId}</span><span className="text-xs text-slate-400">{o.date}</span></div>
                                   <div className="font-bold text-slate-800">{o.qty} units @ {o.rate}</div>
                                </div>
                                <div className="text-right">
                                   <div className="text-lg font-bold text-slate-800">₹{o.amount}</div>
                                   <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>{setEditOrder(o); setIsOrderModalOpen(true)}} className="p-1 text-blue-500"><Edit className="w-3 h-3"/></button><button onClick={()=>deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'orders', o.id))} className="p-1 text-red-500"><Trash2 className="w-3 h-3"/></button></div>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Milestones</div>
                                    {(o.paymentTerms||[]).map((t, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-1 rounded">
                                            <span className="font-medium text-slate-600">{t.label} ({t.percent}%)</span>
                                            <button onClick={()=>togglePaymentStatus(o, i)} className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${t.status==='Paid'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{t.status}</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Documents</div>
                                    {Object.entries(o.docRequirements||{}).map(([doc, stat]) => (
                                        <div key={doc} className="flex justify-between text-xs bg-white border border-slate-100 p-1 rounded">
                                            <span>{doc}</span>
                                            {stat.received ? <span className="text-green-600 font-bold">✔</span> : <span className="text-slate-300">Pending</span>}
                                        </div>
                                    ))}
                                </div>
                             </div>
                          </div>
                       )) : <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-lg">No orders found.</div>}
                    </div>
                 </Card>

                 {/* QUOTES SECTION */}
                 <div>
                    <h3 className="font-bold text-slate-800 text-lg flex gap-2 mb-4"><Package className="w-5 h-5 text-blue-600"/> {isVendor ? 'Purchase Quotes' : 'Product Interests'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quotes.map(q => {
                            const sku = skus.find(s => s.id === q.skuId);
                            const prod = products.find(p => p.id === sku?.productId);
                            const val = isVendor ? (q.price*q.moq) : (q.sellingPrice*q.moq);
                            return (
                                <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-slate-800 text-lg">{prod?.name || 'Unknown'}</div>
                                            <Badge size="xs" color="slate">{sku?.variant}</Badge>
                                        </div>
                                        <Badge color={q.status==='Active'?'green':'blue'}>{q.status || 'Draft'}</Badge>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-3">{sku?.packSize}{sku?.unit} • {sku?.packType} • {sku?.flavour}</div>
                                    <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Unit Rate</div>
                                            <div className="font-mono text-sm font-medium">₹{isVendor ? q.price : q.sellingPrice} <span className="text-xs text-slate-400">/u</span></div>
                                            <div className="text-[10px] text-slate-400 mt-1">MOQ: {q.moq}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Investment</div>
                                            <div className="font-bold text-purple-600 text-lg">{formatMoney(val)}</div>
                                            {q.createdAt && <div className="text-[9px] text-slate-300 mt-1">{formatDate(q.createdAt.seconds ? new Date(q.createdAt.seconds*1000) : new Date())}</div>}
                                        </div>
                                    </div>
                                    {q.driveLink && <div className="mt-2 pt-2 border-t border-slate-50 flex justify-end"><a href={q.driveLink} target="_blank" className="text-blue-500 text-xs flex items-center gap-1 hover:underline"><Link className="w-3 h-3"/> View Quote</a></div>}
                                </div>
                            );
                        })}
                        {quotes.length === 0 && <div className="col-span-2 text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">No quotes recorded.</div>}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Task Modal Overlay */}
        <TaskModal 
            isOpen={isTaskModalOpen} 
            onClose={() => setIsTaskModalOpen(false)} 
            initialData={{ contextType: isVendor ? 'Vendor' : 'Client', relatedId: data.id, relatedName: data.companyName }}
            users={usersList}
        />

        <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} companyId={data.id} orderToEdit={editOrder}/>
        
        <ContactModal 
            isOpen={contactModal.open} 
            onClose={() => setContactModal({ open: false, data: null })} 
            companyId={data.id}
            initialData={contactModal.data}
        />
      </div>
    </div>
  );
}