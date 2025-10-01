import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import MessBillCalculator from './MessBillCalculator';
import StudentDetails from './StudentDetails';
import NonVegItems from './components/NonVegItems';
import StudentManagement from './components/StudentManagement';
import Sidebar from './components/Sidebar';
import './App.css';

const ProtectedRoute = ({ children, allowedUserType }) => {
  const userType = localStorage.getItem('userType');
  
  if (!userType) {
    return <Navigate to="/" replace />;
  }

  if (allowedUserType && userType !== allowedUserType) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AdminLayout = ({ children }) => {
  return (
    <div className="App">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={<Navigate to="/admin/bill-calculation" replace />} 
        />
        <Route 
          path="/admin/bill-calculation" 
          element={
            <ProtectedRoute allowedUserType="admin">
              <AdminLayout>
                <MessBillCalculator />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/non-veg-items" 
          element={
            <ProtectedRoute allowedUserType="admin">
              <AdminLayout>
                <NonVegItems />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/manage-students" 
          element={
            <ProtectedRoute allowedUserType="admin">
              <AdminLayout>
                <StudentManagement />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* Student Route */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedUserType="student">
              <StudentDetails />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;