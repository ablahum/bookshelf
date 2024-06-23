const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const booksFilePath = path.join(__dirname, 'books.json')
const PORT = 9000

const readBooksData = () => {
  const data = fs.readFileSync(booksFilePath)

  return JSON.parse(data)
}

const writeBooksData = (data) => fs.writeFileSync(booksFilePath, JSON.stringify(data, null, 2))

const sendRes = (res, statusCode, response) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}

const requestListener = async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const method = req.method
  const books = readBooksData()

  if (method === 'GET' && parsedUrl.pathname === '/books') {
    const booksSummary = books.map((book) => ({
      id: book.id,
      name: book.name,
      publisher: book.publisher,
    }))

    sendRes(res, 200, {
      status: 'success',
      data: { books: booksSummary },
    })
  }

  if (method === 'GET' && parsedUrl.pathname.startsWith('/books/')) {
    const id = parsedUrl.pathname.split('/')[2]
    const book = books.find((b) => b.id === id)

    if (book) {
      sendRes(res, 200, {
        status: 'success',
        data: { book },
      })
    } else {
      sendRes(res, 404, {
        status: 'fail',
        message: 'Buku tidak ditemukan',
      })
    }
  }

  if (method === 'POST' && parsedUrl.pathname === '/books') {
    const { nanoid } = await import('nanoid')
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      const newBook = JSON.parse(body)

      if (!newBook.name) {
        sendRes(res, 400, {
          status: 'fail',
          message: 'Gagal menambahkan buku. Mohon isi nama buku',
        })
      } else if (newBook.readPage > newBook.pageCount) {
        sendRes(res, 400, {
          status: 'fail',
          message: 'Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount',
        })
      } else {
        newBook.id = nanoid()
        newBook.finished = newBook.pageCount === newBook.readPage
        newBook.insertedAt = new Date().toISOString()
        newBook.updatedAt = newBook.insertedAt

        books.push(newBook)
        writeBooksData(books)

        sendRes(res, 200, {
          status: 'success',
          message: 'Buku berhasil ditambahkan',
          data: { bookId: newBook.id },
        })
      }
    })
  }

  if (method === 'PUT' && parsedUrl.pathname.startsWith('/books/')) {
    const id = parsedUrl.pathname.split('/')[2]
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      const updatedBook = JSON.parse(body)
      const bookIndex = books.findIndex((book) => book.id === id)

      if (bookIndex !== -1) {
        if (!updatedBook.name) {
          sendRes(res, 400, {
            status: 'fail',
            message: 'Gagal menambahkan buku. Mohon isi nama buku',
          })
        } else if (updatedBook.readPage > updatedBook.pageCount) {
          sendRes(res, 400, {
            status: 'fail',
            message: 'Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount',
          })
        } else {
          books[bookIndex] = { ...books[bookIndex], ...updatedBook, updatedAt: new Date().toISOString() }
          books[bookIndex].finished = books[bookIndex].pageCount === books[bookIndex].readPage

          writeBooksData(books)
          sendRes(res, 200, {
            tatus: 'success',
            data: { book: books[bookIndex] },
          })
        }
      } else {
        sendRes(res, 404, {
          status: 'fail',
          message: 'Gagal memperbarui buku. Id tidak ditemukan',
        })
      }
    })
  }

  if (method === 'DELETE' && parsedUrl.pathname.startsWith('/books/')) {
    const id = parsedUrl.pathname.split('/')[2]
    const bookIndex = books.findIndex((book) => book.id === id)

    if (bookIndex !== -1) {
      books.splice(bookIndex, 1)
      writeBooksData(books)

      sendRes(res, 200, {
        status: 'success',
        message: 'Buku berhasil dihapus',
      })
    } else {
      sendRes(res, 404, {
        status: 'fail',
        message: 'Buku gagal dihapus. Id tidak ditemukan',
      })
    }
  }
}

const server = http.createServer(requestListener)

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
