# Smart PDF Conversion Studio (PDF2JPEG & Word)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkarthikeyan0929%2Flokah)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat&logo=vercel)](https://lokah-nu.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Smart PDF Conversion Studio (Lokah)** is a complete, production-grade SaaS document-processing suite designed for in-browser PDF-to-JPEG conversion, PDF-to-Word (.docx) compilation, deep document structure inspection, image editing, watermarking, and OCR text extraction.

🌐 **Live Application**: [https://lokah-nu.vercel.app](https://lokah-nu.vercel.app)

---

## 🌟 Advanced Studio Capabilities

1. **High-Definition PDF to JPEG Conversion**:
   - Customizable DPI Presets: `72 DPI` (Web), `150 DPI` (HD), `300 DPI` (Ultra/Print), `600 DPI` (Archival).
   - Dynamic Quality Slider (20% to 100% compression).
   - Grayscale (B&W) rasterization filter.
   - White background canvas isolation preserving transparent vectors.

2. **Deep Document & Page Analysis**:
   - Page dimensions, total image counts, orientation analysis (Portrait/Landscape/Mixed).
   - Scanned document heuristic detection.
   - Text layer density inspection.
   - **Smart Optimization Recommendation Engine**: Suggests optimal DPI and JPEG quality based on real document characteristics.

3. **Smart Page Filtering**:
   - Range selection (e.g. `1-5, 8, 12`).
   - Quick selection helpers: *Even Pages*, *Odd Pages*, *Invert Selection*, *Select All*.
   - **Exclude Blank Pages**: Automatically identifies and filters out blank or empty pages.

4. **Built-in Post-Conversion Canvas Image Editor**:
   - 90° rotation, horizontal & vertical flip.
   - Real-time filters: Brightness, Contrast, Saturation, and B&W Grayscale.
   - Custom Watermarks (position, opacity, rotation).
   - Non-destructive history with full **Undo / Redo / Reset**.

5. **OCR & Structured Text Extraction**:
   - Extract selectable text layers into structured text view.
   - Single-click **Copy to Clipboard** or export as `.txt` files.

6. **PDF to Word (.docx) Compilation**:
   - Converts multi-page PDFs into formatted, editable Microsoft Word (`.docx`) files with page sections and heading hierarchies.

7. **Batch Processing & Multi-Level Downloads**:
   - Multi-file queue with independent status indicators.
   - Single-click **Bulk ZIP packaging** using `JSZip` and `FileSaver`.

8. **Conversion Metrics & Local History**:
   - Real processing time, compression calculations, and local conversion history tracking.
   - Temporary Share link generator.

---

## 🛠️ Project Structure

```text
lokah/
├── src/
│   ├── lib/
│   │   ├── analyzer.js        # Deep document inspection & smart recommendations
│   │   ├── fileUtils.js       # Validation, formatting & page range parsing
│   │   ├── historyService.js  # LocalStorage conversion history & share links
│   │   ├── imageEditor.js     # Canvas editor engine (rotate, filters, watermark, undo/redo)
│   │   ├── pdfConverter.js    # PDF.js rasterization with DPI scaling & watermarks
│   │   ├── wordConverter.js   # PDF to DOCX document generation with docx/mammoth
│   │   └── zipUtils.js        # Bulk ZIP archiving
│   ├── styles/
│   │   └── main.css           # Complete SaaS design system, dark/light modes & editor styles
│   └── main.js                # Studio state machine, workflow controller & event handling
├── index.html                 # Semantic HTML5 layout
├── vercel.json                # Vercel deployment configuration
└── package.json               # Dependencies and scripts
```

---

## 💻 Local Development

```bash
# Clone repository
git clone https://github.com/karthikeyan0929/lokah.git
cd lokah

# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build
```

---

## 🔒 Security & Privacy

All processing is **100% client-side**. Documents never leave your computer or browser memory. No data is stored externally.

---

## 📜 License

MIT License
