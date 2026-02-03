'use client';

import { useCallback, useState } from 'react';
import { Toast } from '../types';

export const useToasts = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
            const id = Math.random().toString(36).substr(2, 9);
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => removeToast(id), 3000);
        },
        [removeToast]
    );

    return { toasts, addToast, removeToast };
};
