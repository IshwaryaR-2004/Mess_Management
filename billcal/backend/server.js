import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';

const app = express();
const PORT = 5000;

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = 'mongodb://127.0.0.1:27017/messdb';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully to messdb'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Bill Schema and Model
const billSchema = new mongoose.Schema({
  description: { 
    type: String, 
    required: [true, 'Description is required'],
    minlength: [3, 'Description must be at least 3 characters']
  },
  amount: { 
    type: Number, 
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
});

const Bill = mongoose.model('Bill', billSchema);

// Student Schema and Model
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollno: { type: String, required: true, unique: true },
  dept: { type: String, required: true },
  year: { type: Number, required: true },
  messbill: { type: Number, default: 0 },
  password: { type: String, default: '123456' }
});

const Student = mongoose.model('students', studentSchema);

// Non-Veg Item Schema and Model
const nonVegItemSchema = new mongoose.Schema({
  rollno: {
    type: String,
    required: [true, 'Student roll number is required']
  },
  item: {
    type: String,
    required: [true, 'Item name is required']
  },
  date: { 
    type: Date, 
    default: Date.now 
  }
});

const NonVegItem = mongoose.model('NonVegItem', nonVegItemSchema);

// Admin Schema and Model
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Initialize admin if not exists
const initializeAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const admin = new Admin({
        username: 'admin',
        password: 'admin'
      });
      await admin.save();
      console.log('Default admin account created');
    }
  } catch (err) {
    console.error('Error initializing admin:', err);
  }
};

initializeAdmin();

// API Routes

// Bill Routes
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ date: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/bills', async (req, res) => {
  try {
    const bill = new Bill(req.body);
    const newBill = await bill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Student Routes
app.post('/students', async (req, res) => {
  try {
    const { rollno, name, dept, year } = req.body;
    
    const existingStudent = await Student.findOne({ rollno });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student roll number already exists!' });
    }

    // Create new student with default messbill of 0
    const student = new Student({
      rollno,
      name,
      dept,
      year,
      messbill: 0,
      password: '123456'
    });

    await student.save();
    res.status(201).json({ 
      message: 'Student added successfully',
      student: {
        rollno: student.rollno,
        name: student.name,
        dept: student.dept,
        year: student.year,
        messbill: student.messbill
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add bulk upload endpoint after the existing student routes
app.post('/students/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname);

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log('Parsed Excel data:', data);

    // Validate data format
    const invalidRows = data.filter(row => !row.name || !row.rollno || !row.dept || row.year === undefined);
    if (invalidRows.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid data format in some rows',
        invalidRows: invalidRows,
        requiredColumns: ['name', 'rollno', 'dept', 'year']
      });
    }

    // Transform data to match exact database schema
    const students = data.map(row => ({
      name: row.name,
      rollno: row.rollno.toString(),
      dept: row.dept,
      year: Number(row.year),
      messbill: Number(row.messbill || 0),
      password: row.password || '123456'
    }));

    console.log('Transformed data:', students);

    let inserted = 0;
    let updated = 0;
    let errors = [];

    // Process each student individually
    for (const student of students) {
      try {
        const existingStudent = await Student.findOne({ rollno: student.rollno });
        
        if (existingStudent) {
          // Update existing student
          await Student.findOneAndUpdate(
            { rollno: student.rollno },
            student,
            { new: true }
          );
          updated++;
          console.log('Updated student:', student.rollno);
        } else {
          // Insert new student
          const new_student = new Student(student);
          await new_student.save();
          inserted++;
          console.log('Inserted student:', student.rollno);
        }
      } catch (err) {
        errors.push({
          rollno: student.rollno,
          name: student.name,
          error: err.message
        });
        console.error(`Error processing student ${student.rollno}:`, err);
      }
    }

    const response = {
      message: `Processed ${students.length} students (${inserted} inserted, ${updated} updated)`,
      total: students.length,
      inserted,
      updated,
      success: inserted + updated,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Upload response:', response);
    res.status(200).json(response);

  } catch (err) {
    console.error('File processing error:', err);
    res.status(500).json({ 
      message: 'Error processing file',
      error: err.message
    });
  }
});

// Non-veg items upload endpoint
app.post('/nonveg/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let insertedCount = 0;
    let errors = [];

    for (const item of data) {
      try {
        // Validate required fields
        if (!item.rollno || !item.item || !item.price) {
          errors.push(`Missing required fields for row: ${JSON.stringify(item)}`);
          continue;
        }

        // Find the student
        const student = await Student.findOne({ rollno: item.rollno.toString() });
        if (!student) {
          errors.push(`Student not found with roll number: ${item.rollno}`);
          continue;
        }

        // Create new non-veg item
        const nonVegItem = new NonVegItem({
          rollno: item.rollno.toString(),
          item: item.item,
          price: parseFloat(item.price),
          date: item.date || new Date()
        });

        await nonVegItem.save();

        // Update student's mess bill
        const updatedStudent = await Student.findOneAndUpdate(
          { rollno: item.rollno.toString() },
          { $inc: { messbill: parseFloat(item.price) } },
          { new: true }
        );

        console.log(`Updated mess bill for student ${item.rollno}: ${updatedStudent.messbill}`);
        insertedCount++;
      } catch (error) {
        console.error('Error processing item:', error);
        errors.push(`Error processing item for roll number ${item.rollno}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Send response
    res.json({
      message: `Processed ${insertedCount} items successfully${errors.length > 0 ? ' with some errors' : ''}`,
      inserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Get all non-veg items
app.get('/nonveg/items', async (req, res) => {
  try {
    const items = await NonVegItem.find().sort({ date: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all students with their messbill
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ rollno: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Calculate and distribute non-veg bill
app.post('/nonveg/calculate-bill', async (req, res) => {
  try {
    // Get all non-veg items
    const items = await NonVegItem.find();
    
    if (items.length === 0) {
      return res.status(400).json({ 
        message: 'No non-veg items found to calculate bill' 
      });
    }

    // Group items by student roll number
    const studentItems = {};
    items.forEach(item => {
      if (!studentItems[item.rollno]) {
        studentItems[item.rollno] = [];
      }
      studentItems[item.rollno].push(item.item.toLowerCase());
    });

    // Calculate bill for each student
    const updatedStudents = [];
    let totalAmount = 0;

    for (const [rollno, items] of Object.entries(studentItems)) {
      const student = await Student.findOne({ rollno });
      if (student) {
        let studentAmount = 0;
        const itemizedBill = [];
        
        // Calculate amount based on items
        items.forEach(item => {
          const isEggItem = item.includes('egg');
          const itemPrice = isEggItem ? 10 : 50;
          studentAmount += itemPrice;
          
          itemizedBill.push({
            item: item,
            price: itemPrice
          });
        });

        // Update student's messbill
        const previousMessbill = student.messbill;
        student.messbill += studentAmount;
        await student.save();

        updatedStudents.push({
          name: student.name,
          rollno: student.rollno,
          items: itemizedBill,
          itemCount: items.length,
          previousMessbill,
          addedAmount: studentAmount,
          newMessbill: student.messbill
        });

        totalAmount += studentAmount;
      }
    }

    // Clear all non-veg items after successful distribution
    await NonVegItem.deleteMany({});

    res.status(200).json({
      message: 'Bill calculated and distributed successfully',
      totalAmount,
      studentCount: updatedStudents.length,
      updatedStudents,
      summary: {
        totalStudents: updatedStudents.length,
        totalAmount,
        averagePerStudent: totalAmount / updatedStudents.length
      }
    });

  } catch (err) {
    res.status(500).json({ 
      message: 'Error calculating bill',
      error: err.message
    });
  }
});

// Calculate and update messbills for all students based on total expenses (alternative endpoint)
app.post('/calculate-messbill', async (req, res) => {
  try {
    console.log('Received calculation request:', req.body);
    const { totalAmount } = req.body;
    
    if (!totalAmount || totalAmount <= 0) {
      console.log('Invalid total amount:', totalAmount);
      return res.status(400).json({ 
        message: 'Invalid total amount' 
      });
    }
    
    // Get all students
    const students = await Student.find();
    console.log('Found students:', students.length);
    
    if (students.length === 0) {
      console.log('No students found in database');
      return res.status(400).json({ 
        message: 'No students found in the database' 
      });
    }
    
    // Calculate per student amount and ceil it if not a whole number
    const rawPerStudentAmount = totalAmount / students.length;
    const perStudentAmount = Math.ceil(rawPerStudentAmount * 100) / 100; // Ceil to 2 decimal places
    console.log('Raw per student amount:', rawPerStudentAmount);
    console.log('Ceiled per student amount:', perStudentAmount);
    
    // Calculate the actual total after ceiling
    const actualTotal = perStudentAmount * students.length;
    console.log('Actual total after ceiling:', actualTotal);
    
    // Update messbill for each student
    const updatedStudents = [];
    
    for (const student of students) {
      try {
        const previousMessbill = student.messbill;
        student.messbill += perStudentAmount;
        await student.save();
        
        updatedStudents.push({
          name: student.name,
          rollno: student.rollno,
          previousMessbill,
          addedAmount: perStudentAmount,
          newMessbill: student.messbill
        });
        
        console.log(`Updated student ${student.rollno}: ${previousMessbill} -> ${student.messbill}`);
      } catch (err) {
        console.error(`Error updating student ${student.rollno}:`, err);
        throw err; // Re-throw to be caught by outer try-catch
      }
    }
    
    console.log('Successfully updated all students');
    
    res.status(200).json({
      message: `Successfully updated messbills for ${updatedStudents.length} students. Each student's bill increased by ₹${perStudentAmount.toFixed(2)}`,
      totalAmount: actualTotal,
      originalTotal: totalAmount,
      studentCount: updatedStudents.length,
      perStudentAmount,
      updatedStudents
    });
    
  } catch (err) {
    console.error('Error calculating messbill:', err);
    res.status(500).json({ 
      message: 'Error calculating and updating messbills',
      error: err.message,
      details: err.stack
    });
  }
});

// Student login endpoint
app.post('/login', async (req, res) => {
  try {
    const { rollno, password } = req.body;
    console.log('Student login attempt:', rollno);

    if (!rollno || !password) {
      return res.status(400).json({
        success: false,
        message: 'Roll number and password are required'
      });
    }

    const student = await Student.findOne({ rollno });
    console.log('Student found:', student ? 'Yes' : 'No');

    if (!student || student.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      student: {
        rollno: student.rollno,
        name: student.name,
        dept: student.dept,
        year: student.year,
        messbill: student.messbill
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Password reset endpoint
app.post('/reset-password', async (req, res) => {
  try {
    const { rollno, newPassword } = req.body;
    console.log('Password reset attempt for rollno:', rollno);
    
    if (!rollno || !newPassword) {
      console.log('Missing reset password data');
      return res.status(400).json({ 
        success: false,
        message: 'Roll number and new password are required' 
      });
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    const student = await Student.findOne({ rollno: rollno.toString() });
    console.log('Found student for reset:', student ? 'Yes' : 'No');
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Update password
    student.password = newPassword;
    await student.save();
    console.log('Password updated successfully for student:', rollno);

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error resetting password',
      error: err.message 
    });
  }
});

// Admin login endpoint
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Admin login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const admin = await Admin.findOne({ username });
    console.log('Admin found:', admin ? 'Yes' : 'No');

    if (!admin || admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      message: 'Admin login successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});