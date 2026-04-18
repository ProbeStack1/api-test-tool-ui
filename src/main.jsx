import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
<Toaster 
  position="top-right"
  richColors={false}
  closeButton
  icons={{
    close: <span style={{ fontSize: '28px', lineHeight: 1 }}>×</span>
  }}
  toastOptions={{
    classNames: {
      success: '!bg-green-500/20 !backdrop-blur-sm !border !border-green-500/30 !shadow-lg',
      error: '!bg-red-500/20 !backdrop-blur-sm !border !border-red-500/30 !shadow-lg',
      info: '!bg-blue-500/20 !backdrop-blur-sm !border !border-blue-500/30 !shadow-lg',
      warning: '!bg-yellow-500/20 !backdrop-blur-sm !border !border-yellow-500/30 !shadow-lg',
      default: '!bg-gray-500/20 !backdrop-blur-sm !border !border-gray-500/30 !shadow-lg',
      toast: '!rounded-lg !p-4 !font-medium',
    }
  }}
/>
    </BrowserRouter>
  </StrictMode>,
)