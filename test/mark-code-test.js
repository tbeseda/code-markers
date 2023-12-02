import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import markCode, { createMarksFromOptions, marker } from '../src/mark-code.js'

test('create marks from options', () => {
  assert.deepEqual(createMarksFromOptions({}), [])
  assert.deepEqual(
    createMarksFromOptions({ mark: "'foo'", ins: 'bar', del: '"baz"' }),
    [
      { mark: 'mark', type: 'string', value: 'foo' },
      { mark: 'ins', type: 'string', value: 'bar' },
      { mark: 'del', type: 'string', value: '"baz"' },
    ],
  )
  assert.deepEqual(
    createMarksFromOptions({ mark: '42', ins: '2-4', del: '/baz/' }),
    [
      { mark: 'mark', type: 'number', value: 42 },
      { mark: 'ins', type: 'range', value: [2, 4] },
      { mark: 'del', type: 'regex', value: /baz/ },
    ],
  )
  assert.deepEqual(
    createMarksFromOptions({ mark: "{1,2-3,foo,'bar',/baz/}" }),
    [
      { mark: 'mark', type: 'number', value: 1 },
      { mark: 'mark', type: 'range', value: [2, 3] },
      { mark: 'mark', type: 'string', value: 'foo' },
      { mark: 'mark', type: 'string', value: 'bar' },
      { mark: 'mark', type: 'regex', value: /baz/ },
    ],
  )
})

test('marker string and regex', () => {
  assert.equal(
    marker.string(
      '<pre><code>foobar</code></pre>',
      { mark: 'mark', value: 'foo' },
    ),
    '<pre><code><mark>foo</mark>bar</code></pre>',
  )
  assert.equal(
    marker.string(
      '<pre><code>foobar</code></pre>',
      { mark: 'ins', value: 'foo' },
    ),
    '<pre><code><mark class="ins">foo</mark>bar</code></pre>',
  )
  assert.equal(
    marker.regex(
      '<pre><code>yes, no, yep</code></pre>',
      { mark: 'mark', value: /ye[sp]/ },
    ),
    '<pre><code><mark>yes</mark>, no, <mark>yep</mark></code></pre>',
  )
  assert.equal(
    marker.regex(
      '<pre><code>yes, no, yep</code></pre>',
      { mark: 'del', value: /ye[sp]/ },
    ),
    '<pre><code><mark class="del">yes</mark>, no, <mark class="del">yep</mark></code></pre>',
  )
})

test('marker: number and range', () => {
  // lines are passed as an integer or as a range
  assert.equal(
    marker.number(
      '<pre><code><span class="code-line">foo</span>\n<span class="code-line">bar</span>\n<span class="code-line">baz</span></code></pre>',
      { mark: 'mark', value: 2 },
    ),
    '<pre><code><span class="code-line">foo</span>\n<span class="code-line mark">bar</span>\n<span class="code-line">baz</span></code></pre>',
  )
  assert.equal(
    marker.number(
      '<pre><code><span class="code-line">foo</span>\n<span class="code-line">bar</span>\n<span class="code-line">baz</span></code></pre>',
      { mark: 'ins', value: 2 },
    ),
    '<pre><code><span class="code-line">foo</span>\n<span class="code-line ins">bar</span>\n<span class="code-line">baz</span></code></pre>',
  )
  assert.equal(
    marker.range(
      '<pre><code><span class="code-line">foo</span>\n<span class="code-line">bar</span>\n<span class="code-line">baz</span></code></pre>',
      { mark: 'mark', value: [2, 3] },
    ),
    '<pre><code><span class="code-line">foo</span>\n<span class="code-line mark">bar</span>\n<span class="code-line mark">baz</span></code></pre>',
  )
  assert.equal(
    marker.range(
      '<pre><code><span class="code-line">foo</span>\n<span class="code-line">bar</span>\n<span class="code-line">baz</span></code></pre>',
      { mark: 'del', value: [2, 3] },
    ),
    '<pre><code><span class="code-line">foo</span>\n<span class="code-line del">bar</span>\n<span class="code-line del">baz</span></code></pre>',
  )
})

test('mark baseline', () => {
  // @ts-ignore
  assert.equal(markCode(), null)
  assert.equal(markCode(''), null)

  assert.equal(markCode('<div>not code'), '<div>not code')
  assert.equal(markCode('<code>'), '<code>')
  assert.equal(markCode('<pre><code>'), '<pre><code>')
  assert.equal(markCode('<pre><code></code>'), '<pre><code></code>')
  assert.equal(markCode('<pre><code>foo</code></pre>'), '<pre><code><span class="code-line">foo</span></code></pre>')

  assert.equal(markCode('<div>not code', {}), '<div>not code')
  assert.equal(markCode('<code>', {}), '<code>')
  assert.equal(markCode('<pre><code>', {}), '<pre><code>')
  assert.equal(markCode('<pre><code></code>', {}), '<pre><code></code>')
  assert.equal(markCode('<pre><code>foo</code></pre>', {}), '<pre><code><span class="code-line">foo</span></code></pre>')
})

test('mark', () => {
  const here = path.dirname(new URL(import.meta.url).pathname)
  const sample = fs.readFileSync(path.join(here, 'sample.html'), 'utf8')
    .split('<!-- TEST -->')[1]
    .trim()
  const sampleExpected = fs.readFileSync(path.join(here, 'sample-expected.html'), 'utf8')
    .split('<!-- TEST -->')[1]
    .trim()

  assert.equal(
    markCode(
      sample,
      { mark: "{1,10,'red'}", ins: '{6-9,blue}', del: '{/green|grey/,3}' },
    ),
    sampleExpected,
  )
})
