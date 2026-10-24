import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox } from 'pdf-lib';

export interface ExtractedEvaluation {
  scores: Record<string, string>;
  recommendations: string;
  method: 'FORM_FIELDS' | 'TEXT_PATTERN' | 'EMPTY';
  fieldCount: number;
}

export async function extractScoresFromPdf(
  bytes: Uint8Array,
  templateQuestions: { key: string; label: string; options?: string[] }[] = []
): Promise<ExtractedEvaluation> {
  const scores: Record<string, string> = {};
  let recommendations = '';

  // Pass 1: Try reading interactive AcroForm / PDF form widgets
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdf.getForm();
    const fields = form.getFields();

    if (fields.length > 0) {
      for (const field of fields) {
        const name = field.getName().trim().toLowerCase();
        let val = '';
        if (field instanceof PDFTextField) val = field.getText()?.trim() ?? '';
        else if (field instanceof PDFRadioGroup) val = field.getSelected()?.trim() ?? '';
        else if (field instanceof PDFDropdown) val = field.getSelected()?.[0]?.trim() ?? '';
        else if (field instanceof PDFCheckBox) val = field.isChecked() ? 'Yes' : 'No';

        if (!val) continue;

        if (name.includes('recommend') || name.includes('comment') || name.includes('feedback') || name.includes('remark') || val.length > 35) {
          recommendations += (recommendations ? '\n' : '') + val;
          continue;
        }

        // Check against question key or label
        let matched = false;
        for (const q of templateQuestions) {
          if (name.includes(q.key.toLowerCase()) || name.includes(q.label.toLowerCase())) {
            scores[q.key] = val;
            matched = true;
            break;
          }
        }

        if (!matched && /^[1-5](\.0)?$/.test(val)) {
          const intVal = val.split('.')[0]!;
          for (const q of templateQuestions) {
            if (!scores[q.key]) {
              scores[q.key] = intVal;
              break;
            }
          }
        }
      }

      if (Object.keys(scores).length > 0 || recommendations) {
        return { scores, recommendations, method: 'FORM_FIELDS', fieldCount: fields.length };
      }
    }
  } catch {
    // Non-fillable or standard flattened PDF
  }

  // Pass 2: Fallback text parsing
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({ data: bytes, disableFontFace: true });
    const doc = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item: unknown) => (item && typeof item === 'object' && 'str' in item ? String(item.str) : ''));
      fullText += strings.join(' ') + '\n';
    }

    const recMatch = fullText.match(/(?:recommendations?|comments?|feedback|remarks?|areas?\s+of\s+improvement)[:\s]+([^.\n]{10,500})/i);
    if (recMatch?.[1]) recommendations = recMatch[1].trim();

    const matches = [...fullText.matchAll(/(?:([1-5])\s*\/\s*5|\b(?:score|rating|points?)[:\s]*([1-5])\b|\[\s*([1-5])\s*\])/gi)];
    const extractedNumbers: string[] = [];
    for (const m of matches) {
      const num = m[1] || m[2] || m[3];
      if (num && extractedNumbers.length < templateQuestions.length) {
        extractedNumbers.push(num);
      }
    }

    templateQuestions.forEach((q, idx) => {
      if (extractedNumbers[idx]) scores[q.key] = extractedNumbers[idx]!;
    });

    if (Object.keys(scores).length > 0 || recommendations) {
      return { scores, recommendations, method: 'TEXT_PATTERN', fieldCount: extractedNumbers.length };
    }
  } catch {
    // PDF text stream unavailable or scanned image
  }

  return { scores, recommendations, method: 'EMPTY', fieldCount: 0 };
}
