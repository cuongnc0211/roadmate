import { Controller } from "@hotwired/stimulus"

// Shows/hides vehicle plate and available seats fields based on vehicle type selection
export default class extends Controller {
  static targets = ["vehicleType", "seatsField", "plateField"]

  connect() {
    this.toggle()
  }

  toggle() {
    const hasVehicle = this.vehicleTypeTarget.value !== "no_vehicle"
    this.seatsFieldTarget.classList.toggle("hidden", !hasVehicle)
    this.plateFieldTarget.classList.toggle("hidden", !hasVehicle)
    // Clear stale values so they don't persist in DB when switching to no_vehicle
    if (!hasVehicle) {
      this.plateFieldTarget.querySelector("input").value = ""
      this.seatsFieldTarget.querySelector("input").value = ""
    }
  }
}
