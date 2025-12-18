import { createContext, useContext, useState, useEffect } from "react";
import { signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, APP_ID } from "../lib/firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Connect to Firebase Anonymous Auth
    signInAnonymously(auth).catch(console.error);

    // 2. Listen to the "users" collection
    const path = `artifacts/${APP_ID}/public/data`;
    const unsubscribe = onSnapshot(collection(db, path, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsersList(fetchedUsers);
      
      // Auto-create Admin if empty (Safety Net)
      if (fetchedUsers.length === 0) {
        addDoc(collection(db, path, 'users'), {
          name: 'System Admin',
          username: 'admin',
          password: 'password123',
          role: 'Admin',
          createdAt: serverTimestamp()
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Simple Login Logic
  const login = (username, password) => {
    const foundUser = usersList.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      return { success: true };
    }
    return { success: false, error: "Invalid credentials" };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, usersList, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};