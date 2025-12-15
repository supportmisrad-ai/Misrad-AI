
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Map, ArrowRight, Home, Lock } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
        <Map size={48} className="text-gray-400 opacity-50" />
      </div>
      <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-700 mb-4">העמוד לא נמצא</h2>
      <p className="text-gray-500 max-w-xs mx-auto mb-8">
        נראה שהלכת לאיבוד במערכת. העמוד שחיפשת אינו קיים או שהועבר למקום אחר.
      </p>
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all"
      >
        <Home size={18} /> חזרה ללוח הבקרה
      </button>
    </div>
  );
};

export const AccessDeniedView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
      <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center shadow-sm relative z-10 border border-red-100">
            <Lock size={40} className="text-red-500" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-gray-100 z-20">
              <ShieldAlert size={20} className="text-red-600" />
          </div>
      </div>
      
      <h1 className="text-2xl font-black text-gray-900 mb-2">אין לך הרשאת גישה</h1>
      <p className="text-gray-500 max-w-sm mx-auto mb-8">
        אזור זה מוגבל למורשים בלבד. אם אתה סבור שזו טעות, אנא פנה למנהל המערכת לעדכון תפקידך.
      </p>
      
      <div className="flex gap-4">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold px-4 py-2 transition-colors"
          >
            חזור אחורה
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all"
          >
            ללוח הבקרה <ArrowRight size={18} className="rotate-180" />
          </button>
      </div>
    </div>
  );
};
