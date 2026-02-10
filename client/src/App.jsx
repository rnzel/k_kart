import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import './custom-bootstrap.css'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
