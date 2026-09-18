import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// App State
const state = {
  file: null,
  pdfDoc: null,
  renderedPages: [], // { pageNum, dataUrl, blob, textContent }
  selectedPages: new Set(),
  isConverting: false,
  scale: 2.0,
  quality: 0.92,
  chatHistory: []
};

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileStatsDisplay = document.getElementById('fileStatsDisplay');
const clearFileBtn = document.getElementById('clearFileBtn');
const scaleSelect = document.getElementById('scaleSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const pageRangeInput = document.getElementById('pageRangeInput');
const progressContainer = document.getElementById('progressContainer');
const progressBarFill = document.getElementById('progressBarFill');
const progressText = document.getElementById('progressText');
const convertAllBtn = document.getElementById('convertAllBtn');
const askAiSummaryBtn = document.getElementById('askAiSummaryBtn');
const gallerySection = document.getElementById('gallerySection');
const pagesGrid = document.getElementById('pagesGrid');
const renderedCountDisplay = document.getElementById('renderedCountDisplay');
const selectAllBtn = document.getElementById('selectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const selectedCountDisplay = document.getElementById('selectedCountDisplay');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Chat DOM
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const promptChips = document.getElementById('promptChips');

// Modal DOM
const previewModal = document.getElementById('previewModal');
const modalPreviewImg = document.getElementById('modalPreviewImg');
const modalPageTitle = document.getElementById('modalPageTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
let activeModalPage = null;

// Initialize Event Listeners
function initEvents() {
  // Drag & Drop
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  clearFileBtn.addEventListener('click', resetDocument);

  // Settings
  scaleSelect.addEventListener('change', (e) => {
    state.scale = parseFloat(e.target.value);
    if (state.pdfDoc) {
      renderPdfPages();
    }
  });

  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = `${e.target.value}%`;
    state.quality = parseInt(e.target.value, 10) / 100;
  });

  qualitySlider.addEventListener('change', () => {
    if (state.pdfDoc) {
      renderPdfPages();
    }
  });

  pageRangeInput.addEventListener('change', () => {
    if (state.pdfDoc) {
      renderPdfPages();
    }
  });

  // Action Buttons
  convertAllBtn.addEventListener('click', downloadAllZip);
  askAiSummaryBtn.addEventListener('click', generateAiSummary);
  selectAllBtn.addEventListener('click', toggleSelectAll);
  downloadSelectedBtn.addEventListener('click', downloadSelectedZip);

  // Chat
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;
    addUserMessage(query);
    chatInput.value = '';
    handleAiBotResponse(query);
  });

  promptChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const prompt = chip.dataset.prompt;
    addUserMessage(prompt);
    handleAiBotResponse(prompt);
  });

  // Modal
  closeModalBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
  });

  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      previewModal.style.display = 'none';
    }
  });

  modalDownloadBtn.addEventListener('click', () => {
    if (activeModalPage) {
      downloadSinglePage(activeModalPage);
    }
  });

  // Theme toggle
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
  });
}

// Handle Upload
async function handleFileUpload(file) {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    alert('Please upload a valid PDF document.');
    return;
  }

  state.file = file;
  fileNameDisplay.textContent = file.name;
  fileStatsDisplay.textContent = `Loading document • ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  settingsPanel.style.display = 'block';

  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    state.pdfDoc = await loadingTask.promise;
    fileStatsDisplay.textContent = `${state.pdfDoc.numPages} Page${state.pdfDoc.numPages > 1 ? 's' : ''} • ${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    addBotMessage(`📄 Document **${file.name}** loaded successfully (${state.pdfDoc.numPages} pages). Rendering pages into high-definition JPEGs now...`);
    await renderPdfPages();
  } catch (err) {
    console.error('Error loading PDF:', err);
    alert('Failed to parse PDF document. It might be password-protected or corrupted.');
  }
}

// Parse page range string (e.g. "1-3, 5, 8")
function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          pages.add(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        pages.add(pageNum);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// Render PDF Pages to Canvas and JPEG Data URLs
async function renderPdfPages() {
  if (!state.pdfDoc || state.isConverting) return;
  state.isConverting = true;
  state.renderedPages = [];
  state.selectedPages.clear();
  updateSelectionUi();

  pagesGrid.innerHTML = '';
  gallerySection.style.display = 'block';
  progressContainer.style.display = 'block';

  const pagesToRender = parsePageRange(pageRangeInput.value, state.pdfDoc.numPages);
  const total = pagesToRender.length;

  for (let i = 0; i < total; i++) {
    const pageNum = pagesToRender[i];
    progressText.textContent = `Rendering page ${pageNum} (${i + 1}/${total})...`;
    progressBarFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    // Extract text for AI
    const textContentObj = await page.getTextContent();
    const textStrings = textContentObj.items.map(item => item.str).join(' ');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background for clean JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Convert canvas to JPEG blob and data URL
    const dataUrl = canvas.toDataURL('image/jpeg', state.quality);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', state.quality));

    const pageData = {
      pageNum,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
      textContent: textStrings
    };

    state.renderedPages.push(pageData);
    appendPageCard(pageData);
  }

  renderedCountDisplay.textContent = state.renderedPages.length;
  progressText.textContent = `Done! Rendered ${state.renderedPages.length} high-res JPEG pages.`;
  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 1200);

  state.isConverting = false;
}

// Append page card into gallery grid
function appendPageCard(pageData) {
  const card = document.createElement('div');
  card.className = 'page-card';
  card.id = `page-card-${pageData.pageNum}`;

  card.innerHTML = `
    <input type="checkbox" class="page-select-checkbox" data-page="${pageData.pageNum}" title="Select page" />
    <div class="page-preview-wrapper" data-page="${pageData.pageNum}">
      <img src="${pageData.dataUrl}" alt="Page ${pageData.pageNum}" class="page-preview-img" loading="lazy" />
      <div class="page-hover-overlay">
        <button class="btn btn-secondary btn-sm preview-trigger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          </svg>
          Zoom
        </button>
      </div>
    </div>
    <div class="page-footer">
      <span class="page-num">Page ${pageData.pageNum} (${pageData.width}x${pageData.height})</span>
      <div class="page-actions">
        <button class="btn btn-icon btn-sm download-single-btn" data-page="${pageData.pageNum}" title="Download JPEG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Page Card Events
  const checkbox = card.querySelector('.page-select-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.selectedPages.add(pageData.pageNum);
      card.classList.add('selected');
    } else {
      state.selectedPages.delete(pageData.pageNum);
      card.classList.remove('selected');
    }
    updateSelectionUi();
  });

  const previewWrapper = card.querySelector('.page-preview-wrapper');
  previewWrapper.addEventListener('click', () => openModalPreview(pageData));

  const downloadBtn = card.querySelector('.download-single-btn');
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadSinglePage(pageData);
  });

  pagesGrid.appendChild(card);
}

// Update UI for multi-selection
function updateSelectionUi() {
  const count = state.selectedPages.size;
  selectedCountDisplay.textContent = count;
  downloadSelectedBtn.disabled = count === 0;
  selectAllBtn.textContent = (count === state.renderedPages.length && count > 0) ? 'Deselect All' : 'Select All';
}

function toggleSelectAll() {
  const allSelected = state.selectedPages.size === state.renderedPages.length;
  state.renderedPages.forEach(p => {
    const card = document.getElementById(`page-card-${p.pageNum}`);
    const cb = card ? card.querySelector('.page-select-checkbox') : null;
    if (allSelected) {
      state.selectedPages.delete(p.pageNum);
      if (card) card.classList.remove('selected');
      if (cb) cb.checked = false;
    } else {
      state.selectedPages.add(p.pageNum);
      if (card) card.classList.add('selected');
      if (cb) cb.checked = true;
    }
  });
  updateSelectionUi();
}

// Download Single Page JPEG
function downloadSinglePage(pageData) {
  const baseName = state.file.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}_page_${pageData.pageNum}.jpeg`;
  saveAs(pageData.blob, fileName);
}

// Download Selected Pages ZIP
async function downloadSelectedZip() {
  if (state.selectedPages.size === 0) return;
  const pagesToDownload = state.renderedPages.filter(p => state.selectedPages.has(p.pageNum));
  await createAndDownloadZip(pagesToDownload);
}

// Download All Pages ZIP
async function downloadAllZip() {
  if (state.renderedPages.length === 0) return;
  await createAndDownloadZip(state.renderedPages);
}

async function createAndDownloadZip(pages) {
  const zip = new JSZip();
  const baseName = state.file.name.replace(/\.[^/.]+$/, '');
  const folder = zip.folder(`${baseName}_jpegs`);

  pages.forEach(p => {
    folder.file(`${baseName}_page_${p.pageNum}.jpeg`, p.blob);
  });

  progressContainer.style.display = 'block';
  progressText.textContent = 'Generating ZIP archive...';
  progressBarFill.style.width = '75%';

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${baseName}_jpegs.zip`);

  progressBarFill.style.width = '100%';
  progressText.textContent = 'ZIP Downloaded successfully!';
  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 1000);
}

// Open Modal Preview
function openModalPreview(pageData) {
  activeModalPage = pageData;
  modalPageTitle.textContent = `Page ${pageData.pageNum} (${pageData.width} × ${pageData.height} px)`;
  modalPreviewImg.src = pageData.dataUrl;
  previewModal.style.display = 'flex';
}

// Reset state
function resetDocument() {
  state.file = null;
  state.pdfDoc = null;
  state.renderedPages = [];
  state.selectedPages.clear();
  fileInput.value = '';
  settingsPanel.style.display = 'none';
  gallerySection.style.display = 'none';
  pagesGrid.innerHTML = '';
  addBotMessage('Document cleared. Drop a new PDF whenever you are ready!');
}

// AI Bot Chat Functions
function addUserMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user-bubble';
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(markdownText) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot-bubble';
  
  // Format simple markdown into HTML
  let formatted = markdownText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n- /g, '<br/>• ')
    .replace(/\n/g, '<br/>');

  bubble.innerHTML = `
    <div class="bubble-header">Lokah AI Bot</div>
    <div class="bubble-body">${formatted}</div>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// AI Bot Reasoning Logic
async function handleAiBotResponse(userQuery) {
  if (!state.pdfDoc) {
    setTimeout(() => {
      addBotMessage("Please upload a PDF document first so I can inspect the content and answer your questions!");
    }, 400);
    return;
  }

  // Combine extracted text across pages
  const totalPages = state.renderedPages.length;
  const combinedText = state.renderedPages.map(p => `[Page ${p.pageNum}]: ${p.textContent}`).join('\n\n');
  const queryLower = userQuery.toLowerCase();

  // Show typing indicator
  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble bot-bubble typing';
  typingBubble.innerHTML = `<div class="bubble-body"><em>Thinking & analyzing PDF...</em></div>`;
  chatMessages.appendChild(typingBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setTimeout(() => {
    typingBubble.remove();
    let response = "";

    if (queryLower.includes('summar') || queryLower.includes('overview') || queryLower.includes('about')) {
      const sampleText = combinedText.substring(0, 500);
      response = `📑 **Document Summary**:
- **File Name**: ${state.file.name}
- **Pages**: ${state.pdfDoc.numPages} total pages
- **Resolution**: Rendered at ${state.scale}x scale (~${state.scale * 72} DPI)

**Content Highlights**:
${sampleText ? sampleText + '...' : 'This document contains mostly graphical or vector layouts.'}

💡 *You can download individual pages or export all converted pages as a ZIP file!*`;
    } else if (queryLower.includes('date') || queryLower.includes('action') || queryLower.includes('item') || queryLower.includes('key')) {
      const dates = combinedText.match(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [];
      response = `🔍 **Extracted Key Details**:
- **Dates found**: ${dates.length > 0 ? Array.from(new Set(dates)).slice(0, 5).join(', ') : 'No explicit date timestamps detected in the text layer.'}
- **Document Length**: ${state.pdfDoc.numPages} pages
- **Text Density**: ${combinedText.length > 200 ? 'High text density' : 'Visual / image-heavy document'}`;
    } else if (queryLower.includes('layout') || queryLower.includes('structure')) {
      const avgWidth = state.renderedPages[0] ? state.renderedPages[0].width : 'N/A';
      const avgHeight = state.renderedPages[0] ? state.renderedPages[0].height : 'N/A';
      response = `📐 **Document Layout Analysis**:
- **Page Dimensions**: ${avgWidth} x ${avgHeight} pixels per page
- **Total Rendered Pages**: ${totalPages}
- **Color Profile**: RGB JPEG Output (Quality: ${Math.round(state.quality * 100)}%)
- **Orientation**: ${avgWidth > avgHeight ? 'Landscape layout' : 'Portrait layout'}`;
    } else {
      // General question search inside PDF text
      const searchTerms = userQuery.split(' ').filter(w => w.length > 3);
      const matchingPages = [];

      state.renderedPages.forEach(p => {
        if (searchTerms.some(term => p.textContent.toLowerCase().includes(term.toLowerCase()))) {
          matchingPages.push(p.pageNum);
        }
      });

      if (matchingPages.length > 0) {
        response = `🔎 I searched through the document for **"${userQuery}"**:
Relevant keywords were found on **Page ${matchingPages.join(', Page ')}**.

You can click the **Zoom** preview button on those page cards to inspect the full resolution render!`;
      } else {
        response = `I analyzed your document for **"${userQuery}"**.
- Analyzed ${totalPages} pages.
- No direct text keyword matches were found in the standard text layer, but you can inspect the high-resolution JPEG renders in the gallery.`;
      }
    }

    addBotMessage(response);
  }, 700);
}

function generateAiSummary() {
  handleAiBotResponse("Summarize this document");
}

// Start application
initEvents();
