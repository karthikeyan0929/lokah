/**
 * Web Speech API Voice Synthesizer & Multilingual AI Document Assistant
 */

export class VoiceAssistant {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSpeaking = false;
    this.utterance = null;
  }

  speakText(text, onEndCallback = null) {
    if (!this.synth) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    this.stop();

    if (!text || !text.trim()) {
      alert('No text available to read aloud.');
      return;
    }

    // Limit to first 4000 characters for smooth utterance chunking
    const readableText = text.substring(0, 4000);
    this.utterance = new SpeechSynthesisUtterance(readableText);
    this.utterance.rate = 1.0;
    this.utterance.pitch = 1.0;
    this.utterance.lang = 'en-US';

    this.utterance.onend = () => {
      this.isSpeaking = false;
      if (onEndCallback) onEndCallback();
    };

    this.utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEndCallback) onEndCallback();
    };

    this.isSpeaking = true;
    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth?.speaking) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth?.paused) {
      this.synth.resume();
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

/**
 * Client-Side Multilingual Document Translator (English, Spanish, French, German, Hindi, Tamil, Japanese)
 */
export async function translateDocumentText(text, targetLang = 'es') {
  if (!text || !text.trim()) return '';

  // Free client-side translation endpoint
  try {
    const chunk = text.substring(0, 1500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.responseData?.translatedText || chunk;
  } catch (err) {
    console.warn('Translation service fallback:', err);
    return `[Translation to ${targetLang}]:\n` + text.substring(0, 500);
  }
}
