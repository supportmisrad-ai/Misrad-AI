'use client';

import React, { useEffect, useState } from 'react';

interface AvatarProps {
    src?: string | null;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    rounded?: 'none' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
    className?: string;
}

const sizeClasses = {
    xs: 'w-4 h-4 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 md:w-9 md:h-9 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-full h-full text-4xl'
};

export function Avatar({
    src,
    alt,
    name,
    size = 'md',
    rounded = 'full',
    className = ''
}: AvatarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const sizeClass = sizeClasses[size];
    const initials = getInitials(name);

    const roundedClass =
        rounded === 'none'
            ? ''
            : rounded === 'lg'
                ? 'rounded-lg'
                : rounded === 'xl'
                    ? 'rounded-xl'
                    : rounded === '2xl'
                        ? 'rounded-2xl'
                        : rounded === '3xl'
                            ? 'rounded-3xl'
                            : 'rounded-full';

    const effectiveSrc = mounted ? src : undefined;

    if (!effectiveSrc || effectiveSrc.trim() === '') {
        return (
            <div 
                className={`${sizeClass} ${roundedClass} bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold ${className}`}
                aria-label={alt || name || 'User avatar'}
                suppressHydrationWarning
            >
                {initials}
            </div>
        );
    }

    return (
        <img 
            src={effectiveSrc} 
            alt={alt || name || 'User avatar'} 
            className={`${sizeClass} ${roundedClass} object-cover ${className}`}
        />
    );
};
