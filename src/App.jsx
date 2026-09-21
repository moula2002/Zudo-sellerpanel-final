import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Pickup from './pages/Pickup';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Orders from './pages/Orders';
import Pickups from './pages/Pickups';
import Settings from './pages/Settings';
import BulkUpload from './pages/BulkUpload';
import Returns from './pages/Returns';
import VerificationPending from './pages/VerificationPending';
import FeedUpload from './pages/FeedUpload';
import Invoices from './pages/Invoices';

import { ThemeProvider } from './utils/ThemeContext';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('zudo_seller_token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/complete-profile" 
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/add" 
          element={
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/edit/:id" 
          element={
            <ProtectedRoute>
              <EditProduct />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products/bulk" 
          element={
            <ProtectedRoute>
              <BulkUpload />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/returns" 
          element={
            <ProtectedRoute>
              <Returns />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pickups" 
          element={
            <ProtectedRoute>
              <Pickups />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/driver-pickup" 
          element={
            <ProtectedRoute>
              <Pickup />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/verification-pending" 
          element={
            <ProtectedRoute>
              <VerificationPending />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/feed-upload" 
          element={
            <ProtectedRoute>
              <FeedUpload />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/invoices" 
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;
