import { useState, useEffect } from 'react'
import axios from 'axios'
import './MessBillCalculator.css'

export default function MessBillCalculator() {
  const [expenses, setExpenses] = useState([])
  const [formData, setFormData] = useState({
    description: '',
    amount: ''
  })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [calculationStatus, setCalculationStatus] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [perStudentAmount, setPerStudentAmount] = useState(0)

  useEffect(() => {
    fetchExpenses()
    fetchStudentCount()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const response = await axios.get('http://localhost:5000/api/bills')
      setExpenses(response.data)
      calculateTotal(response.data)
    } catch (err) {
      setError('Failed to fetch expenses')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentCount = async () => {
    try {
      const response = await axios.get('http://localhost:5000/students')
      setStudentCount(response.data.length)
    } catch (err) {
      console.error('Error fetching student count:', err)
    }
  }

  const calculateTotal = (expenses) => {
    const sum = expenses.reduce((acc, expense) => acc + expense.amount, 0)
    setTotal(sum)
    if (studentCount > 0) {
      setPerStudentAmount(sum / studentCount)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('http://localhost:5000/api/bills', {
        description: formData.description.trim(),
        amount: amount
      })
      
      setExpenses(prev => [...prev, response.data])
      setTotal(prev => prev + amount)
      setFormData({ description: '', amount: '' })
      setError(null)
      
      // Update per student amount
      if (studentCount > 0) {
        setPerStudentAmount((total + amount) / studentCount)
      }
    } catch (err) {
      setError('Failed to add expense')
      console.error('Submit error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (expenses.length === 0) {
      setError('No expenses to calculate')
      return
    }

    if (studentCount === 0) {
      setError('No students found in the database')
      return
    }

    setLoading(true)
    setCalculationStatus('')
    setError(null)

    try {
      console.log('Sending calculation request:', {
        totalAmount: total
      });

      const response = await axios.post('http://localhost:5000/calculate-messbill', {
        totalAmount: total
      })
      
      console.log('Calculation response:', response.data);
      
      // Create a more detailed status message
      const statusMessage = `${response.data.message}\n\n` +
        `Original Total: ₹${response.data.originalTotal.toFixed(2)}\n` +
        `Actual Total (after rounding): ₹${response.data.totalAmount.toFixed(2)}\n` +
        `Difference: ₹${(response.data.totalAmount - response.data.originalTotal).toFixed(2)}`;
      
      setCalculationStatus(statusMessage);
      
      // Refresh the expenses list to show updated data
      fetchExpenses()
    } catch (err) {
      console.error('Calculation error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to calculate and update messbills';
      const errorDetails = err.response?.data?.details || err.message;
      setError(`${errorMessage}\nDetails: ${errorDetails}`);
    } finally {
      setLoading(false)
    }
  }

  if (loading && expenses.length === 0) return <div className="loading">Loading...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="calculator">
      <h1>Mess Bill Calculator</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            name="description"
            placeholder="Expense description"
            value={formData.description}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount (₹)"
            value={formData.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </form>

      <div className="summary">
        <h2>Bill Summary</h2>
        {expenses.length > 0 ? (
          <>
            <ul>
              {expenses.map((expense) => (
                <li key={expense._id}>
                  {expense.description}: ₹{expense.amount.toFixed(2)}
                  <span className="date">
                    {new Date(expense.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="total">Total: ₹{total.toFixed(2)}</div>
            {studentCount > 0 && (
              <div className="per-student">
                Per Student: ₹{perStudentAmount.toFixed(2)} (for {studentCount} students)
              </div>
            )}
          </>
        ) : (
          <p>No expenses recorded yet</p>
        )}
      </div>

      {expenses.length > 0 && (
        <div className="calculate-section">
          <button 
            className="calculate-button" 
            onClick={handleCalculate}
            disabled={loading || studentCount === 0}
          >
            {loading ? 'Calculating...' : 'Calculate & Update All Student Bills'}
          </button>
          {calculationStatus && (
            <div className="calculation-status">
              {calculationStatus}
            </div>
          )}
        </div>
      )}
    </div>
  )
}