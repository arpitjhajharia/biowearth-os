import DetailPanel from "./DetailPanel";
import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { Button, Badge } from "../components/UI";
import { 
  Factory, Users, Plus, Search, Filter, Phone, Mail, 
  Linkedin, Globe, ExternalLink, MoreVertical, Eye
} from "lucide-react";

export default function CompanyMaster({ type }) { // type is 'vendor' or 'client'
const isVendor = type === 'vendor';
  const collectionName = isVendor ? 'vendors' : 'clients';
  
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
const [detailView, setDetailView] = useState({ open: false, data: null });

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const unsub = onSnapshot(collection(db, path, collectionName), (s) => {
      setData(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [collectionName]);

  // --- 2. HELPERS ---
  const crud = {
    add: (item) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, collectionName), { ...item, createdAt: serverTimestamp() }),
    update: (id, item) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, collectionName, id), item),
  };

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.companyName?.toLowerCase().includes(search.toLowerCase())
    ).sort((a,b) => a.companyName.localeCompare(b.companyName));
  }, [data, search]);

  const statusOptions = isVendor 
    ? ['Active', 'On Hold', 'Potential', 'Blacklisted']
    : ['Lead', 'Active', 'Negotiation', 'Churned', 'Hot Lead'];

  // --- 3. RENDERERS ---
  const StatusBadge = ({ status }) => {
    let color = 'blue';
    if (['Active', 'Hot Lead'].includes(status)) color = 'green';
    if (['Blacklisted', 'Churned'].includes(status)) color = 'red';
    if (['On Hold', 'Potential'].includes(status)) color = 'slate';
    return <Badge color={color}>{status || 'Active'}</Badge>;
  };

  const renderList = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
          <tr>
            <th className="px-4 py-3">Company Name</th>
            <th className="px-4 py-3 w-32">Status</th>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3">Website</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.map(item => (
            <tr key={item.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => setDetailView({ open: true, data: item })}>
              <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${isVendor ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                  {item.companyName.charAt(0)}
                </div>
                {item.companyName}
              </td>
              <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-3 text-slate-600">{item.country || '-'}</td>
              <td className="px-4 py-3">
                {item.website && (
                  <a href={item.website} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                    <Globe className="w-3 h-3"/> {item.website.replace('https://','').replace('www.','').split('/')[0]}
                  </a>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => { setFormData(item); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- 4. MAIN RENDER ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isVendor ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
            {isVendor ? <Factory className="w-5 h-5"/> : <Users className="w-5 h-5"/>}
          </div>
          <h2 className="font-bold text-lg text-slate-800">{isVendor ? 'Vendor Directory' : 'Client List'}</h2>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
            <input 
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 ring-blue-100 outline-none w-full md:w-64" 
              placeholder={`Search ${isVendor ? 'vendors' : 'clients'}...`} 
              value={search} 
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <Button icon={Plus} onClick={() => { setFormData({}); setIsModalOpen(true); }}>New {isVendor ? 'Vendor' : 'Client'}</Button>
        </div>
      </div>

      {/* LIST VIEW */}
      {renderList()}

{/* DETAIL PANEL OVERLAY */}
      {detailView.open && (
        <DetailPanel 
          type={type} 
          data={detailView.data} 
          onClose={() => setDetailView({ open: false, data: null })} 
        />
      )}
      
      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-lg mb-4">{formData.id ? 'Edit' : 'New'} {isVendor ? 'Vendor' : 'Client'}</h3>
            <div className="space-y-4">
              <input placeholder="Company Name" className="w-full p-2 border rounded" value={formData.companyName||''} onChange={e=>setFormData({...formData, companyName:e.target.value})}/>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Website" className="p-2 border rounded" value={formData.website||''} onChange={e=>setFormData({...formData, website:e.target.value})}/>
                <input placeholder="Country" className="p-2 border rounded" value={formData.country||''} onChange={e=>setFormData({...formData, country:e.target.value})}/>
              </div>
              <select className="w-full p-2 border rounded" value={formData.status||''} onChange={e=>setFormData({...formData, status:e.target.value})}>
                <option value="">Select Status...</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Drive Folder Link" className="w-full p-2 border rounded" value={formData.driveLink||''} onChange={e=>setFormData({...formData, driveLink:e.target.value})}/>
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