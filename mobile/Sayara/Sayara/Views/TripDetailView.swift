import SwiftUI

/// One booking from pickup to return: photos, locker code, map, return check, report.
struct TripDetailView: View {
    @Environment(AppStore.self) private var store
    let bookingId: String

    @State private var pickupPhotos: [Slot: String] = [:]
    @State private var returnPhotos: [Slot: String] = [:]
    @State private var checking: Int?
    @State private var error: String?

    var body: some View {
        let state = store.state
        if let booking = state.booking(bookingId), let car = state.car(booking.carId) {
            let pickup = state.inspection(bookingId, .pickup)
            let returned = state.inspection(bookingId, .return)
            let isBorrower = booking.userId == store.currentUserId
            let isOwner = car.ownerId == store.currentUserId

            Screen {
                Card {
                    CarSummary(car: car, owner: state.user(car.ownerId))
                    HStack {
                        Pill(text: "\(Day.short(booking.from)) – \(Day.short(booking.to))", symbol: "calendar")
                        Pill(text: plural(booking.days, "credit"), symbol: "creditcard")
                        Spacer()
                        Pill(text: booking.status == .returned ? "Returned" : "Booked",
                             color: booking.status == .returned ? Theme.textSoft : Theme.green)
                    }
                    if isOwner {
                        Text("Borrowed by \(state.user(booking.userId)?.name ?? "someone"). You earn \(plural(booking.days, "credit")) when it comes back.")
                            .font(.caption).foregroundStyle(Theme.textSoft)
                    }
                }

                if let error { ErrorBanner(message: error) }

                if pickup == nil {
                    if isBorrower {
                        pickupStep
                    } else {
                        Card { Text("Waiting for the borrower's pickup photos.").foregroundStyle(Theme.textSoft) }
                    }
                } else if returned == nil {
                    if isBorrower {
                        LockerCodeView(bookingId: bookingId)
                        ParkingMapView(car: car)
                        returnStep(pickup!)
                    } else {
                        Card {
                            Label("Picked up. Six pickup photos are on file.", systemImage: "checkmark.seal.fill")
                                .foregroundStyle(Theme.green)
                        }
                    }
                } else if let pickup, let returned {
                    ImpactView(days: booking.days)
                    CompareReportView(pickup: pickup, returned: returned, canDecide: isOwner)
                }
            }
            .navigationTitle(car.model)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            Screen { Text("This trip no longer exists.").foregroundStyle(Theme.textSoft) }
        }
    }

    private var pickupStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Step 1 · Pickup photos",
                         detail: "Take six photos before you drive. The locker code unlocks when they are done.")
            PhotoCaptureGrid(photos: $pickupPhotos)
            Button("Use sample pickup photos") { useSamples(.pickup) }.buttonStyle(.secondary)
            Button("Save photos and unlock the key") { savePickup() }
                .buttonStyle(.primary)
                .disabled(pickupPhotos.count < Slot.allCases.count)
            missing(pickupPhotos)
        }
    }

    private func returnStep(_ pickup: Inspection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Step 2 · Return photos",
                         detail: "Back at the airport, take the same six photos. The AI compares each one with its pickup photo.")
            PhotoCaptureGrid(photos: $returnPhotos, disabled: checking != nil)
            if let checking {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Comparing \(Slot.allCases[checking].label.lowercased()) photos, \(checking + 1) of \(Slot.allCases.count)")
                        .font(.subheadline.weight(.semibold))
                    ProgressView(value: Double(checking) + 0.5, total: Double(Slot.allCases.count))
                }
            } else {
                Button("Use sample return photos") { useSamples(.return) }.buttonStyle(.secondary)
                Button("Check photos and return car") { Task { await checkAndReturn(pickup) } }
                    .buttonStyle(.primary)
                    .disabled(returnPhotos.count < Slot.allCases.count)
                missing(returnPhotos)
            }
        }
    }

    @ViewBuilder private func missing(_ photos: [Slot: String]) -> some View {
        let left = Slot.allCases.filter { photos[$0] == nil }
        if !left.isEmpty {
            Text("Still needed: \(left.map { $0.label.lowercased() }.joined(separator: ", ")).")
                .font(.caption).foregroundStyle(Theme.textSoft)
        }
    }

    private func useSamples(_ phase: InspectionPhase) {
        do {
            let photos = try SamplePhotos.make(phase)
            if phase == .pickup { pickupPhotos = photos } else { returnPhotos = photos }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func savePickup() {
        do {
            try store.update { try Rules.savePickup(&$0, bookingId: bookingId, photos: pickupPhotos) }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func checkAndReturn(_ pickup: Inspection) async {
        error = nil
        let service = Inspector.current
        var results: [Slot: InspectionResult] = [:]
        // One pair at a time: steady progress on screen, and no burst against a rate limit.
        for (index, slot) in Slot.allCases.enumerated() {
            checking = index
            guard let before = pickup.photos[slot].flatMap(PhotoStore.load),
                  let after = returnPhotos[slot].flatMap(PhotoStore.load) else { continue }
            if let result = await service.compare(before: before, after: after, slot: slot) {
                results[slot] = result
            }
        }
        do {
            try store.update {
                try Rules.saveReturn(&$0, bookingId: bookingId, photos: returnPhotos,
                                     results: results, provider: service.providerName)
            }
        } catch {
            self.error = error.localizedDescription
        }
        checking = nil
    }
}
