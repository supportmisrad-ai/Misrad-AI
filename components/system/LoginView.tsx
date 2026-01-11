'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LoginView = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    router.replace('/login?redirect=/system');
  }, []);

  return null;
};

export default LoginView;
