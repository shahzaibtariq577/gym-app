# Gym App 🏋️

A simple gym management app for small gyms that cannot afford fingerprint entry systems.

The owner logs in, adds **packages** (name, fee, days) and **members** (name, phone, photo, package). The app works out each member's next fee due date, shows who is late or due soon, records every payment (also part payments), prints a payment slip, and opens **WhatsApp** with a ready reminder message.

Built with the MERN stack (MongoDB, Express, React, Node.js) as a practice project.

**Online:** https://gym-app-ehn.pages.dev (the backend runs on a free plan, so the first visit after a quiet time can take about a minute)

## Screenshot

![Dashboard](docs/dashboard.png)
![Members](docs/Members.png)
![MembersDetails](docs/Memberdetails.png)
![Packages](docs/Packages.png)
![AddPackages](docs/Addpackages.png)
![PaymentHistory](docs/Paymenthistory.png)
![MobileScreen](docs/Mobilescreen1.png)
![MobileScreen](docs/mobilescreen2.png)
![Login](docs/Login.png)
![Settings](docs/Settings.png)
![Expenses](docs/Expenses.png)
![ExpensesInsights](docs/Expensesinsights.png)


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
- "Unpaid balance" card with the total still owed by members who paid only a part (shown only when there is a balance)
- "Profit this month" card (earned minus spent, red and called Loss when spent is more than earned) with a button to the Expenses page
- List of Late and Due soon members with their round photo and quick buttons: send WhatsApp reminder and mark as paid
- Click a photo for a big popup, or click a name to open the member's details page

**Members**
- Add, edit and delete members
- Search by name or phone, filter by status, 10 members per page
- Member photo: choose a picture from the PC or take one with the live camera (saved as a small 200x200 picture)
- Change a member's package, or type a new due date by hand
- "Start new package from today" option: restarts the due date and saves a payment (not possible while the member still owes a balance)
- Mark as paid: choose how it was paid (Cash, JazzCash, Easypaisa or Bank), save a payment record, and move the due date forward when the fee is fully paid
- Part payments: if a member pays only a part of the fee, the due date stays, the rest is saved as a balance ("Rs 2,500 left" shows in red), and the next payment starts with that balance
- An amount bigger than what the member owes is refused (it protects against a typing mistake)
- For Bank payments, a picture of the bank slip can be attached (optional)
- WhatsApp reminder with a message that changes with the situation (late, due today, days left, or the remaining balance)

**Member details page**
- Click a member's name to open it
- Photo (click it for a big preview), status, phone, package, fee, balance to pay, join date and next due date
- Change or remove the photo at any time (choose from the PC or use the live camera)
- Payment history of that member with the total paid and the remaining balance after each payment
- Undo the newest payment: the due date and the balance go back
- Send a reminder or mark as paid from the same page

**Packages**
- Package cards with name, days, fee and a check-mark list of details (for example Gym Access, Locker, Personal Trainer)
- Edit a package (renaming it also renames it on its members)
- A package cannot be deleted while members use it

**Payment History**
- All payments, newest first, with search and a running total
- Month filter: This month, Last month, All, or pick any month; the search and the total follow the month
- Export CSV: downloads the payments you see (Excel can open it)
- Each payment shows its method, the remaining balance, and the bank slip picture if one was attached
- Payment slip (receipt) with the gym name, phone and address from Settings, a stamp (PAID or PART PAID), the real remaining balance, and Print / Save as PDF

**Expenses and insights**
- Add an expense with a date, a category (Electricity, Rent, Staff salary, Equipment repair, New equipment, Internet, Cleaning or Other), an amount and an optional note
- Optional picture of the bill (saved small, like the bank slip, and opened only when you click it)
- Edit and delete an expense
- Month buttons (Previous and Next) to see any month, with the list of that month
- Earned (all payments of the month), Spent (all expenses) and Profit (earned minus spent)
- Spending by category with a bar and a percentage for each category
- Last 6 months chart: earned, spent and the profit of each month, so you can see if a cost like electricity is going up

**Other**
- Works on phone screens (compact tables and icon buttons)
- Loading message and a clear error message when the backend is off
- Backup script: `node backup.js` saves every collection as a JSON file

## Fee status rule

One rule is used on every page (it lives in `frontend/src/utils.js`):

| Status | Meaning |
| --- | --- |
| Late (red) | The due date has passed |
| Due soon (orange) | 0 to 2 days left |
| OK (green) | More than 2 days left |

## Part payment rule

| Situation | What happens |
| --- | --- |
| The member owes the fee (balance 0) | The amount owed is the package fee |
| The member has a balance | The amount owed is the balance |
| The amount paid covers what is owed | The due date moves by the package days (from the old due date if the member is not late, from today if late) and the balance becomes 0 |
| The amount paid is less than what is owed | The due date does not move and the balance becomes owed minus amount |
| The amount paid is more than what is owed | Refused |
| Undo the newest payment | The due date and the balance go back to what they were |

Old payments (made before balance tracking) count as fully paid.

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Security | bcryptjs (password hash), jsonwebtoken (login token) |
| Tests | Jest, supertest, mongodb-memory-server |
| Hosting | Cloudflare Pages (website), SnapDeploy with a Dockerfile (backend), Atlas (database) |
| Other | dotenv, cors, WhatsApp link (wa.me) |

## Project structure

```
gym-app/
  backend/
    server.js            reads .env, checks JWT_SECRET, connects to MongoDB and listens
    app.js               the Express app: CORS, JSON, login guard and all routes
    seed.js              creates the first owner (run once on a new database)
    createOwner.js       creates the owner or resets the password
    backup.js            saves every collection as JSON (node backup.js)
    Dockerfile           recipe for the online host
    models/              Member.js, Package.js, Payment.js, Owner.js, Setting.js, Expense.js
    routes/              members.js, packages.js, payments.js, auth.js, settings.js, expenses.js
    middleware/          requireLogin.js (the login guard)
    tests/               helpers.js, auth.test.js, payments.test.js, packages.test.js, balance.test.js
  frontend/
    src/
      main.jsx           starts React
      App.jsx            layout, side menu and routes
      utils.js           API address, status rule, dates, WhatsApp, photo resize
      auth.js            keeps the login token and sends it with every request
      PayBox.jsx         the Mark as paid box (amount, method, bank slip)
      Slip.jsx           the payment receipt
      CameraCapture.jsx  live camera photo box
      App.css            styles
      SettingsContext    gym and owner settings shared by all pages
      pages/             Login, Dashboard, Members, MemberDetails, Packages,
                         PaymentHistory, Settings, Expenses
  docs/                  screenshots
```

## API

Base address: `http://localhost:5000/api`

Everything needs a login token (sent with every request) except the two open addresses marked "Open".

| Method | Address | What it does |
| --- | --- | --- |
| POST | `/auth/login` | Open. Send `username` and `password`, get a token back |
| GET | `/auth/gym` | Open. The gym name only (the login screen shows it) |
| GET | `/members` | All members, soonest due date first (each has a `balance`) |
| POST | `/members` | Add a member. Send `name`, `phone`, `packageId` and optional `photo` |
| PUT | `/members/:id` | Edit name, phone, photo (an empty `photo` removes it), package (`packageId`), due date (`nextDueDate`) or start a new package today (`startToday: true`, refused while a balance is open) |
| PUT | `/members/:id/pay` | Mark as paid. Optional `amount` (default: what the member owes), `method` (Cash, JazzCash, Easypaisa, Bank) and `slipImage`. A full payment moves the due date; a part payment saves a balance. Answers with `{ member, payment }` |
| DELETE | `/members/:id` | Delete a member |
| GET | `/packages` | All packages, cheapest first |
| POST | `/packages` | Add a package. Send `name`, `fee`, `durationDays`, `features` |
| PUT | `/packages/:id` | Edit a package (also renames it on its members) |
| DELETE | `/packages/:id` | Delete a package (refused if members use it) |
| GET | `/payments` | All payments, newest first, without slip pictures. Use `?memberId=...` for one member |
| GET | `/payments/summary` | Total collected this month |
| GET | `/payments/:id/slip` | The bank slip picture of one payment (404 if there is none) |
| DELETE | `/payments/:id` | Undo a payment. Only the newest payment of a member; the due date and the balance go back |
| GET | `/settings` | The gym name, phone, address, owner name and owner photo |
| PUT | `/settings` | Save the gym and owner profile |
| PUT | `/settings/account` | Change the username and/or password (the current password is needed) |
| GET | `/expenses?month=2026-11` | Expenses of one month, newest first (default: this month). No bill pictures inside, only `hasBill` |
| GET | `/expenses/insights?month=2026-11` | Earned, spent and profit of the month, spending by category, and the last 6 months |
| GET | `/expenses/:id/bill` | The bill picture of one expense (404 if there is none) |
| POST | `/expenses` | Add an expense. Send `date` (2026-11-30), `category`, `amount`, optional `note` and optional `billImage` |
| PUT | `/expenses/:id` | Edit an expense (only the fields sent). `billImage`: leave it out to keep the picture, send an empty text to remove it |
| DELETE | `/expenses/:id` | Delete an expense |

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

## Run the tests

```
cd backend
npm test
```

The tests use Jest and supertest on the Express app (`app.js`) with an in-memory MongoDB (mongodb-memory-server), so your real database is never touched and the backend does not need to be running. The first run downloads a test database and can take a few minutes.

What is tested (53 tests):
- Login: right and wrong password, unknown username, the 5 wrong tries block, and that every data address answers 401 without a token
- Packages: add, sort, validation, duplicate names, rename (members follow), delete rules
- Members: add and validation (name, phone, photo, package)
- Mark as paid: fee and method, due date for a member who is not late and for a late member, bad amounts and methods, bank slip door
- Undo: the due date and balance come back, only the newest payment can be undone
- Part payments: balance, due date stays, paying the rest, late members, amounts above what is owed, new package while a balance is open, old payments without balance fields

## Deploy online

| Part | Where | Settings |
| --- | --- | --- |
| Website | Cloudflare Pages | production branch `main`, root directory `frontend`, build command `npm run build`, output directory `dist`, variables `VITE_API_URL` (the backend address + `/api`) and `NODE_VERSION` = `22` |
| Backend | SnapDeploy (free plan) | repository `gym-app`, branch `main`, root directory `backend`, the `Dockerfile` in the backend folder, variables `MONGO_URI`, `JWT_SECRET`, `TZ` = `Asia/Karachi` and `CLIENT_URL` (the website address, no slash at the end) |
| Database | MongoDB Atlas | a database user with only readWrite on the app database, a strong password. The free hosts have no fixed IP, so the IP list is 0.0.0.0/0 |

Notes:
- The Dockerfile runs `npm ci --omit=dev`, so the test tools are not installed online. Always commit `package.json` and `package-lock.json` together, or the online build fails.
- The free SnapDeploy backend sleeps after 15 minutes without visitors (the first visit takes about a minute) and has a limited number of deploys and hours. A real gym would need an always-on host.
- The camera needs https, which the online website has.
- Use a different `JWT_SECRET` online than on your own computer.

## Design decisions

- **The server is the source of truth.** The screen sends only name, phone and package. The backend works out the fee and the due date, so the rules live in one safe place.
- **Validation on the server.** Name, phone, package fields, payment method, amounts and picture size are checked in the backend, because anyone can call the API without the screen.
- **The backend is locked, not only the screen.** A login page alone only hides the pages, so every API address checks the token.
- **Passwords are hashed.** Only a bcrypt hash is saved, and the login gives the same answer for a wrong username or a wrong password.
- **A member keeps its own copy of the package name and fee.** If the owner changes a package price later, old members and old payments do not change.
- **Part payments keep the due date.** The due date moves only when the fee is fully paid, so a member who paid only a part stays Late or Due soon and is not forgotten. Each payment saves the balance before and after it, so Undo can put both back.
- **Photos are saved as small text (200x200 JPEG).** This is simple for a small gym. For thousands of members, files in cloud storage would be better.
- **Mark as paid does not lose days.** If the member is not late yet, the new period starts from the old due date, not from today.
- **Payment first, then member.** Mark as paid saves the payment first, and if saving the member fails, the payment is removed again, so the two always match.
- **One door does the month maths.** `GET /expenses/insights` reads the payments and the expenses together, adds them by month and sends a small answer, so the screen does no maths.
- **Bill pictures and bank slips are fetched only when opened.** The lists send only `hasBill` or `hasSlip`, so they stay fast.
- **The app and the server are two files.** `app.js` builds the Express app and `server.js` starts it, so the tests can call the app without a port and with a fake database.
- **One gym, one database, one owner.** The first owner is made with `seed.js`.

## Known limits and ideas for later

- Only one owner login (no staff accounts yet)
- No "forgot password" (the owner can reset it with a script)
- The login try limit is kept in memory and resets when the backend restarts
- WhatsApp receipt after a payment (a WhatsApp link can send only text, not a file)
- Expenses that repeat every month (rent, internet) filled in by themselves
- Reminders are sent by the owner with one click (not automatic)
- Phone numbers that start with 0 are treated as Pakistan numbers (+92) for WhatsApp
- Pictures are still saved in the database (move them to file storage before the free 512 MB fills)
- Tests do not cover editing members, settings and expenses yet
- The free backend sleeps; a real gym needs an always-on host
- A landing page and sign up for many gyms (today one gym uses one database)

## Author

Shahzaib Tariq, Computer Science graduate from Faisalabad.