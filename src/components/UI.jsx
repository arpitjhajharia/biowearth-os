import { Loader2 } from "lucide-react";

// Standard Card Component
export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

// Standard Badge Component
export const Badge = ({ children, color = "blue", size = "sm" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
    purple: "bg-purple-100 text-purple-800",
    slate: "bg-slate-100 text-slate-800",
  };
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`rounded-full font-medium ${colors[color] || colors.slate} ${sizeClasses}`}>
      {children}
    </span>
  );
};

// Standard Button Component
export const Button = ({ children, onClick, variant = "primary", icon: Icon, className = "", size = "md", disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`
      flex items-center justify-center rounded font-medium transition-colors 
      ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'} 
      ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} 
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}
  >
    {Icon && <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />} 
    {children}
  </button>
);

// Loading Spinner
export const LoadingScreen = () => (
  <div className="h-screen flex items-center justify-center text-slate-400 gap-2">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    Loading Biowearth OS...
  </div>
);