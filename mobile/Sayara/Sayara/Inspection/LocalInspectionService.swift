import CoreML
import UIKit
import Vision

/// The photo check, run entirely on the phone. No network, no key.
///
/// Car sides and the interior: a YOLOv11-nano car-damage detector (DamageDetector.mlpackage, converted from
/// huggingface.co/vineetsarpal/yolov11n-car-damage, Apache-2.0) looks at the pickup photo and the return photo.
/// A kind of damage it finds on the return photo but not on the pickup photo is new; damage on both was
/// already there and is not blamed on the borrower.
///
/// Dashboard: on-device text recognition reads the odometer (largest 4 to 7 digit number) and the fuel
/// fraction ("1/2") on both photos.
final class LocalInspectionService: InspectionService {
    let providerName = "on-device"
    private(set) var lastError: String?

    /// Detections below this are ignored. The report's own 60% line then decides flagged or unsure.
    static let minDetection: Float = 0.25

    private static let model: VNCoreMLModel? = {
        let config = MLModelConfiguration()
        config.computeUnits = .all
        guard let ml = try? DamageDetector(configuration: config).model else { return nil }
        return try? VNCoreMLModel(for: ml)
    }()

    struct Finding {
        let label: String        // "Headlight-damage"
        let confidence: Float
        let box: CGRect          // normalised, origin bottom-left (Vision)
    }

    func compare(before: UIImage, after: UIImage, slot: Slot) async -> InspectionResult? {
        if slot == .dashboard { return await Task.detached { Self.readDashboard(before: before, after: after) }.value }
        guard Self.model != nil else {
            lastError = "The damage model could not be loaded."
            return nil
        }
        let result: InspectionResult? = await Task.detached {
            guard let pickup = Self.detect(before), let back = Self.detect(after) else { return nil }
            return Self.newDamage(pickup: pickup, returned: back, slot: slot)
        }.value
        lastError = result == nil ? "The damage model could not read these photos." : nil
        return result
    }

    // MARK: Damage

    nonisolated static func detect(_ image: UIImage) -> [Finding]? {
        guard let model, let cg = image.cgImage else { return nil }
        let request = VNCoreMLRequest(model: model)
        request.imageCropAndScaleOption = .scaleFit
        do {
            try VNImageRequestHandler(cgImage: cg, orientation: image.cgOrientation).perform([request])
        } catch {
            return nil
        }
        return (request.results as? [VNRecognizedObjectObservation] ?? []).compactMap { o in
            // o.confidence is the detector's own score; label confidences are only shares among the 14 kinds.
            guard let top = o.labels.first, o.confidence >= minDetection else { return nil }
            return Finding(label: top.identifier, confidence: o.confidence, box: o.boundingBox)
        }
    }

    /// Damage on the return photo whose kind is not on the pickup photo. One entry per kind, strongest first.
    nonisolated static func newDamage(pickup: [Finding], returned: [Finding], slot: Slot) -> InspectionResult {
        let before = Set(pickup.map(\.label))
        var strongest: [String: Finding] = [:]
        for f in returned where !before.contains(f.label) {
            if (strongest[f.label]?.confidence ?? 0) < f.confidence { strongest[f.label] = f }
        }
        let damage = strongest.values.sorted { $0.confidence > $1.confidence }.map { f in
            Damage(location: location(f, slot: slot), type: kind(f.label),
                   severity: f.box.width * f.box.height > 0.25 ? "major" : f.box.width * f.box.height > 0.08 ? "moderate" : "minor",
                   confidence: Double(f.confidence))
        }
        let already = Set(returned.map(\.label)).intersection(before).map(kind).sorted()
        var notes: [String] = []
        notes.append(damage.isEmpty ? "No new damage found on the return photo." : "Found on the return photo but not at pickup.")
        if !already.isEmpty { notes.append("Already there at pickup: \(already.joined(separator: ", ")).") }
        return InspectionResult(newDamage: damage, notes: notes.joined(separator: " "))
    }

    /// "Front-windscreen-damage" -> "front windscreen damage"
    nonisolated static func kind(_ label: String) -> String {
        label.replacingOccurrences(of: "-", with: " ").replacingOccurrences(of: "_", with: " ").lowercased()
    }

    /// "front, left of photo"
    nonisolated static func location(_ f: Finding, slot: Slot) -> String {
        let x = f.box.midX
        let part = x < 0.36 ? "left of photo" : x > 0.64 ? "right of photo" : "middle of photo"
        return "\(slot.label.lowercased()), \(part)"
    }

    // MARK: Dashboard

    nonisolated static func readDashboard(before: UIImage, after: UIImage) -> InspectionResult {
        let a = readText(before), b = readText(after)
        let kmBefore = odometer(a), kmAfter = odometer(b)
        let fuel = fuelLevel(b)
        let read = [kmBefore == nil ? nil : "pickup odometer", kmAfter == nil ? nil : "return odometer", fuel == nil ? nil : "fuel"].compactMap { $0 }
        return InspectionResult(newDamage: [], odometerKm: kmAfter, odometerBeforeKm: kmBefore, fuelLevel: fuel,
                                notes: read.isEmpty ? "Could not read the dashboard." : "Read on the phone: \(read.joined(separator: ", ")).")
    }

    nonisolated static func readText(_ image: UIImage) -> [String] {
        guard let cg = image.cgImage else { return [] }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        try? VNImageRequestHandler(cgImage: cg, orientation: image.cgOrientation).perform([request])
        return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    }

    /// The largest 4 to 7 digit number on the dashboard.
    nonisolated static func odometer(_ lines: [String]) -> Int? {
        lines.flatMap { line in
            line.replacingOccurrences(of: ",", with: "").replacingOccurrences(of: " ", with: "")
                .split(whereSeparator: { !$0.isNumber }).compactMap { $0.count >= 4 && $0.count <= 7 ? Int($0) : nil }
        }.max()
    }

    /// "1/2", "3/4", "F", "E".
    nonisolated static func fuelLevel(_ lines: [String]) -> String? {
        for line in lines {
            if let r = line.range(of: #"[0-8]\s?/\s?[1-8]"#, options: .regularExpression) {
                return line[r].replacingOccurrences(of: " ", with: "")
            }
        }
        return nil
    }
}

extension UIImage {
    nonisolated var cgOrientation: CGImagePropertyOrientation {
        switch imageOrientation {
        case .up: .up
        case .down: .down
        case .left: .left
        case .right: .right
        case .upMirrored: .upMirrored
        case .downMirrored: .downMirrored
        case .leftMirrored: .leftMirrored
        case .rightMirrored: .rightMirrored
        @unknown default: .up
        }
    }
}
