import markCode from './mark-code.js'

export default class CodeMarkers extends window.HTMLElement {
  constructor () {
    super()
    this.mark = this.getAttribute('mark')
    this.ins = this.getAttribute('ins')
    this.del = this.getAttribute('del')
  }

  markCode () {
    if (this.classList.contains('marked')) return
    this.innerHTML = markCode(
      this.innerHTML.trim(),
      {
        mark: this.mark,
        ins: this.ins,
        del: this.del,
      },
    )
    this.classList.add('marked')
  }

  connectedCallback () {
    const code = this.querySelector('pre > code')
    if (code?.classList.contains('hljs')) {
      this.markCode()
    }
  }
}

window.customElements.define('code-markers', CodeMarkers)
