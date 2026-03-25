'use client'

// must be configured once before any PDF processing occurs
// call this in any component that processes PDFs client-side

let configured = false

export function configurePDFWorker() {
  if (configured) return
  if (typeof window === 'undefined') return

  // dynamic import to avoid SSR issues
  import('pdfjs-dist').then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    configured = true
  })
}
