import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { supabase } from '../config/supabase';
import { upload } from '../config/multer';
import { googleGenAI, langchainGemini } from '../config/ai';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { bookService } from '../services/BookService';
import pdfParse from 'pdf-parse';

const router = Router();

// 1. UPLOAD BOOK: POST /api/books
router.post(
  '/',
  authMiddleware,
  requireRole(['user', 'admin']),
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const pdfFile = files?.pdf?.[0];
      const coverFile = files?.cover?.[0];

      if (!pdfFile) {
        res.status(400).json({ message: 'Book PDF file is required.' });
        return;
      }

      const { title, author, genre, description, language, readingLevel, tags, aiSummary: clientAiSummary, keyPoints } = req.body;
      if (!title || !author || !genre) {
        res.status(400).json({ message: 'Title, author, and genre fields are required.' });
        return;
      }

      let tagsArray: string[] = [];
      if (tags) {
        if (Array.isArray(tags)) {
          tagsArray = tags.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (typeof tags === 'string') {
          tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      }

      let keyPointsArray: string[] = [];
      if (keyPoints) {
        if (Array.isArray(keyPoints)) {
          keyPointsArray = keyPoints.map((k: any) => String(k).trim()).filter(Boolean);
        } else if (typeof keyPoints === 'string') {
          try {
            const parsed = JSON.parse(keyPoints);
            if (Array.isArray(parsed)) {
              keyPointsArray = parsed.map((k: any) => String(k).trim()).filter(Boolean);
            } else {
              keyPointsArray = [keyPoints.trim()];
            }
          } catch {
            keyPointsArray = keyPoints.split(',').map((k) => k.trim()).filter(Boolean);
          }
        }
      }

      // Step A: Parse PDF Content in-memory
      let parsedText = '';
      try {
        const pdfData = await pdfParse(pdfFile.buffer);
        parsedText = pdfData.text || '';
      } catch (parseErr) {
        console.error('Error parsing PDF content:', parseErr);
        // We will fallback to empty text if parsing fails to avoid crashing
      }

      // Step B: Upload PDF to Supabase Storage
      const bucketName = process.env.SUPABASE_BUCKET_NAME || 'Nova-Books';
      if (!supabase) {
        res.status(500).json({ message: 'Supabase storage is not configured.' });
        return;
      }

      const pdfPath = `books/${Date.now()}_${pdfFile.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: pdfUploadErr } = await supabase.storage
        .from(bucketName)
        .upload(pdfPath, pdfFile.buffer, {
          contentType: pdfFile.mimetype,
          upsert: true,
        });

      if (pdfUploadErr) {
        console.error('Supabase PDF Upload Error:', pdfUploadErr);
        res.status(500).json({ message: 'Failed to upload PDF file to storage.' });
        return;
      }

      const { data: pdfUrlData } = supabase.storage.from(bucketName).getPublicUrl(pdfPath);
      const fileUrl = pdfUrlData.publicUrl;

      // Step C: Upload Cover Image to Supabase (Optional)
      let coverUrl = '';
      let coverPath = '';
      if (coverFile) {
        coverPath = `covers/${Date.now()}_${coverFile.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: coverUploadErr } = await supabase.storage
          .from(bucketName)
          .upload(coverPath, coverFile.buffer, {
            contentType: coverFile.mimetype,
            upsert: true,
          });

        if (!coverUploadErr) {
          const { data: coverUrlData } = supabase.storage.from(bucketName).getPublicUrl(coverPath);
          coverUrl = coverUrlData.publicUrl;
        } else {
          console.error('Supabase Cover Upload Error:', coverUploadErr);
        }
      }

      // Step D: Generate Gemini AI Summary (Optional/Placeholder)
      let aiSummary = 'No summary generated (Configure GEMINI_API_KEY to enable AI Summary).';
      if (googleGenAI && parsedText.trim().length > 10) {
        try {
          const model = googleGenAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
          // Limit to first 4000 chars for prompts to stay safe
          const sampleText = parsedText.substring(0, 4000);
          const aiResponse = await model.generateContent(
            `Provide a premium, engaging 3-sentence summary of this book text: ${sampleText}`
          );
          const generatedText = aiResponse.response.text();
          if (generatedText) {
            aiSummary = generatedText.trim();
          }
        } catch (aiErr) {
          console.error('Gemini AI summary generation failed:', aiErr);
          aiSummary = 'AI summary generation failed due to an API processing error.';
        }
      }

      // Step E: Save metadata to MongoDB via BookService
      const savedBook = await bookService.createBook({
        title,
        author,
        genre,
        description: description || '',
        fileUrl,
        filePath: pdfPath,
        coverUrl: coverUrl || undefined,
        coverPath: coverPath || undefined,
        language: language || 'English',
        readingLevel: readingLevel || 'Intermediate',
        tags: tagsArray,
        keyPoints: keyPointsArray,
        uploadedBy: req.user?.id || 'unknown',
        uploadedByName: req.user?.name || 'Unknown User',
        pdfText: parsedText,
        aiSummary: clientAiSummary || aiSummary,
        status: 'pending', // Explicitly start as pending
      });

      res.status(201).json({
        message: 'Book uploaded and processed successfully. Waiting for admin approval.',
        book: savedBook,
      });
    } catch (err) {
      console.error('Error in upload route:', err);
      res.status(500).json({ message: 'Internal server error during book upload.' });
    }
  }
);

// 2. GET ALL BOOKS WITH PAGINATION & FILTERING (PUBLIC): GET /api/books
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const language = req.query.language as string;
    const readingLevel = req.query.readingLevel as string;
    const sort = req.query.sort as string;

    const result = await bookService.getPaginatedBooks({
      page,
      limit,
      search,
      genre,
      language,
      readingLevel,
      sort,
      adminView: false,
    });

    res.status(200).json({
      books: result.books,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Internal server error while fetching books.' });
  }
});

// 2.5 USER MANAGED BOOKS: GET /api/books/user/manage
router.get('/user/manage', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const books = await bookService.getBooksByUploader(req.user!.id);
    res.status(200).json(books);
  } catch (err) {
    console.error('Error fetching user managed books:', err);
    res.status(500).json({ message: 'Internal server error fetching user managed books.' });
  }
});

// 2.6 ADMIN PENDING BOOKS: GET /api/books/admin/pending
router.get('/admin/pending', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const books = await db.collection('books')
      .find({ status: 'pending' }, { projection: { pdfText: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(books);
  } catch (err) {
    console.error('Error fetching pending admin books:', err);
    res.status(500).json({ message: 'Internal server error fetching pending books.' });
  }
});

// 2.65 ADMIN DASHBOARD STATS: GET /api/books/admin/stats
router.get('/admin/stats', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const totalBooks = await db.collection('books').countDocuments({});
    const pendingBooks = await db.collection('books').countDocuments({ status: 'pending' });
    const acceptedBooks = await db.collection('books').countDocuments({ status: 'accepted' });
    const rejectedBooks = await db.collection('books').countDocuments({ status: 'rejected' });
    const totalUsers = await db.collection('user').countDocuments({});

    // Simple aggregation of books by genre for charts
    const genres = await db.collection('books').aggregate([
      { $group: { _id: '$genre', count: { $sum: 1 } } }
    ]).toArray();

    res.status(200).json({
      totalBooks,
      pendingBooks,
      acceptedBooks,
      rejectedBooks,
      totalUsers,
      genres: genres.map(g => ({ name: g._id || 'Unknown', count: g.count }))
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Internal server error fetching stats.' });
  }
});

// 2.66 ADMIN BOOKS LIST BY STATUS: GET /api/books/admin/list
router.get('/admin/list', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    if (status && !['accepted', 'pending', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status parameter.' });
      return;
    }

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const db = getDb();
    const books = await db.collection('books')
      .find(query, { projection: { pdfText: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(books);
  } catch (err) {
    console.error('Error fetching admin books list:', err);
    res.status(500).json({ message: 'Internal server error fetching books.' });
  }
});

// 2.67 ADMIN USERS LIST: GET /api/books/admin/users
router.get('/admin/users', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const users = await db.collection('user')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching admin users list:', err);
    res.status(500).json({ message: 'Internal server error fetching users.' });
  }
});

// 2.7 ADMIN UPDATE STATUS: PATCH /api/books/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid book ID format.' });
      return;
    }

    if (!['accepted', 'pending', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be accepted, pending, or rejected.' });
      return;
    }

    const db = getDb();
    const result = await db.collection('books').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Book not found.' });
      return;
    }

    res.status(200).json({ message: `Book status updated to '${status}' successfully.` });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ message: 'Internal server error updating book status.' });
  }
});

// 3. GET SINGLE BOOK DETAILS & RELATED BOOKS: GET /api/books/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid book ID format.' });
      return;
    }

    const db = getDb();
    const bookId = new ObjectId(id);
    const book = await db.collection('books').findOne({ _id: bookId });

    if (!book) {
      res.status(404).json({ message: 'Book not found.' });
      return;
    }

    // Fetch related books: same genre (category), excluding this book, only accepted
    const relatedBooks = await db
      .collection('books')
      .find(
        {
          _id: { $ne: bookId },
          genre: book.genre,
          status: 'accepted',
        },
        { projection: { pdfText: 0 }, limit: 4 }
      )
      .toArray();

    res.status(200).json({
      ...book,
      relatedBooks,
    });
  } catch (err) {
    console.error('Error fetching single book:', err);
    res.status(500).json({ message: 'Internal server error while fetching book details.' });
  }
});

// 3.5 BOOK SPECIFIC AI CHAT: POST /api/books/:id/chat
router.post('/:id/chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, history } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid book ID format.' });
      return;
    }

    if (!message) {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    const db = getDb();
    const book = await db.collection('books').findOne({ _id: new ObjectId(id) });

    if (!book) {
      res.status(404).json({ message: 'Book not found.' });
      return;
    }

    if (!langchainGemini) {
      res.status(500).json({ message: 'AI model is not initialized. Please configure GEMINI_API_KEY.' });
      return;
    }

    // Extract book text for context (limit to first 60,000 characters to keep context clean and avoid latency)
    const bookText = book.pdfText ? String(book.pdfText).substring(0, 60000) : '';
    const bookContext = `
Book Title: ${book.title}
Author: ${book.author}
Genre: ${book.genre}
Description: ${book.description || 'N/A'}
AI Summary: ${book.aiSummary || 'N/A'}
Key Points: ${book.keyPoints ? book.keyPoints.join(', ') : 'N/A'}

Full Book Text Content Snippet:
${bookText || 'No full text extracted for this book.'}
`;

    // Construct history formatting for LangChain prompt
    let historyPrompt = '';
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        const sender = h.sender === 'user' ? 'User' : 'Assistant';
        historyPrompt += `${sender}: ${h.text}\n`;
      });
    }

    const systemPrompt = `You are a helpful and knowledgeable AI Librarian. Your goal is to help readers learn from the book described below.
You must answer questions strictly in the context of the book and the text content provided.

BOOK CONTEXT:
${bookContext}

CONVERSATION HISTORY:
${historyPrompt}

Current Question:
User: ${message}

AI Librarian response (please answer directly, thoroughly, and professionally):`;

    const aiResponse = await langchainGemini.invoke(systemPrompt);
    
    res.status(200).json({
      message: 'AI response generated successfully.',
      response: aiResponse.content,
    });
  } catch (err: any) {
    console.error('Error in book-specific chat route:', err);
    res.status(500).json({ message: err.message || 'Internal server error during chat.' });
  }
});

// 4. DELETE BOOK: DELETE /api/books/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid book ID format.' });
      return;
    }

    const db = getDb();
    const book = await db.collection('books').findOne({ _id: new ObjectId(id) });

    if (!book) {
      res.status(404).json({ message: 'Book not found.' });
      return;
    }

    // Auth Check: Only owner/uploader or admin can delete
    const isOwner = book.uploadedBy === req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized. Only the uploader or an admin can delete this book.' });
      return;
    }

    // Step A: Clean up files in Supabase Storage
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'Nova-Books';
    if (supabase) {
      const filesToDelete: string[] = [];
      if (book.filePath) filesToDelete.push(book.filePath);
      if (book.coverPath) filesToDelete.push(book.coverPath);

      if (filesToDelete.length > 0) {
        const { error: deleteErr } = await supabase.storage.from(bucketName).remove(filesToDelete);
        if (deleteErr) {
          console.error('Error deleting files from Supabase:', deleteErr);
        }
      }
    }

    // Step B: Delete from MongoDB
    await db.collection('books').deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({ message: 'Book and its resources deleted successfully.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ message: 'Internal server error while deleting book.' });
  }
});

// 4.5 ANALYZE PDF: POST /api/books/analyze-pdf
router.post(
  '/analyze-pdf',
  authMiddleware,
  upload.single('pdf'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pdfFile = req.file;
      if (!pdfFile) {
        res.status(400).json({ message: 'Book PDF file is required for analysis.' });
        return;
      }

      // Parse PDF Content in-memory
      let parsedText = '';
      try {
        const pdfData = await pdfParse(pdfFile.buffer);
        parsedText = pdfData.text || '';
      } catch (parseErr) {
        console.error('Error parsing PDF content:', parseErr);
        res.status(400).json({ message: 'Failed to read PDF document text.' });
        return;
      }

      if (parsedText.trim().length < 20) {
        res.status(400).json({ message: 'PDF document text is too short or cannot be extracted.' });
        return;
      }

      if (!langchainGemini) {
        res.status(500).json({ message: 'AI model is not initialized. Please configure GEMINI_API_KEY.' });
        return;
      }

      // Extract a representative chunk of text (first 6000 chars is usually enough for metadata, title, author, genre and summary)
      const sampleText = parsedText.substring(0, 6000);

      const prompt = `You are an expert digital librarian. Analyze the following book text extracted from a PDF.
Extract and identify the metadata and key concepts.

Instructions:
1. Identify Book Title (if not explicitly found, infer a suitable title based on the text context).
2. Identify Author Name (if not explicitly found, return "Unknown Author").
3. Determine primary Genre/Category. It MUST be exactly one of: Finance, Fiction, Science, Biography, Technology, History. If none match perfectly, choose the closest.
4. Suggest Reading Level. It MUST be exactly one of: Beginner, Intermediate, Advanced.
5. Create 3-5 tags (keywords).
6. Create an engaging 2-3 sentence Description/Overview of the book.
7. Create a premium, engaging 3-sentence Summary of the book text.
8. Create a list of 3-5 main Key Points/takeaways.

You must return ONLY a valid JSON object matching the schema below.
DO NOT wrap the response in markdown code blocks (like \`\`\`json). Just return raw JSON.

Schema:
{
  "title": "string",
  "author": "string",
  "genre": "Finance | Fiction | Science | Biography | Technology | History",
  "readingLevel": "Beginner | Intermediate | Advanced",
  "tags": ["string"],
  "description": "string",
  "summary": "string",
  "keyPoints": ["string"]
}

Book Text:
${sampleText}`;

      const aiResponse = await langchainGemini.invoke(prompt);
      let contentText = String(aiResponse.content).trim();

      // Clean up markdown wrapper if any
      if (contentText.startsWith('```')) {
        contentText = contentText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }

      try {
        const result = JSON.parse(contentText);
        res.status(200).json(result);
      } catch (jsonErr) {
        console.error('Failed to parse JSON content from Gemini response:', contentText, jsonErr);
        res.status(500).json({
          message: 'AI response parsing failed.',
          rawResponse: contentText,
        });
      }
    } catch (err: any) {
      console.error('Error in analyze-pdf route:', err);
      res.status(500).json({ message: err.message || 'Internal server error during PDF analysis.' });
    }
  }
);

// 5. TEST CHAT WITH LANGCHAIN + GEMINI: POST /api/books/test-chat
router.post('/test-chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    if (!langchainGemini) {
      res.status(500).json({ message: 'LangChain Gemini is not initialized. Please check GEMINI_API_KEY.' });
      return;
    }

    const response = await langchainGemini.invoke(message);
    res.status(200).json({
      message: 'AI response generated successfully.',
      response: response.content,
    });
  } catch (err: any) {
    console.error('Error in test-chat route:', err);
    res.status(500).json({ message: err.message || 'Internal server error during chat.' });
  }
});

export default router;
