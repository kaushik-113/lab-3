
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();

app.use(express.json());

const PORT = 3000;
let db;

// Log every incoming request
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// 1. Create Books table
const createBooksTable = async () => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            price REAL NOT NULL,
            pages INTEGER NOT NULL
        )
    `);

    console.log('Books table created successfully');
};

// 2. Insert sample books without duplicates
const insertBooks = async () => {
    const books = [
        ['The Psychology of Money', 'Morgan Housel', 399, 256],
        ['Atomic Habits', 'James Clear', 450, 320],
        ['Rich Dad Poor Dad', 'Robert Kiyosaki', 350, 336],
        ['The Alchemist', 'Paulo Coelho', 299, 208],
        ['Deep Work', 'Cal Newport', 499, 304]
    ];

    for (const book of books) {
        await db.run(
            `INSERT INTO books (title, author, price, pages)
             SELECT ?, ?, ?, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM books WHERE title = ?
             )`,
            [...book, book[0]]
        );
    }

    console.log('Sample books inserted successfully');
};

// 3. GET all books with search, sorting, pagination and price filters
app.get('/books', async (req, res) => {
    try {
        const {
            search_q,
            order_by,
            order,
            limit,
            offset,
            min_price,
            max_price
        } = req.query;

        let query = 'SELECT * FROM books';
        const conditions = [];
        const params = [];

        // Search books
        if (search_q) {
            conditions.push('(title LIKE ? OR author LIKE ?)');
            const searchValue = `%${search_q}%`;
            params.push(searchValue, searchValue);
        }

        // Minimum price validation
        if (min_price !== undefined) {
            const minPrice = Number(min_price);

            if (!Number.isFinite(minPrice) || minPrice < 0) {
                return res.status(400).json({
                    error: 'min_price must be a valid non-negative number'
                });
            }

            conditions.push('price >= ?');
            params.push(minPrice);
        }

        // Maximum price validation
        if (max_price !== undefined) {
            const maxPrice = Number(max_price);

            if (!Number.isFinite(maxPrice) || maxPrice < 0) {
                return res.status(400).json({
                    error: 'max_price must be a valid non-negative number'
                });
            }

            conditions.push('price <= ?');
            params.push(maxPrice);
        }

        // Validate price range
        if (
            min_price !== undefined &&
            max_price !== undefined &&
            Number(min_price) > Number(max_price)
        ) {
            return res.status(400).json({
                error: 'min_price cannot be greater than max_price'
            });
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        const allowedColumns = [
            'id',
            'title',
            'author',
            'price',
            'pages'
        ];

        const alllowedOrders = ['ASC', 'DESC'];

        const sortColumn = allowedColumns.includes(order_by)
            ? order_by
            : 'id';

        const requestedOrder = (order || 'ASC').toUpperCase();

        const sortOrder = allowedOrders.includes(requestedOrder)
            ? requestedOrder
            : 'ASC';

        query += ` ORDER BY ${sortColumn} ${sortOrder}`;

        // Pagination
        const pageLimit = limit === undefined ? 10 : Number(limit);
        const pageOffset = offset === undefined ? 0 : Number(offset);

        if (
            !Number.isInteger(pageLimit) ||
            pageLimit <= 0 ||
            !Number.isInteger(pageOffset) ||
            pageOffset < 0
        ) {
            return res.status(400).json({
                error: 'limit must be a positive integer and offset must be a non-negative integer'
            });
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(pageLimit, pageOffset);

        const books = await db.all(query, params);

        return res.status(200).json(books);

    } catch (error) {
        console.error('GET Error:', error.message);

        return res.status(500).json({
            error: 'Failed to retrieve books',
            details: error.message
        });
    }
});

// 4. POST a new book with validation
app.post('/books', async (req, res) => {
    try {
        console.log('POST /books request received');
        console.log('Request body:', req.body);

        const { title, author, price, pages } = req.body || {};

        if (
            typeof title !== 'string' ||
            title.trim() === '' ||
            typeof author !== 'string' ||
            author.trim() === '' ||
            price === undefined ||
            pages === undefined
        ) {
            return res.status(400).json({
                error: 'Title, author, price and pages are required'
            });
        }

        if (
            typeof price !== 'number' ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return res.status(400).json({
                error: 'Price must be a valid non-negative number'
            });
        }

        if (
            typeof pages !== 'number' ||
            !Number.isInteger(pages) ||
            pages <= 0
        ) {
            return res.status(400).json({
                error: 'Pages must be a positive integer'
            });
        }

        const result = await db.run(
            `INSERT INTO books (title, author, price, pages)
             VALUES (?, ?, ?, ?)`,
            [title.trim(), author.trim(), price, pages]
        );

        const newBook = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [result.lastID]
        );

        return res.status(201).json({
            message: 'Book added successfully',
            book: newBook
        });

    } catch (error) {
        console.error('POST Error:', error.message);

        return res.status(500).json({
            error: 'Failed to add book',
            details: error.message
        });
    }
});

// 5. PUT - Update an existing book
app.put('/books/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, author, price, pages } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'Invalid book ID'
            });
        }

        const existingBook = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (!ExistingBook) {
            return res.status(404).json({
                error: 'Book not found'
            });
        }

        if (
            typeof title !== 'string' ||
            title.trim() === '' ||
            typeof author !== 'string' ||
            author.trim() === '' ||
            typeof price !== 'number' ||
            !Number.isFinite(price) ||
            price < 0 ||
            typeof pages !== 'number' ||
            !Number.isInteger(pages) ||
            pages <= 0
        ) {
            return res.status(400).json({
                error: 'Valid title, author, price and pages are required'
            });
        }

        await db.run(
            `UPDATE books
             SET title = ?, author = ?, price = ?, pages = ?
             WHERE id = ?`,
            [title.trim(), author.trim(), price, pages, id]
        );

        const updatedBook = await db.get(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        return res.status(200).json({
            message: 'Book updated successfully',
            book: updatedBook
        });

    } catch (error) {
        console.error('PUT Error:', error.message);

        return res.status(500).json({
            error: 'Failed to update book',
            details: error.message
        });
    }
});

// 6. DELETE - Delete an existing book
app.delete('/books/Y	Ë\Þ[˜È
™\K™\ÊHOˆÃBˆžHÃBˆÛÛœÝYH[X™\Š™\Kœ\˜[\ËšY
NÃBƒBˆYˆ
S[X™\‹š\Ò[YÙ\ŠY
HYH
HÃBˆ™]\›ˆ™\ËœÝ]\Ê
KšœÛÛŠÃBˆ\œ›ÜŽˆ	Ò[˜[Y›ÛÚÈQ	ÃBˆJNÃBˆCBƒBˆÛÛœÝ^\Ý[™Ð›ÛÚÈH]ØZ]‹™Ù]
Bˆ	ÔÑSPÕ
ˆ”“ÓH›ÛÚÜÈÒT‘HYHÉËBˆÚYCBˆ
NÃBƒBˆYˆ
Q^\Ý[™Ð›ÛÚÊHÃBˆ™]\›ˆ™\ËœÝ]\Ê
KšœÛÛŠÃBˆ\œ›ÜŽˆ	Ð›ÛÚÈ›Ý›Ý[™	ÃBˆJNÃBˆCBƒBˆ]ØZ]‹œ[ŠBˆ	ÑSUH”“ÓH›ÛÚÜÈÒT‘HYHÉËBˆÚYCBˆ
NÃBƒBˆ™]\›ˆ™\ËœÝ]\ÊŒ
KšœÛÛŠÃBˆY\ÜØYÙNˆ	Ð›ÛÚÈ[]YÝXØÙ\ÜÙ[IËBˆ›ÛÚÎˆ^\Ý[™Ð›ÛÚÃBˆJNÃBƒBˆHØ]Ú
\œ›ÜŠHÃBˆÛÛœÛÛK™\œ›ÜŠ	ÑSUH\œ›ÜŽ‰Ë\œ›Ü‹›Y\ÜØYÙJNÃBƒBˆ™]\›ˆ™\ËœÝ]\ÊL
KšœÛÛŠÃBˆ\œ›ÜŽˆ	Ñ˜Z[YÈ[]H›ÛÚÉËBˆ]Z[Îˆ\œ›Ü‹›Y\ÜØYÙCBˆJNÃBˆCBŸJNÃBƒB‹ËÈËˆ[™H[šÛ›ÝÛˆ›Ý]\ÃB˜\\ÙJ
™\K™\ÊHOˆÃBˆ™]\›ˆ™\ËœÝ]\Ê
KšœÛÛŠÃBˆ\œ›ÜŽˆ	Ô›Ý]H›Ý›Ý[™	ÃBˆJNÃBŸJNÃBƒB‹ËÈˆ[š]X[^™H]X˜\ÙH[™Ý\Ù\™\ƒB˜ÛÛœÝ[š]X[^™Q[™Ù\™\ˆH\Þ[˜È

HOˆÃBˆžHÃBˆˆH]ØZ]Ü[ŠÃBˆš[[˜[YNˆ	Ë‹Ù]X˜\ÙK™‰ËBˆš]™\ŽˆÜ[]LË‘]X˜\ÙCBˆJNÃBƒBˆÛÛœÛÛK›ÙÊ	Ñ]X˜\ÙHÛÛ›™XÝYÝXØÙ\ÜÙ[IÊNÃBƒBˆ]ØZ]Ü™X]P›ÛÚÜÕX›J
NÃBˆ]ØZ][œÙ\›ÛÚÜÊ
NÃBƒBˆÛÛœÝÙ\™\ˆH\›\Ý[ŠÔ•	ÌLËŒŒŒIË

HOˆÃBˆÛÛœÛÛK›ÙÊÙ\™\ˆ[›š[™È]‹ËÛØØ[ÜÝ‰ÔÔ•X
NÃBˆJNÃBƒBˆÙ\™\‹›ÛŠ	Ù\œ›Ü‰Ë
\œ›ÜŠHOˆÃBˆÛÛœÛÛK™\œ›ÜŠ	ÔÙ\™\ˆ\œ›ÜŽ‰Ë\œ›Ü‹›Y\ÜØYÙJNÃBˆJNÃBƒBˆHØ]Ú
\œ›ÜŠHÃBˆÛÛœÛÛK™\œ›ÜŠ[š]X[^˜][Ûˆ\œ›ÜŽ‰Ë\œ›Ü‹›Y\ÜØYÙJNÃBˆ›ØÙ\ÜË™^]ÛÙHHNÃBˆCBŸNÃBƒBš[š]X[^™Q[™Ù\™\Š
NÃB