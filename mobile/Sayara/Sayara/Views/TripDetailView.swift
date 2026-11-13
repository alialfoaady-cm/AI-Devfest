import SwiftUI

/// One booking from pickup to return. The borrower sees the steps in the order they need them;
/// the owner sees where the trip is; both see the report once the car is back.
struct TripDetailView: View {
    @Environment(AppStore.self) private var store
    let bookingId: String

    @State private var pickupPhotos: [Slot: String] = [:]
    @State private var returnPhotos: [Slot: String] = [:]
    @State private var status: [Slot: SlotStatus]?
    @State private var error: String?

    var body: some View {
        let state = store.state
        if let booking = state.booking(bookingId), let car = state.car(booking.carId) {
            let stage = state.stage(bookingId)
            let owner = state.firstName(car.ownerId)
            let borrower = state.firstName(booking.userId)
            let isBorrower = booking.userId == store.currentUserId
            let isOwner = car.ownerId == store.currentUserId

            Screen {
                header(car: car, booking: booking, stage: stage, owner: owner, borrower: borrower, isOwner: isOwner)

                if let error { ErrorBanner(message: error) }

                if isBorrower && stage == .pickup {
                    WhereItIs(car: car, owner: owner, returning: false)
                    pickupStep
                }
                if isBorrower && stage == .driving, let pickup = state.inspection(bookingId, .pickup) {
                    LockerCodeView(bookingId: bookingId)
                    WhereItIs(car: car, owner: owner, returning: true)
                    returnStep(pickup)
                }
                if isOwner && stage != .returned {
                    Card {
                        Text((stage == .pickup
                              ? "\(borrower) has booked your car and has not picked it up yet."
                              : "\(borrower) has your car. The pickup photos are saved.")
                             + " You earn \(plural(booking.days, "credit")) when it comes back.")
                            .foregroundStyle(Theme.text)
                    }
                }
                if stage == .returned && (isBorrower || isOwner),
                   let pickup = state.inspection(bookingId, .pickup), let returned = state.inspection(bookingId, .return) {
                    (Text("Car returned. ")
                     + Text(isOwner ? "You earned \(plural(booking.days, "credit"))." : "\(owner) earned \(plural(booking.days, "credit")).")
                        .foregroundStyle(Theme.greenText))
                        .font(.title2.bold())
                        .foregroundStyle(Theme.text)
                    ImpactView(days: booking.days)
                    CompareReportView(pickup: pickup, returned: returned, canDecide: isOwner)
                }
                if !isBorrower && !isOwner {
                    Card { Text("This trip belongs to other users. Switch user at the top to see it.").foregroundStyle(Theme.textSoft) }
                }
            }
            .navigationTitle(car.model)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            Screen { Text("This trip no longer exists. The sample data may have been reset.").foregroundStyle(Theme.textSoft) }
        }
    }

    private func header(car: Car, booking: Booking, stage: TripStage, owner: String, borrower: String, isOwner: Bool) -> some View {
        HStack(alignment: .top, spacing: 14) {
            CarPhotoView(car: car)
                .frame(width: 110, height: 82)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 6) {
                Text("\(car.model) at \(car.airport)").font(.title3.weight(.heavy)).foregroundStyle(Theme.text)
                Text("\(Day.short(booking.from)) to \(Day.short(booking.to)). \(isOwner ? "Borrowed by \(borrower)." : "Lent by \(owner).")")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)
                progress(stage)
            }
        }
    }

    /// Pick up, Drive, Return: three bars, filled up to where the trip is.
    private func progress(_ stage: TripStage) -> some View {
        let steps = ["Pick up", "Drive", "Return"]
        return HStack(spacing: 6) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, label in
                VStack(alignment: .leading, spacing: 4) {
                    Capsule().fill(index <= stage.rawValue ? Theme.text : Theme.line).frame(height: 4)
                    Text(label).font(.caption.weight(.medium))
                        .foregroundStyle(index == stage.rawValue ? Theme.text : Theme.textSoft)
                }
                .accessibilityElement(children: .combine)
                .accessibilityValue(index < stage.rawValue ? "done" : index == stage.rawValue ? "now" : "later")
            }
        }
        .padding(.top, 4)
        .animation(.easeOut(duration: 0.3), value: stage)
    }

    private var pickupStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Photograph it before you drive",
                         detail: "Six photos record the car as you found it. They unlock the key locker.")
            PhotoCaptureGrid(photos: $pickupPhotos)
            Button("Save photos and get the key code") { savePickup() }
                .buttonStyle(.primary)
                .disabled(pickupPhotos.count < Slot.allCases.count)
            Button("Use sample photos") { useSamples(.pickup) }.buttonStyle(.secondary)
            missing(pickupPhotos)
        }
    }

    private func returnStep(_ pickup: Inspection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Return photos",
                         detail: "Back at the airport, take the same six photos. Each one is compared with its pickup photo.")
            PhotoCaptureGrid(photos: $returnPhotos, status: status)
            if let status {
                let checking = Slot.allCases.first { status[$0] == .checking }
                Text(checking.map { "Comparing the \($0.label.lowercased()) photos." } ?? "All six pairs compared.")
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
            } else {
                Button("Check photos and return the car") { Task { await checkAndReturn(pickup) } }
                    .buttonStyle(.primary)
                    .disabled(returnPhotos.count < Slot.allCases.count)
                Button("Use sample photos") { useSamples(.return) }.buttonStyle(.secondary)
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
        status = Dictionary(uniqueKeysWithValues: Slot.allCases.map { ($0, SlotStatus.waiting) })
        // One pair at a time: steady progress on screen, and no burst against a rate limit.
        for slot in Slot.allCases {
            status?[slot] = .checking
            var result: InspectionResult?
            if let before = pickup.photos[slot].flatMap({ PhotoStore.load($0) }),
               let after = returnPhotos[slot].flatMap({ PhotoStore.load($0) }) {
                result = await service.compare(before: before, after: after, slot: slot)
            }
            results[slot] = result
            status?[slot] = .done(Verdict.slot(result))
        }
        try? await Task.sleep(for: .milliseconds(600)) // let the last verdict be seen
        do {
            try store.update {
                try Rules.saveReturn(&$0, bookingId: bookingId, photos: returnPhotos,
                                     results: results, provider: service.providerName)
            }
        } catch {
            self.error = error.localizedDescription
        }
        status = nil
    }
}
