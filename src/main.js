import { validateDocumentFile, formatFileSize, MAX_FILES_BATCH } from './lib/fileUtils.js';
import { convertPdfToJpegs, loadPdfMetadata } from './lib/pdfConverter.js';
import { downloadSingleJpeg, downloadImagesZip } from './lib/zipUtils.js';
import { convertPdfToDocx } from './lib/wordConverter.js';

// Application State
const state = {
  mode: 'pdf-to-jpeg', // 'pdf-to-jpeg' | 'pdf-to-docx'
  queue: [], // Array of { id, file, pdfDoc, pageCount, status: 'ready'|'converting'|'completed'|'failed', error: null }
  settings: {
    resolution: 'high',
    quality: 'custom',
    customQuality: 0.92,
    pageRange: ''
  },
  convertedImages: [],
  generatedDocx: null, // { blob, fileName }
  isConverting: false
};

// DOM References
const tabPdfToJpeg = document.getElementById('tabPdfToJpeg');
const tabPdfToDocx = document.getElementById('tabPdfToDocx');
const dropzone = document.getElementById('uploadDropzone');
const fileInput = document.getElementById('pdfFileInput');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const queueSection = document.getElementById('queueSection');
const fileQueueList = document.getElementById('fileQueueList');
const fileCountBadge = document.getElementById('fileCountBadge');
const clearAllFilesBtn = document.getElementById('clearAllFilesBtn');

const settingsBox = document.getElementById('settingsBox');
const jpegSettingsGrid = document.getElementById('jpegSettingsGrid');
const wordSettingsNote = document.getElementById('wordSettingsNote');
const resolutionSelect = document.getElementById('resolutionSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValDisplay = document.getElementById('qualityValDisplay');
const pageRangeFilter = document.getElementById('pageRangeFilter');

const actionRow = document.getElementById('actionRow');
const convertBtn = document.getElementById('convertBtn');
const convertBtnLabel = document.getElementById('convertBtnLabel');

const progressSection = document.getElementById('progressSection');
const progressStepTitle = document.getElementById('progressStepTitle');
const progressPercentNumber = document.getElementById('progressPercentNumber');
const progressBar = document.getElementById('progressBar');
const progressDetailText = document.getElementById('progressDetailText');
const progressPageCount = document.getElementById('progressPageCount');

// Results Dashboards
const resultsDashboard = document.getElementById('resultsDashboard');
const totalJpegsCount = document.getElementById('totalJpegsCount');
const imagesGrid = document.getElementById('imagesGrid');
const downloadAllZipBtn = document.getElementById('downloadAllZipBtn');
const exportToDocxBtn = document.getElementById('exportToDocxBtn');
const startOverBtn = document.getElementById('startOverBtn');

const wordResultsCard = document.getElementById('wordResultsCard');
const docxFileNameDisplay = document.getElementById('docxFileNameDisplay');
const downloadWordBtn = document.getElementById('downloadWordBtn');
const wordStartOverBtn = document.getElementById('wordStartOverBtn');

// Modal Elements
const previewModal = document.getElementById('previewModal');
const modalPreviewImage = document.getElementById('modalPreviewImage');
const modalHeading = document.getElementById('modalHeading');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
let currentModalItem = null;

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');

/**
 * Initialize App
 */
function initApp() {
  setupModeTabs();
  setupDragAndDrop();
  setupSettingsListeners();
  setupActionListeners();
  setupFaqAccordion();
  setupThemeToggle();
}

/**
 * Setup Conversion Mode Switcher Tabs
 */
function setupModeTabs() {
  tabPdfToJpeg.addEventListener('click', () => setMode('pdf-to-jpeg'));
  tabPdfToDocx.addEventListener('click', () => setMode('pdf-to-docx'));
}

function setMode(newMode) {
  state.mode = newMode;
  tabPdfToJpeg.classList.toggle('active', newMode === 'pdf-to-jpeg');
  tabPdfToDocx.classList.toggle('active', newMode === 'pdf-to-docx');

  if (newMode === 'pdf-to-docx') {
    jpegSettingsGrid.style.display = 'none';
    wordSettingsNote.style.display = 'block';
    convertBtnLabel.textContent = 'Convert to Word (.docx)';
  } else {
    jpegSettingsGrid.style.display = 'grid';
    wordSettingsNote.style.display = 'none';
    convertBtnLabel.textContent = 'Convert to JPEG';
  }

  // Clear errors when switching modes
  hideError();
}

/**
 * Drag & Drop Setup
 */
function setupDragAndDrop() {
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFilesAdded(Array.from(dt.files));
    }
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  });

  clearAllFilesBtn.addEventListener('click', () => {
    resetState();
  });
}

/**
 * Handle incoming files
 */
async function handleFilesAdded(fileList) {
  hideError();

  if (fileList.length > MAX_FILES_BATCH) {
    showError(`Please upload at most ${MAX_FILES_BATCH} PDF files in a single batch.`);
    fileList = fileList.slice(0, MAX_FILES_BATCH);
  }

  for (const file of fileList) {
    const validation = validateDocumentFile(file, state.mode);
    if (!validation.valid) {
      showError(validation.error);
      continue;
    }

    const fileId = `${file.name}-${file.size}-${Date.now()}`;
    const queueItem = {
      id: fileId,
      file: file,
      pdfDoc: null,
      pageCount: 'Loading...',
      status: 'ready',
      error: null
    };

    state.queue.push(queueItem);
    renderQueueList();

    // Async load document metadata to get real page count
    try {
      const { pdfDoc, numPages } = await loadPdfMetadata(file);
      queueItem.pdfDoc = pdfDoc;
      queueItem.pageCount = numPages;
      renderQueueList();
    } catch (err) {
      console.error('Error reading PDF metadata:', err);
      queueItem.status = 'failed';
      queueItem.pageCount = '0';
      queueItem.error = 'Unable to parse PDF. The file might be password-protected or corrupted.';
      renderQueueList();
    }
  }

  updateWorkflowVisibility();
}

/**
 * Render Queue list
 */
function renderQueueList() {
  fileQueueList.innerHTML = '';
  fileCountBadge.textContent = state.queue.length;

  state.queue.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.innerHTML = `
      <div class="file-card-info">
        <div class="file-card-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="file-card-details">
          <div class="file-card-name" title="${item.file.name}">${item.file.name}</div>
          <div class="file-card-meta">
            <span>${formatFileSize(item.file.size)}</span>
            <span>•</span>
            <span>${typeof item.pageCount === 'number' ? `${item.pageCount} page${item.pageCount > 1 ? 's' : ''}` : item.pageCount}</span>
          </div>
        </div>
      </div>
      <div class="file-card-actions">
        <span class="file-status-badge status-${item.status}">${item.status}</span>
        <button class="btn btn-ghost btn-icon btn-sm remove-file-btn" data-index="${index}" title="Remove file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    const removeBtn = card.querySelector('.remove-file-btn');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.queue.splice(index, 1);
      renderQueueList();
      updateWorkflowVisibility();
    });

    fileQueueList.appendChild(card);
  });
}

/**
 * Settings Listeners
 */
function setupSettingsListeners() {
  resolutionSelect.addEventListener('change', (e) => {
    state.settings.resolution = e.target.value;
  });

  qualitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    qualityValDisplay.textContent = `${val}%`;
    state.settings.customQuality = val / 100;
  });

  pageRangeFilter.addEventListener('input', (e) => {
    state.settings.pageRange = e.target.value.trim();
  });
}

/**
 * Action & Button Listeners
 */
function setupActionListeners() {
  convertBtn.addEventListener('click', handleConversion);
  downloadAllZipBtn.addEventListener('click', handleDownloadAllZip);
  exportToDocxBtn.addEventListener('click', handleExportCurrentToDocx);
  startOverBtn.addEventListener('click', resetState);
  wordStartOverBtn.addEventListener('click', resetState);

  downloadWordBtn.addEventListener('click', () => {
    if (state.generatedDocx) {
      import('file-saver').then(({ saveAs }) => {
        saveAs(state.generatedDocx.blob, state.generatedDocx.fileName);
      });
    }
  });

  // Modal Events
  closeModalBtn.addEventListener('click', closeModal);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closeModal();
  });

  modalDownloadBtn.addEventListener('click', () => {
    if (currentModalItem) {
      downloadSingleJpeg(currentModalItem);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.style.display === 'flex') {
      closeModal();
    }
  });
}

/**
 * Main Conversion Handler
 */
async function handleConversion() {
  if (state.isConverting || state.queue.length === 0) return;

  const validItems = state.queue.filter((item) => item.status !== 'failed');
  if (validItems.length === 0) {
    showError('No valid PDF files in the queue to convert.');
    return;
  }

  state.isConverting = true;
  state.convertedImages = [];
  state.generatedDocx = null;
  hideError();

  convertBtn.disabled = true;
  progressSection.style.display = 'block';
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'none';

  let totalRendered = 0;

  try {
    for (const item of validItems) {
      item.status = 'converting';
      renderQueueList();

      const images = await convertPdfToJpegs(item, state.settings, (prog) => {
        progressStepTitle.textContent = `Converting ${prog.currentFile}`;
        progressPercentNumber.textContent = `${prog.percent}%`;
        progressBar.style.width = `${prog.percent}%`;
        progressPageCount.textContent = `Page ${prog.currentPage} of ${prog.totalInFile}`;
        progressDetailText.textContent = `Rendering page ${prog.pageNumber} at high resolution...`;
      });

      state.convertedImages.push(...images);
      item.status = 'completed';
      totalRendered += images.length;
      renderQueueList();

      // If in Word mode, compile docx
      if (state.mode === 'pdf-to-docx') {
        progressDetailText.textContent = 'Formatting and compiling Word (.docx) document...';
        const docxResult = await convertPdfToDocx({
          fileName: item.file.name,
          pages: images
        });
        state.generatedDocx = docxResult;
      }
    }

    // Finished
    progressBar.style.width = '100%';
    progressPercentNumber.textContent = '100%';
    progressStepTitle.textContent = 'Conversion Successful!';
    progressDetailText.textContent = `Finished processing ${totalRendered} pages.`;

    setTimeout(() => {
      progressSection.style.display = 'none';
      if (state.mode === 'pdf-to-docx') {
        displayWordResults();
      } else {
        displayResults();
      }
    }, 600);

  } catch (err) {
    console.error('Conversion failed:', err);
    showError('An error occurred during conversion. Please ensure your PDF is valid.');
  } finally {
    state.isConverting = false;
    convertBtn.disabled = false;
  }
}

/**
 * Display Rendered JPEGs in Results Gallery
 */
function displayResults() {
  resultsDashboard.style.display = 'block';
  wordResultsCard.style.display = 'none';
  totalJpegsCount.textContent = state.convertedImages.length;
  imagesGrid.innerHTML = '';

  state.convertedImages.forEach((img) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
      <div class="image-thumbnail-box">
        <img src="${img.dataUrl}" alt="${img.filename}" class="image-thumbnail" loading="lazy" />
        <div class="image-overlay">
          <button class="btn btn-secondary btn-sm preview-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
            <span>Zoom</span>
          </button>
        </div>
      </div>
      <div class="image-card-body">
        <div class="image-card-filename" title="${img.filename}">${img.filename}</div>
        <div class="image-card-info-row">
          <span>Page ${img.pageNum}</span>
          <span>${img.width} × ${img.height} px</span>
          <span>${formatFileSize(img.sizeBytes)}</span>
        </div>
        <div class="image-card-footer">
          <button class="btn btn-secondary btn-sm single-dl-btn" style="width: 100%;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download JPEG</span>
          </button>
        </div>
      </div>
    `;

    // Preview Event
    const thumbBox = card.querySelector('.image-thumbnail-box');
    thumbBox.addEventListener('click', () => openModal(img));

    // Single Download Event
    const dlBtn = card.querySelector('.single-dl-btn');
    dlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSingleJpeg(img);
    });

    imagesGrid.appendChild(card);
  });

  resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Display Word (.docx) results
 */
function displayWordResults() {
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'block';
  if (state.generatedDocx) {
    docxFileNameDisplay.textContent = state.generatedDocx.fileName;
  }
  wordResultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Export currently converted pages to Word
 */
async function handleExportCurrentToDocx() {
  if (state.convertedImages.length === 0) return;
  const originalHtml = exportToDocxBtn.innerHTML;
  exportToDocxBtn.innerHTML = `<span>Exporting...</span>`;

  try {
    const activeFile = state.queue[0]?.file?.name || 'document.pdf';
    await convertPdfToDocx({
      fileName: activeFile,
      pages: state.convertedImages
    });
  } catch (err) {
    console.error('Word export error:', err);
    showError('Failed to compile Word document.');
  } finally {
    exportToDocxBtn.innerHTML = originalHtml;
  }
}

/**
 * Handle Download All as ZIP
 */
async function handleDownloadAllZip() {
  if (state.convertedImages.length === 0) return;

  downloadAllZipBtn.disabled = true;
  const originalHtml = downloadAllZipBtn.innerHTML;
  downloadAllZipBtn.innerHTML = `<span>Creating ZIP...</span>`;

  try {
    const zipName = state.queue.length === 1 ? `${state.queue[0].file.name.replace(/\.[^/.]+$/, '')}_jpegs.zip` : 'pdf2jpeg_converted_images.zip';
    await downloadImagesZip(state.convertedImages, zipName);
  } catch (err) {
    console.error('ZIP packaging failed:', err);
    showError('Failed to generate ZIP archive.');
  } finally {
    downloadAllZipBtn.disabled = false;
    downloadAllZipBtn.innerHTML = originalHtml;
  }
}

/**
 * Modal Preview Handler
 */
function openModal(item) {
  currentModalItem = item;
  modalHeading.textContent = `${item.filename} (${item.width} × ${item.height} px)`;
  modalPreviewImage.src = item.dataUrl;
  previewModal.style.display = 'flex';
}

function closeModal() {
  previewModal.style.display = 'none';
  modalPreviewImage.src = '';
  currentModalItem = null;
}

/**
 * Reset App State
 */
function resetState() {
  state.queue = [];
  state.convertedImages = [];
  state.generatedDocx = null;
  fileInput.value = '';
  hideError();
  updateWorkflowVisibility();
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'none';
  progressSection.style.display = 'none';
}

/**
 * Update UI Workflow Component Visibility
 */
function updateWorkflowVisibility() {
  const hasFiles = state.queue.length > 0;
  queueSection.style.display = hasFiles ? 'block' : 'none';
  settingsBox.style.display = hasFiles ? 'block' : 'none';
  actionRow.style.display = hasFiles ? 'flex' : 'none';
}

/**
 * Error Banner Helpers
 */
function showError(msg) {
  errorMessage.textContent = msg;
  errorAlert.style.display = 'flex';
}

function hideError() {
  errorAlert.style.display = 'none';
}

/**
 * FAQ Accordion Setup
 */
function setupFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-question');
    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach((el) => el.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

/**
 * Theme Switcher
 */
function setupThemeToggle() {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
  });
}

// Start application
initApp();
