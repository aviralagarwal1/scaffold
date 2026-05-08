import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripHtml } from '../lib/server/text.ts';

test('inline tags leave no gap before punctuation or between adjacent runs', () => {
  assert.equal(stripHtml('<p>The book <em>Regional Advantage</em>, by Annalee.</p>'), 'The book Regional Advantage, by Annalee.');
  assert.equal(stripHtml('<p><strong>Bold</strong><em>Ital</em> and <a href="x">link</a>.</p>'), 'BoldItal and link.');
  assert.equal(stripHtml('<p>word<sup>1</sup> then</p>'), 'word1 then');
});

test('block tags still separate lines without leading spaces', () => {
  assert.equal(stripHtml('<p>one</p><p>two</p>'), 'one\ntwo');
  assert.equal(stripHtml('<li>x</li><li>y</li>'), 'x\ny');
  assert.equal(stripHtml('<p>a<br>b</p>'), 'a\nb');
  assert.equal(stripHtml('<td>a</td><td>b</td>'), 'a b');
});
