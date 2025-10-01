import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear any stored user data
    localStorage.removeItem('userType');
    localStorage.removeItem('studentData');
    // Redirect to login page
    navigate('/');
  };

  return (
    <div className="sidebar">
      <h1>Mess LMS</h1>
      <nav className="sidebar-nav">
        <NavLink 
          to="/admin/bill-calculation" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Bill Calculation
        </NavLink>
        <NavLink 
          to="/admin/non-veg-items" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Non-Veg Items
        </NavLink>
        <NavLink 
          to="/admin/manage-students" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Admin Page
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 