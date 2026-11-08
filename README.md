# Lab 3 – Books REST API

A RESTful API built using **Node.js, Express.js, and SQLite** to manage book records. The API supports CRUD operations, searching, sorting, pagination, and price filtering.

## Live Project

- **Live API:** https://lab-3-books-api.onrender.com
- **GitHub Repository:** https://github.com/kaushik-113/lab-3

## Technologies Used

- Node.js
- Express.js
- SQLite
- JavaScript
- REST API

## Features

- Get all books
- Search books by title or author
- Sort books in ascending or descending order
- Pagination using limit and offset
- Filter books by minimum and maximum price
- Add a new book
- Get a book by ID
- Update an existing book
- Delete a book
- Input validation and error handling

## Installation and Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/kaushik-113/lab-3.git
   ```

2. Navigate to the project folder:

   ```bash
   cd lab-3
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open:

   ```text
   http://localhost:3000
   ```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/books` | Get all books |
| GET | `/books/:id` | Get book by ID |
| POST | `/books` | Add a new book |
| PUT | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |

## Search, Sorting and Filtering

The `GET /books` endpoint supports the following query parameters:

| Parameter | Description |
|---|---|
| `search_q` | Search by title or author |
| `order_by` | Sort by id, title, author, price, or pages |
| `order` | ASC or DESC |
| `limit` | Maximum number of records |
| `offset` | Number of records to skip |
| `min_price` | Minimum book price |
| `max_price` | Maximum book price |

### Examples

```text
GET /books?search_q=Atomic
GET /books?order_by=price&order=ASC
GET /books?order_by=price&order=DESC
GET /books?limit=2&offset=0
GET /books?min_price=200
GET /books?max_price=400
GET /books?min_price=200&max_price=400
```

## Adding a Book

**POST** `/books`

Example JSON body:

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": 550,
  "pages": 464
}
```

## Updating a Book

**PUT** `/books/1`

Example JSON body:

```json
{
  "title": "Updated Book",
  "author": "Updated Author",
  "price": 600,
  "pages": 350
}
```

## Deleting a Book

**DELETE** `/books/1`

## Database

The project uses SQLite with a `books` table containing:

- `id` – Primary key
- `title` – Book title
- `author` – Author name
- `price` – Book price
- `pages` – Number of pages

Sample book records are inserted automatically when the database is initialized.

## Screenshots

API testing screenshots are available in the [`screenshots`](./screenshots) folder.

## Author

**Kaushik Bharadwaj**

Backend Development Fundamentals – Lab 3