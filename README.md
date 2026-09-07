# Comic RAG — Frontend

A premium React + Vite + TypeScript frontend for the Comic RAG backend.
Upload comics and explore them with an AI that understands story, characters, and pages.

---

## Installation

```bash
cd frontend
npm install
```

---

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the backend URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Development

Start both backend and frontend in separate terminals:

**Terminal 1 — Backend:**
```bash
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Production Build

```bash
npm run build
```

Outputs to `frontend/dist/`.

---

## Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | `HomePage` | Landing page with hero and feature overview |
| `/library` | `LibraryPage` | Comic library, upload, search |
| `/comics/:comicId` | `ReaderPage` | 3-panel comic reader with AI chat |

---

## Architecture

```
src/
├── components/
│   ├── layout/     AppHeader, Sidebar, MobileDrawer
│   ├── comic/      ComicCard, ComicGrid, UploadDropzone
│   ├── reader/     ComicReader, ReaderToolbar, PageNavigator
│   ├── chat/       ChatPanel, ChatMessageList, ChatMessage, ChatInput, TypingIndicator
│   ├── sources/    SourceList, SourceCard
│   └── common/     Button, Modal, Spinner, EmptyState, ErrorState, Skeleton, Toast
├── pages/          HomePage, LibraryPage, ReaderPage
├── layouts/        AppLayout
├── services/       api.ts, comicApi.ts, conversationApi.ts
├── stores/         comicStore.ts, chatStore.ts, uiStore.ts
├── types/          comic.ts, conversation.ts, api.ts
├── hooks/          useComic.ts, useConversation.ts
└── utils/          errors.ts, formatting.ts, storage.ts
```

---

## API Integration

All backend calls go through `VITE_API_BASE_URL`.

| Endpoint | Usage |
|---|---|
| `POST /comics/upload` | Upload comic file |
| `GET /comics/{comic_id}` | Load comic metadata and pages |
| `POST /conversations` | Create conversation |
| `GET /conversations/{id}` | Restore conversation history |
| `POST /conversations/{id}/ask` | Send question, receive answer + sources |
| `DELETE /conversations/{id}` | Delete conversation |

---

## State Management (Zustand)

| Store | Responsibility |
|---|---|
| `comicStore` | Current comic, page selection, library entries |
| `chatStore` | Active conversation, messages, loading/error |
| `uiStore` | Sidebar, mobile drawers, toast notifications |

---

## LocalStorage

| Key | Value |
|---|---|
| `comic-rag-library` | JSON array of uploaded `LocalComicEntry` objects |
| `comic-rag-conversation:{comic_id}` | `conversation_id` string for each comic |

---

## Known Backend Limitations

1. **No `GET /comics` endpoint**: The library index is maintained locally in `localStorage`.
   When a comic is uploaded, its metadata is saved locally. Opening a direct URL
   (`/comics/:comicId`) still loads comic data via `GET /comics/{comic_id}`.

2. **No page image endpoint**: The backend does not expose raw comic page images.
   The reader displays the analyzed text content (OCR transcription, descriptions,
   characters, dialogue) returned by `GET /comics/{comic_id}`. The architecture is
   designed to support adding image rendering once a page-image endpoint is available.

---

## Technology Stack

- React 18
- Vite 6
- TypeScript 5
- Tailwind CSS 3
- React Router 6
- Zustand
- Axios
- Lucide React
