(() => {
  // node_modules/fancy-value-parser/index.js
  function parseOption(option) {
    if (typeof option !== "string") {
      throw new TypeError(`Expected string, got ${typeof option}`);
    }
    const firstChar = option.charAt(0);
    let type;
    let value;
    switch (firstChar) {
      case "'":
        type = "string";
        value = option.substring(1, option.length - 1);
        break;
      case "/":
        type = "regex";
        value = new RegExp(option.substring(1, option.length - 1));
        break;
      case "{":
        type = "set";
        value = option.substring(1, option.length - 1).split(",").map((item) => item.trim()).map(parseOption);
        break;
      default: {
        const n = Number(firstChar);
        if (isNaN(n)) {
          type = null;
          value = option;
        } else if (option.includes("-")) {
          const [start, end] = option.split("-");
          type = "range";
          value = [parseInt(start), parseInt(end) || null];
        } else {
          type = "number";
          value = parseInt(option);
        }
        break;
      }
    }
    return { type, value };
  }

  // src/mark-code.js
  var marker = {
    string(html, mark) {
      const c = mark.mark === "mark" ? null : mark.mark;
      html = html.replace(
        new RegExp(mark.value, "g"),
        `<mark${c ? ` class="${c}"` : ""}>${mark.value}</mark>`
      );
      return html;
    },
    regex(html, mark) {
      const c = mark.mark === "mark" ? null : mark.mark;
      html = html.replace(
        new RegExp(`(${mark.value.source})`, "g"),
        `<mark${c ? ` class="${c}"` : ""}>$1</mark>`
      );
      return html;
    },
    number(html, { mark: c, value: lineNo }) {
      let count = 0;
      html = html.replace(
        /class="code-line/g,
        (match, offset) => {
          count++;
          if (count === lineNo) {
            return `class="code-line ${c}`;
          }
          return match;
        }
      );
      return html;
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
