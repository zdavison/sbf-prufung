import * as cheerio from 'cheerio';
import type { Exam, RawQuestion } from './types';

// DOM map (placeholder — tune these against real ELWIS HTML once fixtures are committed):
//   Each question: div.row.frage or similar container
//   Official number: first element with question number text
//   Category heading: h2 or h3 preceding a group of questions
//   Question body text: p inside the question container
//   Answers: li elements in an ol or ul inside the question container
//   Images: img inside the question container
// These selectors are GUESSES. Run npm test -- parse-elwis after adding fixtures to verify.

export function parseElwisHtml(html: string, exam: Exam): RawQuestion[] {
  const $ = cheerio.load(html);
  const questions: RawQuestion[] = [];
  let currentCategory = '';

  $('h2, h3, .frage, .question, [class*="frage"], [class*="question"]').each((_, el) => {
    const $el = $(el);
    const tagName = el.type === 'tag' ? el.name : '';

    if (tagName === 'h2' || tagName === 'h3') {
      const text = $el.text().trim();
      if (text) currentCategory = text;
      return;
    }

    const fullText = $el.text();
    const numberMatch = fullText.match(/^(\d+)[.\s]/);
    if (!numberMatch) return;
    const officialNumber = parseInt(numberMatch[1]!, 10);
    if (officialNumber < 1 || officialNumber > 300) return;

    const questionText = $el.find('p').first().text().trim() || fullText.split('\n')[1]?.trim() || '';
    const answers = $el.find('li').map((_, li) => $(li).text().trim()).get().filter(Boolean);
    const imgSrc = $el.find('img').attr('src');

    if (!questionText || answers.length !== 4) return;

    const isNavigationTask = exam === 'see' && officialNumber >= 286 && officialNumber <= 300;

    questions.push({
      exam,
      officialNumber,
      category: currentCategory,
      question: questionText,
      answers,
      correctIndex: 0,
      imageRef: imgSrc ? new URL(imgSrc, 'https://www.elwis.de/').toString() : undefined,
      isNavigationTask,
    });
  });

  return questions;
}
