# AttendSecure
**Smart Location-Based College Attendance Management System**

AttendSecure is a production-quality full-stack web application developed for **Thakur Shyamnarayan Degree College (TSDC), Mumbai**. It enforces physical classroom presence through server-authoritative geodesic radius checks, live browser geolocation, and front-camera anti-proxy verification before accepting student attendance submissions.

---

## 🏛 Official College Location

- **Institution:** Thakur Shyamnarayan Degree College (TSDC), Thakur Complex, Kandivali East, Mumbai 400101
- **Official Latitude:** `19.2138050`
- **Official Longitude:** `72.8648690`
- **Configurable Radius:** `1m` to `50m` (Default: `10m`)

---

## 🚀 Key Features

1. **Role-Based Access Control (RBAC):**
   - **Student:** Register with OTP, monitor attendance %, subject analytics, view history, receive 75% low-attendance warnings, and submit verified attendance for active lectures.
   - **Faculty:** Class selection (TYCS.A, TYCS.B, STQA.A, etc.), subject assignment, start/stop attendance session with configurable radius & "What was taught today?" lecture topic, live session monitoring with distance & photo thumbnails, and defaulter analysis.
   - **Admin:** Configure college coordinates & radius policy, manage classes/divisions, assign subjects, activate/deactivate accounts, audit historical sessions, and inspect dispatched OTPs.

2. **Geolocation Verification Security:**
   - Server-side geodesic distance calculated using high-precision **Haversine formula**.
   - Live Leaflet.js campus map displaying official college coordinates, radius boundary, and student's GPS location.
   - Floor/Altitude capture when provided by device hardware.

3. **Front-Camera Anti-Proxy Verification:**
   - Real-time `getUserMedia` front camera stream with face alignment guide.
   - Strict ban on gallery uploads, drag-and-drop, or pre-saved images.
   - Cryptographic timestamp overlay on live captured frames.

4. **Class & Division Isolation:**
   - Strict logical isolation across classes (`TYCS.A`, `TYCS.B`, `STQA.A`, `BCA.A`, `BScCS.A`).
   - Server validates student enrollment before accepting attendance for any session.

5. **Email OTP Verification:**
   - Secure 6-digit OTP generation with expiration timer, attempt limiting, and professional HTML template.

---

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Leaflet.js, Lucide Icons, Canvas Confetti.
- **Backend:** Node.js, Express, TypeScript (`tsx`).
- **Persistence:** Relational JSON/SQLite database storage with ACID file locking and seed initialization.
- **Security:** bcrypt password/OTP hashing, JWT authentication tokens, server-side parameter re-validation.

---

## ⚙️ Installation & Local Setup in VS Code

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🔑 Default Seed Credentials for Testing

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@tsdc.edu.in` | `Admin@123` | Full administrative access |
| **Faculty** | `faculty@tsdc.edu.in` | `Faculty@123` | Computer Science Instructor |
| **Student 1** | `student@tsdc.edu.in` | `Student@123` | Aarav Sharma (TYCS.A, ~87% attendance) |
| **Student 2** | `rahul.sharma@tsdc.edu.in` | `Student@123` | Rahul Sharma (TYCS.A, ~93% attendance) |
| **Student 3** | `priya.patel@tsdc.edu.in` | `Student@123` | Priya Patel (TYCS.A, ~62% Defaulter) |
| **Student 4** | `amit.verma@tsdc.edu.in` | `Student@123` | Amit Verma (TYCS.B) |
| **Student 5** | `neha.singh@tsdc.edu.in` | `Student@123` | Neha Singh (STQA.A) |

---

## 📂 Project Architecture

```text
├── server/
│   ├── routes/
│   │   ├── auth.ts          # Registration, OTP verification, Login
│   │   ├── student.ts       # Dashboard, attendance submit, geo verification
│   │   ├── faculty.ts       # Session creation, live monitoring, rosters
│   │   └── admin.ts         # Location & radius settings, classes, users
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication & role-based access control
│   ├── utils/
│   │   ├── geo.ts           # Server-side Haversine geodesic distance formula
│   │   └── email.ts         # Professional HTML OTP template & mailer
│   ├── db.ts                # Database manager & seed data initialization
│   └── types.ts             # Backend data schemas & interfaces
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Header.tsx             # 3-zone top bar contract
│   │       ├── LocationMap.tsx        # Leaflet map with campus radius & GPS pin
│   │       └── CameraVerification.tsx # Live front camera anti-proxy stream
│   ├── context/
│   │   └── AuthContext.tsx  # React auth provider & session state
│   ├── pages/
│   │   ├── auth/            # Login, Registration, OTP verification modal
│   │   ├── student/         # Dashboard, multi-step attendance modal, history
│   │   ├── faculty/         # Lecture console, live student roster, audit modal
│   │   └── admin/           # Settings, class manager, subject mapping
│   ├── services/
│   │   └── api.ts           # Frontend REST client with bearer tokens
│   ├── App.tsx              # Root app component with role router
│   ├── index.css            # Tailwind CSS & Leaflet custom styling
│   └── main.tsx             # React entry point
├── data/
│   └── attendsecure.json    # Persistent database storage
├── server.ts                # Full-stack server entry point
├── metadata.json            # Application metadata & permissions
└── vite.config.ts           # Vite build configuration
```
