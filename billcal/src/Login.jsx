import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetData, setResetData] = useState({
    rollno: '',
    newPassword: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First try admin login
      const adminResponse = await axios.post('http://localhost:5000/admin/login', {
        username: credentials.username,
        password: credentials.password
      });

      if (adminResponse.data.success) {
        console.log('Admin login successful');
        localStorage.setItem('userType', 'admin');
        navigate('/admin/bill-calculation');
        return;
      }
    } catch (adminError) {
      // If admin login fails, try student login
      try {
        const studentResponse = await axios.post('http://localhost:5000/login', {
          rollno: credentials.username,
          password: credentials.password
        });

        if (studentResponse.data.success) {
          console.log('Student login successful');
          localStorage.setItem('userType', 'student');
          localStorage.setItem('studentData', JSON.stringify(studentResponse.data.student));
          navigate('/student');
          return;
        }
      } catch (studentError) {
        console.error('Login error:', studentError);
        setError('Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/reset-password', {
        rollno: resetData.rollno.trim(),
        newPassword: resetData.newPassword
      });
      
      if (response.data.success) {
        setError('Password reset successful. Please login with your new password.');
        setShowForgotPassword(false);
        setResetData({ rollno: '', newPassword: '', confirmPassword: '' });
        setCredentials(prev => ({ ...prev, password: '' }));
      } else {
        setError(response.data.message || 'Password reset failed');
      }
    } catch (err) {
      console.error('Reset password error:', err.response || err);
      if (err.response?.status === 404) {
        setError('Student not found. Please check your roll number.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'Password reset failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Mess LMS Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username/Roll Number:</label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              placeholder="Enter username or roll number"
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 