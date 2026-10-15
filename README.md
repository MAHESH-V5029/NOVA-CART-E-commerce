# NovaCart — Beginner E-Commerce Web Application

A college-friendly full-stack online store built with **HTML, CSS, JavaScript, Node.js, Express.js, and MySQL**. Express serves the frontend and backend together, so you only need to run one local server.

## Features

- Product catalogue with search, stock display, product photos, and prices in INR
- Shopping cart saved in the browser
- Customer registration and login (passwords are hashed with bcrypt)
- JWT-based authentication and Admin/User role checks
- Checkout using **Cash on Delivery** (no payment gateway is connected)
- Order history and order status tracking
- Admin dashboard to add, edit, and delete products and update order status
- MySQL tables for users, products, orders, and order items
- Server-side checks for order prices and stock; checkout uses a database transaction

## Requirements

- Node.js 18 or newer and npm
- MySQL 8 recommended (MySQL Community Server or a local package such as XAMPP/MAMP)
- VS Code (recommended)
- Internet connection for Google Fonts and the remote sample product photos. The application code and database run locally.

Check Node.js and npm in a terminal:

```bash
node -v
npm -v
```

If either command is missing, install the current Node.js LTS version from https://nodejs.org/, then reopen your terminal.

## Run it on macOS / Windows / Linux

### Step 1 — Unzip and open the project

1. Extract `ecommerce-webapp.zip` to a folder you can find, such as your Desktop.
2. Open VS Code.
3. Choose **File → Open Folder…** and select the extracted `ecommerce-webapp` folder.
4. In VS Code, choose **Terminal → New Terminal**. The terminal should be inside the project folder. You should see `package.json`, `server.js`, and the `public` folder when you look at the Explorer panel.

### Step 2 — Start MySQL

Install and start MySQL if it is not already installed. On macOS, if you installed MySQL from its official installer, open **System Settings → MySQL** (or the MySQL preference pane, depending on the installer) and start the server. If you use MAMP/XAMPP, start its MySQL service through that application.

The default `.env.example` assumes MySQL runs on `localhost:3306` with user `root`. Your installation may use a different port, username, or password.

### Step 3 — Create the database and sample products

**Option A: MySQL Workbench**

1. Open MySQL Workbench and connect to your local MySQL server.
2. Choose **File → Open SQL Script…** and open `database/schema.sql` inside the project folder.
3. Click the lightning-bolt **Execute** button to run the script.
4. Refresh the Schemas panel. You should see `ecommerce_db` and the tables `users`, `products`, `orders`, and `order_items`.

**Option B: Terminal**

If the `mysql` command is available, run this from the project folder:

```bash
mysql -u root -p < database/schema.sql
```

Enter your MySQL password when requested. If your MySQL username is not `root`, replace `root` with your username. This SQL file creates `ecommerce_db` and inserts six sample products. It is safe to run again for the sample products because it checks product names before inserting them.

### Step 4 — Create your `.env` configuration

In the VS Code terminal, run:

```bash
cp .env.example .env
```

On Windows Command Prompt, use:

```bat
copy .env.example .env
```

Open `.env` in VS Code and update these values to match your MySQL setup:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=ecommerce_db
JWT_SECRET=put_a_long_random_secret_here
PORT=3000

ADMIN_NAME=Store Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=choose_your_own_password_123
```

Replace `your_actual_mysql_password`, the JWT secret, the admin email, and the admin password. The admin password must be at least 8 characters and must **not** be `ChangeMe123!`, which is only an example. If your MySQL account has no password, leave `DB_PASSWORD=` empty. Keep `.env` private; it is excluded by `.gitignore`.

### Step 5 — Install the project packages

In the VS Code terminal, from the project folder, run:

```bash
npm install
```

Wait for npm to finish. It creates a `node_modules` folder. Do not edit files inside `node_modules`.

### Step 6 — Create the administrator account

Run:

```bash
npm run create-admin
```

This creates or updates the account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, and assigns it the `admin` role. Use this email/password to log in to the website. **Do not expose an admin password in a public repository or project demo.**

Normal visitors who register through the website are always created as `user`; they cannot choose the admin role themselves.

### Step 7 — Start the web application

Run:

```bash
npm start
```

You should see something like:

```text
NovaCart is running at http://localhost:3000
Press Ctrl+C to stop the server.
```

Keep this terminal running while using the website. Open **http://localhost:3000** in your browser. Do not open `public/index.html` by double-clicking it; the frontend calls the backend through the local server.

To stop the server, return to the terminal and press **Ctrl+C**.

### Step 8 — Test the main features

1. Open `http://localhost:3000`. Six sample products should appear.
2. Search for a product, add one or more products to the cart, adjust quantities, and remove items.
3. Click **Account** and register a new customer account with a valid email and a password of at least 8 characters.
4. Open the cart, enter a delivery address, and place an order. The checkout method in this starter project is Cash on Delivery.
5. Click **Orders** to see the order and its status.
6. Log out. Log in with the admin credentials you configured in Step 4. The Admin dashboard appears.
7. In the dashboard, add or edit a product. Find the order in **All orders** and change its status to Processing, Shipped, or Delivered.
8. Log in as the customer again and open Orders to check the updated status.

You can also check whether the server and database connection work by visiting **http://localhost:3000/api/health**. A successful response looks like:

```json
{"status":"ok","database":"connected"}
```

## Folder structure

```text
ecommerce-webapp/
├── config/
│   └── db.js                 # MySQL connection pool
├── database/
│   └── schema.sql            # Database tables and sample products
├── middleware/
│   └── auth.js               # Login-token and admin checks
├── routes/
│   ├── auth.js               # Register, login, current user
│   ├── products.js           # Catalogue and admin product APIs
│   └── orders.js             # Checkout, orders, order status
├── scripts/
│   └── create-admin.js       # Creates the admin login
├── public/
│   ├── index.html            # Website structure
│   ├── styles.css            # Website design and responsive layout
│   └── app.js                # Browser interactions and API calls
├── .env.example              # Sample configuration (copy to .env)
├── .gitignore
├── package.json
├── README.md                 # This guide
└── server.js                 # Starts Express and serves the site
```

## API routes (for your practical/demo explanation)

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Check server and DB connection | Public |
| POST | `/api/auth/register` | Create a customer account | Public |
| POST | `/api/auth/login` | Log in and receive a token | Public |
| GET | `/api/auth/me` | Get the signed-in account | Logged-in user |
| GET | `/api/products` | List products; optional `?search=bag` | Public |
| POST | `/api/products` | Add a product | Admin |
| PATCH | `/api/products/:id` | Edit product fields | Admin |
| DELETE | `/api/products/:id` | Delete a product | Admin |
| POST | `/api/orders` | Place an order | Logged-in user |
| GET | `/api/orders` | List own orders (admins see all) | Logged-in user |
| PATCH | `/api/orders/:id/status` | Update order status | Admin |

Protected API requests use this header:

```text
Authorization: Bearer YOUR_LOGIN_TOKEN
```

## Common problems

**`Access denied for user 'root'`** — Check `DB_USER` and `DB_PASSWORD` in `.env`. Make sure you changed `.env`, not only `.env.example`.

**`ECONNREFUSED` or “Could not connect to MySQL”** — Start the MySQL server and verify host/port in `.env` (normally `localhost` and `3306`).

**Unknown database or missing table** — Run `database/schema.sql` in MySQL Workbench or with the terminal command from Step 3.

**`npm: command not found` / `node: command not found`** — Install Node.js LTS and restart VS Code/your terminal.

**Port 3000 is already in use** — Stop the other process or change `PORT=3001` in `.env`, restart the server, and open `http://localhost:3001`.

**Admin dashboard does not appear** — Run `npm run create-admin` after updating the admin settings in `.env`; then log in with that admin email and password. Normal sign-up creates only customer accounts.

**Images do not appear** — The sample images are remote URLs and require internet access. Product data and checkout still work without the photos.

## Learning notes and limitations

- The browser stores the login token and cart in `localStorage` for beginner simplicity. A production store should consider secure, HttpOnly cookies and additional security measures.
- Configure a strong private `JWT_SECRET`; never deploy with example credentials.
- Payments are not processed online. “Checkout” creates an order for Cash on Delivery only.
- This starter has no email notifications, password reset, shipping carrier integration, automated tests, rate limiting, or production deployment configuration.
- Before using this as a public production store, add HTTPS, request rate limits, stronger operational logging, security review, backups, and proper deployment secrets management.
