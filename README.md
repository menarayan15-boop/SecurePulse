# SecurePulse — Smart Login & Adaptive Security System

**Intelligent Access. Personalized Experience. Stronger Security.**

SecurePulse is an independent, production-ready, full-stack cybersecurity web application designed to provide users with an intelligent, personalized, and secure authentication experience.

The platform automatically adapts its interface based on login time (converted to Indian Standard Time), detects unfamiliar login environments (browser, operating system, device class, IP address, and geographic location), challenges users through 6-digit OTP verification, maintains detailed login telemetry with interactive map visualization, and provides complete user control over account security.

---

## 🌟 Key Highlights & Business Principles

- **100% Free Forever**: All security and personalization features are completely free for all registered users. No paywalls, subscriptions, upgrade buttons, or hidden tiers.
- **Zero Dummy Data**: Fully connected to real database models, real bcrypt password hashing, real session tokens, real risk calculations, and real audit logs.
- **Mobile-First Responsive Design**: Designed with independent responsive navigation, touch-friendly 6-digit OTP inputs, mobile cards, and zero horizontal overflow.
- **Cybersecurity SaaS Aesthetics**: Clean glassmorphism, charcoal/navy surfaces in dark mode, crisp soft-slate in light mode, emerald `#10b981` accents, and subtle status pulses.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom cybersecurity palette (`cyber-bg`, `cyber-surface`, `pulse-500`)
- **Icons**: Lucide React
- **Animations**: Framer Motion & CSS transitions
- **Routing**: React Router DOM (v6)
- **Maps**: Leaflet with custom pulse markers & OpenStreetMap CartoDB Voyager tiles
- **Bundler**: Vite

### Backend
- **Runtime**: Node.js (v20+) with TypeScript (`tsx` dev / `tsc` build)
- **Framework**: Express.js REST API
- **Database**: MongoDB with Mongoose (with automated fallback to embedded persistent JSON storage for zero-config offline runs)
- **Authentication**: JWT (Access Token 15m, Refresh Token 7d with DB rotation)
- **Password Security**: bcryptjs password hashing (12 rounds)
- **Hardening**: Helmet.js security headers, CORS with credentials, express-rate-limit protection
- **Telemetry Parsing**: `ua-parser-js` (Browser, OS, Device, Engine) and `geoip-lite` (City, State, Country, Coordinates)
- **Notification Transports**: Resend API (`RESEND_API_KEY`) and authenticated Nodemailer SMTP (Gmail, Brevo, SendGrid, Amazon SES) with responsive branded HTML email templates

---

## 🚀 Architectural Features

### 1. Adaptive Theme Engine (Indian Standard Time - IST)
- Powered by trusted backend server time converted to `Asia/Kolkata` (UTC+5:30).
- **Rules**:
  - `5:00 AM` to `11:59 AM IST` &rarr; **Light mode**
  - `12:00 PM` to `4:59 AM IST` &rarr; **Dark mode**
- **Theme Modes**: `Automatic (IST)`, `Light`, `Dark`.
- Manual user selection immediately overrides and persists across devices in MongoDB (`users.themePreference`). Users can revert to Automatic mode anytime.
- Zero flickering on load with client-side localStorage cache and server synchronization.

### 2. Intelligent Environment Detection & Risk Engine
- Captures browser name, browser version, browser engine, operating system, device type (Desktop, Mobile, Tablet), public IP, city, state, country, and approximate coordinates.
- **Configurable Risk Scoring**:
  - Unrecognized browser: `+20 pts`
  - Unfamiliar device type / OS: `+25 pts`
  - New network / IP address: `+15 pts`
  - New city / state location: `+25 pts`
  - Recent failed login bursts: `+40 pts`
- **Risk Tiers**:
  - `0 - 24`: Low Risk (Standard login permitted)
  - `25 - 49`: Medium Risk (OTP Challenge issued if unfamiliar device)
  - `50 - 74`: High Risk (Mandatory OTP Challenge + Security Notification)
  - `75 - 100`: Critical Risk (Mandatory OTP + Elevated Security Alert)
- Valid trusted device tokens reduce friction for ordinary environmental shifts while upholding strict thresholds for anomalous bursts.

### 3. Real 6-Digit Email OTP Verification & Zero-Leakage Architecture
- **Real Inbox Delivery**: Single-use 6-digit verification codes are dispatched directly to the user's verified email address via Resend API or verified SMTP.
- **Zero Exposure**: Verification codes are NEVER exposed on the frontend, never returned in API payloads, never leaked in console logs, and never stored in plain text.
- **SHA-256 Hashing**: Stored strictly as SHA-256 hashes with an automated 5-minute TTL expiration.
- **Strict Single-Use**: Validated OTPs cannot be replayed or reused.
- **Resend Invalidation**: Requesting a new OTP immediately invalidates any prior active code.
- **Brute-Force Shield**: Maximum 5 attempts per challenge before complete invalidation.
- **60-Second Cooldown**: Rate-limited resend interval with responsive UI countdown.
- **Device Trusting**: Optional "Trust this device for 30 days" bypasses repeated OTP prompts on subsequent logins from recognized environments under normal security conditions.

### 4. Trusted Device Management
- Displays device name, browser, OS, device type, location, IP, first trusted date, last active, expiry, and current device indicator.
- Allows user to trust current device, revoke individual devices, or revoke all trusted devices.

### 5. Login Activity & Interactive Map
- Audit trail containing every login attempt (successful, failed, or OTP-challenged).
- Filter by status, device class, search (IP, city, browser), and date range.
- Pagination controls.
- Interactive Leaflet Map with animated pulse pins (Green = Success, Red = Failed, Amber = OTP Challenge) displaying city, country, browser, IP, and timestamp.
- **One-Click CSV Export**: Download complete login activity history as a valid CSV file.

### 6. Active Session Management
- Displays active sessions with device details, IP, location, and timestamps.
- One-click actions to terminate an individual session, terminate other sessions, or terminate all sessions.
- Invalidation immediately revokes the session token and refresh token hash in MongoDB.

### 7. Security Alerts & Notification Center
- Categorized notifications for new browsers, unfamiliar devices, IP changes, failed login bursts, password updates, device trust changes, and emergency locks.
- Real-time unread counter, mark as read, and clear-all controls.
- Secure email dispatch with branded SecurePulse cybersecurity templates.

### 8. Security Health Score
- Real-time 0–100 score calculated dynamically from account hygiene factors:
  - Primary Email Verified (+25)
  - Recovery Mobile Linked (+15)
  - Unfamiliar Environment Challenge Enforced (+20)
  - Clean Login Record past 7 days (+15)
  - Concurrent Active Sessions <= 3 (+15)
  - Trusted Device Review footprint <= 5 (+10)
- Actionable recommendations for every checklist item.

### 9. Emergency Account Lockdown & Recovery
- **Kill Switch**: Immediately invalidates all active sessions, revokes all trusted devices, locks account status, and dispatches security alert email.
- **Recovery Workflow**: 2-step verification requiring registered email 6-digit OTP challenge and new password creation to unlock and restore the account.

---

## 📁 Repository Structure

```
SecurePulse/
├── client/                          # React + TypeScript + Tailwind Frontend
│   ├── index.html                   # HTML Entry point with Inter & JetBrains Mono fonts
│   ├── vite.config.ts               # Vite configuration with /api reverse proxy
│   ├── tailwind.config.js           # Custom cybersecurity theme extension
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Typed API client with auto-refresh & cookie credentials
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── SecurityBadge.tsx       # Risk, status & device badges
│   │   │   │   ├── OtpInput.tsx            # Accessible 6-digit split OTP input
│   │   │   │   ├── PasswordStrengthMeter.tsx # Real-time strength meter with checklist
│   │   │   │   └── ConfirmationModal.tsx   # Dialog for destructive actions
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx              # Top bar with IST ticker, theme & profile
│   │   │   │   ├── Sidebar.tsx             # 7-link navigation & emergency kill switch
│   │   │   │   └── DashboardLayout.tsx     # Authenticated layout with mobile drawer
│   │   │   └── map/
│   │   │       └── LoginMap.tsx            # Leaflet interactive map with custom pins
│   │   ├── context/
│   │   │   ├── AuthContext.tsx             # Global authentication state
│   │   │   └── ThemeContext.tsx            # Adaptive IST theme engine provider
│   │   ├── pages/
│   │   │   ├── auth/                       # Login, Register, ForgotPw, ResetPw, Recovery
│   │   │   └── dashboard/                  # Overview, Activity, Devices, Sessions, Alerts, Settings, Profile
│   │   ├── types/
│   │   │   └── index.ts                    # Shared TypeScript interfaces
│   │   ├── App.tsx                         # App routes & provider nesting
│   │   └── main.tsx                        # React DOM mounting
│   └── package.json
│
├── server/                          # Express.js + Mongoose REST Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                       # MongoDB connection & local fallback handler
│   │   │   └── embeddedStore.ts            # Persistent JSON database for offline runs
│   │   ├── controllers/
│   │   │   ├── authController.ts           # Register, verify email, login, OTP, refresh, logout
│   │   │   ├── userController.ts           # Profile, theme update, security settings, deletion
│   │   │   ├── loginHistoryController.ts   # History query, filtering, CSV export
│   │   │   ├── deviceController.ts         # Trust device, revoke device, revoke all
│   │   │   ├── sessionController.ts        # Active sessions, terminate single/others/all
│   │   │   └── securityController.ts       # Overview stats, alerts, health score, emergency lock
│   │   ├── middleware/
│   │   │   ├── auth.ts                     # JWT & session validation middleware
│   │   │   └── rateLimiter.ts              # Express rate limiters for auth & OTP
│   │   ├── models/                         # Mongoose Models (User, LoginHistory, TrustedDevice, etc.)
│   │   ├── routes/                         # Express Route definitions
│   │   ├── services/
│   │   │   ├── environmentDetection.ts     # UA parser & IP geolocation
│   │   │   ├── riskEngine.ts               # Anomaly & risk-scoring evaluation
│   │   │   └── notificationService.ts      # Branded HTML email & in-app alerts
│   │   ├── utils/
│   │   │   ├── crypto.ts                   # Password hashing, OTP generation, token signing
│   │   │   └── themeEngine.ts              # IST time calculation & theme rules
│   │   ├── test-full-suite.ts              # End-to-end automated verification suite (20 tests)
│   │   ├── app.ts                          # Express application initialization
│   │   └── server.ts                       # Server bootstrap & port listener
│   ├── .env.example
│   └── package.json
│
├── package.json                     # Root npm orchestration scripts
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step 1: Install Dependencies
Run the install command from root:
```bash
# In the server directory:
cd server
npm install

# In the client directory:
cd ../client
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` in `server`:
```bash
cd server
cp .env.example .env
```
Default configuration values:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# To use MongoDB Atlas, paste your connection string here.
# If omitted, the server automatically runs in Embedded Persistent Storage mode!
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/securepulse

JWT_ACCESS_SECRET=securepulse_super_secret_access_token_jwt_key_2026_xyz
JWT_REFRESH_SECRET=securepulse_super_secret_refresh_token_jwt_key_2026_abc
```

### Step 3: Run the Development Servers
In two separate terminals:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Starts on http://localhost:3000
```

Open your browser at `http://localhost:3000` to access SecurePulse!

---

## 🧪 Automated Verification & Testing

SecurePulse includes an automated end-to-end test suite that verifies all 20 critical authentication, risk engine, and security scenarios:

### Test Real Email Delivery to Your Inbox:
Verify that your SMTP credentials or Resend API key work and send a real test OTP email directly to your inbox:

```bash
cd server
npm run test:email recipient@yourdomain.com
```

### Automated End-to-End Security Test Suite:
```bash
cd server
npm test
```

### Test Suite Coverage:
1. `[PASS]` System Health Check & Telemetry
2. `[PASS]` Indian Standard Time (IST) Engine conversion
3. `[PASS]` Adaptive theme calculation (IST morning/night rules)
4. `[PASS]` Unauthorized API protection (Requires JWT)
5. `[PASS]` New user registration with bcrypt password hashing
6. `[PASS]` Email OTP verification & account activation
7. `[PASS]` Authenticated profile retrieval
8. `[PASS]` Manual theme update & DB persistence
9. `[PASS]` Incorrect password rejection & audit logging
10. `[PASS]` Unfamiliar environment detection & 6-digit OTP challenge
11. `[PASS]` Successful OTP challenge verification & trusted device registration
12. `[PASS]` Security Health Score calculation (0-100)
13. `[PASS]` Security Overview aggregation
14. `[PASS]` Detailed Login History telemetry
15. `[PASS]` Login History CSV Export
16. `[PASS]` Active Sessions listing
17. `[PASS]` Emergency Account Lock kill switch
18. `[PASS]` Locked account blocks subsequent logins
19. `[PASS]` Emergency Account Recovery dispatch
20. `[PASS]` Emergency Account Recovery & Unlock with new password

---

## 🌐 Production Deployment Guide

### 1. Database: MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and allow your server IP (or `0.0.0.0/0` with secure credentials).
3. Copy the Connection String `mongodb+srv://...` and set it as `MONGODB_URI` in your backend environment.

### 2. Backend: Node.js Hosting (e.g. Render, Railway, DigitalOcean, Heroku)
1. Set the root directory to `server`.
2. Build command: `npm run build`
3. Start command: `npm run start`
4. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=mongodb+srv://...`
   - `JWT_ACCESS_SECRET=<random-64-character-string>`
   - `JWT_REFRESH_SECRET=<random-64-character-string>`
   - `CLIENT_URL=https://your-securepulse-app.vercel.app`
   - **For Resend Email Delivery (Recommended):**
     - `RESEND_API_KEY=re_...`
     - `EMAIL_FROM="SecurePulse Security" <security@yourdomain.com>`
   - **OR for Standard SMTP:**
     - `SMTP_HOST=<smtp.provider.com>`
     - `SMTP_PORT=587`
     - `SMTP_SECURE=false`
     - `SMTP_USER=<username>`
     - `SMTP_PASS=<password>`
     - `EMAIL_FROM="SecurePulse Security" <security@yourdomain.com>`

### 3. Frontend: Vercel
1. Link your GitHub repository in [Vercel](https://vercel.com).
2. Set Root Directory to `client`.
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Set Environment Variables:
   - `VITE_API_URL=https://your-backend-api.onrender.com/api`

---

## 🛡️ Security & Privacy Notice

- **Password Storage**: Passwords are never stored in plain text. Secure 12-round bcrypt hashes are utilized.
- **Passcodes (OTPs)**: 6-digit passcodes are hashed with SHA-256 before storage in database collections, with automated 5-minute TTL purge.
- **Tokens**: Access tokens are signed JWTs valid for 15 minutes. Refresh tokens are hashed in the database and rotated upon each refresh.
- **Location Privacy**: Geolocation is derived approximately at the city/region level via IP address lookup. Exact GPS home addresses are never queried or collected.

---

## 📄 License

This project is created as an independent, fully functional open cybersecurity platform. Completely free for all registered users without charges or paywalls.

