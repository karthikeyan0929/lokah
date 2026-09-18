# PDF2JPEG – High-Definition PDF to JPEG Converter

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkarthikeyan0929%2Flokah)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat&logo=vercel)](https://lokah-nu.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PDF2JPEG (Lokah)** is a modern, production-ready SaaS web application that converts PDF documents into high-resolution JPEG images directly inside the browser. Fast, 100% private, and zero server upload required.

🌐 **Live Demo**: [https://lokah-nu.vercel.app](https://lokah-nu.vercel.app)


---

## 🚀 Features

- ⚡ **100% In-Browser Rendering**: PDF pages are parsed and rendered onto HTML5 Canvas elements locally. No documents are uploaded to any external server.
- 🎯 **Multiple Resolution Presets**:
  - **Standard**: 1.25x (~96-100 DPI)
  - **High Definition**: 2.0x (~150 DPI)
  - **Very High / Print**: 3.0x (~300 DPI)
- 🎚️ **Custom JPEG Quality Compression**: Fine-tune compression ratio from 50% to 100% with live quality percentage display.
- 📑 **Flexible Page Selection**: Convert all pages or specify page ranges (e.g. `1-5, 8, 12`).
- 📦 **One-Click Bulk ZIP Export**: Download individual page images or package all converted pages into a `.zip` file using `JSZip` and `FileSaver`.
- 🔍 **Fullscreen Zoom Modal**: Click any page preview thumbnail to inspect the full-resolution render.
- 📱 **Mobile & Tablet Optimized**: Responsive layout across all screen sizes.
- 🌓 **Dark / Light Mode**: Accessible contrast with theme switching.

---

## 🛠️ Architecture & Tech Stack

```text
lokah/
├── src/
│   ├── lib/
│   │   ├── fileUtils.js       # File validation, size formatting, page-range parsing
│   │   ├── pdfConverter.js    # PDF.js rendering pipeline, canvas rasterization, DPI scaling
│   │   └── zipUtils.js        # ZIP bundling and download triggers
│   ├── styles/
│   │   └── main.css           # SaaS design system, dark/light modes, responsive layout
│   └── main.js                # Application state machine, queue & UI workflow controller
├── index.html                 # Semantic HTML5 layout (Hero, Dropzone, Queue, Results, FAQ, Footer)
├── vercel.json                # Vercel deployment configuration
└── package.json               # Dependencies and scripts
```

- **PDF Engine**: [Mozilla PDF.js](https://mozilla.github.io/pdf.js/)
- **Bundler & Server**: [Vite](https://vitejs.dev/)
- **Archiving**: [JSZip](https://stuk.github.io/jszip/) + [FileSaver](https://github.com/eligrey/FileSaver.js/)
- **Styling**: Vanilla CSS3 design system with CSS custom properties and Glassmorphism accents.

---

## ⚙️ How It Works (Conversion Pipeline)

```
[PDF File Selected]
       │
       ▼
[Validate MIME & Size]
       │
       ▼
[Load PDF Metadata & Page Count via PDF.js]
       │
       ▼
[Render Target Pages onto HTML5 Canvas with White Background & High DPI Scale]
       │
       ▼
[Encode Canvas to JPEG Blob & Data URL]
       │
       ▼
[Display Results Gallery with Dimensions & File Size]
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
[Single JPEG Download]   [Interactive Zoom Preview]   [Bulk ZIP Archive Export]
```

---

## 💻 Installation & Local Development

### 1. Clone the repository
```bash
git clone https://github.com/karthikeyan0929/lokah.git
cd lokah
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local dev server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

### 5. Preview production build
```bash
npm run preview
```

---

## 🌐 Supported Browsers

- Google Chrome (Desktop & Mobile)
- Mozilla Firefox
- Apple Safari (macOS & iOS)
- Microsoft Edge
- Brave / Chromium-based browsers

---

## 🔒 Privacy & Security

- **Zero Server Uploads**: The application operates entirely on the client side using Web APIs and Web Workers.
- **No Telemetry / No Tracking**: Your private documents, financial reports, or personal PDFs never leave your device.
- **Temporary Memory Cleanup**: Canvas buffers and object URLs are safely garbage-collected between conversions.

---

## 🔮 Future Improvements

- [ ] WebP & PNG output format toggle
- [ ] Drag-and-drop page reordering
- [ ] Client-side PDF page rotation & extraction
- [ ] OCR text extraction overlay

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
