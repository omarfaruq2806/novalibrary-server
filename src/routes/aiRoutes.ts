import { Router, Request, Response } from 'express';
import { getDb } from '../config/db';
import { langchainGemini } from '../config/ai';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Helper database search function
async function searchLibraryCatalog(query: string, genre?: string, readingLevel?: string) {
  try {
    const db = getDb();
    const filterQuery: any = { status: 'accepted' };

    if (genre && genre !== 'All' && genre.trim() !== '') {
      filterQuery.genre = new RegExp(genre.trim(), 'i');
    }
    if (readingLevel && readingLevel !== 'All' && readingLevel.trim() !== '') {
      filterQuery.readingLevel = new RegExp(readingLevel.trim(), 'i');
    }
    if (query && query.trim() !== '') {
      const searchRegex = new RegExp(query.trim(), 'i');
      filterQuery.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    const books = await db.collection('books')
      .find(filterQuery, { projection: { pdfText: 0 } })
      .limit(6)
      .toArray();

    return books;
  } catch (err) {
    console.error('Error searching catalog inside tool:', err);
    return [];
  }
}

// 1. LIBRARIAN CHAT: POST /api/ai/librarian-chat
router.post('/librarian-chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    if (!langchainGemini) {
      res.status(500).json({ message: 'AI model is not initialized. Please configure GEMINI_API_KEY.' });
      return;
    }

    // Step 1: Pre-router logic to decide if we should search the database catalog
    const intentPrompt = `You are a router. Decide if the user's message is asking for book recommendations, searching the library catalog, or asking about books available in the library.
Message: "${message}"

Respond ONLY in this JSON format (no markdown blocks, no wrapper text):
{
  "shouldSearch": true | false,
  "searchQuery": "search terms here or empty",
  "genre": "Genre name or empty",
  "readingLevel": "Beginner | Intermediate | Advanced | empty"
}`;

    let shouldSearch = false;
    let catalogBooks: any[] = [];
    
    try {
      const intentRes = await langchainGemini.invoke(intentPrompt);
      let contentText = String(intentRes.content).trim();
      if (contentText.startsWith('```')) {
        contentText = contentText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }
      const parsedIntent = JSON.parse(contentText);
      if (parsedIntent.shouldSearch) {
        shouldSearch = true;
        catalogBooks = await searchLibraryCatalog(
          parsedIntent.searchQuery || '',
          parsedIntent.genre || '',
          parsedIntent.readingLevel || ''
        );
      }
    } catch (e) {
      console.warn('Failed to parse intent, proceeding without catalog pre-search:', e);
    }

    // Format catalog book details to feed as context if searched
    let catalogContext = '';
    if (shouldSearch) {
      if (catalogBooks.length > 0) {
        catalogContext = 'The following books are available in our library database matching the request:\n';
        catalogBooks.forEach((b: any) => {
          catalogContext += `- **${b.title}** by ${b.author} [Category: ${b.genre}, Reading Level: ${b.readingLevel}]. Description: ${b.description || 'N/A'}. Link: http://localhost:3000/books/${b._id}\n`;
        });
      } else {
        catalogContext = 'No matching books were found in the library catalog database for this query.\n';
      }
    }

    // Format chat history
    let historyPrompt = '';
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        const sender = h.sender === 'user' ? 'User' : 'Librarian';
        historyPrompt += `${sender}: ${h.text}\n`;
      });
    }

    const systemPrompt = `You are a premium, friendly, and expert AI Librarian for the Nova Library.
Your job is to:
1. Answer general questions.
2. Recommend books (based on the catalog context below).
3. Create structured learning roadmaps for users (e.g. step-by-step paths on learning Finance, Tech, Science) and suggest matching books from the catalog context.

Instructions:
- If recommending a book from the catalog context, ALWAYS provide its title, author, and a clickable Markdown link using the link specified in the catalog context (e.g., [View Book Detail](http://localhost:3000/books/ID)).
- If no catalog context is provided or no books match, suggest relevant topics and politely mention that users can upload matching PDFs to help grow the catalog.
- Keep your tone welcoming, professional, and encouraging.

CATALOG CONTEXT:
${catalogContext || 'No catalog pre-search was performed for this conversation.'}

CONVERSATION HISTORY:
${historyPrompt}

Current Question:
User: ${message}

Librarian response:`;

    const librarianResponse = await langchainGemini.invoke(systemPrompt);

    res.status(200).json({
      message: 'AI response generated successfully.',
      response: librarianResponse.content,
    });
  } catch (err: any) {
    console.error('Error in AI librarian chat route:', err);
    res.status(500).json({ message: err.message || 'Internal server error during librarian chat.' });
  }
});

export default router;
