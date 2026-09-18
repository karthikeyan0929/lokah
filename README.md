# Lokah - AI PDF to JPEG Converter & Document Assistant 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkarthikeyan0929%2Flokah)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat&logo=vercel)](https://lokah.vercel.app)

**Lokah** is an AI-powered PDF-to-JPEG converter and document intelligence bot. Convert PDF files into ultra crisp, high-resolution JPEG images directly inside your browser with zero latency and 100% privacy.

🌐 **Live Application Link**: [https://lokah.vercel.app](https://lokah.vercel.app)


## ✨ Features

- 🖼️ **High-Resolution JPEG Conversion**: Render PDF pages at custom scale/DPI (1.5x up to 4.0x Ultra HD) with customizable JPEG quality compression.
- 📦 **Bulk Export & ZIP Packaging**: Download individual pages or package selected/all pages into a `.zip` archive with one click.
- 📑 **Custom Page Ranges**: Choose specific page ranges (e.g. `1-3, 5, 8`) or process the full document.
- 🔍 **Interactive Zoom Preview**: Inspect rendered JPEG pages in a full-resolution modal.
- 🤖 **Document AI Bot**:
  - Live document summarization.
  - Structure & layout analysis.
  - Key dates & action items extraction.
  - Interactive Q&A chat based on extracted text and visual contents.
- 🔒 **100% Client-Side Privacy**: Documents are processed locally in your browser — zero files uploaded to external servers.
- 🌓 **Modern Dark / Light Mode**: Sleek glassmorphic user interface.

## 🛠️ Tech Stack

- **PDF Engine**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Bundler & Server**: [Vite](https://vitejs.dev/)
- **Archiving**: [JSZip](https://stuk.github.io/jszip/) + [FileSaver](https://github.com/eligrey/FileSaver.js/)
- **Styling**: Modern CSS with CSS variables, Glassmorphism, and responsive layout.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

## 📜 License

MIT
