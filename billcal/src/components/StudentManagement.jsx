import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StudentManagement.css';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({
    rollno: '',
    name: '',
    dept: '',
    year: '',
    password: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/students');
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage('Error fetching students. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5000/students', newStudent);
      setMessage('Student added successfully!');
      fetchStudents();
      setNewStudent({
        rollno: '',
        name: '',
        dept: '',
        year: '',
        password: ''
      });
    } catch (error) {
      console.error('Error adding student:', error);
      setMessage(error.response?.data?.message || 'Error adding student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setMessage('');
      } else {
        setMessage('Please upload only Excel files (.xlsx or .xls)');
        e.target.value = null;
      }
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5000/students/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.message) {
        setMessage(response.data.message);
        if (response.data.success > 0) {
          fetchStudents(); // Refresh the list only if students were added
        }
      }
      setFile(null);
      e.target.reset();
    } catch (error) {
      console.error('Error uploading students:', error);
      setMessage(error.response?.data?.message || 'Error uploading students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-management-container">
      <h2>Student Management</h2>

      <div className="add-student-section">
        <h3>Add New Student</h3>
        <form onSubmit={handleAddStudent}>
          <div className="form-group">
            <input
              type="text"
              name="rollno"
              placeholder="Roll Number"
              value={newStudent.rollno}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={newStudent.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              name="dept"
              placeholder="Department"
              value={newStudent.dept}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="number"
              name="year"
              placeholder="Year"
              value={newStudent.year}
              onChange={handleInputChange}
              required
              min="1"
              max="4"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={newStudent.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>

      <div className="bulk-upload-section">
        <h3>Bulk Upload Students</h3>
        <p>Upload an Excel file containing student data</p>
        <form onSubmit={handleBulkUpload}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
          />
          <button type="submit" disabled={!file || loading}>
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
        {message && (
          <div className={`message ${message.includes('Error') || message.includes('invalid') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="students-list">
        <h3>Students List</h3>
        <table>
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Name</th>
              <th>Department</th>
              <th>Year</th>
              <th>Mess Bill</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.rollno}>
                <td>{student.rollno}</td>
                <td>{student.name}</td>
                <td>{student.dept}</td>
                <td>{student.year}</td>
                <td>₹{student.messbill || 0}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No students found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentManagement; 