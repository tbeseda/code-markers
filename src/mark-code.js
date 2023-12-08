import parseValue from 'fancy-value-parser'

export const marker = {
  string (html, { mark, value }) {
    const c = mark === 'mark' ? null : mark
    html = html.replace(
      new RegExp(value, 'g'),
      `<mark${c ? ` class="${c}"` : ''}>${value}</mark>`,
    )
    return html
  },

  regex (html, { mark, value }) {
    const c = mark === 'mark' ? null : mark
    html = html.replace(
      new RegExp(`(${value.source})`, 'g'),
      `<mark${c ? ` class="${c}"` : ''}>$1</mark>`,
    )
    return html
  },

  number (html, { mark: c, value: lineNo }) {
    const lines = html.split('\n')
    const lineIndex = lineNo - 1
    const lineText = lines[lineIndex]

    if (lineText === undefined) return html

    lines[lineIndex] = lineText.replace(
      /class="code-line/g,
      `class="code-line ${c}`,
    )

    return lines.join('\n')
  },

  range (html, { mark: c, value: [start, end] }) {
    // ? is splitting into lines faster?
    // it's certainly more readable
    let count = 0
    html = html.replace(
      /class="code-line/g,
      (match, offset) => {
        count++
        if (count >= start && count <= end) {
          return `class="code-line ${c}`
        }
        return match
      })

    return html
  },

  pair (html, { mark: c, value: [line, matcher] }) {
    const lineNo = line.value
    const { type, value } = matcher

    const lines = html.split('\n')
    const lineIndex = lineNo - 1
    const lineText = lines[lineIndex]

    if (lineText === undefined) return html

    if (type === 'string' || type === null || type === 'number') {
      lines[lineIndex] = marker.string(lineText, { mark: c, value })
    } else if (type === 'regex') {
      lines[lineIndex] = marker.regex(lineText, { mark: c, value })
    }

    return lines.join('\n')
  },
}

/**
 * @description Create marks from options.
 * @param {Object} options
 * @return {Array}
 */
export function createMarksFromOptions (options) {
  const parsedOptions = Object.entries(options)
    .reduce((acc, [key, value]) => {
      if (!value) return acc
      const parsed = parseValue(value)
      if (parsed.type === null) parsed.type = 'string'
      acc[key] = parsed
      return acc
    }, { })

  let marks = []
  for (const [mark, option] of Object.entries(parsedOptions)) {
    if (option.type === 'set') {
      for (const val of option.value) {
        marks.push({ mark, ...val })
      }
    } else {
      marks.push({ mark, ...option })
    }
  }

  marks = marks.map(({ type, ...mark }) => ({ type: type || 'string', ...mark }))

  return marks
}

/**
 * @description Mark a code block string.
 * @param {String} html
 * @param {Object} [options]
 * @param {String | null} [options.mark]
 * @param {String | null} [options.ins]
 * @param {String | null} [options.del]
 * @return {Object}
 */
export default function markCode (html, options = {}) {
  if (!html || typeof html !== 'string') return null
  // some naive validation
  // block starts with a pre tag
  if (!html.match(/^<pre/)) return html
  // block has code tag
  if (!html.match(/<code/)) return html

  // if !options, we'll still wrap lines

  const match = html.match(/(<pre(?:\s+[^>]*)?>\s*<code(?:\s+[^>]*)?>)([\s\S]*?)(<\/code>\s*<\/pre>)/i)
  if (!match) return html

  const [, open, block, close] = match
  html = [
    open,
    block.split('\n')
      .map(line => `<span class="code-line">${line}</span>`)
      .join('\n'),
    close,
  ].join('')

  const marks = createMarksFromOptions(options)
  for (const mark of marks) {
    if (marker[mark.type]) {
      html = marker[mark.type](html, mark)
    } else {
      console.error(`Unknown mark type: ${mark.type}`)
    }
  }

  return html
}
