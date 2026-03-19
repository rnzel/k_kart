// Frontend form validation utilities

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (Philippine format)
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^09[0-9]{9}$/;
  return phoneRegex.test(phone);
};

// Password validation
export const validatePassword = (password) => {
  const minLength = password.length >= 6;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return {
    isValid: minLength && hasLetters && hasNumbers,
    errors: [
      !minLength && 'Password must be at least 6 characters',
      !hasLetters && 'Password must contain at least one letter',
      !hasNumbers && 'Password must contain at least one number'
    ].filter(Boolean)
  };
};

// Name validation
export const validateName = (name) => {
  const minLength = name.trim().length >= 2;
  const maxLength = name.trim().length <= 50;
  const hasValidChars = /^[a-zA-Z\s'-]+$/.test(name);
  
  return {
    isValid: minLength && maxLength && hasValidChars,
    errors: [
      !minLength && 'Name must be at least 2 characters',
      !maxLength && 'Name cannot exceed 50 characters',
      !hasValidChars && 'Name can only contain letters, spaces, hyphens, and apostrophes'
    ].filter(Boolean)
  };
};

// Shop name validation
export const validateShopName = (name) => {
  const minLength = name.trim().length >= 2;
  const maxLength = name.trim().length <= 100;
  
  return {
    isValid: minLength && maxLength,
    errors: [
      !minLength && 'Shop name must be at least 2 characters',
      !maxLength && 'Shop name cannot exceed 100 characters'
    ].filter(Boolean)
  };
};

// Shop description validation
export const validateShopDescription = (description) => {
  const maxLength = description.length <= 500;
  
  return {
    isValid: maxLength,
    errors: [
      !maxLength && 'Shop description cannot exceed 500 characters'
    ].filter(Boolean)
  };
};

// Product name validation
export const validateProductName = (name) => {
  const minLength = name.trim().length >= 2;
  const maxLength = name.trim().length <= 50;
  
  return {
    isValid: minLength && maxLength,
    errors: [
      !minLength && 'Product name must be at least 2 characters',
      !maxLength && 'Product name cannot exceed 50 characters'
    ].filter(Boolean)
  };
};

// Product description validation
export const validateProductDescription = (description) => {
  const maxLength = description.length <= 500;
  
  return {
    isValid: maxLength,
    errors: [
      !maxLength && 'Product description cannot exceed 500 characters'
    ].filter(Boolean)
  };
};

// Product price validation
export const validateProductPrice = (price) => {
  const numPrice = Number(price);
  const isNumber = !isNaN(numPrice);
  const isPositive = numPrice >= 0;
  const isReasonable = numPrice <= 999999;
  
  return {
    isValid: isNumber && isPositive && isReasonable,
    errors: [
      !isNumber && 'Price must be a valid number',
      !isPositive && 'Price cannot be negative',
      !isReasonable && 'Price cannot exceed 999,999'
    ].filter(Boolean)
  };
};

// Product stock validation
export const validateProductStock = (stock) => {
  const numStock = Number(stock);
  const isNumber = !isNaN(numStock);
  const isNonNegative = numStock >= 0;
  const isReasonable = numStock <= 999999;
  
  return {
    isValid: isNumber && isNonNegative && isReasonable,
    errors: [
      !isNumber && 'Stock must be a valid number',
      !isNonNegative && 'Stock cannot be negative',
      !isReasonable && 'Stock cannot exceed 999,999'
    ].filter(Boolean)
  };
};

// Pickup location validation
export const validatePickupLocation = (location) => {
  const minLength = location.trim().length >= 2;
  const maxLength = location.trim().length <= 200;
  
  return {
    isValid: minLength && maxLength,
    errors: [
      !minLength && 'Pickup location must be at least 2 characters',
      !maxLength && 'Pickup location cannot exceed 200 characters'
    ].filter(Boolean)
  };
};

// Note validation
export const validateNote = (note) => {
  const maxLength = note.length <= 500;
  
  return {
    isValid: maxLength,
    errors: [
      !maxLength && 'Note cannot exceed 500 characters'
    ].filter(Boolean)
  };
};

// Form validation for registration
export const validateRegistrationForm = (formData) => {
  const errors = {};
  
  // Name validation
  const firstNameValidation = validateName(formData.firstName);
  const lastNameValidation = validateName(formData.lastName);
  
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.errors[0];
  }
  
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.errors[0];
  }
  
  // Email validation
  if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors[0];
  }
  
  // Confirm password validation
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Seller-specific validation
  if (formData.accountType === 'seller' && !formData.studentIdPicture) {
    errors.studentIdPicture = 'Please upload your ID picture';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form validation for login
export const validateLoginForm = (formData) => {
  const errors = {};
  
  // Email validation
  if (!formData.email) {
    errors.email = 'Please enter your email';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Please enter your password';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form validation for shop creation/update
export const validateShopForm = (formData) => {
  const errors = {};
  
  // Shop name validation
  const shopNameValidation = validateShopName(formData.shopName);
  if (!shopNameValidation.isValid) {
    errors.shopName = shopNameValidation.errors[0];
  }
  
  // Shop description validation
  const shopDescriptionValidation = validateShopDescription(formData.shopDescription);
  if (!shopDescriptionValidation.isValid) {
    errors.shopDescription = shopDescriptionValidation.errors[0];
  }
  
  // Shop contact validation
  if (!formData.shopContact) {
    errors.shopContact = 'Shop contact is required';
  } else if (!validatePhoneNumber(formData.shopContact)) {
    errors.shopContact = 'Please enter a valid Philippine phone number (e.g., 09123456789)';
  }
  
  // Shop email validation (optional)
  if (formData.shopEmail && !validateEmail(formData.shopEmail)) {
    errors.shopEmail = 'Please enter a valid email address';
  }
  
  // Shop location validation
  if (!formData.shopLocation) {
    errors.shopLocation = 'Shop location is required';
  } else {
    const locationValidation = validatePickupLocation(formData.shopLocation);
    if (!locationValidation.isValid) {
      errors.shopLocation = locationValidation.errors[0];
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form validation for product creation/update
export const validateProductForm = (formData) => {
  const errors = {};
  
  // Product name validation
  const productNameValidation = validateProductName(formData.productName);
  if (!productNameValidation.isValid) {
    errors.productName = productNameValidation.errors[0];
  }
  
  // Product description validation (optional)
  if (formData.productDescription) {
    const productDescriptionValidation = validateProductDescription(formData.productDescription);
    if (!productDescriptionValidation.isValid) {
      errors.productDescription = productDescriptionValidation.errors[0];
    }
  }
  
  // Product price validation
  const productPriceValidation = validateProductPrice(formData.productPrice);
  if (!productPriceValidation.isValid) {
    errors.productPrice = productPriceValidation.errors[0];
  }
  
  // Product stock validation
  const productStockValidation = validateProductStock(formData.productStock);
  if (!productStockValidation.isValid) {
    errors.productStock = productStockValidation.errors[0];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form validation for checkout
export const validateCheckoutForm = (formData) => {
  const errors = {};
  
  // Pickup location validation
  const pickupLocationValidation = validatePickupLocation(formData.pickupLocation);
  if (!pickupLocationValidation.isValid) {
    errors.pickupLocation = pickupLocationValidation.errors[0];
  }
  
  // Contact number validation
  if (!formData.contactNumber) {
    errors.contactNumber = 'Contact number is required';
  } else if (!validatePhoneNumber(formData.contactNumber)) {
    errors.contactNumber = 'Please enter a valid Philippine phone number (e.g., 09123456789)';
  }
  
  // Note validation (optional)
  if (formData.note) {
    const noteValidation = validateNote(formData.note);
    if (!noteValidation.isValid) {
      errors.note = noteValidation.errors[0];
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Utility to sanitize input (client-side)
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim();
};