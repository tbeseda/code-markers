(() => {
  // node_modules/fancy-value-parser/index.js
  var T = {
    string: "string",
    regex: "regex",
    number: "number",
    boolean: "boolean",
    range: "range",
    pair: "pair",
    set: "set",
    null: null
  };
  function parseOption(option) {
    if (typeof option !== "string") {
      throw new TypeError(`Expected string, got ${typeof option}`);
    }
    let type;
    let value;
    if (option === "true") {
      type = T.boolean;
      value = true;
      return { type, value };
    }
    if (option === "false") {
      type = T.boolean;
      value = false;
      return { type, value };
    }
    const firstChar = option.charAt(0);
    const lastChar = option.charAt(option.length - 1);
    if (firstChar === "{" && lastChar === "}") {
      type = T.set;
      value = option.substring(1, option.length - 1).split(",").map((item) => item.trim()).map(parseOption);
      return { type, value };
    }
    if (option.includes(":")) {
      const [k = null, v = null] = option.split(/:(.*)/s);
      const parsedKey = k ? parseOption(k) : null;
      const parsedVal = v ? parseOption(v) : null;
      type = "pair";
      value = [parsedKey, parsedVal];
      let pairKey = null;
      if (parsedKey) {
        if ([T.number, T.string].includes(parsedKey.type)) {
          pairKey = parsedKey.value;
        } else {
          pairKey = k;
        }
      }
      let pairVal = null;
      if (parsedVal) {
        if ([T.number, T.string, T.regex].includes(parsedVal.type)) {
          pairVal = parsedVal.value;
        } else {
          pairVal = v;
        }
      }
      return {
        type,
        value,
        [pairKey]: pairVal
      };
    }
    switch (firstChar) {
      case "'":
        type = T.string;
        value = option.substring(1, option.length - 1);
        break;
      case "/":
        type = T.regex;
        value = new RegExp(option.substring(1, option.length - 1));
        break;
      case "{":
        type = T.set;
        value = option.substring(1, option.length - 1).split(",").map((item) => item.trim()).map(parseOption);
        break;
      default: {
        const n = Number(firstChar);
        if (isNaN(n)) {
          type = T.null;
          value = option;
        } else if (option.includes("-")) {
          const [start, end] = option.split("-");
          type = T.range;
          value = [parseInt(start), parseInt(end) || null];
        } else {
          type = T.number;
          value = parseInt(option);
        }
        break;
      }
    }
    return { type, value };
  }

  // src/mark-code.js
  var marker = {
    string(html, { mark, value }) {
      const c = mark === "mark" ? null : mark;
      html = html.replace(
        new RegExp(value, "g"),
        `<mark${c ? ` class="${c}"` : ""}>${value}</mark>`
      );
      return html;
    },
    regex(html, { mark, value }) {
      const c = mark === "mark" ? null : mark;
      html = html.replace(
        new RegExp(`(${value.source})`, "g"),
        `<mark${c ? ` class="${c}"` : ""}>$1</mark>`
      );
      return html;
    },
    number(html, { mark: c, value: lineNo }) {
      const lines = html.split("\n");
      const lineIndex = lineNo - 1;
      const lineText = lines[lineIndex];
      if (lineText === void 0)
        return html;
      lines[lineIndex] = lineText.replace(
        /class="code-line/g,
        `class="code-line ${c}`
      );
      return lines.join("\n");
    },
    range(html, { mark: c, value: [start, end] }) {
      let count = 0;
      html = html.replace(
        /class="code-line/g,
        (match, offset) => {
          count++;
          if (count >= start && count <= end) {
            return `class="code-line ${c}`;
          }
          return match;
        }
      );
      return html;
    },
    pair(html, { mark: c, value: [line, matcher] }) {
      const lineNo = line.value;
      const { type, value } = matcher;
      const lines = html.split("\n");
      const lineIndex = lineNo - 1;
      const lineText = lines[lineIndex];
      if (lineText === void 0)
        return html;
      if (type === "string" || type === null || type === "number") {
        lines[lineIndex] = marker.string(lineText, { mark: c, value });
      } else if (type === "regex") {
        lines[lineIndex] = marker.regex(lineText, { mark: c, value });
      }
      return lines.join("\n");
    }
  };
  function createMarksFromOptions(options) {
    const parsedOptions = Object.entries(options).reduce((acc, [key, value]) => {
      if (!value)
        return acc;
      const parsed = parseOption(value);
      if (parsed.type === null)
        parsed.type = "string";
      acc[key] = parsed;
      return acc;
    }, {});
    let marks = [];
    for (const [mark, option] of Object.entries(parsedOptions)) {
      if (option.type === "set") {
        for (const val of option.value) {
          marks.push({ mark, ...val });
        }
      } else {
        marks.push({ mark, ...option });
      }
    }
    marks = marks.map(({ type, ...mark }) => ({ type: type || "string", ...mark }));
    return marks;
  }
  function markCode(html, options = {}) {
    if (!html || typeof html !== "string")
      return null;
    if (!html.match(/^<pre/))
      return html;
    if (!html.match(/<code/))
      return html;
    const match = html.match(/(<pre(?:\s+[^>]*)?>\s*<code(?:\s+[^>]*)?>)([\s\S]*?)(<\/code>\s*<\/pre>)/i);
    if (!match)
      return html;
    const [, open, block, close] = match;
    html = [
      open,
      block.split("\n").map((line) => `<span class="code-line">${line}</span>`).join("\n"),
      close
    ].join("");
    const marks = createMarksFromOptions(options);
    for (const mark of marks) {
      if (marker[mark.type]) {
        html = marker[mark.type](html, mark);
      } else {
        console.error(`Unknown mark type: ${mark.type}`);
      }
    }
    return html;
  }

  // src/elem.js
  var CodeMarkers = class extends window.HTMLElement {
    constructor() {
      super();
      this.mark = this.getAttribute("mark");
      this.ins = this.getAttribute("ins");
      this.del = this.getAttribute("del");
    }
    markCode() {
      if (this.classList.contains("marked"))
        return;
      this.innerHTML = markCode(
        this.innerHTML.trim(),
        {
          mark: this.mark,
          ins: this.ins,
          del: this.del
        }
      );
      this.classList.add("marked");
    }
    connectedCallback() {
      const code = this.querySelector("pre > code");
      if (code?.classList.contains("hljs")) {
        this.markCode();
      }
    }
  };
  window.customElements.define("code-markers", CodeMarkers);
})();
