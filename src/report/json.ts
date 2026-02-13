import { writeFile } from 'fs/promises';
import type { SessionReport, StepResult, EvaluationResult } from '../core/types.js';

// JSON Report Types - machine-readable contract for automation

export type JsonReportStep = {
  step: number;
  action: string;
  target: string | null;
  value?: string;
  result: 'met' | 'partial' | 'surprised' | 'failed';
  notes: string[];
};

export type JsonReportIssue = {
  id: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  evidence: {
    step: number;
    description: string;
  };
  recommendation: string;
  acceptance_criteria: string[];
};

export type JsonReportPositive = {
  id: string;
  category: string;
  title: string;
  evidence: {
    step: number;
    description: string;
  };
};

export type JsonReportObservation = {
  step: number;
  text: string;
};

export type JsonReport = {
  run_id: string;
  url: string;
  persona: {
    name: string;
    description: string;
  };
  intent: string | null;
  duration_ms: number;
  intuitiveness_score: number;
  artifacts: {
    video?: string;
    screenshots: string[];
  };
  steps: JsonReportStep[];
  issues: JsonReportIssue[];
  positives: JsonReportPositive[];
  observations: JsonReportObservation[];
  summary: {
    total_steps: number;
    met: number;
    partial: number;
    failed: number;
  };
};

// Sentiment classification for notes
type NoteSentiment = 'negative' | 'positive' | 'neutral';

// Keywords indicating negative sentiment (problems, issues, risks)
const NEGATIVE_KEYWORDS = [
  'chybí', 'není', 'nejasn', 'matoucí', 'zmaten', 'problém', 'špatně', 'špatný',
  'nefunguje', 'broken', 'fail', 'error', 'nelze', 'nemůže', 'nevidí', 'schází',
  'missing', 'unclear', 'confus', 'difficult', 'hard to', 'cannot', 'doesn\'t',
  'won\'t', 'couldn\'t', 'shouldn\'t', 'risk', 'danger', 'warning', 'issue',
  'bug', 'nevím', 'don\'t know', 'unsure', 'uncertain', 'překáž', 'blokuje',
  'brání', 'komplik', 'složit', 'těžk', 'nepohodl', 'frustr', 'irituj',
  'otravuj', 'zdržuje', 'pomalý', 'slow', 'lag', 'neočekáv', 'unexpect',
  'ale ', 'však', 'jenže', 'bohužel', 'unfortunately', 'could be better',
  'mohl by být', 'mohlo by', 'would be nice', 'by se hodilo', 'není vidět',
  'skryt', 'malý', 'small', 'tiny', 'hard to see', 'těžko vidět', 'nevýrazn'
];

// Keywords indicating positive sentiment
const POSITIVE_KEYWORDS = [
  'přehledn', 'jednoduch', 'snadný', 'srozumiteln', 'jasný', 'clear', 'easy',
  'simple', 'intuitive', 'intuitivn', 'dobrý', 'dobře', 'good', 'great',
  'excellent', 'perfect', 'výborn', 'skvěl', 'pěkn', 'nice', 'helpful',
  'užitečn', 'praktick', 'čiteln', 'readable', 'velký', 'large', 'visible',
  'viditeln', 'funguje', 'works', 'working', 'správně', 'correctly', 'properly',
  'rychl', 'fast', 'quick', 'responzivn', 'responsive', 'bezpečn', 'secure',
  'díky', 'thanks', 'rád', 'glad', 'happy', 'pleased', 'satisfied', 'spokoje'
];

// Classify note sentiment
export const classifyNoteSentiment = (note: string): NoteSentiment => {
  const lower = note.toLowerCase();

  // Count negative and positive indicators
  let negativeScore = 0;
  let positiveScore = 0;

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) negativeScore++;
  }

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) positiveScore++;
  }

  // Check for "but" constructions that negate positives
  if (lower.includes(' ale ') || lower.includes(' však ') || lower.includes(', but ')) {
    // If there's a "but", the overall sentiment is likely negative
    if (negativeScore > 0) return 'negative';
  }

  // Determine sentiment
  if (negativeScore > positiveScore) return 'negative';
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore === 0 && positiveScore === 0) return 'neutral';

  // If equal, lean towards negative for safety (issues are more actionable)
  return negativeScore > 0 ? 'negative' : 'neutral';
};

// Detect issue category from text
export const detectCategory = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('form') || lower.includes('input') || lower.includes('field') || lower.includes('políčk') || lower.includes('formulář')) return 'form';
  if (lower.includes('navigation') || lower.includes('menu') || lower.includes('link') || lower.includes('navigac')) return 'navigation';
  if (lower.includes('loading') || lower.includes('slow') || lower.includes('performance') || lower.includes('pomal') || lower.includes('načít')) return 'performance';
  if (lower.includes('accessibility') || lower.includes('a11y') || lower.includes('screen reader') || lower.includes('přístupnost')) return 'a11y';
  if (lower.includes('onboarding') || lower.includes('registration') || lower.includes('sign up') || lower.includes('registrac') || lower.includes('vytvoř') && lower.includes('účet')) return 'onboarding';
  if (lower.includes('text') || lower.includes('label') || lower.includes('copy') || lower.includes('placeholder') || lower.includes('popis') || lower.includes('nápis')) return 'copy';
  if (lower.includes('error') || lower.includes('validation') || lower.includes('chyb') || lower.includes('validac')) return 'validation';
  if (lower.includes('feedback') || lower.includes('confirm') || lower.includes('potvr') || lower.includes('zpětná vazba')) return 'feedback';
  if (lower.includes('heslo') || lower.includes('password')) return 'security';
  if (lower.includes('button') || lower.includes('tlačítko') || lower.includes('klik')) return 'interaction';
  return 'ux';
};

// Detect severity with improved rules
export const detectSeverity = (text: string, category: string): JsonReportIssue['severity'] => {
  const lower = text.toLowerCase();

  // High severity: Critical issues
  if (lower.includes('critical') || lower.includes('broken') || lower.includes('crash') ||
      lower.includes('nefunguje') || lower.includes('nelze') || lower.includes('blokuje') ||
      lower.includes('cannot') || lower.includes('impossible')) {
    return 'high';
  }

  // Onboarding confusion after registration => min. medium
  if (category === 'onboarding' && (lower.includes('zmaten') || lower.includes('confus') ||
      lower.includes('nevím') || lower.includes('nejasn') || lower.includes('neočekáv'))) {
    return 'medium';
  }

  // Missing password rules => medium if can lead to rejection
  if ((lower.includes('heslo') || lower.includes('password')) &&
      (lower.includes('chybí') || lower.includes('missing') || lower.includes('není') ||
       lower.includes('nevím') || lower.includes('požadav') || lower.includes('pravidl'))) {
    // If it mentions rejection or error potential, it's medium
    if (lower.includes('odmít') || lower.includes('reject') || lower.includes('chyb') ||
        lower.includes('error') || lower.includes('fail')) {
      return 'medium';
    }
    return 'medium'; // Default to medium for password issues
  }

  // General medium severity
  if (lower.includes('confus') || lower.includes('unclear') || lower.includes('missing') ||
      lower.includes('zmaten') || lower.includes('nejasn') || lower.includes('chybí') ||
      lower.includes('matoucí') || lower.includes('těžk') || lower.includes('komplik')) {
    return 'medium';
  }

  return 'low';
};

// Generate stable issue ID
export const generateIssueId = (category: string, index: number): string => {
  const prefix = category.toUpperCase().slice(0, 3);
  return `UX-${prefix}-${String(index + 1).padStart(3, '0')}`;
};

// Generate stable positive ID
export const generatePositiveId = (category: string, index: number): string => {
  const prefix = category.toUpperCase().slice(0, 3);
  return `OK-${prefix}-${String(index + 1).padStart(3, '0')}`;
};

// Extract persona name from description
export const extractPersonaName = (persona: string): { name: string; description: string } => {
  // Try to find a name pattern like "Viktor", "Jana, 45", etc.
  const nameMatch = persona.match(/^([A-ZÁ-Ž][a-zá-ž]+)/);
  if (nameMatch) {
    return {
      name: nameMatch[1],
      description: persona,
    };
  }
  // Try to find "jmeno je X" pattern
  const jmenoMatch = persona.match(/jm[eé]no\s+je\s+([A-ZÁ-Ž][a-zá-ž]+)/i);
  if (jmenoMatch) {
    return {
      name: jmenoMatch[1],
      description: persona,
    };
  }
  // Fallback - use first few words as name
  const words = persona.split(/[,.\s]+/).slice(0, 2).join(' ');
  return {
    name: words || 'User',
    description: persona,
  };
};

// Generate specific, verifiable acceptance criteria
export const generateAcceptanceCriteria = (issue: string, category: string): string[] => {
  const criteria: string[] = [];
  const lower = issue.toLowerCase();

  // Password-related issues
  if (lower.includes('heslo') || lower.includes('password')) {
    if (lower.includes('chybí') || lower.includes('požadav') || lower.includes('pravidl') || lower.includes('nevím')) {
      criteria.push('Pod polem hesla je zobrazen text s požadavky (např. "min. 8 znaků, 1 číslo")');
      criteria.push('Při psaní hesla se dynamicky zobrazuje indikátor síly (slabé/střední/silné)');
      criteria.push('Nesplněné požadavky jsou zvýrazněny červeně před odesláním formuláře');
    }
    if (lower.includes('nevidím') || lower.includes('tečk') || lower.includes('skryt')) {
      criteria.push('U pole hesla je ikona oka pro přepnutí viditelnosti');
      criteria.push('Po kliknutí na ikonu se heslo zobrazí jako čitelný text');
    }
  }

  // Form/input issues
  if (category === 'form' || lower.includes('formulář') || lower.includes('políčk') || lower.includes('input')) {
    if (lower.includes('povinн') || lower.includes('required') || lower.includes('hvězdičk')) {
      criteria.push('Povinná pole jsou označena hvězdičkou (*) nebo textem "povinné"');
      criteria.push('Při pokusu o odeslání prázdného povinného pole se zobrazí chybová hláška');
    }
    if (lower.includes('validac') || lower.includes('chyb')) {
      criteria.push('Chybové hlášky se zobrazují přímo u příslušného pole');
      criteria.push('Text chyby jasně říká, co je špatně a jak to opravit');
    }
  }

  // Onboarding/registration issues
  if (category === 'onboarding' || lower.includes('registrac')) {
    if (lower.includes('uvítací') || lower.includes('potvr') || lower.includes('welcome') || lower.includes('neočekáv')) {
      criteria.push('Po úspěšné registraci se zobrazí uvítací zpráva s textem "Účet byl vytvořen"');
      criteria.push('Uvítací zpráva obsahuje jméno uživatele');
      criteria.push('Novinka/promo okno se nezobrazuje ihned po registraci, ale až po zavření uvítání');
    }
    if (lower.includes('slang') || lower.includes('hantýrk') || lower.includes('jazyk') || lower.includes('text')) {
      criteria.push('Všechny texty v UI jsou srozumitelné pro uživatele 60+');
      criteria.push('Neformální výrazy jsou nahrazeny standardním jazykem');
    }
  }

  // Visibility/size issues
  if (lower.includes('malý') || lower.includes('small') || lower.includes('vidět') || lower.includes('nevýrazn')) {
    criteria.push('Element má minimální velikost 44x44px (dotyková oblast)');
    criteria.push('Text má minimální velikost 16px');
    criteria.push('Kontrastní poměr textu vůči pozadí je min. 4.5:1');
  }

  // Feedback issues
  if (category === 'feedback' || lower.includes('zpětná') || lower.includes('feedback')) {
    criteria.push('Po každé uživatelské akci je viditelná odezva do 100ms');
    criteria.push('Úspěšné akce jsou potvrzeny zelenou barvou nebo ikonou ✓');
  }

  // Navigation issues
  if (category === 'navigation') {
    criteria.push('Odkaz je vizuálně odlišen od okolního textu (barva, podtržení)');
    criteria.push('Po najetí myší se změní kurzor na pointer');
  }

  // Generic fallback criteria based on issue text
  if (criteria.length === 0) {
    // Extract key action from issue
    if (lower.includes('přidat') || lower.includes('add')) {
      const what = issue.match(/přidat\s+([^,\.]+)/i)?.[1] || issue.match(/add\s+([^,\.]+)/i)?.[1];
      if (what) {
        criteria.push(`Element "${what.trim()}" je přítomen na stránce`);
        criteria.push(`Element "${what.trim()}" je viditelný bez scrollování`);
      }
    }
    if (lower.includes('zobrazit') || lower.includes('show') || lower.includes('display')) {
      criteria.push('Informace je viditelná ihned po načtení stránky');
      criteria.push('Informace je umístěna v kontextu relevantního prvku');
    }
  }

  // Ensure we have at least 2 criteria
  if (criteria.length < 2) {
    criteria.push('Změna je viditelná na stránce bez nutnosti refreshe');
    criteria.push('Funkčnost je ověřena manuálním testem');
  }

  // Limit to 5 criteria
  return criteria.slice(0, 5);
};

// Extract target from action
const getTarget = (step: StepResult): string | null => {
  if (step.action.inputs && step.action.inputs.length > 0) {
    return step.action.inputs.map(i => i.elementId).join(', ');
  }
  return step.action.elementId || null;
};

// Map evaluation result to JSON result
const mapResult = (result: EvaluationResult): JsonReportStep['result'] => {
  switch (result) {
    case 'met': return 'met';
    case 'partial': return 'partial';
    case 'surprised': return 'surprised';
    case 'unmet': return 'failed';
    default: return 'failed';
  }
};

// Build JSON report from session data
export const buildJsonReport = (
  report: SessionReport,
  videoPath?: string
): JsonReport => {
  const runId = new Date(report.startTime).toISOString().replace(/[:.]/g, '-');
  const persona = extractPersonaName(report.config.persona);

  // Build steps
  const steps: JsonReportStep[] = report.steps.map((step) => ({
    step: step.stepNumber,
    action: step.action.action,
    target: getTarget(step),
    value: step.action.value || (step.action.inputs ? JSON.stringify(step.action.inputs.map(i => i.value)) : undefined),
    result: mapResult(step.evaluation.result),
    notes: step.evaluation.notes.slice(0, 5),
  }));

  // Classify notes into issues, positives, and observations
  const issues: JsonReportIssue[] = [];
  const positives: JsonReportPositive[] = [];
  const observations: JsonReportObservation[] = [];
  let issueIndex = 0;
  let positiveIndex = 0;

  // Process step evaluation notes
  for (const step of report.steps) {
    for (const note of step.evaluation.notes) {
      if (note.length < 15) continue; // Skip trivial notes

      const sentiment = classifyNoteSentiment(note);
      const category = detectCategory(note);

      if (sentiment === 'negative') {
        const severity = detectSeverity(note, category);
        issues.push({
          id: generateIssueId(category, issueIndex++),
          severity,
          category,
          title: note.split('.')[0].slice(0, 100),
          evidence: {
            step: step.stepNumber,
            description: note,
          },
          recommendation: step.evaluation.suggestions.find(s =>
            detectCategory(s) === category
          ) || step.evaluation.suggestions[0] || 'Investigate and address this issue',
          acceptance_criteria: generateAcceptanceCriteria(note, category),
        });
      } else if (sentiment === 'positive') {
        positives.push({
          id: generatePositiveId(category, positiveIndex++),
          category,
          title: note.split('.')[0].slice(0, 100),
          evidence: {
            step: step.stepNumber,
            description: note,
          },
        });
      } else {
        observations.push({
          step: step.stepNumber,
          text: note,
        });
      }
    }

    // Process suggestions as potential issues (they indicate something to improve)
    for (const suggestion of step.evaluation.suggestions) {
      if (suggestion.length < 20) continue;

      // Check if this issue is already captured
      const alreadyExists = issues.some(i =>
        i.title.toLowerCase().includes(suggestion.toLowerCase().slice(0, 30)) ||
        suggestion.toLowerCase().includes(i.title.toLowerCase().slice(0, 30))
      );

      if (!alreadyExists) {
        const category = detectCategory(suggestion);
        const severity = detectSeverity(suggestion, category);
        issues.push({
          id: generateIssueId(category, issueIndex++),
          severity,
          category,
          title: suggestion.split('.')[0].slice(0, 100),
          evidence: {
            step: step.stepNumber,
            description: `Suggestion from evaluation: ${suggestion}`,
          },
          recommendation: suggestion,
          acceptance_criteria: generateAcceptanceCriteria(suggestion, category),
        });
      }
    }
  }

  // Add issues from summary if not already covered
  for (const issue of report.summary.issuesFound) {
    const alreadyExists = issues.some(i =>
      i.title.toLowerCase().includes(issue.toLowerCase().slice(0, 30)) ||
      issue.toLowerCase().includes(i.title.toLowerCase().slice(0, 30))
    );
    if (!alreadyExists && issue.length > 20) {
      const category = detectCategory(issue);
      const severity = detectSeverity(issue, category);
      issues.push({
        id: generateIssueId(category, issueIndex++),
        severity,
        category,
        title: issue.slice(0, 100),
        evidence: {
          step: 0,
          description: issue,
        },
        recommendation: report.summary.improvements.find(i =>
          detectCategory(i) === category
        ) || 'Address this UX issue',
        acceptance_criteria: generateAcceptanceCriteria(issue, category),
      });
    }
  }

  // Deduplicate issues by similar titles
  const uniqueIssues = issues.reduce((acc, issue) => {
    const isDuplicate = acc.some(existing => {
      const existingLower = existing.title.toLowerCase();
      const issueLower = issue.title.toLowerCase();
      // Check for significant overlap
      return existingLower.includes(issueLower.slice(0, 20)) ||
             issueLower.includes(existingLower.slice(0, 20));
    });
    if (!isDuplicate) acc.push(issue);
    return acc;
  }, [] as JsonReportIssue[]);

  // Calculate summary stats
  const met = steps.filter(s => s.result === 'met').length;
  const partial = steps.filter(s => s.result === 'partial').length;
  const failed = steps.filter(s => s.result === 'failed' || s.result === 'surprised').length;

  return {
    run_id: runId,
    url: report.config.url,
    persona,
    intent: report.config.intent || null,
    duration_ms: report.endTime - report.startTime,
    intuitiveness_score: report.summary.intuitivenessScore,
    artifacts: {
      video: videoPath,
      screenshots: [],
    },
    steps,
    issues: uniqueIssues.slice(0, 20),
    positives: positives.slice(0, 10),
    observations: observations.slice(0, 10),
    summary: {
      total_steps: steps.length,
      met,
      partial,
      failed,
    },
  };
};

// Save JSON report to file
export const saveJsonReport = async (
  report: SessionReport,
  outputPath: string,
  videoPath?: string
): Promise<void> => {
  const jsonReport = buildJsonReport(report, videoPath);
  await writeFile(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
};
