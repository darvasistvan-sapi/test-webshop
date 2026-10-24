# TechPiac

TechPiac is a Vue.js-based online marketplace for selling computer products. In addition to the customer-facing storefront, it also includes an administration area where products, categories, orders, and users can be managed.

## Technologies

- Vue 3 and `<script setup>` components
- Vite development environment and build system
- Vue Router for navigation between pages
- Pinia for application state management
- Express REST API between the frontend and database
- SQLite database for storing products, categories, orders, and users

## Getting Started

Node.js and npm are required to run the project.

```bash
npm install
npm run dev
```

The API must be started in a separate terminal:

```bash
npm run server
```

After that, the app can be opened on the local address shown by Vite, typically `http://localhost:5173`. The frontend requests to `/api` are automatically forwarded by the Vite dev proxy to the backend running at `http://localhost:3001`.

Create a production build and preview it:

```bash
npm run build
npm run preview
```

## How the storefront works

### Browsing products

On the home page, all products are displayed in a card layout. Products are grouped into categories, which are stored in the database and can be managed by the admin (see [Category management](#category-management)). A category can have a parent category; selecting a parent category also lists the products of all its subcategories. The initial categories are:

- laptops
- desktop PCs
- monitors
- mice
- keyboards
- routers
- headsets
- storage devices

The search field in the header filters by name or brand. The left-side category selector shows products from a single category (including its subcategories), and the price fields allow filtering by minimum and maximum price. The list can also be sorted by price or name.

### Product details

Clicking a product opens its detail page. It shows:

- the product name, brand, and price
- a short description
- stock quantity
- technical specifications
- the quantity to add to the cart

Out-of-stock products cannot be added to the cart.

### Cart and checkout

1. A product is added to the cart using the **Add to cart** button.
2. On the cart page, the quantity can be changed or a product can be removed.
3. The **Continue to checkout** button opens the order form.
4. The customer must enter their name, email address, and shipping address.
5. After finalizing the order, the order ID and summary page are shown.

A successful order reduces the stock of the affected products and then empties the cart.

### Registration and login

A new customer account can be created from the **Register** button in the header (`/regisztracio`). The user must provide a full name, a username (3–30 characters), an email address, and a password at least 6 characters long. The username and email address can only be used once. After successful registration, the user is automatically logged in.

On the **Login** page (`/bejelentkezes`), users can sign in with either a username or an email address. After logging in, the header displays the user's name and a **Logout** button, and the checkout form is auto-filled with the name and email.

### Profile editing

A logged-in user can open the **Profile** page (`/profil`) by clicking their own name in the header. There they can change their name, username, and email address; the uniqueness of the username and email is checked by the server. The password can also be changed there; to do so, the current password must be entered. After a password change, the user is logged out on all other devices. Without logging in, the `/profil` page redirects to the login page.

Passwords are stored on the server as salted hashes using the `scrypt` algorithm in the `users` table. When logging in, the server returns a random session token (`sessions` table), which the browser stores and verifies against `/api/auth/me` when the page reloads.

## Admin area

The admin signs in using the same `/bejelentkezes` page. The admin account is created automatically when the server starts for the first time.

Demo login details:

- Username: `admin`
- Password: `admin123`

After successful login, the protected admin interface is available at `/admin`. Without logging in, the admin pages automatically redirect to the login page.

| Page | Route |
| --- | --- |
| Dashboard | `/admin` |
| Products | `/admin/termekek` (new: `/admin/termekek/uj`, edit: `/admin/termekek/:id`) |
| Categories – list | `/admin/kategoriak` |
| Categories – products by category | `/admin/kategoriak/termekek` |
| Orders | `/admin/rendelesek` (edit: `/admin/rendelesek/:id`) |
| Users | `/admin/felhasznalok` |

Permissions are also checked by the server: creating, editing, deleting, and moving products between categories; creating, editing, and deleting categories; listing, editing, updating status, and deleting orders; and managing users are only possible with an admin token. Without a token, the response is `401`; for non-admin users, it is `403`. A single order (`GET /api/orders/:id`) can only be requested by the admin or by the logged-in customer who placed it. The product and category lists and order placement remain available to everyone.

### Dashboard

The overview page shows:

- the number of products
- the number of out-of-stock products
- the number of orders
- total revenue
- a list of recent orders

### Product management

In the **Products** section, the admin can:

- search by name or brand
- create a new product
- edit an existing product
- delete a product
- modify the price and stock
- add technical specifications
- upload an image for the product

The product image can be added through a drag-and-drop interface in the form: the file can be dragged into the field or selected by clicking. After selection, a preview appears immediately, and the image is uploaded when the **Save** / **Create** button is clicked (it is not sent to the server if canceled). Accepted formats: JPG, PNG, WebP, and GIF, up to 5 MB. Uploaded images are saved as `server/storage/products/<category>/upload-*`.

### Category management

The **Categories** section has two views, which can be switched with the tabs at the top of the page.

**Category list** (`/admin/kategoriak`): a table of all categories with their icon, name, ID, and parent category (main categories show `—`). The form next to the table is used to create a new category or edit an existing one:

- **ID**: only lowercase letters, digits, and hyphens; it is also the name of the category's image folder, so it cannot be changed later
- **Name**
- **Icon**: an emoji (or an image path starting with `/`)
- **Parent category**: empty for a main category; a category cannot be moved under itself or under one of its own subcategories

A category can only be deleted if no products belong to it and it has no subcategories; otherwise the server rejects the deletion and the reason is shown.

**Products by category** (`/admin/kategoriak/termekek`): every category is shown as a separate box with the products that belong directly to it. Each product shows its uploaded image (or the category icon if it has none), its name, and its brand. Subcategories show their parent in the box header. A product can be moved to another category by dragging it with the mouse into that category's box; the change is saved immediately, and if the server rejects it, the product moves back. Dragging works with a mouse only, not on touch screens.

### Order management

On the **Orders** page, the admin can view the customer's and order's details and modify the order status. Each order also shows its average price per item (total price / number of items, where quantities are counted, so 2 × A and 1 × B count as 3 items).

The **Edit** button in the order's details opens the order editor (`/admin/rendelesek/:id`), where the admin can change:

- the customer's name, email address, and shipping address
- the order status
- the quantity of each item, remove items, or add new products

New products are added with a searchable field: typing filters the products by name and brand (case- and accent-insensitive, every typed word must match), and a result can be selected with the mouse or with the arrow keys and Enter. The total is recalculated while editing.

Items already in the order keep the name and price they were ordered at; newly added products get their current price. The stock follows the change: a higher quantity is taken from the stock, a lower quantity or a removed item is returned to it.

The possible statuses are:

- In processing
- Packaging
- In transit
- Completed
- Deleted

### User management

On the **Users** page (`/admin/felhasznalok`), the admin sees all registered users: their name, username, email, role, registration date, and the number of orders they placed. The list can be searched by name, username, or email.

- The role (Customer / Admin) can be changed directly in the list.
- A user can be deleted. The deleted user is immediately logged out, but their orders remain.
- The admin cannot change their own role and cannot delete their own account, so they cannot lock themselves out.

## Data and project structure

Products, categories, and orders are not stored in the frontend files or in the browser `localStorage`. The Express backend uses a SQLite database located at `server/data/shop.sqlite`. On the first startup (and every startup if a new item has been added), the initial categories and products from `server/seed-data.js` fill in missing rows in the `categories` and `products` tables; after that, the SQLite database is the primary data source.

Products have integer IDs (`INTEGER PRIMARY KEY AUTOINCREMENT`), just like users. Older databases that still use text IDs (`p12`) are converted automatically when the server starts: seed products keep their number, and every other product gets a new one. Order items are updated to the new IDs as well.

Product images are stored in `server/storage/products/<category>/<file-name>` folders, and the Express server serves them statically at the `/storage` route. The frontend dev proxy (`vite.config.js`) also forwards `/storage` requests to the backend running at `http://localhost:3001`.

The cart is browser-side state. User accounts, sessions, and product/order data are stored on the server in the SQLite database.

Key directories:

- `src/views/`: customer and admin pages
- `src/components/`: reusable Vue components (`src/components/admin/`: admin-only components, such as the image drop zone and the searchable product picker)
- `src/stores/`: Pinia stores for products, categories, cart, orders, users, and authentication
- `src/router/`: routes and admin route protection
- `server/index.js`: Express API and SQLite database handling
- `server/seed-data.js`: initial category and product data and image references
- `server/storage/products/`: product image files in category-specific folders
- `server/data/shop.sqlite`: SQLite database file

## Demo limitations

This project is an educational and demo application. The admin login credentials are demo-only (`admin` / `admin123`). Session tokens do not expire automatically; they are only removed on logout. For production use, stronger authentication, authorization checks, a real payment provider, inventory synchronization, and email order confirmations would be required.
