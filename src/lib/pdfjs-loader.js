/**
 * Loads PDF.js from CDN instead of the npm bundle (which can fail in Vite preview).
 * Returns the pdfjsLib global after loading.
 */
const PDFJS_VERSION = "3.11.174";
const CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let loadPromise = null;

export function loadPdfJs() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN_BASE}/pdf.worker.min.js`;
      return resolve(window.pdfjsLib);
    }

    const script = document.createElement("script");
    script.src = `${CDN_BASE}/pdf.min.js`;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN_BASE}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load PDF.js from CDN"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}