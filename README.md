# Gym App

A gym management app for small gyms that cannot afford fingerprint entry.
The owner adds members and packages, sees who must pay soon, and sends a
WhatsApp reminder with one click.

## Features

- **Dashboard:** summary boxes (Late, Due soon, OK, Total members) and a list
  of members whose fee is due in 2 days or less, with a "Show more" button
- **Members page:** add, edit, delete, and search members by name or phone
- **Packages page:** add, edit, and delete packages (name, fee, days)
- Next fee due date is worked out automatically from the package
- Colour badges: red (late), orange (due in 7 days), green (OK)
- "Mark as paid" moves the due date forward by the package days
- "Send reminder" opens WhatsApp with the message already written
- The owner can set his own gym name as the main heading
- "Are you sure?" box before delete and mark as paid

## Tech used

- Frontend: React (Vite) and React Router
- Backend: Node.js and Express
- Database: MongoDB Atlas (Mongoose)

## How to run

Backend:

    cd backend
    npm install
    node server.js

Create a file `backend/.env` with one line: `MONGO_URI=your_mongodb_address`

Frontend:

    cd frontend
    npm install
    npm run dev

Then open http://localhost:5173

## API

| Method | Address | What it does |
| --- | --- | --- |
| GET | /api/members | Show all members |
| POST | /api/members | Add a member |
| PUT | /api/members/:id | Edit a member (name, phone) |
| PUT | /api/members/:id/pay | Mark as paid |
| DELETE | /api/members/:id | Delete a member |
| GET | /api/packages | Show all packages |
| POST | /api/packages | Add a package |
| PUT | /api/packages/:id | Edit a package (fee, days) |
| DELETE | /api/packages/:id | Delete a package |

## Planned

- Photo upload for members
- Owner login
- Automatic reminders and AI-written messages in Urdu or English