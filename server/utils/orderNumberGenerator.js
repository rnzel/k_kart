// Utility function to generate unique order numbers
// Format: KK-YYYY-MM-XXXXXX where YYYY-MM is current date and XXXXXX is sequential 6-digit number

const Order = require('../models/Order');

/**
 * Generates a unique order number in the format KK-YYYY-MM-XXXXXX
 * @returns {Promise<string>} A unique order number
 */
async function generateOrderNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const datePart = `${year}-${month}`;
  
  // Find the highest order number for this month
  const lastOrder = await Order.findOne(
    { orderNumber: { $regex: `^KK-${datePart}-` } },
    {},
    { sort: { orderNumber: -1 } }
  );

  let nextNumber = 1;
  
  if (lastOrder) {
    // Extract the number from the last order number
    const lastNumberMatch = lastOrder.orderNumber.match(/-(\d+)$/);
    if (lastNumberMatch) {
      nextNumber = parseInt(lastNumberMatch[1]) + 1;
    }
  }

  // Format as 6-digit number
  const formattedNumber = String(nextNumber).padStart(6, '0');
  const orderNumber = `KK-${datePart}-${formattedNumber}`;

  // Verify uniqueness (in case of race conditions)
  const existingOrder = await Order.findOne({ orderNumber });
  if (existingOrder) {
    // If somehow there's a collision, increment and try again
    const retryNumber = String(nextNumber + 1).padStart(6, '0');
    return `KK-${datePart}-${retryNumber}`;
  }

  return orderNumber;
}

/**
 * Validates order number format
 * @param {string} orderNumber - The order number to validate
 * @returns {boolean} True if format is valid
 */
function isValidOrderNumber(orderNumber) {
  const regex = /^KK-\d{4}-\d{2}-\d{6}$/;
  return regex.test(orderNumber);
}

/**
 * Gets the next sequential number for a given date
 * @param {string} datePart - Date part in YYYY-MM format
 * @returns {Promise<number>} The next sequential number
 */
async function getNextSequentialNumber(datePart) {
  const lastOrder = await Order.findOne(
    { orderNumber: { $regex: `^KK-${datePart}-` } },
    {},
    { sort: { orderNumber: -1 } }
  );

  let nextNumber = 1;
  
  if (lastOrder) {
    const lastNumberMatch = lastOrder.orderNumber.match(/-(\d+)$/);
    if (lastNumberMatch) {
      nextNumber = parseInt(lastNumberMatch[1]) + 1;
    }
  }

  return nextNumber;
}

module.exports = { 
  generateOrderNumber, 
  isValidOrderNumber, 
  getNextSequentialNumber 
};