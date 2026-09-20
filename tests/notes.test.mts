import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findNoteIndex, selectionContext } from '../lib/client/notes.ts';

test('repeated quotations use the surrounding passage, including whitespace', () => {
  const text = 'First thought.\n\nA repeated line.\n\nSecond thought.\n\nA repeated line.\n\nThe end.';
  const quote = 'A repeated line.';
  const start = text.lastIndexOf(quote);
  assert.equal(findNoteIndex(text, { quote, ...selectionContext(text, start, quote) }), start);
});

test('sync can move a unique quotation without losing its note', () => {
  const quote = 'Keep this sentence.';
  const original = 'Introduction. ' + quote;
  const note = { quote, ...selectionContext(original, original.indexOf(quote), quote) };
  assert.equal(findNoteIndex('New introduction. ' + original, note), 32);
});

test('ambiguous or removed quotations stay unplaced instead of marking the wrong passage', () => {
  assert.equal(findNoteIndex('same then same', { quote: 'same', prefix: 'old context', suffix: '' }), -1);
  assert.equal(findNoteIndex('rewritten', { quote: 'removed', prefix: '', suffix: '' }), -1);
});

test('identical surrounding contexts are also ambiguous', () => {
  assert.equal(findNoteIndex('before same after / before same after', { quote: 'same', prefix: 'before ', suffix: ' after' }), -1);
});
