import { createContext, useContext, useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);

  // 1. Try to load users for dropdowns (Assignees), but don't block the app if it fails
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, `artifacts/${APP_ID}/public/data`, 'users'), (s) => {
        setUsersList(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("Dropdown fetch warning:", err.message));
    } catch(e) {
      console.log("Offline mode or path error");
    }
    return () => unsub();
  }, []);

  // 2. THE BYPASS: Accept ANY credentials
  const login = async (email, password) => {
    console.log("⚠️ DEV MODE: Bypassing password check");
    
    // Create a fake Admin session immediately
    setUser({ 
        id: 'dev_admin', 
        name: 'Arpit (Dev)', 
        email: email, 
        role: 'Admin' 
    });
    return true; 
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, usersList, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}