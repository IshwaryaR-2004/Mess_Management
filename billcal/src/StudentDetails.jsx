import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDetails.css';

export default function StudentDetails() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const studentData = localStorage.getItem('studentData');
    if (!studentData) {
      navigate('/login');
      return;
    }

    setStudent(JSON.parse(studentData));
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('studentData');
    navigate('/login');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!student) return null;

  return (
    <div className="student-details">
      <div className="header">
        <h1>Student Details</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="details-card">
        <div className="detail-row">
          <span className="label">Roll Number:</span>
          <span className="value">{student.rollno}</span>
        </div>
        <div className="detail-row">
          <span className="label">Name:</span>
          <span className="value">{student.name}</span>
        </div>
        <div className="detail-row">
          <span className="label">Department:</span>
          <span className="value">{student.dept}</span>
        </div>
        <div className="detail-row">
          <span className="label">Year:</span>
          <span className="value">{student.year}</span>
        </div>
        <div className="detail-row">
          <span className="label">Current Mess Bill:</span>
          <span className="value">₹{student.messbill.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
} 