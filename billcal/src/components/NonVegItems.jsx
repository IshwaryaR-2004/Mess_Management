import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NonVegItems.css';

const NonVegItems = () => {
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchNonVegItems();
  }, []);

  const fetchNonVegItems = async () => {
    try {
      const response = await axios.get('http://localhost:5000/nonveg/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching non-veg items:', error);
      setMessage('Error fetching items. Please try again.');
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

  const handleUpload = async (e) => {
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
      const response = await axios.post('http://localhost:5000/nonveg/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.message) {
        setMessage(response.data.message);
        if (response.data.inserted > 0) {
          fetchNonVegItems(); // Refresh the list only if items were inserted
        }
      }
      setFile(null);
      // Reset file input
      e.target.reset();
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage(error.response?.data?.message || 'Error uploading file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="non-veg-items-container">
      <h2>Non-Veg Items Management</h2>
      
      <div className="bulk-upload-section">
        <h3>Upload Non-Veg Items</h3>
        <p>Upload an Excel file containing non-veg items data</p>
        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="upload-button"
            disabled={!file || loading}
          >
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
        {message && (
          <div className={`message ${message.includes('Error') || message.includes('invalid') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="non-veg-items-list">
        <h3>Non-Veg Items List</h3>
        <table>
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Item</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{item.rollno}</td>
                <td>{item.item}</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NonVegItems; 