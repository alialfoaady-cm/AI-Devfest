import SwiftUI

/// The return report: pickup and return photos side by side, the AI's flags, and the owner's call.
/// The AI flags; the owner decides. Nothing here moves credits.
struct CompareReportView: View {
    @Environment(AppStore.self) private var store
    let pickup: Inspection
    let returned: Inspection
    let canDecide: Bool
    var borrowerName = "the borrower"
    /// The borrower bought cover for this trip.
    var insured = false

    /// Who pays for damage the owner confirms. The report is shown to the owner (who can decide) and to the borrower.
    private var payer: String {
        insured ? "This trip is insured, so Sayara pays for the repair."
            : "This trip is not insured, so \(canDecide ? borrowerName : "you") \(canDecide ? "pays" : "pay") for the repair."
    }

    private var results: [Slot: InspectionResult] { returned.aiResult ?? [:] }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(text: "Return report",
                         detail: "Checked by \(Self.providerLabel(returned.aiProvider)). The AI flags changes; the owner confirms or disputes them.")
            OnDeviceAIBadge()

            summary

            ForEach(Slot.allCases) { slot in
                slotCard(slot)
            }
        }
    }

    private var summary: some View {
        let dash = results[.dashboard]
        let flagged = Slot.allCases.filter { Verdict.slot(results[$0]) == .flagged }.count
        let unsure = Slot.allCases.filter { Verdict.slot(results[$0]) == .unsure }.count
        return HStack(spacing: 10) {
            stat(Verdict.kmDriven(dash).map { "\(Int((Double($0) / Config.kmPerMile).rounded()))" } ?? "—", "mi driven")
            stat(dash?.fuelLevel ?? "—", "fuel now")
            stat("\(flagged)", "flagged", color: flagged > 0 ? Theme.flag : Theme.green)
            stat("\(unsure)", "unsure", color: unsure > 0 ? Theme.unsure : Theme.textSoft)
        }
    }

    private func stat(_ value: String, _ label: String, color: Color = Theme.text) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.bold()).foregroundStyle(color).monospacedDigit()
            Text(label).font(.caption2).foregroundStyle(Theme.textSoft)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
    }

    private func slotCard(_ slot: Slot) -> some View {
        let result = results[slot]
        let verdict = Verdict.slot(result)
        return Card {
            HStack {
                Label(slot.label, systemImage: slot.symbol).font(.headline).foregroundStyle(Theme.text)
                Spacer()
                verdictPill(verdict)
            }
            HStack(spacing: 6) {
                photo(pickup.photos[slot], "Pickup")
                photo(returned.photos[slot], "Return", highlight: verdict == .flagged)
            }
            if result == nil {
                Text("The AI could not give a trusted answer for this pair. Look at the photos yourself.")
                    .font(.caption).foregroundStyle(Theme.unsure)
            }
            if let result {
                ForEach(Array(result.newDamage.enumerated()), id: \.offset) { index, damage in
                    finding(slot: slot, index: index, damage: damage)
                }
                if !result.notes.isEmpty {
                    Text(result.notes).font(.caption).foregroundStyle(Theme.textSoft)
                }
            }
            if let name = returned.photos[slot], PhotoStore.isTooDark(name, slot: slot) {
                Label("The return photo is very dark, so this check is less reliable.", systemImage: "moon.fill")
                    .font(.caption).foregroundStyle(Theme.unsure)
            }
        }
    }

    private func photo(_ name: String?, _ caption: String, highlight: Bool = false) -> some View {
        ZStack(alignment: .topLeading) {
            Color.clear
                .frame(height: 110)
                .frame(maxWidth: .infinity)
                .overlay { StoredPhoto(name: name) }   // a wide photo fills the frame instead of widening it
                .clipped()
            Text(caption)
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 6).padding(.vertical, 3)
                .background(.black.opacity(0.65), in: Capsule())
                .padding(6)
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(highlight ? Theme.flag : Theme.line, lineWidth: highlight ? 2 : 1))
    }

    private func verdictPill(_ verdict: Verdict) -> some View {
        switch verdict {
        case .clear: Pill(text: "No change", color: Theme.green, symbol: "checkmark")
        case .flagged: Pill(text: "Flagged", color: Theme.flag, symbol: "exclamationmark.triangle.fill")
        case .unsure: Pill(text: "Unsure", color: Theme.unsure, symbol: "questionmark")
        }
    }

    private func finding(slot: Slot, index: Int, damage: Damage) -> some View {
        let key = "\(slot.rawValue):\(index)"
        let verdict = Verdict.finding(damage)
        let decision = returned.ownerDecision[key]
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(verdict == .flagged
                     ? "\(damage.severity.capitalized) \(damage.type), \(damage.location)"
                     : "Maybe a \(damage.type), \(damage.location)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(verdict == .flagged ? Theme.flag : Theme.unsure)
                Spacer()
                Text("\(Int((damage.confidence * 100).rounded()))% sure")
                    .font(.caption.monospacedDigit()).foregroundStyle(Theme.textSoft)
            }
            if verdict == .flagged {
                if let decision {
                    Label(decision == .confirmed ? "Owner confirmed this damage" : "Owner disputed this flag",
                          systemImage: decision == .confirmed ? "checkmark.seal.fill" : "xmark.seal.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(decision == .confirmed ? Theme.flag : Theme.green)
                    Text(decision == .confirmed ? payer : "Nobody pays for a disputed flag.")
                        .font(.caption).foregroundStyle(Theme.textSoft)
                }
                if canDecide {
                    HStack(spacing: 8) {
                        Button("Confirm") { decide(key, .confirmed) }
                            .buttonStyle(.primary)
                        Button("Dispute") { decide(key, .disputed) }
                            .buttonStyle(.secondary)
                    }
                } else if decision == nil {
                    Text("Waiting for the owner to confirm or dispute.").font(.caption).foregroundStyle(Theme.textSoft)
                }
            }
        }
        .padding(10)
        .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 10))
    }

    private func decide(_ key: String, _ decision: OwnerDecision) {
        try? store.update { Rules.decide(&$0, inspectionId: returned.id, findingKey: key, decision: decision) }
    }

    /// Who checked the photos, for the report header.
    static func providerLabel(_ provider: String?) -> String {
        switch provider {
        case "on-device": "the on-device damage model"
        case "watsonx": "IBM watsonx.ai"
        case "mock": "the sample answers"
        case let other?: "AI (\(other))"
        case nil: "AI"
        }
    }
}
