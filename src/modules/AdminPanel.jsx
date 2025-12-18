import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Badge } from "../components/UI";
import { Users, Settings, Plus, Trash2, Edit, Save } from "lucide-react";

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});

  // Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({});

  // 1. LOAD DATA
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const subs = [
      onSnapshot(collection(db, path, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()})))),
      onSnapshot(collection(db, path, 'settings'), s => {
        const data = {};
        s.docs.forEach(d => data[d.id] = d.data().list || []);
        // Initialize defaults if empty
        if (s.empty) initDefaults(); 
        else setSettings(data);
      })
    ];
    return () => subs.forEach(fn => fn());
  }, []);

  const initDefaults = () => {
    const defaults = {
      formats: ['Powder','Liquid','Tablet','Capsule','Gummy','Sachet'],
      units: ['g','kg','ml','L','pcs'],
      leadSources: ['LinkedIn','Website','Referral','Cold Call'],
    };
    Object.keys(defaults).forEach(key => {
      setDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'settings', key), { list: defaults[key] });
    });
  };

  // 2. ACTIONS
  const saveUser = async () => {
    const col = collection(db, `artifacts/${APP_ID}/public/data`, 'users');
    if(userForm.id) await updateDoc(doc(col, userForm.id), userForm);
    else await addDoc(col, { ...userForm, createdAt: serverTimestamp() });
    setIsUserModalOpen(false);
  };

  const deleteUser = async (id) => {
    if(confirm('Delete user?')) await deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'users', id));
  };

  const SettingsCard = ({ title, settingKey, items = [] }) => {
    const [newItem, setNewItem] = useState('');
    const add = async () => {
      if(newItem && !items.includes(newItem)) {
        await setDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'settings', settingKey), { list: [...items, newItem] });
        setNewItem('');
      }
    };
    const remove = async (item) => {
      if(confirm(`Remove ${item}?`)) {
        await setDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'settings', settingKey), { list: items.filter(i => i !== item) });
      }
    };

    return (
      <Card className="p-4 flex flex-col h-full">
        <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">{title}</h3>
        <div className="flex gap-2 mb-3">
          <input 
            className="border rounded text-sm p-1.5 flex-1 outline-none focus:border-blue-500" 
            placeholder="Add new..." 
            value={newItem} 
            onChange={e=>setNewItem(e.target.value)} 
            onKeyDown={e=>e.key==='Enter'&&add()}
          />
          <Button size="sm" onClick={add}><Plus className="w-4 h-4"/></Button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-40 space-y-1 pr-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm p-1.5 bg-slate-50 rounded group hover:bg-slate-100">
              <span>{item}</span>
              <button onClick={()=>remove(item)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3"/></button>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  if (user?.role !== 'Admin') return <div className="p-10 text-center text-red-500">Access Denied: Admins Only</div>;

  return (
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex gap-1 bg-slate-200 p-1 rounded-lg w-fit">
        <button onClick={()=>setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${activeTab==='users'?'bg-white shadow text-blue-600':'text-slate-500'}`}>User Management</button>
        <button onClick={()=>setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded transition-all ${activeTab==='settings'?'bg-white shadow text-blue-600':'text-slate-500'}`}>System Settings</button>
      </div>

      {activeTab === 'users' ? (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">All Users</h3>
            <Button size="sm" icon={Plus} onClick={() => { setUserForm({}); setIsUserModalOpen(true); }}>Add User</Button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-700">{u.name}</td>
                  <td className="px-6 py-3 text-slate-500">{u.username}</td>
                  <td className="px-6 py-3"><Badge color={u.role==='Admin'?'purple':'blue'}>{u.role}</Badge></td>
                  <td className="px-6 py-3 text-right flex justify-end gap-2">
                    <button onClick={() => { setUserForm(u); setIsUserModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit className="w-4 h-4"/></button>
                    {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SettingsCard title="Product Formats" settingKey="formats" items={settings.formats} />
          <SettingsCard title="SKU Units" settingKey="units" items={settings.units} />
          <SettingsCard title="Lead Sources" settingKey="leadSources" items={settings.leadSources} />
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4">{userForm.id ? 'Edit' : 'New'} User</h3>
            <div className="space-y-4">
              <input placeholder="Full Name" className="w-full p-2 border rounded" value={userForm.name||''} onChange={e=>setUserForm({...userForm, name:e.target.value})}/>
              <input placeholder="Username" className="w-full p-2 border rounded" value={userForm.username||''} onChange={e=>setUserForm({...userForm, username:e.target.value})}/>
              <input placeholder="Password" type="password" className="w-full p-2 border rounded" value={userForm.password||''} onChange={e=>setUserForm({...userForm, password:e.target.value})}/>
              <select className="w-full p-2 border rounded" value={userForm.role||'Staff'} onChange={e=>setUserForm({...userForm, role:e.target.value})}>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
              <Button onClick={saveUser}>Save User</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}