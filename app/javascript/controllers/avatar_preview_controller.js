import { Controller } from "@hotwired/stimulus"

// Shows a live preview of the selected avatar image before form submit
export default class extends Controller {
  static targets = ["input", "preview", "fallback"]

  show() {
    const file = this.inputTarget.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      this.previewTarget.src = e.target.result
      this.previewTarget.classList.remove("hidden")
      // Hide initials fallback if present
      if (this.hasFallbackTarget) {
        this.fallbackTarget.classList.add("hidden")
      }
    }
    reader.readAsDataURL(file)
  }
}
