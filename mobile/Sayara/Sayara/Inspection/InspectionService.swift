import SwiftUI
import UIKit

/// Compares one pickup photo with one return photo.
/// nil = the request failed or the answer could not be trusted. The screen shows that as "unsure".
protocol InspectionService: AnyObject {
    /// "mock", or what the server says it used ("watsonx", or "mock" when the server runs its own mock).
    var providerName: String { get }
    /// Why the last call failed, in words for the screen. nil when it worked.
    var lastError: String? { get }
    func compare(before: UIImage, after: UIImage, slot: Slot) async -> InspectionResult?
}

enum Inspector {
    /// The on-device damage model. No network, no key (LocalInspectionService.swift).
    static var current: InspectionService { LocalInspectionService() }
}

/// Canned answers, the same as lib/inspection/mock.ts. It never looks at the images.
final class MockInspectionService: InspectionService {
    let providerName = "mock"
    let lastError: String? = nil

    func compare(before: UIImage, after: UIImage, slot: Slot) async -> InspectionResult? {
        try? await Task.sleep(for: .milliseconds(450)) // long enough to see the progress
        let clear = InspectionResult(newDamage: [], notes: "No visible change between the two photos.")
        switch slot {
        case .back:
            return InspectionResult(
                newDamage: [Damage(location: "rear bumper, left", type: "scratch", severity: "minor", confidence: 0.86)],
                notes: "Two light marks on the return photo that are not on the pickup photo.")
        case .left:
            // The low-confidence case: must show as "unsure", not as damage.
            return InspectionResult(
                newDamage: [Damage(location: "left rear door", type: "dent", severity: "minor", confidence: 0.35)],
                notes: "The return photo is much darker than the pickup photo. The mark may be a shadow.")
        case .dashboard:
            return InspectionResult(newDamage: [], odometerKm: 48682, odometerBeforeKm: 48210, fuelLevel: "1/2",
                                    notes: "Odometer read from both photos. Fuel was at 3/4 at pickup.")
        case .front, .right, .interior:
            return clear
        }
    }
}

/// Sends the stitched pair to the web app's `/api/inspect` route, which holds the IBM watsonx key.
/// The phone never sees the key.
final class ServerInspectionService: InspectionService {
    let baseURL: URL
    private(set) var providerName = "server"
    private(set) var lastError: String?

    init(baseURL: URL) { self.baseURL = baseURL }

    private struct Body: Encodable { let slot: String; let image: String }
    private struct Reply: Decodable { let result: InspectionResult?; let provider: String?; let error: String? }

    func compare(before: UIImage, after: UIImage, slot: Slot) async -> InspectionResult? {
        guard let jpeg = Stitcher.stitch(before, after).jpegData(compressionQuality: 0.85) else { return nil }
        var request = URLRequest(url: baseURL.appending(path: "api/inspect"))
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(
            Body(slot: slot.rawValue, image: "data:image/jpeg;base64," + jpeg.base64EncodedString()))
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let reply = try? JSONDecoder().decode(Reply.self, from: data)
            guard (response as? HTTPURLResponse)?.statusCode == 200, let reply else {
                lastError = reply?.error ?? "The photo check server answered with an error."
                return nil
            }
            lastError = nil
            if let provider = reply.provider { providerName = provider }
            return Verdict.validated(reply.result)
        } catch {
            print("Inspection of \(slot.rawValue) failed:", error)
            lastError = "Could not reach the photo check server at \(baseURL.absoluteString)."
            return nil
        }
    }

    /// GET /api/inspect: which provider the server runs ("mock" or "watsonx").
    static func ping(_ baseURL: URL) async -> Result<String, Error> {
        struct Info: Decodable { let provider: String }
        var request = URLRequest(url: baseURL.appending(path: "api/inspect"))
        request.timeoutInterval = 8
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            return .success(try JSONDecoder().decode(Info.self, from: data).provider)
        } catch {
            return .failure(error)
        }
    }
}

/// Turns a result into what the screen says. "Flagged" means "the owner should look", not "the borrower did it".
enum Verdict: String {
    case clear, flagged, unsure

    static func finding(_ damage: Damage) -> Verdict {
        damage.confidence >= Config.minDamageConfidence ? .flagged : .unsure
    }

    static func slot(_ result: InspectionResult?) -> Verdict {
        guard let result else { return .unsure }
        if result.newDamage.isEmpty { return .clear }
        return result.newDamage.contains { finding($0) == .flagged } ? .flagged : .unsure
    }

    /// Kilometres driven, only when both readings exist and make sense.
    static func kmDriven(_ result: InspectionResult?) -> Int? {
        guard let after = result?.odometerKm, let before = result?.odometerBeforeKm, after >= before else { return nil }
        return after - before
    }

    /// Drops anything out of range rather than trusting it.
    static func validated(_ result: InspectionResult?) -> InspectionResult? {
        guard var result else { return nil }
        guard result.newDamage.allSatisfy({ (0...1).contains($0.confidence) }) else { return nil }
        if let km = result.odometerKm, km < 0 { result.odometerKm = nil }
        if let km = result.odometerBeforeKm, km < 0 { result.odometerBeforeKm = nil }
        return result
    }
}

/// "On-device AI" under the photo check: the damage model runs on this iPhone, nothing is uploaded.
struct OnDeviceAIBadge: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "cpu")
            Text("On-device AI").fontWeight(.bold)
            Text("· photos never leave this iPhone").foregroundStyle(Theme.textSoft)
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(Theme.text)
        .padding(.horizontal, 12).padding(.vertical, 7)
        .glassEffect(.regular.tint(Theme.green.opacity(0.18)), in: Capsule())
        .accessibilityElement(children: .combine)
    }
}
