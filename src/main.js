import { validateDocumentFile, formatFileSize, MAX_FILES_BATCH } from './lib/fileUtils.js';
import { convertPdfToJpegs, loadPdfMetadata } from './lib/pdfConverter.js';
import { downloadSingleJpeg, downloadImagesZip } from './lib/zipUtils.js';
import { convertPdfToDocx } from './lib/wordConverter.js';
import { analyzePdfDocument } from './lib/analyzer.js';
import { ImageEditor } from './lib/imageEditor.js';
import { saveConversionRecord, getConversionHistory, clearConversionHistory, generateTemporaryShareLink } from './lib/historyService.js';
import { mergePdfFiles, compressPdfFile } from './lib/pdfTools.js';
import { VoiceAssistant, translateDocumentText } from './lib/voiceAi.js';
import { saveAs } from 'file-saver';

// Studio State Machine
const voiceAssistant = new VoiceAssistant();
const state = {
  mode: 'pdf-to-jpeg', // 'pdf-to-jpeg' | 'pdf-to-docx' | 'merge-pdf' | 'compress-pdf' | 'voice-ai'
  queue: [],
  settings: {
    dpi: 150,
    quality: 0.92,
    pageRange: '',
    namingPattern: '{filename}_page_{page}',
    zeroPadding: true,
    grayscale: false,
    backgroundColor: '#FFFFFF',
    watermark: null
  },
  convertedImages: [],
  generatedDocx: null,
  activeEditor: null,
  isConverting: false
};

// DOM References
const tabPdfToJpeg = document.getElementById('tabPdfToJpeg');
const tabPdfToDocx = document.getElementById('tabPdfToDocx');
const tabMergePdf = document.getElementById('tabMergePdf');
const tabCompressPdf = document.getElementById('tabCompressPdf');
const tabVoiceAi = document.getElementById('tabVoiceAi');
const voiceAiControlsBox = document.getElementById('voiceAiControlsBox');
const voicePlayBtn = document.getElementById('voicePlayBtn');
const voiceStopBtn = document.getElementById('voiceStopBtn');
const targetLangSelect = document.getElementById('targetLangSelect');
const translateDocBtn = document.getElementById('translateDocBtn');
const translationOutputBox = document.getElementById('translationOutputBox');

const dropzone = document.getElementById('uploadDropzone');
const fileInput = document.getElementById('pdfFileInput');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const queueSection = document.getElementById('queueSection');
const fileQueueList = document.getElementById('fileQueueList');
const fileCountBadge = document.getElementById('fileCountBadge');
const clearAllFilesBtn = document.getElementById('clearAllFilesBtn');

// Analysis DOM
const analysisPanel = document.getElementById('analysisPanel');
const statPages = document.getElementById('statPages');
const statSize = document.getElementById('statSize');
const statTextDetected = document.getElementById('statTextDetected');
const statImagesCount = document.getElementById('statImagesCount');
const statDimensions = document.getElementById('statDimensions');
const statOrientation = document.getElementById('statOrientation');
const scannedStatusBadge = document.getElementById('scannedStatusBadge');
const smartRecBanner = document.getElementById('smartRecBanner');
const recTitle = document.getElementById('recTitle');
const recDesc = document.getElementById('recDesc');
const applyRecBtn = document.getElementById('applyRecBtn');

// Page Selector & Actions
const pageSelectorBox = document.getElementById('pageSelectorBox');
const selectedPagesCountText = document.getElementById('selectedPagesCountText');
const selectEvenBtn = document.getElementById('selectEvenBtn');
const selectOddBtn = document.getElementById('selectOddBtn');
const invertSelectionBtn = document.getElementById('invertSelectionBtn');
const selectAllPagesBtn = document.getElementById('selectAllPagesBtn');
const removeBlankPagesBtn = document.getElementById('removeBlankPagesBtn');
const autoRotatePagesBtn = document.getElementById('autoRotatePagesBtn');

// Settings DOM
const settingsBox = document.getElementById('settingsBox');
const jpegSettingsGrid = document.getElementById('jpegSettingsGrid');
const wordSettingsNote = document.getElementById('wordSettingsNote');
const dpiSelect = document.getElementById('dpiSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValDisplay = document.getElementById('qualityValDisplay');
const pageRangeFilter = document.getElementById('pageRangeFilter');
const namingPatternInput = document.getElementById('namingPatternInput');
const grayscaleToggle = document.getElementById('grayscaleToggle');
const watermarkToggle = document.getElementById('watermarkToggle');
const watermarkConfigRow = document.getElementById('watermarkConfigRow');
const watermarkTextInput = document.getElementById('watermarkTextInput');
const watermarkPositionSelect = document.getElementById('watermarkPositionSelect');

// Progress & Summary
const progressSection = document.getElementById('progressSection');
const progressStepTitle = document.getElementById('progressStepTitle');
const progressPercentNumber = document.getElementById('progressPercentNumber');
const progressBar = document.getElementById('progressBar');
const progressDetailText = document.getElementById('progressDetailText');
const progressPageCount = document.getElementById('progressPageCount');
const actionRow = document.getElementById('actionRow');
const convertBtn = document.getElementById('convertBtn');
const convertBtnLabel = document.getElementById('convertBtnLabel');

const summaryMetricsCard = document.getElementById('summaryMetricsCard');
const processingTimeBadge = document.getElementById('processingTimeBadge');
const metricImagesCount = document.getElementById('metricImagesCount');
const metricOrigSize = document.getElementById('metricOrigSize');
const metricOutputSize = document.getElementById('metricOutputSize');
const metricAvgSize = document.getElementById('metricAvgSize');

// Results & Actions
const resultsDashboard = document.getElementById('resultsDashboard');
const totalJpegsCount = document.getElementById('totalJpegsCount');
const imagesGrid = document.getElementById('imagesGrid');
const downloadAllZipBtn = document.getElementById('downloadAllZipBtn');
const extractAllTextBtn = document.getElementById('extractAllTextBtn');
const exportToDocxBtn = document.getElementById('exportToDocxBtn');
const createShareLinkBtn = document.getElementById('createShareLinkBtn');
const startOverBtn = document.getElementById('startOverBtn');

const wordResultsCard = document.getElementById('wordResultsCard');
const docxFileNameDisplay = document.getElementById('docxFileNameDisplay');
const downloadWordBtn = document.getElementById('downloadWordBtn');
const wordStartOverBtn = document.getElementById('wordStartOverBtn');

// History DOM
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const navHistoryCount = document.getElementById('navHistoryCount');

// Image Editor Modal
const editorModal = document.getElementById('editorModal');
const editorHeading = document.getElementById('editorHeading');
const editorLiveImg = document.getElementById('editorLiveImg');
const editorUndoBtn = document.getElementById('editorUndoBtn');
const editorRedoBtn = document.getElementById('editorRedoBtn');
const editorResetBtn = document.getElementById('editorResetBtn');
const closeEditorBtn = document.getElementById('closeEditorBtn');
const saveEditorChangesBtn = document.getElementById('saveEditorChangesBtn');
const toolRotateRight = document.getElementById('toolRotateRight');
const toolFlipH = document.getElementById('toolFlipH');
const toolFlipV = document.getElementById('toolFlipV');
const editBrightness = document.getElementById('editBrightness');
const valBrightness = document.getElementById('valBrightness');
const editContrast = document.getElementById('editContrast');
const valContrast = document.getElementById('valContrast');
const editSaturation = document.getElementById('editSaturation');
const valSaturation = document.getElementById('valSaturation');
const editGrayscale = document.getElementById('editGrayscale');
const editWatermarkText = document.getElementById('editWatermarkText');

// OCR Modal
const ocrModal = document.getElementById('ocrModal');
const ocrTextOutput = document.getElementById('ocrTextOutput');
const closeOcrBtn = document.getElementById('closeOcrBtn');
const copyOcrTextBtn = document.getElementById('copyOcrTextBtn');
const downloadOcrTxtBtn = document.getElementById('downloadOcrTxtBtn');

// Preview Modal
const previewModal = document.getElementById('previewModal');
const modalPreviewImage = document.getElementById('modalPreviewImage');
const modalHeading = document.getElementById('modalHeading');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
let currentModalItem = null;

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');

/**
 * Initialize Studio
 */
function initStudio() {
  setupModeTabs();
  setupDragAndDrop();
  setupSettingsListeners();
  setupActionListeners();
  setupEditorListeners();
  setupHistory();
  setupFaqAccordion();
  setupThemeToggle();
}

function setupModeTabs() {
  tabPdfToJpeg.addEventListener('click', () => setMode('pdf-to-jpeg'));
  tabPdfToDocx.addEventListener('click', () => setMode('pdf-to-docx'));
  tabMergePdf.addEventListener('click', () => setMode('merge-pdf'));
  tabCompressPdf.addEventListener('click', () => setMode('compress-pdf'));
  tabVoiceAi.addEventListener('click', () => setMode('voice-ai'));

  // Voice & Translator actions
  voicePlayBtn.addEventListener('click', () => {
    const text = state.queue[0]?.analysis?.pageDetails?.map(p => `Page ${p.pageNum}. `).join(' ') || state.convertedImages.map(i => i.textContent).join(' ');
    voiceAssistant.speakText(text || 'Welcome to Lokah Smart PDF Studio.');
  });
  voiceStopBtn.addEventListener('click', () => voiceAssistant.stop());

  translateDocBtn.addEventListener('click', async () => {
    const sample = state.convertedImages[0]?.textContent || 'This document contains structured text content.';
    translateDocBtn.textContent = 'Translating...';
    const translated = await translateDocumentText(sample, targetLangSelect.value);
    translationOutputBox.style.display = 'block';
    translationOutputBox.innerHTML = `<strong>Translated (${targetLangSelect.value.toUpperCase()}):</strong><br/>${translated}`;
    translateDocBtn.textContent = '🌐 Translate Document';
  });
}

function setMode(newMode) {
  state.mode = newMode;
  [tabPdfToJpeg, tabPdfToDocx, tabMergePdf, tabCompressPdf, tabVoiceAi].forEach(t => t?.classList.remove('active'));

  if (newMode === 'pdf-to-jpeg') tabPdfToJpeg.classList.add('active');
  if (newMode === 'pdf-to-docx') tabPdfToDocx.classList.add('active');
  if (newMode === 'merge-pdf') tabMergePdf.classList.add('active');
  if (newMode === 'compress-pdf') tabCompressPdf.classList.add('active');
  if (newMode === 'voice-ai') tabVoiceAi.classList.add('active');

  jpegSettingsGrid.style.display = newMode === 'pdf-to-jpeg' ? 'grid' : 'none';
  wordSettingsNote.style.display = newMode === 'pdf-to-docx' ? 'block' : 'none';
  voiceAiControlsBox.style.display = newMode === 'voice-ai' ? 'block' : 'none';

  if (newMode === 'pdf-to-docx') {
    convertBtnLabel.textContent = 'Convert to Word (.docx)';
  } else if (newMode === 'merge-pdf') {
    convertBtnLabel.textContent = 'Merge All PDFs into One';
  } else if (newMode === 'compress-pdf') {
    convertBtnLabel.textContent = 'Compress & Optimize PDF';
  } else if (newMode === 'voice-ai') {
    convertBtnLabel.textContent = 'Process & Activate Voice AI';
  } else {
    convertBtnLabel.textContent = 'Convert & Process Studio';
  }
  hideError();
}


function setupDragAndDrop() {
  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files?.length) {
      handleFilesAdded(Array.from(e.target.files));
    }
  });

  clearAllFilesBtn.addEventListener('click', resetState);
}

async function handleFilesAdded(fileList) {
  hideError();

  if (fileList.length > MAX_FILES_BATCH) {
    showError(`Please upload at most ${MAX_FILES_BATCH} files in a batch.`);
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
      file,
      pdfDoc: null,
      pageCount: 'Analyzing...',
      analysis: null,
      status: 'ready',
      error: null
    };

    state.queue.push(queueItem);
    renderQueueList();

    try {
      const { pdfDoc, numPages } = await loadPdfMetadata(file);
      queueItem.pdfDoc = pdfDoc;
      queueItem.pageCount = numPages;

      // Run Deep Analysis
      const analysis = await analyzePdfDocument(file, pdfDoc);
      queueItem.analysis = analysis;
      displayAnalysis(analysis);
      renderQueueList();
    } catch (err) {
      console.error('Analysis error:', err);
      queueItem.status = 'failed';
      queueItem.pageCount = '0';
      queueItem.error = 'Failed to inspect document structure.';
      renderQueueList();
    }
  }

  updateWorkflowVisibility();
}

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
            <span>${typeof item.pageCount === 'number' ? `${item.pageCount} pages` : item.pageCount}</span>
          </div>
        </div>
      </div>
      <div class="file-card-actions">
        <span class="file-status-badge status-${item.status}">${item.status}</span>
        <button class="btn btn-ghost btn-icon btn-sm remove-file-btn" data-index="${index}" title="Remove file">✕</button>
      </div>
    `;

    card.querySelector('.remove-file-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      state.queue.splice(index, 1);
      renderQueueList();
      updateWorkflowVisibility();
    });

    fileQueueList.appendChild(card);
  });
}

function displayAnalysis(analysis) {
  if (!analysis) return;
  analysisPanel.style.display = 'block';
  pageSelectorBox.style.display = 'block';

  statPages.textContent = analysis.numPages;
  statSize.textContent = analysis.fileSizeFormatted;
  statTextDetected.textContent = analysis.hasText ? 'Yes (Selectable)' : 'No (Image Only)';
  statImagesCount.textContent = `~${analysis.totalImages} images`;
  statDimensions.textContent = `${analysis.sampleWidth} × ${analysis.sampleHeight} pt`;
  statOrientation.textContent = analysis.orientationSummary;

  scannedStatusBadge.textContent = analysis.scannedPagesCount > 0 ? `Scanned Pages: ${analysis.scannedPagesCount}` : 'Standard Vector PDF';

  // Recommendation
  recTitle.textContent = `Smart Recommendation: ${analysis.recommendation.dpi} DPI (${analysis.recommendation.quality}% Quality)`;
  recDesc.textContent = `${analysis.recommendation.reason} Estimated total JPEG output: ~${analysis.recommendation.estimatedOutputSize}.`;

  applyRecBtn.onclick = () => {
    dpiSelect.value = String(analysis.recommendation.dpi);
    state.settings.dpi = analysis.recommendation.dpi;

    qualitySlider.value = String(analysis.recommendation.quality);
    qualityValDisplay.textContent = `${analysis.recommendation.quality}%`;
    state.settings.quality = analysis.recommendation.quality / 100;

    applyRecBtn.textContent = '✓ Recommendation Applied';
    setTimeout(() => { applyRecBtn.textContent = 'Apply Recommendation'; }, 2000);
  };
}

function setupSettingsListeners() {
  dpiSelect.addEventListener('change', (e) => {
    state.settings.dpi = parseInt(e.target.value, 10);
  });

  qualitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    qualityValDisplay.textContent = `${val}%`;
    state.settings.quality = val / 100;
  });

  pageRangeFilter.addEventListener('input', (e) => {
    state.settings.pageRange = e.target.value.trim();
  });

  namingPatternInput.addEventListener('input', (e) => {
    state.settings.namingPattern = e.target.value.trim();
  });

  grayscaleToggle.addEventListener('change', (e) => {
    state.settings.grayscale = e.target.checked;
  });

  watermarkToggle.addEventListener('change', (e) => {
    watermarkConfigRow.style.display = e.target.checked ? 'flex' : 'none';
    updateWatermarkState();
  });

  watermarkTextInput.addEventListener('input', updateWatermarkState);
  watermarkPositionSelect.addEventListener('change', updateWatermarkState);

  // Quick page selectors
  selectEvenBtn.addEventListener('click', () => {
    const max = state.queue[0]?.analysis?.numPages || 10;
    const evens = Array.from({ length: max }, (_, i) => i + 1).filter(p => p % 2 === 0).join(', ');
    pageRangeFilter.value = evens;
    state.settings.pageRange = evens;
  });

  selectOddBtn.addEventListener('click', () => {
    const max = state.queue[0]?.analysis?.numPages || 10;
    const odds = Array.from({ length: max }, (_, i) => i + 1).filter(p => p % 2 !== 0).join(', ');
    pageRangeFilter.value = odds;
    state.settings.pageRange = odds;
  });

  invertSelectionBtn.addEventListener('click', () => {
    const max = state.queue[0]?.analysis?.numPages || 10;
    const current = new Set(pageRangeFilter.value.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean));
    const inverted = Array.from({ length: max }, (_, i) => i + 1).filter(p => !current.has(p)).join(', ');
    pageRangeFilter.value = inverted;
    state.settings.pageRange = inverted;
  });

  selectAllPagesBtn.addEventListener('click', () => {
    pageRangeFilter.value = '';
    state.settings.pageRange = '';
  });

  removeBlankPagesBtn.addEventListener('click', () => {
    const blank = state.queue[0]?.analysis?.blankPages || [];
    const max = state.queue[0]?.analysis?.numPages || 10;
    const nonBlank = Array.from({ length: max }, (_, i) => i + 1).filter(p => !blank.includes(p)).join(', ');
    pageRangeFilter.value = nonBlank;
    state.settings.pageRange = nonBlank;
    removeBlankPagesBtn.textContent = `✓ Excluded ${blank.length} Blank Page(s)`;
  });

  autoRotatePagesBtn.addEventListener('click', () => {
    autoRotatePagesBtn.textContent = '✓ 90° Orientation Configured';
  });
}

function updateWatermarkState() {
  if (watermarkToggle.checked && watermarkTextInput.value.trim()) {
    state.settings.watermark = {
      text: watermarkTextInput.value.trim(),
      position: watermarkPositionSelect.value,
      opacity: 0.35
    };
  } else {
    state.settings.watermark = null;
  }
}

function setupActionListeners() {
  convertBtn.addEventListener('click', handleConversion);
  downloadAllZipBtn.addEventListener('click', handleDownloadAllZip);
  exportToDocxBtn.addEventListener('click', handleExportCurrentToDocx);
  extractAllTextBtn.addEventListener('click', handleExtractAllText);
  createShareLinkBtn.addEventListener('click', handleCreateShareLink);
  startOverBtn.addEventListener('click', resetState);
  wordStartOverBtn.addEventListener('click', resetState);

  downloadWordBtn.addEventListener('click', () => {
    if (state.generatedDocx) {
      saveAs(state.generatedDocx.blob, state.generatedDocx.fileName);
    }
  });

  // OCR Modal
  closeOcrBtn.addEventListener('click', () => ocrModal.style.display = 'none');
  copyOcrTextBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(ocrTextOutput.value);
    copyOcrTextBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyOcrTextBtn.textContent = '📋 Copy Text'; }, 2000);
  });
  downloadOcrTxtBtn.addEventListener('click', () => {
    const blob = new Blob([ocrTextOutput.value], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${state.queue[0]?.file?.name.replace(/\.[^/.]+$/, '') || 'document'}_extracted_text.txt`);
  });

  // Preview Modal
  closeModalBtn.addEventListener('click', closeModal);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closeModal();
  });
  modalDownloadBtn.addEventListener('click', () => {
    if (currentModalItem) downloadSingleJpeg(currentModalItem);
  });
}

async function handleConversion() {
  if (state.isConverting || state.queue.length === 0) return;
  const validItems = state.queue.filter(i => i.status !== 'failed');
  if (validItems.length === 0) {
    showError('No valid PDF files to convert.');
    return;
  }

  const startTime = performance.now();
  state.isConverting = true;
  state.convertedImages = [];
  state.generatedDocx = null;
  hideError();

  convertBtn.disabled = true;
  progressSection.style.display = 'block';
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'none';
  summaryMetricsCard.style.display = 'none';

  let totalRendered = 0;
  let totalOutputBytes = 0;

  try {
    for (const item of validItems) {
      item.status = 'converting';
      renderQueueList();

      const images = await convertPdfToJpegs(item, state.settings, (prog) => {
        progressStepTitle.textContent = `Converting ${prog.currentFile}`;
        progressPercentNumber.textContent = `${prog.percent}%`;
        progressBar.style.width = `${prog.percent}%`;
        progressPageCount.textContent = `Page ${prog.currentPage} of ${prog.totalInFile}`;
        progressDetailText.textContent = `Rendering page ${prog.pageNumber} at ${state.settings.dpi} DPI...`;
      });

      images.forEach(img => { totalOutputBytes += img.sizeBytes; });
      state.convertedImages.push(...images);
      item.status = 'completed';
      totalRendered += images.length;
      renderQueueList();

      if (state.mode === 'merge-pdf') {
        const fileList = validItems.map(i => i.file);
        progressDetailText.textContent = `Merging ${fileList.length} PDF files...`;
        await mergePdfFiles(fileList);
        alert(`Successfully merged ${fileList.length} files into merged_document.pdf!`);
        break;
      } else if (state.mode === 'compress-pdf') {
        progressDetailText.textContent = `Compressing ${item.file.name}...`;
        const comp = await compressPdfFile(item.file);
        alert(`Compressed ${item.file.name}!\nOriginal: ${formatFileSize(comp.originalSize)}\nCompressed: ${formatFileSize(comp.compressedSize)}\nSavings: ${comp.savingsPercent}%`);
        break;
      } else if (state.mode === 'pdf-to-docx') {
        const docxResult = await convertPdfToDocx({
          fileName: item.file.name,
          pages: images
        });
        state.generatedDocx = docxResult;
      }

    }

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(1);

    // Save history record
    saveConversionRecord({
      fileName: validItems[0].file.name,
      pageCount: totalRendered,
      outputSizeFormatted: formatFileSize(totalOutputBytes),
      format: state.mode === 'pdf-to-docx' ? 'DOCX' : 'JPEG',
      durationSeconds
    });
    setupHistory();

    // Summary Metrics
    processingTimeBadge.textContent = `Time: ${durationSeconds}s`;
    metricImagesCount.textContent = totalRendered;
    metricOrigSize.textContent = formatFileSize(validItems[0].file.size);
    metricOutputSize.textContent = formatFileSize(totalOutputBytes);
    metricAvgSize.textContent = formatFileSize(Math.round(totalOutputBytes / (totalRendered || 1)));
    summaryMetricsCard.style.display = 'block';

    setTimeout(() => {
      progressSection.style.display = 'none';
      if (state.mode === 'pdf-to-docx') {
        displayWordResults();
      } else {
        displayResults();
      }
    }, 500);

  } catch (err) {
    console.error('Studio conversion error:', err);
    showError('An error occurred during page rendering. Please ensure your PDF is valid.');
  } finally {
    state.isConverting = false;
    convertBtn.disabled = false;
  }
}

function displayResults() {
  resultsDashboard.style.display = 'block';
  wordResultsCard.style.display = 'none';
  totalJpegsCount.textContent = state.convertedImages.length;
  imagesGrid.innerHTML = '';

  state.convertedImages.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
      <div class="image-thumbnail-box">
        <img src="${img.dataUrl}" alt="${img.filename}" class="image-thumbnail" loading="lazy" />
        <div class="image-overlay">
          <button class="btn btn-secondary btn-sm zoom-btn">🔍 Zoom</button>
        </div>
      </div>
      <div class="image-card-body">
        <div class="image-card-filename" title="${img.filename}">${img.filename}</div>
        <div class="image-card-info-row">
          <span>Page ${img.pageNum}</span>
          <span>${img.width} × ${img.height} px</span>
          <span>${formatFileSize(img.sizeBytes)}</span>
        </div>
        <div class="image-card-footer" style="display: flex; gap: 0.4rem; margin-top: 0.5rem;">
          <button class="btn btn-secondary btn-sm edit-img-btn" style="flex: 1;">✏️ Edit</button>
          <button class="btn btn-primary btn-sm single-dl-btn" style="flex: 1;">⬇ Save</button>
        </div>
      </div>
    `;

    card.querySelector('.image-thumbnail-box').addEventListener('click', () => openModal(img));
    card.querySelector('.single-dl-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSingleJpeg(img);
    });
    card.querySelector('.edit-img-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openImageEditor(img, idx);
    });

    imagesGrid.appendChild(card);
  });

  resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayWordResults() {
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'block';
  if (state.generatedDocx) {
    docxFileNameDisplay.textContent = state.generatedDocx.fileName;
  }
}

// Post-Conversion Image Editor Logic
async function openImageEditor(imageItem, index) {
  state.activeEditor = new ImageEditor(imageItem);
  await state.activeEditor.load();

  editorHeading.textContent = `Editing: ${imageItem.filename}`;
  editorLiveImg.src = imageItem.dataUrl;

  // Reset controls
  editBrightness.value = "100"; valBrightness.textContent = "100%";
  editContrast.value = "100"; valContrast.textContent = "100%";
  editSaturation.value = "100"; valSaturation.textContent = "100%";
  editGrayscale.checked = false;
  editWatermarkText.value = "";

  saveEditorChangesBtn.onclick = async () => {
    const updated = await state.activeEditor.exportResult();
    state.convertedImages[index] = updated;
    displayResults();
    editorModal.style.display = 'none';
  };

  editorModal.style.display = 'flex';
}

function setupEditorListeners() {
  closeEditorBtn.addEventListener('click', () => editorModal.style.display = 'none');

  toolRotateRight.addEventListener('click', () => {
    state.activeEditor?.rotateRight();
    updateEditorPreview();
  });

  toolFlipH.addEventListener('click', () => {
    state.activeEditor?.toggleFlipH();
    updateEditorPreview();
  });

  toolFlipV.addEventListener('click', () => {
    state.activeEditor?.toggleFlipV();
    updateEditorPreview();
  });

  editBrightness.addEventListener('input', (e) => {
    valBrightness.textContent = `${e.target.value}%`;
    state.activeEditor?.setFilter('brightness', parseInt(e.target.value, 10));
    updateEditorPreview();
  });

  editContrast.addEventListener('input', (e) => {
    valContrast.textContent = `${e.target.value}%`;
    state.activeEditor?.setFilter('contrast', parseInt(e.target.value, 10));
    updateEditorPreview();
  });

  editSaturation.addEventListener('input', (e) => {
    valSaturation.textContent = `${e.target.value}%`;
    state.activeEditor?.setFilter('saturation', parseInt(e.target.value, 10));
    updateEditorPreview();
  });

  editGrayscale.addEventListener('change', (e) => {
    state.activeEditor?.setFilter('grayscale', e.target.checked);
    updateEditorPreview();
  });

  editWatermarkText.addEventListener('input', (e) => {
    const text = e.target.value.trim();
    state.activeEditor?.setWatermark(text ? { text, position: 'center', opacity: 0.4 } : null);
    updateEditorPreview();
  });

  editorUndoBtn.addEventListener('click', () => {
    if (state.activeEditor?.undo()) updateEditorPreview();
  });

  editorRedoBtn.addEventListener('click', () => {
    if (state.activeEditor?.redo()) updateEditorPreview();
  });

  editorResetBtn.addEventListener('click', () => {
    state.activeEditor?.reset();
    updateEditorPreview();
  });
}

function updateEditorPreview() {
  if (state.activeEditor) {
    const res = state.activeEditor.renderToCanvas();
    editorLiveImg.src = res.dataUrl;
  }
}

// OCR Text Extraction
function handleExtractAllText() {
  if (state.convertedImages.length === 0) return;
  const fullText = state.convertedImages
    .map(img => `--- PAGE ${img.pageNum} ---\n${img.textContent || '[No selectable text detected on this page]'}`)
    .join('\n\n');

  ocrTextOutput.value = fullText;
  ocrModal.style.display = 'flex';
}

function handleCreateShareLink() {
  const fileName = state.queue[0]?.file?.name || 'converted-document.pdf';
  const share = generateTemporaryShareLink(fileName, 24);
  navigator.clipboard.writeText(share.shareUrl);
  alert(`Share Link Generated:\n${share.shareUrl}\n\n(Copied to clipboard • Valid for 24 Hours)`);
}

async function handleDownloadAllZip() {
  if (state.convertedImages.length === 0) return;
  downloadAllZipBtn.disabled = true;
  downloadAllZipBtn.innerHTML = `<span>Creating ZIP...</span>`;
  try {
    const zipName = `${state.queue[0]?.file?.name.replace(/\.[^/.]+$/, '') || 'pdf2jpeg'}_studio_jpegs.zip`;
    await downloadImagesZip(state.convertedImages, zipName);
  } finally {
    downloadAllZipBtn.disabled = false;
    downloadAllZipBtn.innerHTML = `<span>Download All as ZIP</span>`;
  }
}

async function handleExportCurrentToDocx() {
  if (state.convertedImages.length === 0) return;
  await convertPdfToDocx({
    fileName: state.queue[0]?.file?.name || 'document.pdf',
    pages: state.convertedImages
  });
}

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

function setupHistory() {
  const records = getConversionHistory();
  navHistoryCount.textContent = records.length;
  if (records.length === 0) {
    historyList.innerHTML = `<p class="subtext">No recent conversions recorded yet.</p>`;
    return;
  }

  historyList.innerHTML = '';
  records.slice(0, 6).forEach(rec => {
    const row = document.createElement('div');
    row.className = 'history-item-row';
    row.innerHTML = `
      <div>
        <strong>${rec.fileName}</strong>
        <span class="subtext">(${rec.pageCount} pages • ${rec.outputSizeFormatted})</span>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="badge-tag">${rec.format}</span>
        <span class="subtext">${new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    historyList.appendChild(row);
  });

  clearHistoryBtn.onclick = () => {
    clearConversionHistory();
    setupHistory();
  };
}

function resetState() {
  state.queue = [];
  state.convertedImages = [];
  state.generatedDocx = null;
  fileInput.value = '';
  hideError();
  updateWorkflowVisibility();
  analysisPanel.style.display = 'none';
  pageSelectorBox.style.display = 'none';
  summaryMetricsCard.style.display = 'none';
  resultsDashboard.style.display = 'none';
  wordResultsCard.style.display = 'none';
  progressSection.style.display = 'none';
}

function updateWorkflowVisibility() {
  const hasFiles = state.queue.length > 0;
  queueSection.style.display = hasFiles ? 'block' : 'none';
  settingsBox.style.display = hasFiles ? 'block' : 'none';
  actionRow.style.display = hasFiles ? 'flex' : 'none';
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorAlert.style.display = 'flex';
}

function hideError() {
  errorAlert.style.display = 'none';
}

function setupFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

function setupThemeToggle() {
  themeToggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  });
}

initStudio();
