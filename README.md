# Gym App

A gym management app for small gyms that cannot afford fingerprint entry.
The owner adds members and packages, sees who must pay soon, and sends a
WhatsApp reminder with one click.

## Features

- Add members with a package (fee and next due date are worked out automatically)
- Member list sorted by due date, with colors: red (late), orange (due in 7 days), green (OK)
- Mark a member as paid (moves the due date forward)
- Add and delete packages
- "Send reminder" button that opens WhatsApp with the message already written
- "Are you sure?" box before delete and mark as paid

## Tech used

- Frontend: React (Vite)
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

## Planned

- Photo upload for members
- Edit members and packages
- Owner login
- Automatic reminders and AI-written messages in Urdu or English