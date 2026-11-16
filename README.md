# Gym App 🏋️

A simple gym management app for small gyms that cannot afford fingerprint entry systems. Many gyms can sign up, and every gym sees only its own data.

A gym owner signs up on the website, adds **packages** (name, fee, days) and **members** (name, phone, photo, package). The app works out each member's next fee due date, shows who is late or due soon, records every payment (also part payments), prints a payment slip, and opens **WhatsApp** with a ready reminder message. The owner can also run a small **Shop** (protein, drinks and so on): sell products, buy stock, and let a customer pay later.

Built with the MERN stack (MongoDB, Express, React, Node.js) as a practice project. The product name for now is **GymDesk**.

**Online:** https://gym-app-ehn.pages.dev (the backend runs on a free plan, so the first visit after a quiet time can take about a minute). The Shop, Buy stock and credit sales are built and tested on my PC and go online with the next deploy.

## Screenshot

![Dashboard](docs/dashboard.png)
![Members](docs/Members.png)
![MembersDetails](docs/Memberdetails.png)
![Packages](docs/Packages.png)
![AddPackages](docs/Addpackages.png)
![PaymentHistory](docs/Paymenthistory.png)
![MobileScreen](docs/Mobilescreen1.png)
![MobileScreen](docs/mobilescreen2.png)
![LandingPage](docs/LandingPage.png)
![Login](docs/Login.png)
![Signup](docs/Signup.png)
![Settings](docs/Settings.png)
![Expenses](docs/Expenses.png)
![AddExpenses](docs/AddExpenses.png)
![Shop](docs/Shop.png)
![BuyStock](docs/Buystock.png)
![Addproduct](docs/Addproduct.png)
![PurchaseHistory](docs/Purchasehistory.png)
![CreditSale](docs/Creditsale.png)
![ShopReceipt](docs/Shopreceipt.png)
![Gymreceipt](docs/Gymreceipt.png)



## Features

**Landing page and sign up**
- The first page a visitor sees: top bar with Login and Sign up, a headline, an example due list, features, how it works in 3 steps, a screenshot box, FAQ and a footer. It works on phones
- Sign up for a new gym: gym name, username and password (at least 8 characters). The new owner is logged in at once and sees an empty gym
- At most 20 sign ups per hour from one address

**Many gyms, separate data**
- Every gym sees only its own members, packages, payments, expenses, shop and settings
- The gym comes only from the login token, never from the browser, so a gym cannot ask for the data of another gym
- Two gyms can both have a package called Gold, or a product called Whey Protein

**Owner login and security**
- The owner must log in with a username and password before using the app
- Log out button in the side menu
- Every backend address (except login and sign up) needs a valid token, so the data is protected even if someone calls the API directly
- Passwords are never saved. Only a scrambled copy (bcrypt hash) is saved
- The token expires after 7 days. An old token without a gym stops working (log in again)
- 5 wrong login tries from one address block login for 15 minutes
- A wrong username and a wrong password give the same answer and take the same time
- On an empty database, the first gym and owner can also be created with a small script (`node seed.js`)

**Settings**
- Gym name, phone and address (they show on the payment slips and in the side menu)
- Owner name and owner photo (they show on the Dashboard and in the side menu). Choose a picture from the PC or use the live camera
- Change the username or password. The current password is always needed, and a new password must have at least 8 characters

**Dashboard**
- Welcome card with the owner's name and photo
- Four clickable cards: Late, Due soon, OK and Total members (each opens the Members page with the right filter)
- "Collected this month" card with the total and the number of payments (gym fees only)
- "Unpaid balance" card with the total still owed by members who paid only a part (shown only when there is a balance)
- "Profit this month" card (earned minus the cost of sold shop items minus spent, red and called Loss when it is below zero) with a button to the Expenses page
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
- For Bank payments, a picture of the bank slip can be attached (optional). It is made smaller before it is saved
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
- Gym fees and shop money together, newest first, with a Type column (Gym fee or Shop), type filter, search and a running total
- A shop sale shows one row for every payment received, on the day the money came, so an unpaid sale does not show until it is paid
- Month filter: This month, Last month, All, or pick any month; the search and the total follow the month
- Export CSV: downloads the payments you see (Excel can open it)
- Each payment shows its method, the remaining balance, and the slip picture if one was attached
- Payment slip (receipt) with the gym name, phone and address from Settings, a stamp (PAID or PART PAID), the real remaining balance, and Print / Save as PDF

**Expenses and insights**
- Add an expense with a date, a category (Electricity, Rent, Staff salary, Equipment repair, New equipment, Internet, Cleaning, Supplements or Other), an amount and an optional note
- Optional picture of the bill (saved small, like the bank slip, and opened only when you click it)
- Edit and delete an expense (not an expense made by a Shop purchase, see below)
- Month buttons (Previous and Next) to see any month, with the list of that month
- Earned (gym fees plus shop sales), Spent (operating expenses, without Supplements) and Profit (earned minus the cost of sold shop items minus spent)
- Supplements are stock bought for the Shop. They are shown as "stock bought" and are not a cost until the items are sold
- Spending by category with a bar and a percentage for each category
- Last 6 months chart: earned, spent and the profit of each month, so you can see if a cost like electricity is going up

**Shop**
- Products with a name (unique inside one gym), sale price, buying price, stock and an optional picture (click it to see it big)
- Sell a product: quantity, price (starts as the sale price), buyer name, note, how the customer paid (Cash, JazzCash, Easypaisa or Bank) and an optional payment screenshot
- The stock goes down at the same moment, and two sales at once cannot sell the last item twice
- Each sale saves the buying price and the profit of that day, so an old profit never changes when a price changes later
- Sale receipt (S-number, PAID, PART PAID or UNPAID stamp, Print / Save as PDF, payment slip pictures)
- Cards: Shop earned, Shop profit, Stock value, Stock bought, Items sold, Customers owe and Low stock (5 or less)
- Best sellers of the month, month buttons, and a sales list with Status, Paid by, Slip, Collect and Undo
- Undo a sale: the stock is put back and its payments are removed

**Buy stock and purchase history**
- A Buy stock button on each product: quantity, buying price, optional supplier, note and bill picture
- One click adds the stock, saves the purchase, sets the new buying price to the weighted average, and makes ONE Supplements expense with the same total and the bill picture
- The weighted average is (old stock x old price + bought quantity x new price) / (old stock + bought quantity)
- Purchase history card with its own month buttons and the bill picture
- Undo works only for the newest purchase of a product, and only if the bought stock is not sold yet. It takes the stock out, puts the old buying price back and deletes the expense
- An expense made by a purchase is locked on the Expenses page (edit and delete are refused with "Remove it from Shop > Purchase history"), so the money is never counted twice
- A Supplements expense typed by hand is still allowed, but it does not add stock

**Credit sales (pay later)**
- "Amount paid now" starts as the total. If it is less (or 0), the buyer name is required
- Status of every sale: Paid, Part paid or Unpaid, with the balance (total minus paid)
- Collect button: save a later payment with an amount (more than 0 and not more than the balance), a method and an optional slip
- The receipt shows every payment and what the customer still owes
- Old sales have no amountPaid and count as fully paid, so nothing had to be migrated
- Money rule: the sale amount and the profit are counted on the sale date. The Customers owe card shows the unpaid total. Payment History shows money on the day it was received. The Dashboard Collected card stays gym fees only

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

## Shop money rules

| Situation | What happens |
| --- | --- |
| A product is sold | Stock goes down (only if enough is left). Revenue and profit are counted on the sale date, even if the customer has not paid yet |
| The customer pays less than the total | The sale is Part paid (or Unpaid for 0). The balance shows in Customers owe until it is collected |
| Money is collected later | A payment is added to the sale. At balance 0 the status is Paid. Payment History shows the money on the day it was received |
| Stock is bought | Stock goes up, the buying price becomes the weighted average, and one locked Supplements expense is made |
| Profit in Expenses insights | earned (gym fees + shop sales) - cost of sold items - spent. Supplements are stock bought, not spent |
| Undo a purchase | Stock and old buying price come back and the expense is deleted. Refused if the stock is already sold or a newer purchase of the product exists |

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
    seed.js              creates the first gym and owner (run once on an empty database)
    createOwner.js       resets the password of a username
    migrate.js           gave the old data its first gymId (safe to run again)
    backup.js            saves every collection as JSON (node backup.js)
    checkPictureSizes.js shows how much space the pictures use (read only)
    Dockerfile           recipe for the online host
    models/              Gym.js, Member.js, Package.js, Payment.js, Owner.js, Setting.js, Expense.js,
                         Product.js, Sale.js, Purchase.js
    routes/              members.js, packages.js, payments.js, auth.js, settings.js, expenses.js, shop.js
    middleware/          requireLogin.js (the login guard, sets req.gymId from the token)
    tests/               helpers.js, auth.test.js, payments.test.js, packages.test.js,
                         balance.test.js, slip.test.js, isolation.test.js, signup.test.js,
                         shop.test.js, purchase.test.js, credit.test.js
  frontend/
    src/
      main.jsx           starts React
      App.jsx            public routes (landing, login, sign up) or the app with the side menu
      utils.js           API address, status rule, dates, WhatsApp, photo resize
      auth.js            keeps the login token and sends it with every request
      PayBox.jsx         the Mark as paid box (amount, method, bank slip)
      Slip.jsx           the payment receipt
      ShopSlip.jsx       the shop sale receipt (Paid, Part paid or Unpaid)
      CameraCapture.jsx  live camera photo box
      App.css            styles
      SettingsContext    gym and owner settings shared by all pages
      pages/             Landing (and Landing.css), Login, Signup, Dashboard, Members,
                         MemberDetails, Packages, PaymentHistory, Settings, Expenses, Shop
  docs/                  screenshots
```

## API

Base address: `http://localhost:5000/api`

Everything needs a login token (sent with every request) except the two open addresses marked "Open". Every address works only on the gym in the token: a member, package, payment, expense, product, sale or purchase of another gym is simply not found (404).

| Method | Address | What it does |
| --- | --- | --- |
| POST | `/auth/login` | Open. Send `username` and `password`, get a token back (the token carries the gym) |
| POST | `/auth/signup` | Open. Send `gymName`, `username` and `password` (8 to 100 characters). Makes a new gym with its owner and answers with a token. At most 20 per hour from one address (then 429) |
| GET | `/members` | All members, soonest due date first (each has a `balance`) |
| POST | `/members` | Add a member. Send `name`, `phone`, `packageId` and optional `photo` |
| PUT | `/members/:id` | Edit name, phone, photo (an empty `photo` removes it), package (`packageId`), due date (`nextDueDate`) or start a new package today (`startToday: true`, refused while a balance is open) |
| PUT | `/members/:id/pay` | Mark as paid. Optional `amount` (default: what the member owes), `method` (Cash, JazzCash, Easypaisa, Bank) and `slipImage`. A full payment moves the due date; a part payment saves a balance. Answers with `{ member, payment }` |
| DELETE | `/members/:id` | Delete a member (404 if it is not in your gym) |
| GET | `/packages` | All packages, cheapest first |
| POST | `/packages` | Add a package. Send `name`, `fee`, `durationDays`, `features`. The name must be new inside your gym |
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
| GET | `/expenses/insights?month=2026-11` | Earned, spent and profit of the month, shop earned and cost, stock bought, spending by category, and the last 6 months |
| GET | `/expenses/:id/bill` | The bill picture of one expense (404 if there is none) |
| POST | `/expenses` | Add an expense. Send `date` (2026-11-30), `category`, `amount`, optional `note` and optional `billImage` |
| PUT | `/expenses/:id` | Edit an expense (only the fields sent). `billImage`: leave it out to keep the picture, send an empty text to remove it. Refused for an expense made by a Shop purchase |
| DELETE | `/expenses/:id` | Delete an expense (404 if it is not in your gym). Refused for an expense made by a Shop purchase |
| GET | `/shop/products` | All products of the gym, A to Z |
| POST | `/shop/products` | Add a product. Send `name`, `salePrice`, `costPrice` (both more than 0), optional `stock` and `photo` |
| PUT | `/shop/products/:id` | Edit a product (only the fields sent) |
| DELETE | `/shop/products/:id` | Delete a product (its old sales stay in the list) |
| POST | `/shop/sales` | Sell. Send `productId`, `quantity`, optional `unitPrice`, `buyer`, `note`, `method`, `slipImage` and `amountPaid` (default the total; the buyer name is needed when it is less). Answers the sale with `status`, `balance` and `amountPaid` |
| GET | `/shop/sales?month=2026-11` | Sales of one month, newest first (`month=all` for every sale). No slip pictures, only `hasSlip` |
| GET | `/shop/sales/:id/slip` | The payment slip picture saved with the sale (404 if there is none) |
| POST | `/shop/sales/:id/pay` | Collect money later. Send `amount` (more than 0, not more than the balance), `method` and optional `slipImage` |
| GET | `/shop/sales/:id/payments/:paymentId/slip` | The slip picture of one later payment (404 if there is none) |
| DELETE | `/shop/sales/:id` | Remove a sale: the stock is put back and its payments are removed |
| POST | `/shop/purchases` | Buy stock. Send `productId`, `quantity`, `unitCost`, optional `supplier`, `note` and `billImage`. Adds the stock, sets the average buying price and makes one Supplements expense |
| GET | `/shop/purchases?month=2026-11` | Purchase history of one month (`month=all` for every purchase). No bill pictures, only `hasBill` |
| GET | `/shop/purchases/:id/bill` | The bill picture of one purchase (404 if there is none) |
| DELETE | `/shop/purchases/:id` | Remove the newest purchase of a product: stock and buying price go back and the expense is deleted. Refused if the stock is already sold |
| GET | `/shop/summary?month=2026-11` | Shop earned, profit, cost, stock bought, stock value, items sold, low stock, customers owe (`owed`, `owedCount`) and best sellers |

Without a valid token, these addresses answer `401` with `{"error":"Please log in"}`.

## How to run it

You need Node.js and a free MongoDB Atlas database. All gyms share the one database, and every document has a `gymId`.

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

**3. Create the first gym (optional, only on an empty database)**

```
node seed.js
```

It asks for the gym name, a username and a password (at least 8 characters) and creates the gym, its owner and its settings. If an owner already exists, it changes nothing. You can skip this step and use Sign up on the website instead.

If your database is from before the many-gyms change (documents without a `gymId`), run these once in the backend folder:

```
node backup.js
node migrate.js
```

`migrate.js` makes the first gym from the old settings and gives every old document its `gymId`. It is safe to run again. The Shop needs no migration: old sales without `amountPaid` count as fully paid.

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

Open http://localhost:5173 in the browser. You see the landing page. Use Sign up to make a gym, or Login if you made the owner with `seed.js`.

The backend does not reload by itself. After any change in the backend, stop it with Ctrl + C and run `node server.js` again.

## Run the tests

```
cd backend
npm test
```

The tests use Jest and supertest on the Express app (`app.js`) with an in-memory MongoDB (mongodb-memory-server), so your real database is never touched and the backend does not need to be running. The first run downloads a test database and can take a few minutes.

What is tested (10 suites; all pass on my PC):
- Login: right and wrong password, unknown username, the 5 wrong tries block, and that every data address answers 401 without a token
- Sign up: a new gym gets a working token and an empty gym, a taken username, a short password, a bad username or gym name are refused, two new gyms never see each other, and the sign up limit (429)
- Two-gym isolation: gym B cannot see, edit, delete or undo anything of gym A (members, packages, payments, slips, bills, insights, settings and the payment summary), a `gymId` sent in the body or the address is ignored, an old token without a gym is refused, and two gyms can use the same package name
- Packages: add, sort, validation, duplicate names, rename (members follow), delete rules
- Members: add and validation (name, phone, photo, package)
- Mark as paid: fee and method, due date for a member who is not late and for a late member, bad amounts and methods, bank slip door and its size limit
- Undo: the due date and balance come back, only the newest payment can be undone
- Part payments: balance, due date stays, paying the rest, late members, amounts above what is owed, new package while a balance is open, old payments without balance fields
- Shop (`shop.test.js`): products, selling, stock, summary, two-gym isolation, stock bought, stock value, profit, payment method, slips and receipt
- Buy stock (`purchase.test.js`): stock and weighted average price, one locked Supplements expense with the bill, bad input, purchase history and bill door, undo rules (newest only, refused when sold), locked expenses, and two-gym isolation
- Credit sales (`credit.test.js`): Paid, Part paid and Unpaid, buyer name needed, amounts refused, collecting money (slips, over-payment refused), old sales count as fully paid, Customers owe, profit counted on the sale date, removing a sale with payments, and two-gym isolation

## Deploy online

| Part | Where | Settings |
| --- | --- | --- |
| Website | Cloudflare Pages | production branch `main`, root directory `frontend`, build command `npm run build`, output directory `dist`, variables `VITE_API_URL` (the backend address + `/api`) and `NODE_VERSION` = `22` |
| Backend | SnapDeploy (free plan) | repository `gym-app`, branch `main`, root directory `backend`, the `Dockerfile` in the backend folder, variables `MONGO_URI`, `JWT_SECRET`, `TZ` = `Asia/Karachi` and `CLIENT_URL` (the website address, no slash at the end) |
| Database | MongoDB Atlas | a database user with only readWrite on the app database, a strong password. The free hosts have no fixed IP, so the IP list is 0.0.0.0/0 |

Notes:
- The Dockerfile runs `npm ci --omit=dev`, so the test tools are not installed online. Always commit `package.json` and `package-lock.json` together, or the online build fails.
- The website and the backend must be updated together: the landing page, Sign up and the Shop need the new backend. After the new backend is online, run `node migrate.js` once more, because the PC and the online backend share one database.
- The free SnapDeploy backend sleeps after 15 minutes without visitors (the first visit takes about a minute) and has a limited number of deploys and hours (5 deploys per 12 hours, and failed builds count, so read the build log before deploying again). A real gym would need an always-on host.
- All gyms share the 512 MB of the free Atlas database.
- The camera needs https, which the online website has.
- Use a different `JWT_SECRET` online than on your own computer.

## Design decisions

- **The server is the source of truth.** The screen sends only name, phone and package. The backend works out the fee and the due date, so the rules live in one safe place. In the Shop the server checks every price, quantity, amount and picture size too.
- **Validation on the server.** Name, phone, package fields, payment method, amounts and picture size are checked in the backend, because anyone can call the API without the screen.
- **The backend is locked, not only the screen.** A login page alone only hides the pages, so every API address checks the token.
- **The gym comes only from the token.** The token is signed, and `requireLogin` saves its `gymId` in `req.gymId`. Every query filters by it, and one document is found with `findOne({ _id, gymId })`, never `findById`. The browser never sends the gym, so it cannot ask for another gym. Two-gym tests prove it.
- **Package and product names are unique inside one gym.** The index is on `gymId` and `name`, so two gyms can both have a package called Gold.
- **Passwords are hashed.** Only a bcrypt hash is saved, and the login gives the same answer for a wrong username or a wrong password.
- **A member keeps its own copy of the package name and fee.** If the owner changes a package price later, old members and old payments do not change. A sale does the same with the buying price and the profit.
- **Part payments keep the due date.** The due date moves only when the fee is fully paid, so a member who paid only a part stays Late or Due soon and is not forgotten. Each payment saves the balance before and after it, so Undo can put both back.
- **Photos are saved as small text (200x200 JPEG).** This is simple for a small gym. Bank slips and bills are resized and limited too. For thousands of members, files in cloud storage would be better.
- **Mark as paid does not lose days.** If the member is not late yet, the new period starts from the old due date, not from today.
- **Payment first, then member.** Mark as paid saves the payment first, and if saving the member fails, the payment is removed again, so the two always match.
- **One door does the month maths.** `GET /expenses/insights` reads the payments, the shop sales and the expenses together, adds them by month and sends a small answer, so the screen does no maths.
- **Bill pictures and slips are fetched only when opened.** The lists send only `hasBill` or `hasSlip`, so they stay fast.
- **The app and the server are two files.** `app.js` builds the Express app and `server.js` starts it, so the tests can call the app without a port and with a fake database.
- **Sign up cleans up after itself.** It makes the gym, the owner and the settings, and if one step fails the records already made are removed. A migration script moved the first gym's old data without losing anything.
- **Selling cannot oversell.** The stock goes down with one atomic update that works only when enough is left. If saving the sale fails, the stock is given back.
- **Buy stock changes everything together.** The stock, the average buying price, the purchase and the Supplements expense are made in one request, so they cannot disagree. There is no MongoDB transaction: each step is done in order and the earlier steps are taken back by hand if one fails. The expense is locked so the money is never counted twice.
- **Stock bought is not a cost until it is sold.** Profit uses the cost of sold items, not the money spent on stock.
- **Credit sales need no migration.** An old sale has no `amountPaid`, so the code treats it as fully paid. The first payment stays in the sale and later payments go in a `payments` list.
- **Collecting money is safe against double clicks.** The update matches the old `amountPaid`, so two clicks cannot pay more than the balance.

## Known limits and ideas for later

- The Shop, Buy stock and credit sales are not online yet (the SnapDeploy deploy limit); they need the next deploy
- Rename "Shop profit" to "Gross profit" (not decided yet)
- A low-stock warning on the Dashboard
- A search filter on the Expenses page
- A buyer phone number so unpaid sales can get a WhatsApp reminder
- One owner login for each gym (no staff accounts yet)
- No "forgot password" (the password can be reset with `node createOwner.js username "newpassword"`)
- The login and sign up limits are kept in memory and reset when the backend restarts
- No way yet to delete a whole gym and its data
- The landing page has a screenshot box and no contact phone yet
- WhatsApp receipt after a payment (a WhatsApp link can send only text, not a file)
- Expenses that repeat every month (rent, internet) filled in by themselves
- Reminders are sent by the owner with one click (not automatic)
- Phone numbers that start with 0 are treated as Pakistan numbers (+92) for WhatsApp
- Pictures are still saved in the database, only smaller (move them to file storage before the free 512 MB fills)
- Tests do not cover editing members, settings and expenses yet
- The free backend sleeps and has limited hours and deploys; it is fine for practice and a few gyms, not for many paying gyms (an always-on host costs about $12 a month)

## Author

Shahzaib Tariq, Computer Science graduate from Faisalabad.