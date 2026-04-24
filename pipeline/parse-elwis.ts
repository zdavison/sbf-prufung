import * as cheerio from 'cheerio';
import type { Exam, RawQuestion } from './types';

// DOM map (ELWIS Fragenkatalog pages, 2023 catalog):
//   Each question is a <p> whose first non-whitespace token is "<number>. <question text>".
//   The question's 4 answers live in the immediately-following <ol class="elwisOL-lowerLiteral">
//   with exactly 4 <li> children.
//   An image, if any, lives in a <p class="picture ..."> between the question <p> and the <ol>
//   (or inside the question <p> itself). It contains <img src="..." /> with an absolute URL.
//   No in-page section headings — each sub-page (Basisfragen / Spezifische-Binnen / Spezifische-Segeln)
//   is a single category. We use the page's <h1 class="isFirstInSlot"> text as the category.

function cleanText(input: string): string {
  return input
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseElwisHtml(html: string, exam: Exam): RawQuestion[] {
  const $ = cheerio.load(html);
  const category = cleanText($('h1.isFirstInSlot').first().text()) || '';
  const questions: RawQuestion[] = [];

  $('ol.elwisOL-lowerLiteral').each((_, ol) => {
    const $ol = $(ol);
    const answers = $ol.children('li').map((_, li) => cleanText($(li).text())).get();
    if (answers.length !== 4) return;

    // Walk backwards through preceding siblings to find the question <p> (the one starting
    // with "N. "), collecting any intermediate <img> tags as the question image.
    let imageRef: string | undefined;
    let officialNumber: number | undefined;
    let questionText: string | undefined;

    let $prev = $ol.prev();
    const maxLookback = 8;
    for (let i = 0; i < maxLookback && $prev.length; i++) {
      const $img = $prev.find('img').first();
      if (!imageRef && $img.length) {
        const src = $img.attr('src');
        if (src) imageRef = new URL(src.replace(/&amp;/g, '&'), 'https://www.elwis.de/').toString();
      }
      const text = cleanText($prev.text());
      const m = text.match(/^(\d{1,3})\.\s+(.+)$/);
      if (m) {
        officialNumber = parseInt(m[1]!, 10);
        questionText = m[2]!.trim();
        // Also check for image inside the question <p> itself.
        if (!imageRef) {
          const $innerImg = $prev.find('img').first();
          if ($innerImg.length) {
            const src = $innerImg.attr('src');
            if (src) imageRef = new URL(src.replace(/&amp;/g, '&'), 'https://www.elwis.de/').toString();
          }
        }
        break;
      }
      $prev = $prev.prev();
    }

    if (officialNumber === undefined || !questionText) return;

    questions.push({
      exam,
      officialNumber,
      category,
      question: questionText,
      answers,
      correctIndex: 0,
      imageRef,
      isNavigationTask: false,
    });
  });

  // De-duplicate by officialNumber (in case a page repeats markup) and sort.
  const byNum = new Map<number, RawQuestion>();
  for (const q of questions) if (!byNum.has(q.officialNumber)) byNum.set(q.officialNumber, q);
  return [...byNum.values()].sort((a, b) => a.officialNumber - b.officialNumber);
}
