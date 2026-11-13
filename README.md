# Gym App 🏋️

A simple gym management app for small gyms that cannot afford fingerprint entry systems.

The owner logs in, adds **packages** (name, fee, days) and **members** (name, phone, photo, package). The app works out each member's next fee due date, shows who is late or due soon, records every payment, prints a payment slip, and opens **WhatsApp** with a ready reminder message.

Built with the MERN stack (MongoDB, Express, React, Node.js) as a practice project.

## Screenshot

![Dashboard](docs/dashboard.png)
![Members](docs/Members.png)
![MembersDetails](docs/Memberdetails.png)
![Packages](docs/Packages.png)
![AddPackages](docs/Addpackages.png)
![PaymentHistory](docs/Paymenthistory.png)
![MobileScreen](docs/Mobilescreen1.png)
![MobileScreen](docs/mobilescreen2.png)


## Features

**Owner login and security**
- The owner must log in with a username and password before using the app
- Log out button in the side menu
- Every backend address (except login and the gym name) needs a valid token, so the data is protected even if someone calls the API directly
- Passwords are never saved. Only a scrambled copy (bcrypt hash) is saved
- The token expires after 7 days
- 5 wrong login tries from one address block login for 15 minutes
- A wrong username and a wrong password give the same answer and take the same time
- The first owner is created with a small script (`node seed.js`), not by hand

**Settings**
- Gym name, phone and address (they show on the payment slips and on the login screen)
- Owner name and owner photo (they show on the Dashboard and in the side menu). Choose a picture from the PC or use the live camera
- Change the username or password. The current password is always needed, and a new password must have at least 8 characters

**Dashboard**
- Welcome card with the owner's name and photo
- Four clickable cards: Late, Due soon, OK and Total members (each opens the Members page with the right filter)
- "Collected this month" card with the total and the number of payments
- List of Late and Due soon members with their round photo and quick buttons: send WhatsApp reminder and mark as paid
- Click a photo for a big popup, or click a name to open the member's details page

**Members**
- Add, edit and delete members
- Search by name or phone, filter by status, 10 members per page
- Member photo: choose a picture from the PC or take one with the live camera (saved as a small 200x200 picture)
- Change a member's package, or type a new due date by hand
- "Start new package from today" option: restarts the due date and saves a payment
- Mark as paid: choose how it was paid (Cash, JazzCash, Easypaisa or Bank), move the due date forward and save a payment record
- For Bank payments, a picture of the bank slip can be attached (optional)
- WhatsApp reminder with a message that changes with the situation (late, due today, days left)

**Member details page**
- Click a member's name to open it
- Photo (click it for a big preview), status, phone, package, fee, join date and next due date
- Change or remove the photo at any time (choose from the PC or use the live camera)
- Payment history of that member with the total paid
- Send a reminder or mark as paid from the same page

**Packages**
- Package cards with name, days, fee and a check-mark list of details (for example Gym Access, Locker, Personal Trainer)
- Edit a package (renaming it also renames it on its members)
- A package cannot be deleted while members use it

**Payment History**
- All payments, newest first, with search and a running total
- Each payment shows its method, and the bank slip picture if one was attached
- Payment slip with the gym name, phone and address from Settings

**Other**
- Works on phone screens (compact tables and icon buttons)
- Loading message and a clear error message when the backend is off

## Fee status rule

One rule is used on every page (it lives in `frontend/src/utils.js`):

| Status | Meaning |
| --- | --- |
| Late (red) | The due date has passed |
| Due soon (orange) | 0 to 2 days left |
| OK (green) | More than 2 days left |

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Security | bcryptjs (password hash), jsonwebtoken (login token) |
| Other | dotenv, cors, WhatsApp link (wa.me) |

## Project structure

```
gym-app/
  backend/
    server.js            starts Express and connects to MongoDB
    seed.js              creates the first owner (run once on a new database)
    models/              Member.js, Package.js, Payment.js, Owner.js, Setting.js
    routes/              members.js, packages.js, payments.js, auth.js, settings.js
  frontend/
    src/
      main.jsx           starts React
      App.jsx            layout, side menu and routes
      utils.js           API address, status rule, dates, WhatsApp, photo resize
      CameraCapture.jsx  live camera photo box
      App.css            styles
      pages/             Login, Dashboard, Members, MemberDetails, Packages,
                         PaymentHistory, Settings
  docs/                  screenshots
```

## API

Base address: `http://localhost:5000/api`

Everything needs a login token (sent with every request) except the two open addresses marked "Open".

| Method | Address | What it does |
| --- | --- | --- |
| POST | `/auth/login` | Open. Send `username` and `password`, get a token back |
| GET | `/auth/gym` | Open. The gym name only (the login screen shows it) |
| GET | `/members` | All members, soonest due date first |
| POST | `/members` | Add a member. Send `name`, `phone`, `packageId` and optional `photo` |
| PUT | `/members/:id` | Edit name, phone, photo (an empty `photo` removes it), package (`packageId`), due date (`nextDueDate`) or start a new package today (`startToday: true`) |
| PUT | `/members/:id/pay` | Mark as paid: new due date, payment method, optional bank slip picture and a payment record |
| DELETE | `/members/:id` | Delete a member |
| GET | `/packages` | All packages, cheapest first |
| POST | `/packages` | Add a package. Send `name`, `fee`, `durationDays`, `features` |
| PUT | `/packages/:id` | Edit a package (also renames it on its members) |
| DELETE | `/packages/:id` | Delete a package (refused if members use it) |
| GET | `/payments` | All payments, newest first. Use `?memberId=...` for one member |
| GET | `/payments/summary` | Total collected this month |

Without a valid token, these addresses answer `401` with `{"error":"Please log in"}`.

## How to run it

You need Node.js and a free MongoDB Atlas database. Each gym uses its own database and has one owner.

**1. Download the project**

```
git clone https://github.com/shahzaibtariq577/gym-app.git
cd gym-app
```

**2. Backend**

```
cd backend
npm install
```

Create a file named `.env` inside the `backend` folder:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=a_long_random_text_of_at_least_32_characters
```

To make a random `JWT_SECRET`, run this and copy the result:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never share the `.env` file and never upload it to GitHub.

**3. Create the owner (only once on a new database)**

```
node seed.js
```

It asks for a username and a password (at least 8 characters) and creates the owner. If an owner already exists, it changes nothing.

**4. Start the backend**

```
node server.js
```

You should see "Database connected" and "Server running on port 5000".

**5. Frontend** (open a second terminal)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in the browser and log in with the username and password from step 3.

The backend does not reload by itself. After any change in the backend, stop it with Ctrl + C and run `node server.js` again.

## Design decisions

- **The server is the source of truth.** The screen sends only name, phone and package. The backend works out the fee and the due date, so the rules live in one safe place.
- **Validation on the server.** Name, phone, package fields, payment method and picture size are checked in the backend, because anyone can call the API without the screen.
- **The backend is locked, not only the screen.** A login page alone only hides the pages, so every API address checks the token.
- **Passwords are hashed.** Only a bcrypt hash is saved, and the login gives the same answer for a wrong username or a wrong password.
- **A member keeps its own copy of the package name and fee.** If the owner changes a package price later, old members and old payments do not change.
- **Photos are saved as small text (200x200 JPEG).** This is simple for a small gym. For thousands of members, files in cloud storage would be better.
- **Mark as paid does not lose days.** If the member is not late yet, the new period starts from the old due date, not from today.
- **One gym, one database, one owner.** The first owner is made with `seed.js`.

## Known limits and ideas for later

- Only one owner login (no staff accounts yet)
- No "forgot password" (the owner can reset it with a script)
- The login try limit is kept in memory and resets when the backend restarts
- WhatsApp receipt after a payment
- Balance tracking for part payments
- Month filter and export in Payment History
- Expenses page with profit for the month and a "Profit this month" card on the Dashboard
- Reminders are sent by the owner with one click (not automatic)
- Phone numbers that start with 0 are treated as Pakistan numbers (+92) for WhatsApp
- Move pictures out of the database into file storage
- Automated tests (login first)
- Deploy online (the camera needs https, and CORS must allow only the real website)

## Author

Shahzaib Tariq, Computer Science graduate from Faisalabad.