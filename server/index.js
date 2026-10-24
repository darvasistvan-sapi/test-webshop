import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import express from 'express'
import initSqlJs from 'sql.js'
import { seedCategories, seedProducts } from './seed-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
const databasePath = path.join(__dirname, 'data', 'shop.sqlite')
const productImageDir = path.join(__dirname, 'storage', 'products')
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const port = process.env.PORT || 3001

const app = express()
app.use(express.json())
app.use('/storage', express.static(path.join(__dirname, 'storage')))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
})

function saveDatabase(db) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true })
    fs.writeFileSync(databasePath, Buffer.from(db.export()))
}

function createProductsSql(table) {
    return `CREATE TABLE IF NOT EXISTS ${table} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            description TEXT NOT NULL,
            brand TEXT NOT NULL,
            specs TEXT NOT NULL DEFAULT '{}',
            image TEXT
        );`
}

function createOrderItemsSql(table) {
    return `CREATE TABLE IF NOT EXISTS ${table} (
            order_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            PRIMARY KEY (order_id, product_id),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );`
}

// Earlier databases stored product ids as text ('p12', or 'p<timestamp>' for admin-created products).
// Seed products keep their number; every other old id, including ones only referenced by orders, gets a new one.
function migrateProductIds(db, seedIds) {
    const legacyIds = [
        ...(db.exec('SELECT id FROM products ORDER BY rowid')[0]?.values ?? []),
        ...(db.exec('SELECT DISTINCT product_id FROM order_items')[0]?.values ?? []),
    ].map(([id]) => String(id))

    const idMap = new Map()
    for (const legacyId of legacyIds) {
        const number = Number(/^p(\d+)$/.exec(legacyId)?.[1])
        if (seedIds.has(number)) idMap.set(legacyId, number)
    }
    let nextId = Math.max(0, ...seedIds, ...idMap.values()) + 1
    for (const legacyId of legacyIds) {
        if (!idMap.has(legacyId)) idMap.set(legacyId, nextId++)
    }

    db.run('BEGIN TRANSACTION')
    db.run('ALTER TABLE products RENAME TO products_legacy')
    db.run('ALTER TABLE order_items RENAME TO order_items_legacy')
    db.run(createProductsSql('products'))
    db.run(createOrderItemsSql('order_items'))
    const productStatement = db.prepare(`
        INSERT INTO products (id, name, category, price, stock, description, brand, specs, image)
        SELECT ?, name, category, price, stock, description, brand, specs, image FROM products_legacy WHERE id = ?
    `)
    const itemStatement = db.prepare(`
        INSERT INTO order_items (order_id, product_id, name, price, quantity)
        SELECT order_id, ?, name, price, quantity FROM order_items_legacy WHERE product_id = ?
    `)
    for (const [legacyId, id] of idMap) {
        productStatement.run([id, legacyId])
        itemStatement.run([id, legacyId])
    }
    productStatement.free()
    itemStatement.free()
    // Reserve the ids handed out to deleted products so new products never reuse them.
    db.run("DELETE FROM sqlite_sequence WHERE name = 'products'")
    db.run("INSERT INTO sqlite_sequence (name, seq) VALUES ('products', ?)", [nextId - 1])
    db.run('DROP TABLE products_legacy')
    db.run('DROP TABLE order_items_legacy')
    db.run('COMMIT')
    saveDatabase(db)
}

// Route parameters are strings; an invalid product id is treated as a missing product.
function parseProductId(value) {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

function buildProductFilter(query = {}) {
    const conditions = []
    const values = []
    const search = String(query.search ?? '').trim().toLowerCase()

    if (search) {
        conditions.push('(lower(name) LIKE ? OR lower(brand) LIKE ?)')
        values.push(`%${search}%`, `%${search}%`)
    }
    // A parent category also lists the products of all its subcategories.
    if (query.category) {
        conditions.push(`category IN (
            WITH RECURSIVE subtree(id) AS (
                SELECT ?
                UNION SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
            )
            SELECT id FROM subtree
        )`)
        values.push(query.category)
    }
    if (query.minPrice !== undefined && query.minPrice !== '') {
        conditions.push('price >= ?')
        values.push(Number(query.minPrice))
    }
    if (query.maxPrice !== undefined && query.maxPrice !== '') {
        conditions.push('price <= ?')
        values.push(Number(query.maxPrice))
    }
    if (query.stock === '0') {
        conditions.push('stock = 0')
    }

    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values }
}

const SORT_COLUMNS = {
    'price-asc': 'price ASC',
    'price-desc': 'price DESC',
    name: 'name ASC',
    default: 'id ASC',
}

function countProducts(db, query = {}) {
    const { where, values } = buildProductFilter(query)
    const statement = db.prepare(`SELECT COUNT(*) AS count FROM products ${where}`)
    statement.bind(values)
    statement.step()
    const { count } = statement.getAsObject()
    statement.free()
    return count
}

function readProducts(db, query = {}) {
    const { where, values } = buildProductFilter(query)
    const orderBy = SORT_COLUMNS[query.sortBy] ?? SORT_COLUMNS.default
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100)
    const page = Math.max(Number(query.page) || 1, 1)
    const offset = (page - 1) * pageSize

    const sql = `SELECT id, name, category, price, stock, description, brand, specs, image FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    const statement = db.prepare(sql)
    statement.bind([...values, pageSize, offset])
    const products = []
    while (statement.step()) {
        const row = statement.getAsObject()
        products.push({ ...row, specs: JSON.parse(row.specs || '{}') })
    }
    statement.free()
    return { products, page, pageSize }
}

function findProduct(db, id) {
    const statement = db.prepare('SELECT id, name, category, price, stock, description, brand, specs, image FROM products WHERE id = ?')
    statement.bind([id])
    const product = statement.step() ? statement.getAsObject() : null
    statement.free()
    return product ? { ...product, specs: JSON.parse(product.specs || '{}') } : null
}

function toCategory(row) {
    return { id: row.id, name: row.name, icon: row.icon ?? null, parentId: row.parent_id ?? null }
}

function readCategories(db) {
    const statement = db.prepare('SELECT id, name, icon, parent_id FROM categories ORDER BY rowid ASC')
    const categories = []
    while (statement.step()) categories.push(toCategory(statement.getAsObject()))
    statement.free()
    return categories
}

function findCategory(db, id) {
    const statement = db.prepare('SELECT id, name, icon, parent_id FROM categories WHERE id = ?')
    statement.bind([id])
    const category = statement.step() ? toCategory(statement.getAsObject()) : null
    statement.free()
    return category
}

function countRows(db, sql, params) {
    const statement = db.prepare(sql)
    statement.bind(params)
    statement.step()
    const [count] = Object.values(statement.getAsObject())
    statement.free()
    return count
}

// Shared validation for creating and editing a category. Returns { error } on failure.
function parseCategory(db, body, id) {
    const category = {
        name: String(body.name ?? '').trim(),
        icon: String(body.icon ?? '').trim() || null,
        parentId: body.parentId ? String(body.parentId) : null,
    }
    if (!category.name) return { error: 'A kategória nevének megadása kötelező.' }
    if (category.parentId) {
        if (!findCategory(db, category.parentId)) return { error: 'A szülő kategória nem található.' }
        // Walk up from the new parent: reaching the category itself would create a cycle.
        for (let ancestor = category.parentId; ancestor; ancestor = findCategory(db, ancestor)?.parentId) {
            if (ancestor === id) return { error: 'A kategória nem lehet a saját leszármazottja.' }
        }
    }
    return { category }
}

function readOrders(db, orderId = null) {
    const orders = new Map()
    const statement = db.prepare(`
        SELECT o.id, o.customer, o.total, o.status, o.created_at, o.user_id,
               i.product_id, i.name, i.price, i.quantity
        FROM orders o
        LEFT JOIN order_items i ON i.order_id = o.id
        ${orderId ? 'WHERE o.id = ?' : ''}
        ORDER BY o.created_at DESC
    `)
    if (orderId) statement.bind([orderId])
    while (statement.step()) {
        const row = statement.getAsObject()
        if (!orders.has(row.id)) {
            orders.set(row.id, {
                id: row.id,
                customer: JSON.parse(row.customer),
                total: row.total,
                status: row.status,
                createdAt: row.created_at,
                userId: row.user_id ?? null,
                items: [],
            })
        }
        if (row.product_id) {
            orders.get(row.id).items.push({
                productId: row.product_id,
                name: row.name,
                price: row.price,
                quantity: row.quantity,
            })
        }
    }
    statement.free()
    return [...orders.values()]
}

const USER_ROLES = ['customer', 'admin']
const ORDER_STATUSES = ['Feldolgozás alatt', 'Csomagolás alatt', 'Kiszállítás alatt', 'Teljesítve', 'Törölve']

function badRequest(res, message) {
    return res.status(400).json({ error: message })
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
    const [salt, hash] = String(stored).split(':')
    if (!salt || !hash) return false
    const expected = Buffer.from(hash, 'hex')
    const actual = crypto.scryptSync(password, salt, 64)
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function toPublicUser(row) {
    return { id: row.id, username: row.username, email: row.email, name: row.name, role: row.role }
}

const PASSWORD_MIN_LENGTH = 6
const PASSWORD_ERROR = `A jelszónak legalább ${PASSWORD_MIN_LENGTH} karakter hosszúnak kell lennie.`

// Shared validation for registration and profile editing. Returns { error } on failure.
function parseProfile(body) {
    const profile = {
        username: String(body.username ?? '').trim(),
        email: String(body.email ?? '').trim().toLowerCase(),
        name: String(body.name ?? '').trim(),
    }
    if (!profile.name) return { error: 'A név megadása kötelező.' }
    if (!/^[\p{L}0-9_.-]{3,30}$/u.test(profile.username)) {
        return { error: 'A felhasználónév 3–30 karakter lehet (betűk, számok, _ . -).' }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return { error: 'Érvénytelen e-mail-cím.' }
    return { profile }
}

// Check whether the username and email are already taken (excluding the current account).
function findTakenField(db, { username, email }, excludeId = 0) {
    if (findUser(db, 'username = ? AND id != ?', [username, excludeId])) return 'Ez a felhasználónév már foglalt.'
    if (findUser(db, 'email = ? AND id != ?', [email, excludeId])) return 'Ezzel az e-mail-címmel már regisztráltak.'
    return null
}

function readUsers(db) {
    const statement = db.prepare(`
        SELECT u.id, u.username, u.email, u.name, u.role, u.created_at,
               (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
        FROM users u
        ORDER BY u.created_at DESC
    `)
    const users = []
    while (statement.step()) {
        const row = statement.getAsObject()
        users.push({ ...toPublicUser(row), createdAt: row.created_at, orderCount: row.order_count })
    }
    statement.free()
    return users
}

function findUser(db, sql, params) {
    const statement = db.prepare(`SELECT id, username, email, name, role, password_hash FROM users WHERE ${sql}`)
    statement.bind(params)
    const user = statement.step() ? statement.getAsObject() : null
    statement.free()
    return user
}

function createSession(db, userId) {
    const token = crypto.randomBytes(32).toString('hex')
    db.run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, userId, Date.now()])
    saveDatabase(db)
    return token
}

function readToken(req) {
    const header = req.get('Authorization') || ''
    return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

function userFromRequest(db, req) {
    const token = readToken(req)
    if (!token) return null
    return findUser(db, 'id = (SELECT user_id FROM sessions WHERE token = ?)', [token])
}

function requireAdmin(db) {
    return (req, res, next) => {
        const user = userFromRequest(db, req)
        if (!user) return res.status(401).json({ error: 'A művelethez be kell jelentkezni.' })
        if (user.role !== 'admin') return res.status(403).json({ error: 'Ehhez a művelethez admin jogosultság szükséges.' })
        req.user = user
        next()
    }
}

async function start() {
    const SQL = await initSqlJs({ locateFile: () => wasmPath })
    const db = fs.existsSync(databasePath)
        ? new SQL.Database(fs.readFileSync(databasePath))
        : new SQL.Database()

    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            parent_id TEXT,
            FOREIGN KEY (parent_id) REFERENCES categories(id)
        );
        ${createProductsSql('products')}
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer TEXT NOT NULL,
            total INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        ${createOrderItemsSql('order_items')}
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `)

    if (!findUser(db, 'username = ?', ['admin'])) {
        db.run(
            'INSERT INTO users (username, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', 'admin@techpiac.hu', 'Adminisztrátor', hashPassword('admin123'), 'admin', Date.now()],
        )
        saveDatabase(db)
    }

    const productColumns = db.exec("PRAGMA table_info(products)")[0]?.values.map((row) => row[1]) ?? []
    if (!productColumns.includes('image')) {
        db.run('ALTER TABLE products ADD COLUMN image TEXT')
    }
    const productIdType = db.exec('PRAGMA table_info(products)')[0]?.values.find((row) => row[1] === 'id')?.[2]
    if (productIdType !== 'INTEGER') {
        migrateProductIds(db, new Set(seedProducts.map((product) => product.id)))
    }

    const orderColumns = db.exec("PRAGMA table_info(orders)")[0]?.values.map((row) => row[1]) ?? []
    if (!orderColumns.includes('user_id')) {
        db.run('ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)')
    }

    const existingCategoryIds = new Set(
        (db.exec('SELECT id FROM categories')[0]?.values ?? []).map((row) => row[0]),
    )
    const missingCategories = seedCategories.filter((category) => !existingCategoryIds.has(category.id))
    if (missingCategories.length) {
        const categoryStatement = db.prepare('INSERT INTO categories (id, name, icon, parent_id) VALUES (?, ?, ?, ?)')
        for (const category of missingCategories) {
            categoryStatement.run([category.id, category.name, category.icon ?? null, category.parentId ?? null])
        }
        categoryStatement.free()
        saveDatabase(db)
    }

    const existingIds = new Set(
        (db.exec('SELECT id FROM products')[0]?.values ?? []).map((row) => row[0]),
    )

    const insertStatement = db.prepare('INSERT INTO products (id, name, category, price, stock, description, brand, specs, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const backfillImageStatement = db.prepare("UPDATE products SET image = ? WHERE id = ? AND (image IS NULL OR image = '')")
    let changed = false
    for (const product of seedProducts) {
        if (!existingIds.has(product.id)) {
            insertStatement.run([
                product.id,
                product.name,
                product.category,
                product.price,
                product.stock,
                product.description,
                product.brand,
                JSON.stringify(product.specs),
                product.image ?? null,
            ])
            changed = true
        } else if (product.image) {
            backfillImageStatement.run([product.image, product.id])
            changed = true
        }
    }
    insertStatement.free()
    backfillImageStatement.free()
    if (changed) saveDatabase(db)

    const adminOnly = requireAdmin(db)

    app.get('/api/categories', (req, res) => {
        res.json(readCategories(db))
    })

    app.get('/api/categories/:id', (req, res) => {
        const category = findCategory(db, req.params.id)
        if (!category) return res.status(404).json({ error: 'A kategória nem található.' })
        res.json(category)
    })

    // The id is also the product image folder name, so it may only contain lowercase letters, digits and hyphens.
    app.post('/api/categories', adminOnly, (req, res) => {
        const id = String(req.body.id ?? '').trim()
        if (!/^[a-z0-9-]+$/.test(id)) return badRequest(res, 'A kategória azonosítója csak kisbetűt, számot és kötőjelet tartalmazhat.')
        if (findCategory(db, id)) return res.status(409).json({ error: 'Ilyen azonosítójú kategória már létezik.' })
        const { category, error } = parseCategory(db, req.body, id)
        if (error) return badRequest(res, error)
        db.run('INSERT INTO categories (id, name, icon, parent_id) VALUES (?, ?, ?, ?)', [id, category.name, category.icon, category.parentId])
        saveDatabase(db)
        res.status(201).json(findCategory(db, id))
    })

    app.put('/api/categories/:id', adminOnly, (req, res) => {
        const id = req.params.id
        if (!findCategory(db, id)) return res.status(404).json({ error: 'A kategória nem található.' })
        const { category, error } = parseCategory(db, req.body, id)
        if (error) return badRequest(res, error)
        db.run('UPDATE categories SET name = ?, icon = ?, parent_id = ? WHERE id = ?', [category.name, category.icon, category.parentId, id])
        saveDatabase(db)
        res.json(findCategory(db, id))
    })

    // Only an unused category can be deleted: it must have no products and no subcategories.
    app.delete('/api/categories/:id', adminOnly, (req, res) => {
        const id = req.params.id
        if (countRows(db, 'SELECT COUNT(*) FROM products WHERE category = ?', [id])) {
            return res.status(409).json({ error: 'A kategóriához még tartoznak termékek.' })
        }
        if (countRows(db, 'SELECT COUNT(*) FROM categories WHERE parent_id = ?', [id])) {
            return res.status(409).json({ error: 'A kategóriának még vannak alkategóriái.' })
        }
        db.run('DELETE FROM categories WHERE id = ?', [id])
        saveDatabase(db)
        res.status(204).end()
    })

    app.get('/api/products', (req, res) => {
        const total = countProducts(db, req.query)
        const { products, page, pageSize } = readProducts(db, req.query)
        res.json({ items: products, total, page, pageSize, hasMore: page * pageSize < total })
    })

    app.get('/api/products/:id', (req, res) => {
        const id = parseProductId(req.params.id)
        const product = findProduct(db, id)
        if (!product) return res.status(404).json({ error: 'A termék nem található.' })
        res.json(product)
    })

    app.post('/api/products', adminOnly, (req, res) => {
        const { name, category, price, stock, description, brand, specs = {}, image = null } = req.body
        if (!name || !category || !brand || !description || Number(price) < 0 || Number(stock) < 0) {
            return badRequest(res, 'Hiányos vagy hibás termékadat.')
        }
        if (!findCategory(db, category)) return badRequest(res, 'A kategória nem található.')
        const statement = db.prepare('INSERT INTO products (name, category, price, stock, description, brand, specs, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        statement.run([name, category, Number(price), Number(stock), description, brand, JSON.stringify(specs), image || null])
        statement.free()
        const [[id]] = db.exec('SELECT last_insert_rowid()')[0].values
        saveDatabase(db)
        res.status(201).json(findProduct(db, id))
    })

    app.put('/api/products/:id', adminOnly, (req, res) => {
        const id = parseProductId(req.params.id)
        const { name, category, price, stock, description, brand, specs = {}, image = null } = req.body
        if (!findProduct(db, id)) return res.status(404).json({ error: 'A termék nem található.' })
        if (!findCategory(db, category)) return badRequest(res, 'A kategória nem található.')
        const statement = db.prepare('UPDATE products SET name = ?, category = ?, price = ?, stock = ?, description = ?, brand = ?, specs = ?, image = ? WHERE id = ?')
        statement.run([name, category, Number(price), Number(stock), description, brand, JSON.stringify(specs), image || null, id])
        statement.free()
        saveDatabase(db)
        res.json(findProduct(db, id))
    })

    app.delete('/api/products/:id', adminOnly, (req, res) => {
        const id = parseProductId(req.params.id)
        const statement = db.prepare('DELETE FROM products WHERE id = ?')
        statement.run([id])
        statement.free()
        saveDatabase(db)
        res.status(204).end()
    })

    app.patch('/api/products/:id/stock', adminOnly, (req, res) => {
        const id = parseProductId(req.params.id)
        const quantity = Number(req.body.quantity)
        if (!Number.isInteger(quantity) || quantity < 0) return badRequest(res, 'Hibás mennyiség.')
        const statement = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
        statement.run([quantity, id])
        statement.free()
        saveDatabase(db)
        res.json(findProduct(db, id))
    })

    // Move a product to another category (drag and drop on the admin category board).
    app.patch('/api/products/:id/category', adminOnly, (req, res) => {
        const id = parseProductId(req.params.id)
        if (!findProduct(db, id)) return res.status(404).json({ error: 'A termék nem található.' })
        const category = String(req.body.category ?? '')
        if (!findCategory(db, category)) return badRequest(res, 'A kategória nem található.')
        db.run('UPDATE products SET category = ? WHERE id = ?', [category, id])
        saveDatabase(db)
        res.json(findProduct(db, id))
    })

    // Upload a product image as raw binary data; the response is the image's public URL.
    app.post(
        '/api/uploads/product-image',
        adminOnly,
        express.raw({ type: Object.keys(IMAGE_TYPES), limit: IMAGE_MAX_BYTES }),
        (req, res) => {
            const extension = IMAGE_TYPES[req.get('Content-Type')]
            if (!extension || !Buffer.isBuffer(req.body) || !req.body.length) {
                return badRequest(res, 'Csak JPG, PNG, WebP vagy GIF kép tölthető fel.')
            }
            const category = String(req.query.category ?? '')
            if (!/^[a-z0-9-]+$/.test(category)) return badRequest(res, 'Érvénytelen kategória.')

            const fileName = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`
            const directory = path.join(productImageDir, category)
            fs.mkdirSync(directory, { recursive: true })
            fs.writeFileSync(path.join(directory, fileName), req.body)
            res.status(201).json({ url: `/storage/products/${category}/${fileName}` })
        },
    )

    app.get('/api/orders', adminOnly, (req, res) => {
        res.json(readOrders(db))
    })

    // An order can be fetched by the admin or by the logged-in user who placed it.
    app.get('/api/orders/:id', (req, res) => {
        const user = userFromRequest(db, req)
        if (!user) return res.status(401).json({ error: 'A művelethez be kell jelentkezni.' })
        const [order] = readOrders(db, req.params.id)
        if (!order || (user.role !== 'admin' && order.userId !== user.id)) {
            return res.status(404).json({ error: 'A rendelés nem található.' })
        }
        res.json(order)
    })

    app.post('/api/orders', (req, res) => {
        const { customer, items, total } = req.body
        if (!customer?.name || !customer?.email || !customer?.address || !Array.isArray(items) || !items.length) {
            return badRequest(res, 'Hiányos rendelési adatok.')
        }
        if (items.some((item) => !parseProductId(item.productId))) return badRequest(res, 'Érvénytelen termékazonosító.')
        const id = `ORD-${Date.now()}`
        const user = userFromRequest(db, req)
        db.run('BEGIN TRANSACTION')
        try {
            const orderStatement = db.prepare('INSERT INTO orders (id, customer, total, status, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?)')
            orderStatement.run([id, JSON.stringify(customer), Number(total), 'Feldolgozás alatt', Date.now(), user?.id ?? null])
            orderStatement.free()
            const itemStatement = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
            const stockStatement = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
            for (const item of items) {
                itemStatement.run([id, Number(item.productId), item.name, Number(item.price), Number(item.quantity)])
                stockStatement.run([Number(item.quantity), Number(item.productId)])
            }
            itemStatement.free()
            stockStatement.free()
            db.run('COMMIT')
            saveDatabase(db)
            res.status(201).json(readOrders(db, id)[0])
        } catch (error) {
            db.run('ROLLBACK')
            res.status(400).json({ error: error.message })
        }
    })

    app.put('/api/orders/:id/status', adminOnly, (req, res) => {
        if (!ORDER_STATUSES.includes(req.body.status)) return badRequest(res, 'Érvénytelen rendelési állapot.')
        const statement = db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        statement.run([req.body.status, req.params.id])
        statement.free()
        saveDatabase(db)
        const [order] = readOrders(db, req.params.id)
        if (!order) return res.status(404).json({ error: 'A rendelés nem található.' })
        res.json(order)
    })

    // Edit an order. Existing items keep the name and price they were ordered at, new items get the current ones.
    // Stock follows the change: a higher quantity takes from it, a lower or removed one gives back.
    app.put('/api/orders/:id', adminOnly, (req, res) => {
        const [order] = readOrders(db, req.params.id)
        if (!order) return res.status(404).json({ error: 'A rendelés nem található.' })

        const { customer, items, status } = req.body
        if (!customer?.name || !customer?.email || !customer?.address || !Array.isArray(items) || !items.length) {
            return badRequest(res, 'Hiányos rendelési adatok.')
        }
        if (!ORDER_STATUSES.includes(status)) return badRequest(res, 'Érvénytelen rendelési állapot.')

        const oldItems = new Map(order.items.map((item) => [item.productId, item]))
        const newItems = new Map()
        for (const item of items) {
            const productId = parseProductId(item.productId)
            const quantity = Number(item.quantity)
            if (!productId) return badRequest(res, 'Érvénytelen termékazonosító.')
            if (!Number.isInteger(quantity) || quantity < 1) return badRequest(res, 'A mennyiség legalább 1 db lehet.')
            if (newItems.has(productId)) return badRequest(res, 'Egy termék csak egyszer szerepelhet a rendelésben.')
            const snapshot = oldItems.get(productId) ?? findProduct(db, productId)
            if (!snapshot) return badRequest(res, 'A termék nem található.')
            newItems.set(productId, { productId, name: snapshot.name, price: snapshot.price, quantity })
        }
        const total = [...newItems.values()].reduce((sum, item) => sum + item.price * item.quantity, 0)
        const savedCustomer = {
            name: String(customer.name).trim(),
            email: String(customer.email).trim(),
            address: String(customer.address).trim(),
            city: String(customer.city ?? '').trim(),
            zip: String(customer.zip ?? '').trim(),
        }

        db.run('BEGIN TRANSACTION')
        try {
            db.run('UPDATE orders SET customer = ?, total = ?, status = ? WHERE id = ?', [JSON.stringify(savedCustomer), total, status, order.id])
            const stockStatement = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
            for (const productId of new Set([...oldItems.keys(), ...newItems.keys()])) {
                const change = (newItems.get(productId)?.quantity ?? 0) - (oldItems.get(productId)?.quantity ?? 0)
                if (change) stockStatement.run([change, productId])
            }
            stockStatement.free()
            db.run('DELETE FROM order_items WHERE order_id = ?', [order.id])
            const itemStatement = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
            for (const item of newItems.values()) {
                itemStatement.run([order.id, item.productId, item.name, item.price, item.quantity])
            }
            itemStatement.free()
            db.run('COMMIT')
        } catch (error) {
            db.run('ROLLBACK')
            return res.status(400).json({ error: error.message })
        }
        saveDatabase(db)
        res.json(readOrders(db, order.id)[0])
    })

    app.delete('/api/orders/:id', adminOnly, (req, res) => {
        db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id])
        db.run('DELETE FROM orders WHERE id = ?', [req.params.id])
        saveDatabase(db)
        res.status(204).end()
    })

    app.get('/api/users', adminOnly, (req, res) => {
        res.json(readUsers(db))
    })

    app.put('/api/users/:id/role', adminOnly, (req, res) => {
        const id = Number(req.params.id)
        if (!USER_ROLES.includes(req.body.role)) return badRequest(res, 'Érvénytelen szerepkör.')
        if (id === req.user.id) return badRequest(res, 'A saját szerepkörödet nem módosíthatod.')
        if (!findUser(db, 'id = ?', [id])) return res.status(404).json({ error: 'A felhasználó nem található.' })
        db.run('UPDATE users SET role = ? WHERE id = ?', [req.body.role, id])
        saveDatabase(db)
        res.json(readUsers(db).find((user) => user.id === id))
    })

    // The user's orders remain, only their account association is removed.
    app.delete('/api/users/:id', adminOnly, (req, res) => {
        const id = Number(req.params.id)
        if (id === req.user.id) return badRequest(res, 'A saját fiókodat nem törölheted.')
        if (!findUser(db, 'id = ?', [id])) return res.status(404).json({ error: 'A felhasználó nem található.' })
        db.run('BEGIN TRANSACTION')
        db.run('DELETE FROM sessions WHERE user_id = ?', [id])
        db.run('UPDATE orders SET user_id = NULL WHERE user_id = ?', [id])
        db.run('DELETE FROM users WHERE id = ?', [id])
        db.run('COMMIT')
        saveDatabase(db)
        res.status(204).end()
    })

    app.post('/api/auth/register', (req, res) => {
        const { profile, error } = parseProfile(req.body)
        if (error) return badRequest(res, error)
        const { username, email, name } = profile
        const password = String(req.body.password ?? '')
        if (password.length < PASSWORD_MIN_LENGTH) return badRequest(res, PASSWORD_ERROR)
        const taken = findTakenField(db, profile)
        if (taken) return res.status(409).json({ error: taken })

        db.run(
            'INSERT INTO users (username, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, name, hashPassword(password), 'customer', Date.now()],
        )
        const user = findUser(db, 'username = ?', [username])
        const token = createSession(db, user.id)
        res.status(201).json({ token, user: toPublicUser(user) })
    })

    app.post('/api/auth/login', (req, res) => {
        const login = String(req.body.username ?? '').trim()
        const password = String(req.body.password ?? '')
        const user = login ? findUser(db, 'username = ? OR email = ?', [login, login]) : null
        if (!user || !verifyPassword(password, user.password_hash)) {
            return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' })
        }
        const token = createSession(db, user.id)
        res.json({ token, user: toPublicUser(user) })
    })

    app.get('/api/auth/me', (req, res) => {
        const user = userFromRequest(db, req)
        if (!user) return res.status(401).json({ error: 'Nincs bejelentkezve.' })
        res.json(toPublicUser(user))
    })

    app.put('/api/auth/me', (req, res) => {
        const user = userFromRequest(db, req)
        if (!user) return res.status(401).json({ error: 'Nincs bejelentkezve.' })
        const { profile, error } = parseProfile(req.body)
        if (error) return badRequest(res, error)
        const taken = findTakenField(db, profile, user.id)
        if (taken) return res.status(409).json({ error: taken })

        db.run('UPDATE users SET username = ?, email = ?, name = ? WHERE id = ?', [profile.username, profile.email, profile.name, user.id])
        saveDatabase(db)
        res.json(toPublicUser(findUser(db, 'id = ?', [user.id])))
    })

    // Change the password with the current password; sessions on other devices are revoked.
    app.put('/api/auth/me/password', (req, res) => {
        const user = userFromRequest(db, req)
        if (!user) return res.status(401).json({ error: 'Nincs bejelentkezve.' })
        const currentPassword = String(req.body.currentPassword ?? '')
        const newPassword = String(req.body.newPassword ?? '')
        if (!verifyPassword(currentPassword, user.password_hash)) {
            return badRequest(res, 'A jelenlegi jelszó nem megfelelő.')
        }
        if (newPassword.length < PASSWORD_MIN_LENGTH) return badRequest(res, PASSWORD_ERROR)

        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), user.id])
        db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', [user.id, readToken(req)])
        saveDatabase(db)
        res.status(204).end()
    })

    app.post('/api/auth/logout', (req, res) => {
        const token = readToken(req)
        if (token) {
            db.run('DELETE FROM sessions WHERE token = ?', [token])
            saveDatabase(db)
        }
        res.status(204).end()
    })

    // Errors from body parsers (for example, oversized uploads) should also reach the client as JSON.
    app.use((error, req, res, next) => {
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ error: 'A kép legfeljebb 5 MB lehet.' })
        }
        console.error(error)
        res.status(error.status || 500).json({ error: 'Szerverhiba történt.' })
    })

    app.listen(port, () => {
        console.log(`TechPiac API fut: http://localhost:${port}`)
        console.log(`SQLite adatbázis: ${databasePath}`)
    })
}

start().catch((error) => {
    console.error(error)
    process.exit(1)
})
