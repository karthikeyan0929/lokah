/**
 * Canvas Image Editor Engine:
 * Supports Crop, Rotate (90, 180, 270), Flip H/V, Filters (Brightness, Contrast, Saturation, Grayscale, Blur, Sharpen), Watermarks, Undo/Redo
 */

export class ImageEditor {
  constructor(imageItem) {
    this.originalItem = imageItem;
    this.history = [];
    this.historyIndex = -1;

    this.state = {
      rotation: 0, // 0, 90, 180, 270
      flipH: false,
      flipV: false,
      brightness: 100, // 0 - 200
      contrast: 100, // 0 - 200
      saturation: 100, // 0 - 200
      grayscale: false,
      blur: 0, // px
      sharpen: false,
      watermark: null // { text, color, opacity, size, position, rotation }
    };

    this.imgElement = new Image();
    this.isLoaded = false;
  }

  async load() {
    return new Promise((resolve, reject) => {
      this.imgElement.onload = () => {
        this.isLoaded = true;
        this.pushState();
        resolve(this);
      };
      this.imgElement.onerror = reject;
      this.imgElement.src = this.originalItem.dataUrl;
    });
  }

  pushState() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    this.historyIndex++;
  }

  undo() {
    if (this.canUndo()) {
      this.historyIndex--;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      return true;
    }
    return false;
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  reset() {
    this.state = {
      rotation: 0,
      flipH: false,
      flipV: false,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      grayscale: false,
      blur: 0,
      sharpen: false,
      watermark: null
    };
    this.pushState();
  }

  rotateRight() {
    this.state.rotation = (this.state.rotation + 90) % 360;
    this.pushState();
  }

  toggleFlipH() {
    this.state.flipH = !this.state.flipH;
    this.pushState();
  }

  toggleFlipV() {
    this.state.flipV = !this.state.flipV;
    this.pushState();
  }

  setFilter(name, val) {
    this.state[name] = val;
    this.pushState();
  }

  setWatermark(wmOptions) {
    this.state.watermark = wmOptions;
    this.pushState();
  }

  /**
   * Render state onto a canvas and return dataUrl & blob
   */
  renderToCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const isSideways = this.state.rotation === 90 || this.state.rotation === 270;
    const width = isSideways ? this.imgElement.height : this.imgElement.width;
    const height = isSideways ? this.imgElement.width : this.imgElement.height;

    canvas.width = width;
    canvas.height = height;

    ctx.save();

    // Solid white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Apply Filter CSS string
    const filterParts = [];
    if (this.state.brightness !== 100) filterParts.push(`brightness(${this.state.brightness}%)`);
    if (this.state.contrast !== 100) filterParts.push(`contrast(${this.state.contrast}%)`);
    if (this.state.saturation !== 100) filterParts.push(`saturate(${this.state.saturation}%)`);
    if (this.state.grayscale) filterParts.push(`grayscale(100%)`);
    if (this.state.blur > 0) filterParts.push(`blur(${this.state.blur}px)`);

    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    // Transformations (Rotate & Flip)
    ctx.translate(width / 2, height / 2);
    ctx.rotate((this.state.rotation * Math.PI) / 180);
    ctx.scale(this.state.flipH ? -1 : 1, this.state.flipV ? -1 : 1);

    ctx.drawImage(
      this.imgElement,
      -this.imgElement.width / 2,
      -this.imgElement.height / 2
    );

    ctx.restore();

    // Apply Watermark if configured
    if (this.state.watermark && this.state.watermark.text) {
      this.drawWatermark(ctx, width, height, this.state.watermark);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return {
      canvas,
      dataUrl,
      width,
      height
    };
  }

  drawWatermark(ctx, width, height, wm) {
    ctx.save();
    const fontSize = Math.max(16, Math.round(width * (wm.size || 0.04)));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = wm.color || 'rgba(0, 0, 0, 0.4)';
    ctx.globalAlpha = wm.opacity !== undefined ? wm.opacity : 0.4;

    let x = width / 2;
    let y = height / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (wm.position === 'top-left') {
      x = 30; y = 40; ctx.textAlign = 'left';
    } else if (wm.position === 'top-center') {
      x = width / 2; y = 40;
    } else if (wm.position === 'top-right') {
      x = width - 30; y = 40; ctx.textAlign = 'right';
    } else if (wm.position === 'bottom-left') {
      x = 30; y = height - 40; ctx.textAlign = 'left';
    } else if (wm.position === 'bottom-center') {
      x = width / 2; y = height - 40;
    } else if (wm.position === 'bottom-right') {
      x = width - 30; y = height - 40; ctx.textAlign = 'right';
    }

    ctx.translate(x, y);
    if (wm.rotation) {
      ctx.rotate((wm.rotation * Math.PI) / 180);
    }
    ctx.fillText(wm.text, 0, 0);
    ctx.restore();
  }

  async exportResult() {
    const { canvas, dataUrl, width, height } = this.renderToCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));

    return {
      ...this.originalItem,
      dataUrl,
      blob,
      width,
      height,
      sizeBytes: blob ? blob.size : 0
    };
  }
}
