import { createContext, useContext, useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, APP_ID } from "../lib/firebase";

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true); // New: Prevents flickering

  // 1. Check if user is ALREADY logged in (Persistence)
  useEffect(() => {
    const savedUser = localStorage.getItem("biowearth_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // 2. Load users for dropdowns (Optional background task)
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

  // 3. THE LOGIN FUNCTION
  const login = async (email, password) => {
    // The specific hardcoded check you requested
    // Note: treating 'email' as 'username' to match your request
    if (email.toLowerCase() === "arpit" && password === "12345") {
      
      const fakeAdmin = { 
        id: 'admin_arpit', 
        name: 'Arpit (Admin)', 
        email: 'arpit@biowearth.com', 
        role: 'Admin' 
      };

      setUser(fakeAdmin);
      localStorage.setItem("biowearth_user", JSON.stringify(fakeAdmin)); // Save to memory
      return true;
    }

    alert("Incorrect Username or Password");
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("biowearth_user"); // Clear from memory
  };

  return (
    <AuthContext.Provider value={{ user, usersList, login, logout }}>
      {/* Don't load the app until we know if you are logged in or not */}
      {!loading && children}
    </AuthContext.Provider>
  );
}