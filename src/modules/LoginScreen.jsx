import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, Button, LoadingScreen } from "../components/UI";

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.success) setError(result.error);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">B</div>
          <h1 className="text-2xl font-bold text-slate-800">Biowearth OS</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Resource Planning</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              autoFocus 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          
          {error && <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded">{error}</div>}
          
          <Button className="w-full" onClick={handleLogin}>Login System</Button>
        </form>
        
        <div className="mt-6 text-center text-xs text-slate-400">
          Biowearth OS v9.5 (React Build)
        </div>
      </Card>
    </div>
  );
}