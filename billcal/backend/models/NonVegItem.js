import mongoose from 'mongoose';

const nonVegItemSchema = new mongoose.Schema({
  rollno: {
    type: String,
    required: true
  },
  item: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const NonVegItem = mongoose.model('NonVegItem', nonVegItemSchema);

export default NonVegItem; 