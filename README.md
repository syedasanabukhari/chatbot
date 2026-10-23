# Gemini AI Studio Chatbot

A modern, production-ready AI chatbot web application inspired by leading AI chat interfaces, powered by the official **Google Gemini API (`@google/genai`)** with real-time SSE streaming, persistent database storage, and full CRUD operations.

---

## ✨ Features

- **⚡ Real-Time Streaming Responses**: Server-Sent Events (SSE) provide immediate progressive token rendering with Gemini 3.8 Flash.
- **🛡️ Secure Architecture**: Gemini credentials and API calls remain strictly server-side. Zero client exposure.
- **💬 Full CRUD Operations**:
  - **Conversations**: Create new chats, load history, search across conversations, rename titles inline, and delete with confirmation dialogs.
  - **Messages**: Edit user prompts with automatic response regeneration, retry/regenerate AI responses, copy to clipboard, and delete individual messages.
- **🎨 Premium UI/UX Design**:
  - Light & dark mode with smooth theme transitions and persistent local storage.
  - Collapsible desktop sidebar and fluid mobile slide-over navigation drawer.
  - Centered welcome screen with curated starter prompt categories (Coding, Brainstorming, Writing, Analysis).
  - Floating auto-resizing input box with keyboard shortcuts (`Enter` to send, `Shift+Enter` for multiline, `⌘K` / `Ctrl+K` for new chat).
  - Stop generation button and typing indicators.
- **📝 Rich Markdown & Code Blocks**:
  - GitHub-flavored Markdown rendering with tables, lists, and blockquotes.
  - Code syntax highlighting with language badge and 1-click copy button.
- **🗄️ Database & Persistence**:
  - File-backed atomic database (`./data/chatbot_db.json`) supporting Conversation and Message models with cascading deletion and search indexing.
  - Export chat history as Markdown (.md) or JSON (.json).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion)
- **Backend**: Express.js server with Vite middlewares
- **AI Integration**: Google Gemini API SDK (`@google/genai`) using `gemini-3.8-flash`
- **Validation**: Zod schema validation
- **Icons**: Lucide React
- **Markdown & Syntax Highlighting**: `react-markdown`, `remark-gfm`, `rehype-highlight`

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js 18+ installed

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
GEMINI_API_KEY="your-gemini-api-key-here"
```
*(In Google AI Studio, this is automatically injected at runtime from your secrets).*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```
