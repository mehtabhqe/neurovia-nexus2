# Neurovia Nexus — Complete Project

## File Structure

```
neurovia-nexus/
│
├── frontend/                        ← Put these on any static host
│   ├── index.html                   ← Main website
│   ├── style.css                    ← Main styles
│   ├── main.js                      ← Particles, countdown, animations
│   ├── api.js                       ← ⭐ Connects frontend to backend
│   ├── blog-shared.css              ← Shared blog article styles
│   ├── blog-smb-downtime.html       ← Blog article 1
│   ├── blog-technician-income.html  ← Blog article 2
│   └── blog-atrde-explained.html    ← Blog article 3
│
└── backend/                         ← Deploy this on Railway
    ├── server.js                    ← Main Express server
    ├── package.json                 ← Node.js dependencies
    ├── .env.example                 ← Copy to .env and fill values
    ├── database/
    │   └── db.js                    ← SQLite setup + all tables
    ├── middleware/
    │   └── auth.js                  ← JWT admin authentication
    ├── routes/
    │   ├── technician.js            ← POST /api/technician/register
    │   ├── booking.js               ← POST /api/booking/submit
    │   ├── waitlist.js              ← POST /api/waitlist/join
    │   └── admin.js                 ← All admin routes + blog CMS
    └── admin/
        └── index.html               ← Admin dashboard UI
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /health | Server health check | None |
| POST | /api/technician/register | Technician registration | None |
| GET | /api/technician/cities | List active cities | None |
| POST | /api/booking/submit | Submit booking request | None |
| GET | /api/booking/status/:id | Check booking status | None |
| POST | /api/waitlist/join | Join NADT waitlist | None |
| GET | /api/waitlist/count | Get waitlist count | None |
| POST | /api/admin/login | Admin login | None |
| GET | /api/admin/me | Verify admin token | JWT |
| GET | /api/admin/stats | Dashboard statistics | JWT |
| GET | /api/admin/technicians | List technicians | JWT |
| PATCH | /api/admin/technicians/:id/status | Approve/reject | JWT |
| DELETE | /api/admin/technicians/:id | Delete technician | JWT |
| GET | /api/admin/bookings | List bookings | JWT |
| PATCH | /api/admin/bookings/:id | Update booking | JWT |
| GET | /api/admin/waitlist | List waitlist | JWT |
| DELETE | /api/admin/waitlist/:id | Remove from waitlist | JWT |
| GET | /api/admin/blog | List all posts | JWT |
| GET | /api/admin/blog/:id | Get single post | JWT |
| POST | /api/admin/blog | Create post | JWT |
| PUT | /api/admin/blog/:id | Update post | JWT |
| DELETE | /api/admin/blog/:id | Delete post | JWT |

---

## Step 1 — Set Up Backend Locally

### Install Node.js
Download from https://nodejs.org (version 18 or higher)

### Install dependencies
```bash
cd backend
npm install
```

### Create your .env file
```bash
cp .env.example .env
```

Open .env and change these values:
```
JWT_SECRET=make_this_a_long_random_string_at_least_32_characters
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=YourStrongPassword123!
ALLOWED_ORIGIN=http://localhost:5500
```

### Start the backend
```bash
npm start
```

You should see:
```
Neurovia Nexus API running on http://localhost:3000
Admin dashboard: http://localhost:3000/admin
```

---

## Step 2 — Connect Frontend to Backend

Open `frontend/api.js` and find this line at the top:

```javascript
const API_BASE = 'http://localhost:3000';
```

For local development this is correct. When you deploy, change it to your Railway URL:

```javascript
const API_BASE = 'https://your-app-name.up.railway.app';
```

---

## Step 3 — Test Locally

Open your frontend in a browser:
- Use VS Code Live Server (right-click index.html → Open with Live Server)
- Or use: `npx serve frontend` in terminal

Test each form:
1. Fill the technician registration form → check admin dashboard
2. Fill the booking form → check admin dashboard
3. Enter email in NADT waitlist → count should update
4. Go to http://localhost:3000/admin → log in with your admin credentials

---

## Step 4 — Deploy Backend to Railway (Free)

1. Go to https://railway.app and sign up (free, no credit card)
2. Click "New Project" → "Deploy from GitHub repo"
3. Push your backend folder to a GitHub repository first:
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/neurovia-backend
   git push -u origin main
   ```
4. In Railway, connect your GitHub repo
5. Railway auto-detects Node.js and runs `npm start`
6. Go to Settings → Variables and add all your .env values:
   - JWT_SECRET
   - ADMIN_EMAIL
   - ADMIN_PASSWORD
   - ALLOWED_ORIGIN (set to your frontend domain)
   - NODE_ENV=production
   - DB_PATH=./database/neurovia.db
7. Railway gives you a URL like: https://neurovia-backend.up.railway.app
8. Copy that URL into api.js: `const API_BASE = 'https://neurovia-backend.up.railway.app'`

---

## Step 5 — Deploy Frontend

### Option A — Netlify (Recommended, Free)
1. Go to https://netlify.com
2. Drag and drop your entire frontend folder
3. Your site goes live instantly with a URL like https://neurovia.netlify.app
4. Update ALLOWED_ORIGIN in Railway variables to match your Netlify URL

### Option B — Vercel
1. Go to https://vercel.com
2. Import your frontend GitHub repo
3. Deploy with one click

### Option C — GitHub Pages (Free)
1. Push frontend folder to GitHub
2. Go to repo Settings → Pages → Deploy from main branch
3. Your site lives at https://yourusername.github.io/neurovia-nexus

---

## Step 6 — Access Admin Dashboard

Once deployed:
- **Local:** http://localhost:3000/admin
- **Live:** https://your-railway-url.up.railway.app/admin

Login with the ADMIN_EMAIL and ADMIN_PASSWORD you set in .env

From the admin dashboard you can:
- ✅ Approve or reject technician applications
- ✅ View and manage all bookings
- ✅ See the full NADT waitlist
- ✅ Write, edit, and publish blog posts without coding
- ✅ See live stats for everything

---

## Changing the Admin Password

Update ADMIN_PASSWORD in your .env file and restart the server.
The password is hashed with bcrypt — it is never stored in plain text.

---

## Database

The SQLite database file is created automatically at `./database/neurovia.db`
when the server starts for the first time. No setup required.

Tables created automatically:
- `technicians` — all registration applications
- `bookings` — all consumer booking requests
- `waitlist` — all NADT waitlist signups
- `blog_posts` — all blog articles
- `admin_users` — admin login credentials

---

## Support

For any issues, check:
1. Is the backend running? Visit /health endpoint
2. Is API_BASE correct in api.js?
3. Is ALLOWED_ORIGIN in .env matching your frontend URL exactly?
4. Check browser console for CORS errors
