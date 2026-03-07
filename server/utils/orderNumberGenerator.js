// Utility function to generate unique order numbers
// Format: ORD-YYYYMMDD-XXXX where YYYYMMDD is current date and XXXX is random 4-digit number

const Order = require('../models/Order');

/**
 * Generates a unique order number in the format ORD-YYYYMMDD-XXXX
 * @returns {Promise<string>} A unique order number
 */
async function generateOrderNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  
  let orderNumber;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops
  
  // Try to generate a unique order number
  while (attempts < maxAttempts) {
    // Generate random 4-digit number
    const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
    orderNumber = `ORD-${datePart}-${randomPart}`;
    
    // Check if this order number already exists
    try {
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        // Found a unique order number
        return orderNumber;
      }
    } catch (error) {
      console.error('Error checking order number uniqueness:', error);
      throw new Error('Failed to generate unique order number');
    }
    
    attempts++;
  }
  
  // If we couldn't find a unique number after max attempts, throw an error
  throw new Error('Unable to generate unique order number after multiple attempts');
}

module.exports = { generateOrderNumber };