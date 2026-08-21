/**
 * Client-side text extraction for RAG document uploads.
 *
 * Deliberately no backend round-trip / new file-storage plumbing: a case's
 * `ragContextDocs` is just `string[]` (see AiTestCase.rag_context_docs), so
 * the only thing that needs to happen with an uploaded file is turning it
 * into text before it lands in that array. Plain text / Markdown / CSV /
 * TSV / JSON are read as-is; PDF gets real page-by-page text extraction
 * via pdf.js (entirely in-browser, no server involved).
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per file
const MAX_EXTRACTED_CHARS = 200_000;     // guard against a huge doc blowing up every prompt/cost

export const SUPPORTED_DOC_EXTENSIONS = ['.txt', '.md', '.csv', '.tsv', '.json', '.pdf'];
export const SUPPORTED_DOC_ACCEPT = SUPPORTED_DOC_EXTENSIONS.join(',');

export class DocExtractionError extends Error {}

const readAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.readAsText(file);
  });

const extractPdfText = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const doc = await getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
    pages.push(text.trim());
  }
  return pages.filter(Boolean).join('\n\n');
};

/** Extracts plain text from one uploaded file, ready to drop into `ragContextDocs`. */
export const extractDocText = async (file: File): Promise<string> => {
  if (file.size > MAX_FILE_BYTES) {
    throw new DocExtractionError(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — 15MB max.`);
  }
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  let text: string;
  try {
    text = ext === '.pdf' ? await extractPdfText(file) : await readAsText(file);
  } catch (e: any) {
    throw new DocExtractionError(e?.message || `Could not read "${file.name}".`);
  }

  text = text.trim();
  if (!text) throw new DocExtractionError(`"${file.name}" has no extractable text.`);
  if (text.length > MAX_EXTRACTED_CHARS) {
    text = text.slice(0, MAX_EXTRACTED_CHARS)
      + `\n\n[…truncated — original was ${text.length.toLocaleString()} characters]`;
  }
  return text;
};
