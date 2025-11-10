# POC Paddle Chat — Document Analyzer

A small proof-of-concept React app that lets you upload documents/images and sends them to a PaddlePaddle-based document parser for OCR and structured extraction.

## Features

- Drag & drop + click-to-browse file uploads
- Live upload progress and per-file status (loading / completed / error)
- View results as Markdown, JSON, or the original image
- Clear individual files or all uploads
- Built with shadcn/ui components and Tailwind CSS

## Tech stack

- Frontend: React 19 + Vite
- UI: shadcn/ui (Radix primitives)
- Styling: Tailwind CSS
- HTTP client: axios
- Markdown: react-markdown
- Icons: lucide-react

## Prerequisites

- Node.js 18+ and npm
- (Optional) A running backend document parser API; the app expects a parser at `http://192.168.2.126:18200` by default

## Development setup

1. Clone the repo:

```bash
git clone https://github.com/VansonLeung/poc_paddle_chat_frontend.git
cd poc_paddle_chat_frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment (optional):

Create a `.env` file or copy the example and set a custom dev port. By default this project uses port `18202` for development.

```bash
cp .env.example .env
# then edit .env if you want to change the port
# VITE_PORT=18202
```

4. Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:<port>` (default `18202` if `VITE_PORT` is set, otherwise Vite's default).

## Usage

- Drag files onto the upload area or click to browse
- Click `Analyze` to send a file to the backend parser
- Use the tabs to view the parser response as Markdown, JSON, or the original image
- Remove single files with the trash button or `Clear All` to remove everything

## API integration

The frontend expects a POST endpoint that accepts `multipart/form-data` with a `file` field.

- Endpoint: `POST http://192.168.2.126:18200/doc_parser`
- Request: `multipart/form-data` with key `file`
- Example successful response (expected shape):

```json
{
"results": [
    {
    "markdown": {
        "markdown_texts": "Extracted text content..."
    }
    }
]
}
```

If your backend returns a different structure, adapt the client parsing logic in `src/components/FileUploader.jsx` (the `generateMarkdown` helper) accordingly.

## Project structure

```text
src/
├─ components/
│  ├─ FileUploader.jsx     # Main upload + analysis UI
│  └─ ui/                 # shadcn/ui components
├─ lib/
│  └─ utils.js            # helper functions (cn)
├─ assets/
├─ App.jsx
└─ main.jsx
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Notes & troubleshooting

- The dev server port is configurable via `VITE_PORT` in `.env`. Vite may fall back to the next available port if the requested port is already in use.
- If you change the backend API address, update the URL used in `src/components/FileUploader.jsx` (search for `/doc_parser`).

## Contributing

1. Fork the repo and create a feature branch
2. Run linting and tests (if any)
3. Open a PR against `main`

## License

This repository is a proof-of-concept implementation for PaddlePaddle document analysis.
