import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.scss'
import App from './App.tsx'

// Установим тему до рендера приложения, чтобы избежать flash
const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('theme')) || null;
if (savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))) {
  document.documentElement.classList.remove('light');
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
