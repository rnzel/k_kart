// Helper functions for search functionality

// Debounce function to limit API calls
export const debounce = (func, delay) => {
  let debounceTimer;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
};

// Highlight matched text in search results
export const highlightText = (text, query) => {
  if (!query || query.trim() === '') return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Get recent searches from localStorage
export const getRecentSearches = () => {
  try {
    const recent = localStorage.getItem('recentSearches');
    return recent ? JSON.parse(recent) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

// Save recent search to localStorage (only saves completed search terms, not partial inputs)
export const saveRecentSearch = (searchTerm) => {
  try {
    // Don't save empty or very short searches
    if (!searchTerm || searchTerm.trim().length < 2) {
      return;
    }
    
    const recent = getRecentSearches();
    // Normalize search term to lowercase for case-insensitive duplicate checking
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Remove existing duplicate (case-insensitive)
    const filteredRecent = recent.filter(term => 
      term.toLowerCase().trim() !== normalizedTerm
    );
    
    // Add new search at the beginning, keep max 10
    const newRecent = [searchTerm.trim(), ...filteredRecent].slice(0, 10);
    
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
};

// Clear recent searches - returns the new empty array for UI updates
export const clearRecentSearches = () => {
  try {
    localStorage.removeItem('recentSearches');
    return [];
  } catch (error) {
    console.error('Error clearing recent searches:', error);
    return [];
  }
};
