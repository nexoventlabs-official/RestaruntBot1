# FoodAdmin Mobile App

React Native Expo app for Admin and Delivery Partners.

## Features

### Admin Panel
- **Home**: Dashboard with today's stats, orders overview, revenue
- **Orders**: View all orders, filter by status, update order status
- **Menu**: Add/edit/delete menu items with images
- **Offers**: Create and manage promotional offers
- **Delivery**: Manage delivery partners, reset passwords

### Delivery Partner
- **Home**: Stats, online/offline toggle
- **Available Orders**: View and claim preparing orders
- **My Orders**: Active orders with Google Maps navigation
- **History**: Completed deliveries
- **Profile**: Change password, view ratings

## Setup

1. Install dependencies:
```bash
cd app
npm install
```

2. Update API URL in `src/config/api.js`:
```javascript
export const API_BASE_URL = 'https://your-backend-url.com';
```

3. Replace placeholder images in `assets/` folder:
- `icon.png` (1024x1024)
- `splash.png` (1284x2778)
- `adaptive-icon.png` (1024x1024)
- `favicon.png` (48x48)

4. Start the app:
```bash
npx expo start
```

## Google Maps Navigation

When delivery partners tap on a customer address, the app:
1. Gets their current location
2. Opens Google Maps with directions from current location to delivery address
3. Uses coordinates if available, otherwise uses the address string

## Login Credentials

### Admin
- Username: `admin`
- Password: `admin`

### Delivery Partner
- Use email/password sent to delivery partner's email when created by admin

## Build for Production

```bash
# Android
npx expo build:android

# iOS
npx expo build:ios
```

Or use EAS Build:
```bash
npx eas build --platform android
npx eas build --platform ios
```
