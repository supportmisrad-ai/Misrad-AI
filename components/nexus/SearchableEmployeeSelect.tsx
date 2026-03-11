
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Employee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

interface SearchableEmployeeSelectProps {
  value: string;
  onChange: (value: string) => void;
  employees: Employee[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SearchableEmployeeSelect: React.FC<SearchableEmployeeSelectProps> = ({ 
  value, 
  onChange, 
  employees, 
  placeholder = 'בחר עובד', 
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number; isMobile?: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const portalContainer: Element | DocumentFragment | null =
    typeof document !== 'undefined' ? (document.body ?? document.documentElement) : null;

  const selectedEmployee = employees.find(emp => emp.id === value);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
          containerRef.current && 
          !containerRef.current.contains(event.target as Node) && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    const handleScroll = (event: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
        setIsOpen(false);
        setSearchTerm('');
    };

    // Throttled handlers - defined outside if block for cleanup access
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let handleResize: (() => void) | null = null;
    let throttledHandleScroll: ((event: Event) => void) | null = null;

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        
        // Throttled resize handler
        handleResize = () => {
            if (resizeTimeout) return;
            resizeTimeout = setTimeout(() => {
                setIsOpen(false);
                setSearchTerm('');
                resizeTimeout = null;
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        
        // Throttled scroll handler
        throttledHandleScroll = (event: Event) => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                handleScroll(event);
                scrollTimeout = null;
            }, 50);
        };
        window.addEventListener('scroll', throttledHandleScroll, true);
        
        // Focus search input when opened
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 100);
    }
    
    return () => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        if (typeof window !== 'undefined') {
            if (handleResize) window.removeEventListener('resize', handleResize);
            if (throttledHandleScroll) window.removeEventListener('scroll', throttledHandleScroll, true);
        }
        if (resizeTimeout) clearTimeout(resizeTimeout);
        if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isOpen]);

  const toggleOpen = () => {
      if (disabled) return;
      
      if (!isOpen && containerRef.current && typeof window !== 'undefined') {
          const rect = containerRef.current.getBoundingClientRect();
          const dropdownHeight = Math.min(filteredEmployees.length * 56 + 60, 320) + 16;
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
          const isMobile = window.innerWidth < 768;

          setPosition({
              top: isMobile ? window.innerHeight / 2 : (showAbove ? rect.top - 8 : rect.bottom + 8),
              left: isMobile ? window.innerWidth / 2 : rect.left,
              width: isMobile ? Math.min(Math.max(rect.width, 280), window.innerWidth - 32) : rect.width,
              isMobile
          });
      }
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
  };

  const handleSelect = (employeeId: string) => {
    onChange(employeeId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={toggleOpen}
          disabled={disabled}
          className={`w-full h-11 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium transition-all outline-none duration-200 group ${
            isOpen 
              ? 'ring-2 ring-black border-black shadow-sm z-20 relative' 
              : 'hover:border-gray-300 shadow-sm hover:shadow'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
            {selectedEmployee ? (
              <>
                {selectedEmployee.avatar ? (
                  <img 
                    src={selectedEmployee.avatar} 
                    alt={selectedEmployee.name}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={14} className="text-gray-600" />
                  </div>
                )}
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-gray-900 font-bold text-sm truncate w-full">
                    {selectedEmployee.name}
                  </span>
                  {selectedEmployee.role && (
                    <span className="text-[10px] text-gray-500 truncate w-full">
                      {selectedEmployee.role}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-gray-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-300 ease-out shrink-0 ${isOpen ? 'rotate-180 text-black' : 'group-hover:text-gray-600'}`} 
          />
        </button>
      </div>

      {portalContainer ? (
        isOpen && position
          ? createPortal(
        <AnimatePresence>
            {position.isMobile && (
                <motion.div 
                    key="backdrop"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                    onClick={() => setIsOpen(false)}
                />
            )}
            <motion.div
                key="dropdown"
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={position.isMobile ? {
                    position: 'fixed', 
                    top: '50%',
                    left: '50%',
                    right: 'auto',
                    bottom: 'auto',
                    transform: 'translate(-50%, -50%)',
                    width: position.width, 
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: '60vh',
                    zIndex: 9999,
                    margin: '0 auto'
                } : {
                    position: 'fixed', 
                    top: position.top, 
                    left: position.left, 
                    width: position.width, 
                    zIndex: 9999,
                    transformOrigin: typeof window !== 'undefined' && position.top > window.innerHeight / 2 ? 'bottom' : 'top'
                }}
                className={`bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col max-h-80 ring-1 ring-black/5 ${!position.isMobile && position.top > window.innerHeight / 2 ? '-translate-y-full' : ''}`}
            >
                {/* Search Input */}
                <div className="p-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div className="relative">
                        <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                        <input 
                            ref={searchInputRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white rounded-xl pr-9 pl-3 py-2 text-xs outline-none transition-all font-medium" 
                            placeholder="חפש עובד לפי שם, תפקיד או אימייל..." 
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                {/* Employee List */}
                <div className="overflow-y-auto custom-scrollbar p-1.5">
                    {filteredEmployees.length > 0 ? (
                        <div className="space-y-0.5">
                            {filteredEmployees.map((employee) => {
                                const isSelected = value === employee.id;
                                return (
                                    <button
                                        key={employee.id}
                                        type="button"
                                        onClick={() => handleSelect(employee.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                                            isSelected 
                                            ? 'bg-black text-white font-bold shadow-md' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                        }`}
                                    >
                                        {employee.avatar ? (
                                            <img 
                                                src={employee.avatar} 
                                                alt={employee.name}
                                                className={`w-8 h-8 rounded-full object-cover border shrink-0 ${
                                                    isSelected ? 'border-white/20' : 'border-gray-200'
                                                }`}
                                            />
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                isSelected ? 'bg-white/20' : 'bg-gray-100'
                                            }`}>
                                                <User size={16} className={isSelected ? 'text-white' : 'text-gray-600'} />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-start flex-1 min-w-0 text-right">
                                            <span className={`text-sm font-bold truncate w-full ${
                                                isSelected ? 'text-white' : 'text-gray-900'
                                            }`}>
                                                {employee.name}
                                            </span>
                                            {(employee.role || employee.email) && (
                                                <span className={`text-[10px] truncate w-full ${
                                                    isSelected ? 'text-white/80' : 'text-gray-500'
                                                }`}>
                                                    {employee.role || employee.email}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {isSelected && (
                                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                                <Check size={14} className="text-white shrink-0" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <p className="text-sm text-gray-400 font-medium">לא נמצאו עובדים</p>
                            <p className="text-xs text-gray-400 mt-1">נסה לחפש במילים אחרות</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>,
        portalContainer
      )
          : null
      ) : null}
    </>
  );
};
