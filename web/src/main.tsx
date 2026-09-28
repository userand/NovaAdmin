import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/inter/index.css';
import { router } from './router';
import { Toaster } from './ui/sonner';
import { ConfirmHost } from './components/ConfirmDialog';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" richColors={false} />
    <ConfirmHost />
  </React.StrictMode>,
);
