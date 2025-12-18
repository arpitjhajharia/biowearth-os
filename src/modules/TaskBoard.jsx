import { useState, useMemo } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase"; // Connect to DB
import { useAuth } from "../context/AuthContext"; // Get current user
import { Card, Button, Badge } from "../components/UI";
import { 
  Calendar, List, Plus, Search, ChevronLeft, ChevronRight, 
  CheckCircle2, Circle, MoreVertical, Trash2 
} from "lucide-react";

export default function TaskBoard() {
  const { user, usersList } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'calendar-week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // --- 1. LOAD TASKS ---
  useState(() => {
    const path = `artifacts/${APP_ID}/public/data`;
    const unsub = onSnapshot(collection(db, path, 'tasks'), (s) => {
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // --- 2. HELPERS ---
  const crud = {
    add: (data) => addDoc(collection(db, `artifacts/${APP_ID}/public/data`, 'tasks'), { ...data, createdAt: serverTimestamp() }),
    update: (id, data) => updateDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'tasks', id), data),
    del: (id) => { if(confirm('Delete task?')) deleteDoc(doc(db, `artifacts/${APP_ID}/public/data`, 'tasks', id)); }
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for(let i=0; i<firstDay.getDay(); i++) days.push(null);
    for(let i=1; i<=lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title?.toLowerCase().includes(search.toLowerCase())
    );
  }, [tasks, search]);

  // --- 3. RENDERERS ---
  const renderList = () => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
          <tr>
            <th className="px-4 py-3 w-10">Status</th>
            <th className="px-4 py-3">Task Title</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredTasks.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
              <td className="px-4 py-3">
                <button onClick={() => crud.update(t.id, { status: t.status === 'Completed' ? 'Pending' : 'Completed' })}>
                  {t.status === 'Completed' 
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" /> 
                    : <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500" />}
                </button>
              </td>
              <td className={`px-4 py-3 font-medium ${t.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {t.title}
              </td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.dueDate}</td>
              <td className="px-4 py-3">
                {t.assignee && <Badge color="blue">{t.assignee}</Badge>}
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => crud.del(t.id)} className="text-slate-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCalendar = () => {
    const days = getCalendarDays();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-[600px] flex flex-col">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">{monthName}</h3>
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 px-2">Today</button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map(d => <div key={d} className="p-2 text-center text-xs font-bold text-slate-400 uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-hidden">
          {days.map((day, i) => {
            if(!day) return <div key={i} className="bg-slate-50 border-r border-b border-slate-100"></div>;
            const dateStr = day.toISOString().split('T')[0];
            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
            const isToday = new Date().toDateString() === day.toDateString();

            return (
              <div key={i} className="border-r border-b border-slate-100 p-1 min-h-[80px] relative hover:bg-slate-50 group">
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                  {dayTasks.map(t => (
                    <div key={t.id} className={`text-[10px] px-1 py-0.5 rounded border truncate ${t.status==='Completed'?'bg-slate-100 text-slate-400 line-through':'bg-blue-50 border-blue-100 text-blue-700'}`}>
                      {t.title}
                    </div>
                  ))}
                </div>
                {/* Quick Add Button */}
                <button 
                  onClick={() => { setEditingTask({ dueDate: dateStr }); setIsModalOpen(true); }}
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white shadow-sm border rounded text-blue-600"
                >
                  <Plus className="w-3 h-3"/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 4. MAIN RENDER ---
  return (
    <div className="space-y-4 h-full flex flex-col">
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
              placeholder="Search tasks..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button icon={Plus} onClick={() => { setEditingTask({}); setIsModalOpen(true); }}>New Task</Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {viewMode === 'list' ? renderList() : renderCalendar()}
      </div>

      {/* Simple Modal for Adding Tasks */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">New Task</h3>
            <div className="space-y-4">
              <input 
                placeholder="Task Title" 
                className="w-full p-2 border rounded" 
                value={editingTask?.title || ''} 
                onChange={e => setEditingTask({...editingTask, title: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date" 
                  className="w-full p-2 border rounded" 
                  value={editingTask?.dueDate || ''} 
                  onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                />
                <select 
                  className="w-full p-2 border rounded" 
                  value={editingTask?.assignee || ''}
                  onChange={e => setEditingTask({...editingTask, assignee: e.target.value})}
                >
                  <option value="">Assignee...</option>
                  {usersList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { crud.add(editingTask); setIsModalOpen(false); }}>Save Task</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}