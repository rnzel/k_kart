# React Image Usage Guide

## Image Endpoint

All images stored in GridFS are served via:
```
GET /api/images/:filename
```

## Usage in React Components

### Option 1: Direct URL (Recommended)

```jsx
// Get the API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Display an image from GridFS
<img 
  src={`${API_URL}/api/images/${imageFilename}`} 
  alt="Product" 
/>
```

### Option 2: Using with fetch for more control

```jsx
import { useState, useEffect } from 'react';

const ProductImage = ({ filename }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  useEffect(() => {
    // Test if image exists
    fetch(`${API_URL}/api/images/${filename}`)
      .then(res => {
        if (res.ok) {
          setImageUrl(`${API_URL}/api/images/${filename}`);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, [filename]);
  
  if (error) {
    return <div>Image not available</div>;
  }
  
  return imageUrl ? (
    <img src={imageUrl} alt="Product" />
  ) : (
    <div>Loading...</div>
  );
};
```

### Example: Product Card Component

```jsx
const ProductCard = ({ product }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // Get the featured image or first image
  const imageIndex = product.featuredImageIndex || 0;
  const imageFilename = product.productImages?.[imageIndex];
  const imageSrc = imageFilename 
    ? `${API_URL}/api/images/${imageFilename}` 
    : '/placeholder-image.jpg';
  
  return (
    <div className="product-card">
      <img 
        src={imageSrc} 
        alt={product.productName}
        onError={(e) => {
          e.target.src = '/placeholder-image.jpg';
        }}
      />
      <h3>{product.productName}</h3>
      <p>${product.productPrice}</p>
    </div>
  );
};
```

### Example: Shop Logo Component

```jsx
const ShopLogo = ({ shop }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  if (!shop?.shopLogo) {
    return <div className="shop-logo-placeholder">No Logo</div>;
  }
  
  return (
    <img 
      src={`${API_URL}/api/images/${shop.shopLogo}`} 
      alt={`${shop.shopName} Logo`}
      className="shop-logo"
    />
  );
};
```

## Environment Variables

### Development (.env)
```
VITE_API_URL=http://localhost:3000
```

### Production (.env) - Update for your deployment
```
VITE_API_URL=https://your-production-url.com
```

## Health Check

You can verify the server is ready by calling:
```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "mongodb": "connected",
  "gridfs": "ready"
}
```

## Error Handling

The image endpoint returns:
- `200` - Image found, streams the image
- `404` - Image not found in GridFS
- `503` - Service unavailable (cold start, retry needed)
- `500` - Server error

Always add error handling in your React components using the `onError` event for images.
