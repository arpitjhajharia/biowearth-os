import { useState, useMemo, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Badge } from "../components/UI";
import { 
  Calendar, List, Plus, Search, ChevronDown, ChevronRight, 
  CheckCircle2, Circle, Trash2, Filter, ArrowUp, ArrowDown, Briefcase, User 
} from "lucide-react";

// --- HELPER: Color Generator ---
const getAssigneeColor = (name) => {
  if (!name) return 'bg-slate-100 text-slate-600 border-slate-200';
  const colors = [
    'bg-red-100 text-red-700 border-red-200', 'bg-orange-100 text-orange-700 border-orange-200',
    'bg-amber-100 text-amber-700 border-amber-200', 'bg-green-100 text-green-700 border-green-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200', 'bg-teal-100 text-teal-700 border-teal-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200', 'bg-blue-100 text-blue-700 border-blue-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200', 'bg-violet-100 text-violet-700 border-violet-200',
    'bg-purple-100 text-purple-700 border-purple-200', 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-pink-100 text-pink-700 border-pink-200', 'bg-rose-100 text-rose-700 border-rose-200'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const formatDate = (dateStr) => {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

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

// --- COMPONENT: Task Modal ---
const TaskModal = ({ isOpen, onClose, initialData, vendors, clients, users, settings }) => {
  if(!isOpen) return null;
  const [form, setForm] = useState({ priority: 'Normal', status: 'Pending', contextType: 'Internal', ...initialData });

  const save = async () => {
    const col = collection(db, `artifacts/${APP_ID}/public/data`, 'tasks');
    if(form.id) await updateDoc(doc(col, form.id), form);
    else await addDoc(col, { ...form, createdAt: serverTimestamp() });
    onClose();
  };

  // Helper to handle context Selection
  const handleContextChange = (type) => {
      setForm(prev => ({...prev, contextType: type, relatedId: null, relatedName: null, secondaryVendorId: null, secondaryClientId: null}));
  };

  const handleRelatedSelect = (e, list) => {
      const item = list.find(i => i.id === e.target.value);
      setForm(prev => ({...prev, relatedId: item.id, relatedName: item.companyName}));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <h3 className="font-bold text-lg mb-4">{form.id ? 'Edit' : 'New'} Task</h3>
        <div className="space-y-4">
          <input placeholder="Title" className="w-full p-2 border rounded focus:ring-2 ring-blue-100 outline-none font-medium" value={form.title||''} onChange={e=>setForm({...form, title:e.target.value})} autoFocus />
          
          {/* Category / Context Selection */}
          <div className="space-y-2 border p-3 rounded bg-slate-50">
              <label className="text-xs font-bold text-slate-500 uppercase">Related To</label>
              <div className="flex gap-2 mb-2">
                  {['Internal','Vendor','Client'].map(type => (
                      <button 
                        key={type}
                        onClick={() => handleContextChange(type)}
                        className={`flex-1 py-1 text-xs rounded border ${form.contextType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                          {type}
                      </button>
                  ))}
              </div>

              {form.contextType === 'Internal' && (
                  <select className="w-full p-2 border rounded text-sm" value={form.taskGroup||''} onChange={e=>setForm({...form, taskGroup:e.target.value})}>
                      <option value="">Select Group...</option>
                      {(settings.taskGroups || ['Operations','Admin','HR']).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
              )}

              {form.contextType === 'Vendor' && (
                  <div className="space-y-2">
                      <select className="w-full p-2 border rounded text-sm" value={form.relatedId||''} onChange={(e)=>handleRelatedSelect(e, vendors)}>
                          <option value="">Select Vendor...</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                      </select>
                      {/* Secondary Link */}
                      <select className="w-full p-2 border rounded text-sm bg-green-50" value={form.secondaryClientId||''} onChange={e=>setForm({...form, secondaryClientId:e.target.value})}>
                          <option value="">Link Client (Optional)...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                      </select>
                  </div>
              )}

              {form.contextType === 'Client' && (
                  <div className="space-y-2">
                      <select className="w-full p-2 border rounded text-sm" value={form.relatedId||''} onChange={(e)=>handleRelatedSelect(e, clients)}>
                          <option value="">Select Client...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                      </select>
                      {/* Secondary Link */}
                      <select className="w-full p-2 border rounded text-sm bg-purple-50" value={form.secondaryVendorId||''} onChange={e=>setForm({...form, secondaryVendorId:e.target.value})}>
                          <option value="">Link Vendor (Optional)...</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                      </select>
                  </div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select className="p-2 border rounded" value={form.assignee||''} onChange={e=>setForm({...form, assignee:e.target.value})}>
                <option value="">Assignee...</option>
                {users.map(u=><option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <input type="date" className="p-2 border rounded" value={form.dueDate||''} onChange={e=>setForm({...form, dueDate:e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Task</Button>
        </div>
      </div>
    </div>
  );
};

export default function TaskBoard() {
  const { user, usersList } = useAuth();
  
  // Data
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState({});

  // UI State
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isDoneExpanded, setIsDoneExpanded] = useState(false);

  // Sorting & Filtering
  const [sort, setSort] = useState({ key: 'dueDate', dir: 'asc' });
  const [filters, setFilters] = useState({
    title: '',
    assignee: [],
    contextType: [],
    relatedName: '',
    dueDate: ''
  });

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const subs = [
      onSnapshot(collection(db, path, 'tasks'), (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'vendors'), (s) => setVendors(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'clients'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, path, 'settings'), (s) => {
          const temp = {};
          s.docs.forEach(d => temp[d.id] = d.data().list || []);
          setSettings(temp);
      })
    ];
    return () => subs.forEach(fn => fn());
  }, []);

  // --- 2. HELPERS ---
  const crud = {
    update: (id, data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'tasks', id), data),
    del: (id) => { if(confirm('Delete task?')) deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'tasks', id)); }
  };

  const handleFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const handleSort = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  // --- 3. FILTERED & SORTED DATA ---
  const processedTasks = useMemo(() => {
      return tasks.filter(t => {
          if (filters.title && !t.title?.toLowerCase().includes(filters.title.toLowerCase())) return false;
          if (filters.relatedName && !t.relatedName?.toLowerCase().includes(filters.relatedName.toLowerCase())) return false;
          if (filters.assignee.length > 0 && !filters.assignee.includes(t.assignee)) return false;
          if (filters.contextType.length > 0 && !filters.contextType.includes(t.contextType)) return false;
          return true;
      }).sort((a,b) => {
          let valA = a[sort.key];
          let valB = b[sort.key];
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
          return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [tasks, filters, sort]);

  const pendingTasks = processedTasks.filter(t => t.status !== 'Completed');
  const completedTasks = processedTasks.filter(t => t.status === 'Completed');

  // --- 4. RENDERERS ---
  const TaskTable = ({ data, showFilters = false }) => (
      <table className="w-full text-sm text-left border-collapse">
        {showFilters && (
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 min-w-[200px]"><FilterHeader label="Task Title" sortKey="title" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.title} onFilter={v=>handleFilter('title',v)} /></th>
                    <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="Related To" sortKey="relatedName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={filters.relatedName} onFilter={v=>handleFilter('relatedName',v)} /></th>
                    <th className="px-4 py-3 min-w-[120px]"><FilterHeader label="Category" sortKey="contextType" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.contextType} onFilter={v=>handleFilter('contextType',v)} options={['Internal','Vendor','Client']} /></th>
                    <th className="px-4 py-3 min-w-[130px]"><div className="cursor-pointer hover:text-blue-600" onClick={()=>handleSort('dueDate')}>Due Date {sort.key==='dueDate'&&(sort.dir==='asc'?'↑':'↓')}</div></th>
                    <th className="px-4 py-3 min-w-[150px]"><FilterHeader label="Assignee" sortKey="assignee" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={filters.assignee} onFilter={v=>handleFilter('assignee',v)} options={usersList.map(u=>u.name)} /></th>
                    <th className="w-10 px-4 py-3"></th>
                </tr>
            </thead>
        )}
        <tbody className="divide-y divide-slate-100">
            {data.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3">
                        <button onClick={() => crud.update(t.id, { status: t.status === 'Completed' ? 'Pending' : 'Completed' })}>
                            {t.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500" />}
                        </button>
                    </td>
                    
                    {/* Editable Title */}
                    <td className="px-4 py-3">
                        <input 
                            className={`bg-transparent w-full outline-none focus:border-b focus:border-blue-500 font-medium ${t.status==='Completed'?'text-slate-400 line-through':'text-slate-800'}`}
                            value={t.title}
                            onChange={(e) => crud.update(t.id, {title: e.target.value})}
                        />
                    </td>

                    {/* Category / Context (Click to Edit full context) */}
                    <td className="px-4 py-3 cursor-pointer" onClick={() => { setEditingTask(t); setIsModalOpen(true); }}>
                        <div className="flex flex-col">
                            {t.relatedName ? <span className="font-medium text-slate-700">{t.relatedName}</span> : <span className="text-slate-400 text-xs">-</span>}
                            {(t.secondaryVendorId || t.secondaryClientId) && (
                                <span className="text-[10px] text-slate-400">+ Linked Entity</span>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <Badge size="xs" color={t.contextType==='Vendor'?'purple':t.contextType==='Client'?'green':'blue'}>{t.contextType}</Badge>
                        {t.contextType === 'Internal' && t.taskGroup && <span className="text-xs text-slate-500 ml-2">{t.taskGroup}</span>}
                    </td>

                    {/* Editable Date */}
                    <td className="px-4 py-3">
                        <div className="relative group/date w-fit">
                            <span className={`text-xs font-mono cursor-pointer ${!t.dueDate && 'text-slate-300 italic'}`}>{t.dueDate ? formatDate(t.dueDate) : 'Set Date'}</span>
                            <input 
                                type="date" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                value={t.dueDate || ''}
                                onChange={(e) => crud.update(t.id, { dueDate: e.target.value })}
                            />
                        </div>
                    </td>

                    {/* Editable Assignee */}
                    <td className="px-4 py-3">
                        <div className="relative group/assignee w-fit">
                            <span className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer ${getAssigneeColor(t.assignee)}`}>
                                {t.assignee || 'Unassigned'}
                            </span>
                            <select 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                value={t.assignee || ''}
                                onChange={(e) => crud.update(t.id, { assignee: e.target.value })}
                            >
                                <option value="">Unassigned</option>
                                {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                        <button onClick={() => crud.del(t.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
  );

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded p-1">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><List className="w-4 h-4"/></button>
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Calendar className="w-4 h-4"/></button>
          </div>
          <div className="h-6 w-px bg-slate-300 mx-1"></div>
          <h2 className="font-bold text-slate-800">Task Board</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
            <input 
              className="pl-9 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-100 outline-none w-48" 
              placeholder="Search..." 
              value={filters.title} 
              onChange={e => handleFilter('title', e.target.value)}
            />
          </div>
          <Button icon={Plus} onClick={() => { setEditingTask({}); setIsModalOpen(true); }}>New Task</Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {viewMode === 'list' ? (
            <div className="flex-1 overflow-auto scroller">
                <TaskTable data={pendingTasks} showFilters={true} />
                
                {/* Done Tasks Accordion */}
                <div className="border-t border-slate-200">
                    <div 
                        className="bg-slate-50 p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => setIsDoneExpanded(!isDoneExpanded)}
                    >
                        {isDoneExpanded ? <ChevronDown className="w-4 h-4 text-slate-500"/> : <ChevronRight className="w-4 h-4 text-slate-500"/>}
                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Completed Tasks ({completedTasks.length})</span>
                    </div>
                    {isDoneExpanded && (
                        <div className="max-h-64 overflow-y-auto bg-slate-50/50">
                            <TaskTable data={completedTasks} showFilters={false} />
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
                Calendar View coming in next update.
            </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingTask}
        vendors={vendors}
        clients={clients}
        users={usersList}
        settings={settings}
      />
    </div>
  );
}