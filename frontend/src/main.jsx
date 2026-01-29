import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SmoothScrollProvider from './components/SmoothScrollProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SmoothScrollProvider>
      <App />
    </SmoothScrollProvider>
  </React.StrictMode>
)
