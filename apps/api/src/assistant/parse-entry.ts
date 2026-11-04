import { extractedCommandSchema, type ExtractedCommand } from './add-command.js';
import { getModel, type ConversationMessage, type ExtractionHints } from './role-router.js';

export type ParseEntryOptions = {
  history?: ConversationMessage[];
  hints?: ExtractionHints;
};

export async function parseEntry(
  text: string,
  options: ParseEntryOptions = {}
): Promise<ExtractedCommand> {
  try {
    const extract = getModel('entry-extraction');
    const raw = await extract({
      text,
      schema: extractedCommandSchema,
      history: options.history,
      hints: options.hints,
    });
    return extractedCommandSchema.parse(raw);
  } catch (error) {
    console.error('[assistant] Failed to parse entry:', error);
    return {
      kind: 'unsupported',
      reason:
        'I could not understand that as an add command. Try rephrasing with an amount and what it was for.',
    };
  }
}
