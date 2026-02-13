import { describe, it, expect } from 'vitest';
import {
  classifyNoteSentiment,
  detectCategory,
  detectSeverity,
  generateIssueId,
  generatePositiveId,
  extractPersonaName,
  generateAcceptanceCriteria,
} from '@/report/json';

describe('classifyNoteSentiment', () => {
  it('returns negative for "confusing"', () => {
    expect(classifyNoteSentiment('This layout is confusing')).toBe('negative');
  });

  it('returns negative for Czech "chybí"', () => {
    expect(classifyNoteSentiment('Na stránce chybí důležitý prvek')).toBe('negative');
  });

  it('returns negative for "broken"', () => {
    expect(classifyNoteSentiment('The submit button is broken')).toBe('negative');
  });

  it('returns positive for "easy"', () => {
    expect(classifyNoteSentiment('The form was easy to fill out')).toBe('positive');
  });

  it('returns positive for "intuitive"', () => {
    expect(classifyNoteSentiment('The navigation is intuitive')).toBe('positive');
  });

  it('returns positive for Czech "funguje"', () => {
    expect(classifyNoteSentiment('Vyhledávání funguje výborně')).toBe('positive');
  });

  it('returns neutral for plain factual text', () => {
    expect(classifyNoteSentiment('The page has a header and a footer with two columns')).toBe('neutral');
  });

  it('"but" construction flips to negative when negative keywords present', () => {
    // "ale" is Czech "but", and "nejasn" is a negative keyword
    expect(classifyNoteSentiment('Design je pěkný, ale navigace je nejasná')).toBe('negative');
  });
});

describe('detectCategory', () => {
  it('maps form-related keywords to "form"', () => {
    expect(detectCategory('The input field is missing validation')).toBe('form');
  });

  it('maps navigation keywords to "navigation"', () => {
    expect(detectCategory('The menu link is broken')).toBe('navigation');
  });

  it('maps performance keywords to "performance"', () => {
    expect(detectCategory('Page loading is slow')).toBe('performance');
  });

  it('maps password keywords to "security"', () => {
    expect(detectCategory('Password requirements are not shown')).toBe('security');
  });

  it('maps button/click keywords to "interaction"', () => {
    expect(detectCategory('Tlačítko nereaguje')).toBe('interaction');
  });

  it('defaults to "ux" for unmatched text', () => {
    expect(detectCategory('Something generic happened here')).toBe('ux');
  });
});

describe('detectSeverity', () => {
  it('returns high for "broken"', () => {
    expect(detectSeverity('The form is broken', 'form')).toBe('high');
  });

  it('returns high for "nefunguje"', () => {
    expect(detectSeverity('Tlačítko nefunguje', 'interaction')).toBe('high');
  });

  it('returns high for "crash"', () => {
    expect(detectSeverity('Page crash after submit', 'ux')).toBe('high');
  });

  it('returns medium for "confusing"', () => {
    expect(detectSeverity('The layout is confusing', 'ux')).toBe('medium');
  });

  it('returns medium for "unclear"', () => {
    expect(detectSeverity('Instructions are unclear', 'ux')).toBe('medium');
  });

  it('returns low as default', () => {
    expect(detectSeverity('Normal observation about the page', 'ux')).toBe('low');
  });
});

describe('generateIssueId', () => {
  it('formats as UX-XXX-001', () => {
    expect(generateIssueId('form', 0)).toBe('UX-FOR-001');
    expect(generateIssueId('navigation', 2)).toBe('UX-NAV-003');
    expect(generateIssueId('ux', 9)).toBe('UX-UX-010');
  });
});

describe('generatePositiveId', () => {
  it('formats as OK-XXX-001', () => {
    expect(generatePositiveId('form', 0)).toBe('OK-FOR-001');
    expect(generatePositiveId('navigation', 1)).toBe('OK-NAV-002');
  });
});

describe('extractPersonaName', () => {
  it('extracts "Jana" from "Jana, 45 let..."', () => {
    const result = extractPersonaName('Jana, 45 let. Nikdy nepouzila Spotify.');
    expect(result.name).toBe('Jana');
    expect(result.description).toContain('Jana');
  });

  it('handles "jmeno je Viktor"', () => {
    const result = extractPersonaName('moje jmeno je Viktor a mam 22 let');
    expect(result.name).toBe('Viktor');
  });

  it('fallback for unusual input', () => {
    const result = extractPersonaName('random lowercase persona');
    expect(result.name).toBeTruthy();
    // Falls through to the word-splitting fallback
    expect(typeof result.name).toBe('string');
  });
});

describe('generateAcceptanceCriteria', () => {
  it('generates password-specific criteria for password issues', () => {
    const criteria = generateAcceptanceCriteria('Chybí informace o požadavcích na heslo', 'security');
    expect(criteria.some(c => c.toLowerCase().includes('heslo') || c.toLowerCase().includes('password') || c.toLowerCase().includes('požadav'))).toBe(true);
  });

  it('always returns 2-5 criteria', () => {
    const cases = [
      generateAcceptanceCriteria('Something generic happened', 'ux'),
      generateAcceptanceCriteria('Heslo je příliš krátké a chybí pravidla', 'security'),
      generateAcceptanceCriteria('Navigation menu is broken', 'navigation'),
      generateAcceptanceCriteria('The form input field has no validation', 'form'),
    ];

    for (const criteria of cases) {
      expect(criteria.length).toBeGreaterThanOrEqual(2);
      expect(criteria.length).toBeLessThanOrEqual(5);
    }
  });
});
