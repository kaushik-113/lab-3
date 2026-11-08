const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'books.db');

app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

let db;

async function initializeDatabase() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      price REAL NOT NULL,
      pages INTEGER NOT NULL
    )
  `);

  const samples = [
    ['The Psychology of Money', 'Morgan Housel', 399, 256],
    ['Atomic Habits', 'James Clear', 450, 320],
    ['Rich Dad Poor Dad', 'Robert Kiyosaki', 350, 336],
    ['The Alchemist', 'Paulo Coelho', 299, 208],
    ['Deep Work', 'Cal Newport', 499, 304]
  ];

  for (const book of samples) {
    await db.run(
      `INSERT INTO books (title, author, price, pages)
       SELECT ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = ?)`,
      [...book, book[0]]
    );
  }
}

app.get('/', (req, res) => {
  res.json({
    message: 'Books REST API is running',
    endpoints: {
      list: 'GET /books',
      create: 'POST /books',
      update: 'PUT /books/:id',
      delete: 'DELETE /books/:id'
    }
  });
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/books', async (req, res) => {
  try {
    const { search_q, order_by, order, limit, offset, min_price, max_price } = req.query;
    const conditions = [];
    const params = [];

    if (search_q) {
      conditions.push('(title LIKE ? OR author LIKE ?)');
      const term = `%${search_q}%`;
      params.push(term, term);
    }

    if (min_price !== undefined) {
      const value = Number(min_price);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ error: 'min_price must be a valid non-negative number' });
      }
      conditions.push('price >= ?');
      params.push(value);
    }

    if (max_price !== undefined) {
      const value = Number(max_price);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ error: 'max_price must be a valid non-negative number' });
      }
      conditions.push('price <= ?');
      params.push(value);
    }

    if (min_price !== undefined && max_price !== undefined && Number(min_price) > Number(max_price)) {
      return res.status(400).json({ error: 'min_price cannot be greater than max_price' });
    }

    const columns = ['id', 'title', 'author', 'price', 'pages'];
    const sortColumn = columns.includes(order_by) ? order_by : 'id';
    const sortOrder = String(order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const pageLimit = limit === undefined ? 10 : Number(limit);
    const pageOffset = offset === undefined ? 0 : Number(offset);

    if (!Number.isInteger(pageLimit) || pageLimit <= 0 ||
        !Number.isInteger(pageOffset) || pageOffset < 0) {
      return res.status(400).json({
        error: 'limit must be a positive integer and offset must be a non-negative integer'
      });
    }

    let sql = 'SELECT * FROM books';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(pageLimit, pageOffset);

    const books = await db.all(sql, params);
    res.status(200).json(books);
  } catch (error) {
    console.error('GET /books error:', error);
    res.status(500).json({ error: 'Failed to retrieve books' });
  }
});

app.post('/books', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body || {};
    if (typeof title !== 'string' || !title.trim() ||
        typeof author !== 'string' || !author.trim() ||
        typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
        typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0) {
      return res.status(400).json({
        error: 'Valid title, author, non-negative price and positive integer pages are required'
      });
    }

    const result = await db.run(
      'INSERT INTO books (title, author, price, pages) VALUES (?, ?, ?, ?)',
      [title.trim(), author.trim(), price, pages]
    );
    const book = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    console.error('POST /books error:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.put('/books/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const existingBook = await db.get('SELECT * FROM books WHERE id = ?', [id]);
    if (!existingBook) return res.status(404).json({ error: 'Book not found' });

    const { title, author, price, pages } = req.body || {};
    if (typeof title !== 'string' || !title.trim() ||
        typeof author !== 'string' || !author.trim() ||
        typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
        typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0) {
      return res.status(400).json({
        error: 'Valid title, author, non-negative price and positive integer pages are required'
      });
    }

    await db.run(
      'UPDATE books SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?',
      [title.trim(), author.trim(), price, pages, id]
    );
    const book = await db.get('SELECT * FROM books WHERE id = ?', [id]);
    res.status(200).json({ message: 'Book updated successfully', book });
  } catch (error) {
    console.error('PUT /books/:id error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const result = await db.run('DELETE FROM books WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('DELETE /books/:id error:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Books API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
