import { extractedCommandSchema, type ExtractedCommand } from './add-command.js';
import {
  getEntryExtractor,
  type ConversationMessage,
  type ExtractionHints,
} from './role-router.js';

export type ParseEntryOptions = {
  history?: ConversationMessage[];
  hints?: ExtractionHints;
};

export async function parseEntry(
  text: string,
  options: ParseEntryOptions = {}
): Promise<ExtractedCommand> {
  let raw: unknown;
  try {
    const extract = getEntryExtractor();
    raw = await extract({
      text,
      schema: extractedCommandSchema,
      history: options.history,
      hints: options.hints,
    });
  } catch (error) {
    // Provider outage, network failure, or unparseable model output — not the
    // user's phrasing. Tell them to retry instead of blaming their words.
    console.error('[assistant] Extraction failed:', error);
    return {
      kind: 'error',
      message: 'The assistant is unavailable right now. Try again in a moment.',
    };
  }

  try {
    return extractedCommandSchema.parse(raw);
  } catch (error) {
    console.error('[assistant] Extraction did not match the schema:', error);
    return {
      kind: 'unsupported',
      reason:
        'I could not understand that as an add command. Try rephrasing with an amount and what it was for.',
    };
  }
}
