# SPARK — Station Planning, Allocation & Reservation Kiosk

SPARK is a modern, real-time desk and station reservation management system designed for hybrid workspaces. It allows employees to book workstations across multiple office locations while providing IT Administrators and Managers with powerful tools to monitor, approve, and manage station allocations.

## 🌟 Features

### For Users
* **Interactive Booking:** Visual grid to select available stations for specific dates and times.
* **Equipment Requests:** Specify hardware needs (e.g., dual monitors, basic setup) during booking.
* **Real-time Availability:** See which stations are available, pending, confirmed, or blocked in real-time.
* **Conflict Prevention:** Automatic overlap detection prevents double-booking.

### For Administrators (IT Admin / Manager)
* **Comprehensive Dashboard:** View real-time statistics including total requests, pending approvals, overrides, and active users.
* **Approval Workflow:** Review, approve, or reject pending station requests with optional rejection reasons.
* **Advanced Views:** Toggle between Daily, Week-to-Date (WTD), Month-to-Date (MTD), and All historical reservations.
* **Station Management:** Block or unblock specific stations for maintenance or VIP use.
* **Override Capabilities:** Admins can override existing bookings if necessary.
* **Export & Integration:** Export reservation data to CSV and generate `.ics` calendar invites.

## 🚀 Tech Stack

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Backend/Database:** Firebase (Firestore, Authentication)
* **Date Management:** date-fns
* **Notifications:** Sonner (Toast notifications)

## 🛠️ Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd spark-reservation-kiosk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Firebase Configuration:**
   Ensure you have a Firebase project set up with Authentication (Google Provider) and Firestore enabled.
   Create a `firebase-applet-config.json` file in the root directory (or configure your environment variables) with your Firebase credentials:
   ```json
   {
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_AUTH_DOMAIN",
     "projectId": "YOUR_PROJECT_ID",
     "appId": "YOUR_APP_ID",
     "firestoreDatabaseId": "(default)"
   }
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to `http://localhost:3000` in your browser.

## 🔐 Roles & Permissions

The application uses Firebase Authentication and Firestore to manage roles. 
* **User:** Default role. Can book stations and view their own reservations.
* **Manager / IT Admin:** Can access the Admin Dashboard, approve/reject requests, block stations, and export data.

*Note: In development, specific emails (like `admin.dev@globalvirtuoso.com`) can be hardcoded in `UserProvider.tsx` to automatically receive IT Admin privileges for testing purposes.*

## 📄 License

This project is proprietary and confidential.
