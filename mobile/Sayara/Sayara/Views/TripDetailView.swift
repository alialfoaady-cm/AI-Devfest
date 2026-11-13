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
    @State private var cancelling = false
    @State private var addingCover = false

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

                // The chat opens once the car is booked, for the two people on the trip only.
                if isBorrower || isOwner { MessageButton(booking: booking) }

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
                if isOwner && (stage == .pickup || stage == .driving) {
                    Card {
                        Text((stage == .pickup
                              ? "\(borrower) has booked your car and has not picked it up yet."
                              : "\(borrower) has your car. The pickup photos are saved.")
                             + " You earn \(plural(Rules.tripCost(booking.days), "credit")) when it comes back, plus 1 for each extra mile.")
                            .foregroundStyle(Theme.text)
                    }
                }
                if stage == .returned && (isBorrower || isOwner),
                   let pickup = state.inspection(bookingId, .pickup), let returned = state.inspection(bookingId, .return) {
                    VStack(alignment: .leading, spacing: 8) {
                        (Text("Car returned. ")
                         + Text("\(isOwner ? "You" : owner) earned \(plural(Rules.tripCost(booking.days) + (booking.mileage?.credits ?? 0), "credit")).")
                            .foregroundStyle(Theme.greenText))
                            .font(.title2.bold())
                            .foregroundStyle(Theme.text)
                        Text(mileageText(booking, isBorrower: isBorrower, isOwner: isOwner, owner: owner, borrower: borrower))
                            .font(.subheadline).foregroundStyle(Theme.textSoft)
                    }
                    ImpactView(days: booking.days)
                    CompareReportView(pickup: pickup, returned: returned, canDecide: isOwner,
                                      borrowerName: borrower, insured: booking.insurance != nil)
                }
                // Either person can cancel until the car is picked up. What it costs shows only in that window.
                if (isBorrower || isOwner) && stage == .pickup {
                    Button("Cancel this trip") { cancelling = true }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.textSoft)
                        .underline()
                        .frame(maxWidth: .infinity)
                        .padding(.top, 4)
                        .sheet(isPresented: $cancelling) {
                            CancelTripSheet(booking: booking, otherName: isBorrower ? owner : borrower)
                        }
                }
                if let cancelled = booking.cancelled, isBorrower || isOwner {
                    let by = cancelled.by == store.currentUserId ? "You" : state.firstName(cancelled.by)
                    let parkingTo = cancelled.by == booking.userId ? (isOwner ? "you" : owner) : (isBorrower ? "you" : borrower)
                    Card {
                        Text("\(by) cancelled this trip.").font(.title3.bold()).foregroundStyle(Theme.text)
                        Text("\(by) paid \(payText(cancelled.fee)) to cancel. \(plural(cancelled.parkingCredits, "credit")) of it went to \(parkingTo) for parking, and the rest to Sayara. \(isBorrower ? "You" : borrower) got back the \(payText(cancelled.refund)) paid for the trip.")
                            .foregroundStyle(Theme.textSoft)
                    }
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
                Text("\(Day.short(booking.from)) to \(Day.short(booking.to)). \(isOwner ? "Borrowed by \(borrower)." : "Lent by \(owner).") \(booking.days * Config.milesIncludedPerDay) miles included.")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)
                HStack(spacing: 10) {
                    Pill(text: booking.insurance != nil ? "Insured: Sayara pays for damage" : "Not insured",
                         color: booking.insurance != nil ? Theme.greenText : Theme.textSoft,
                         symbol: booking.insurance != nil ? "checkmark.shield.fill" : "shield.slash")
                    if booking.insurance == nil && !isOwner && stage == .pickup {
                        Button("Add cover") { addingCover = true }
                            .font(.caption.weight(.semibold)).underline()
                            .foregroundStyle(Theme.text)
                            .sheet(isPresented: $addingCover) {
                                NavigationStack {
                                    Screen { CoverCard(booking: booking) }
                                        .navigationTitle("Add cover before pickup")
                                        .navigationBarTitleDisplayMode(.inline)
                                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { addingCover = false } } }
                                }
                                .preferredColorScheme(.dark)
                                .tint(Theme.green)
                            }
                    }
                }
                progress(stage)
            }
        }
    }

    /// What the dashboard photos said about miles, and what the extra ones cost.
    private func mileageText(_ booking: Booking, isBorrower: Bool, isOwner: Bool, owner: String, borrower: String) -> String {
        guard let m = booking.mileage else {
            return "The odometer could not be read from the dashboard photos, so there is no charge for miles."
        }
        if m.extraMiles == 0 { return "\(m.miles) miles driven, inside the \(m.included) included." }
        let cost = m.credits == 0
            ? "were too few to cost a credit."
            : "cost \(isBorrower ? "you" : borrower) \(plural(m.credits, "credit")), paid to \(isOwner ? "you" : owner)."
        return "\(m.miles) miles driven, \(m.included) included. The \(m.extraMiles) extra \(cost)"
    }

    /// Pick up, Drive, Return: three bars, filled up to where the trip is.
    private func progress(_ stage: TripStage) -> some View {
        let steps = ["Pick up", "Drive", "Return"]
        let step = stage == .cancelled ? -1 : stage.rawValue
        return HStack(spacing: 6) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, label in
                VStack(alignment: .leading, spacing: 4) {
                    Capsule().fill(index <= step ? Theme.green : Theme.line).frame(height: 4)
                    Text(label).font(.caption.weight(.medium))
                        .foregroundStyle(index == step ? Theme.text : Theme.textSoft)
                }
                .accessibilityElement(children: .combine)
                .accessibilityValue(index < step ? "done" : index == step ? "now" : "later")
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
            Button("Use real test photos", systemImage: "photo.stack") { useSamples(.pickup, real: true) }.buttonStyle(.secondary)
            missing(pickupPhotos)
        }
    }

    private func returnStep(_ pickup: Inspection) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(text: "Return photos",
                         detail: "Back at the airport, take the same six photos. Each one is compared with its pickup photo.")
            OnDeviceAIBadge()
            PhotoCaptureGrid(photos: $returnPhotos, status: status)
            if let status {
                let checking = Slot.allCases.first { status[$0] == .checking }
                Text(checking.map { "Comparing the \($0.label.lowercased()) photos." } ?? "All six pairs compared.")
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
            } else {
                Button("Check photos and return the car") { Task { await checkAndReturn(pickup) } }
                    .buttonStyle(.primary)
                    .disabled(returnPhotos.count < Slot.allCases.count)
                // Shown here too: the banner at the top is off screen when this button is tapped.
                if let error { ErrorBanner(message: error) }
                Button("Use sample photos") { useSamples(.return) }.buttonStyle(.secondary)
            Button("Use real test photos", systemImage: "photo.stack") { useSamples(.return, real: true) }.buttonStyle(.secondary)
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

    private func useSamples(_ phase: InspectionPhase, real: Bool = false) {
        do {
            let photos = try (real ? RealTestPhotos.make(phase, bookingId: bookingId) : SamplePhotos.make(phase))
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
        // Nothing came back at all: the server is down or not set up. Say so instead of six "unsure"s.
        if results.isEmpty, let problem = service.lastError {
            error = problem
            status = nil
            return
        }
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
