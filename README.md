# 🏠 KhataNest — Hostel Expense Manager

A full-stack web app for hostel friends to track shared expenses, payments, and balances automatically.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (hooks, context API) |
| Backend | Node.js + Express.js (MVC) |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Styling | CSS Variables (dark/light) |
| Charts | Recharts |
| Jobs | node-cron (auto-clear descriptions) |

---

## 📁 Project Structure

```
khatanest/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, error, validate
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── server.js        # Entry point
│   └── .env.example
│
└── frontend/
    └── src/
        ├── components/  # Reusable UI (Layout, Modal, etc.)
        ├── context/     # AuthContext, ThemeContext
        ├── pages/       # All page components
        ├── services/    # Axios API calls
        └── App.js
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/khatanest
JWT_SECRET=your_super_secret_key_here_min_32_chars
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Run Locally

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

App opens at: **http://localhost:3000**

---

## 👤 Getting Started

1. Register as **Admin** — creates your group automatically
2. Go to **Members** → Add group members (creates their login accounts)
3. Go to **Expenses** → Add shared expenses (auto-splits and updates balances)
4. Go to **Payments** → Record when members pay you back
5. **Dashboard** shows live stats, charts, and settlement suggestions

---

## 🔑 API Endpoints

### Auth
```
POST   /api/auth/register     Register admin + create group
POST   /api/auth/login        Login
GET    /api/auth/me           Get current user
```

### Group
```
GET    /api/group             Get group details + members
PUT    /api/group             Update group name
POST   /api/group/members     Add member (Admin)
DELETE /api/group/members/:id Remove member (Admin)
POST   /api/group/reset       Monthly balance reset (Admin)
```

### Expenses
```
GET    /api/expenses          List expenses (with search/filter/pagination)
POST   /api/expenses          Add expense (Admin)
PUT    /api/expenses/:id      Edit expense (Admin)
DELETE /api/expenses/:id      Delete expense (Admin)
GET    /api/expenses/stats    Dashboard stats
```

### Payments
```
GET    /api/payments          List payments (paginated)
POST   /api/payments          Record payment (Admin)
DELETE /api/payments/:id      Reverse payment (Admin)
```

### Balances
```
GET    /api/balances          All balances + settlement plan
GET    /api/balances/history  Combined transaction history
```

---

## 💡 Key Business Logic

### Expense Balance Update
```
Admin adds Rs. 1000 expense, split among 4 members:
- Each member: balance -= 250  (they owe 250)
- Admin: balance += 750        (1000 - own 250 share)
```

### Payment Balance Update
```
Member pays Rs. 300:
- Member: balance += 300  (debt reduces)
- Admin: balance -= 300   (received cash)
```

### 21-Day Description Auto-Clear
A cron job runs daily at midnight. Any expense older than 21 days has its
`description` field cleared (but title, amount, and transaction remain).

---

## 🌐 Deployment

### Backend → Render.com
1. Push to GitHub
2. New Web Service → Connect repo
3. Build: `npm install`, Start: `node server.js`
4. Add environment variables

### Frontend → Vercel
1. Push to GitHub
2. Import project on Vercel
3. Set `REACT_APP_API_URL=https://your-backend.onrender.com/api`
4. Deploy

---

## 🧪 Sample Test Data

After setup, register admin and run this in MongoDB shell or create via UI:

```
Admin: admin@hostel.com / admin123
Members: bilal@hostel.com, hamza@hostel.com, sara@hostel.com
```

---

## 🎯 Features Summary

- ✅ JWT Authentication (Admin + Member roles)
- ✅ Auto-balance calculation on every expense
- ✅ Payment tracking with balance reversal
- ✅ Settlement suggestion algorithm
- ✅ 21-day description auto-clear (cron job)
- ✅ Weekly expense chart (Recharts)
- ✅ Category breakdown
- ✅ PDF export & print
- ✅ Monthly reset
- ✅ Confirmation modals before delete
- ✅ Toast notifications
- ✅ Pagination everywhere
- ✅ Dark/Light theme toggle
- ✅ Mobile responsive
- ✅ Role-based route protection
