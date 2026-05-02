'use client';

import { useEffect } from 'react';

export default function BootstrapInit() {
  useEffect(() => {
    // Dynamically import Bootstrap JS only on the client
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return null;
}
