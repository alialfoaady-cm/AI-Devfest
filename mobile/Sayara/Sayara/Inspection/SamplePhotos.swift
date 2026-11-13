import SwiftUI

/// Drawn placeholder photos so the demo runs in the simulator with no camera.
/// The return set has a scratch on the back and a darker left side, matching the mock AI's answers.
enum SamplePhotos {
    static func make(_ phase: InspectionPhase) throws -> [Slot: String] {
        var photos: [Slot: String] = [:]
        for slot in Slot.allCases {
            let renderer = ImageRenderer(content: SampleCarArt(slot: slot, phase: phase))
            renderer.scale = 2
            guard let image = renderer.uiImage else { throw RuleError("Could not draw the sample photos.") }
            photos[slot] = try PhotoStore.save(image)
        }
        return photos
    }
}

private struct SampleCarArt: View {
    let slot: Slot
    let phase: InspectionPhase

    private let body0 = Color(red: 0.16, green: 0.38, blue: 0.78)
    private var isReturn: Bool { phase == .return }

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(white: 0.78), Color(white: 0.58)], startPoint: .top, endPoint: .bottom)
            content
            if isReturn && slot == .left {
                Color.black.opacity(0.78) // the "too dark" return photo
            }
        }
        .frame(width: 400, height: 300)
    }

    @ViewBuilder private var content: some View {
        switch slot {
        case .front, .back:
            ZStack {
                RoundedRectangle(cornerRadius: 26).fill(body0).frame(width: 260, height: 130).offset(y: 30)
                RoundedRectangle(cornerRadius: 20).fill(body0.opacity(0.9)).frame(width: 190, height: 80).offset(y: -50)
                RoundedRectangle(cornerRadius: 10).fill(Color(white: 0.85, opacity: 0.9)).frame(width: 160, height: 55).offset(y: -50)
                HStack(spacing: 150) {
                    Circle().fill(slot == .front ? Color.yellow.opacity(0.9) : Color.red.opacity(0.85)).frame(width: 30)
                    Circle().fill(slot == .front ? Color.yellow.opacity(0.9) : Color.red.opacity(0.85)).frame(width: 30)
                }.offset(y: 20)
                RoundedRectangle(cornerRadius: 4).fill(.white).frame(width: 80, height: 24).offset(y: 70)
                    .overlay(Text("DEMO").font(.system(size: 13, weight: .bold)).foregroundStyle(.black).offset(y: 70))
                if slot == .back && isReturn {
                    // Fresh marker "damage" on the rear bumper, left.
                    Path { p in
                        p.move(to: CGPoint(x: 90, y: 215)); p.addLine(to: CGPoint(x: 140, y: 200))
                        p.move(to: CGPoint(x: 95, y: 228)); p.addLine(to: CGPoint(x: 150, y: 212))
                    }
                    .stroke(Color.red, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 400, height: 300)
                }
            }
        case .left, .right:
            ZStack {
                Capsule().fill(body0).frame(width: 320, height: 90).offset(y: 30)
                RoundedRectangle(cornerRadius: 30).fill(body0).frame(width: 190, height: 80).offset(x: slot == .left ? 10 : -10, y: -20)
                RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.85, opacity: 0.9)).frame(width: 150, height: 45).offset(x: slot == .left ? 10 : -10, y: -25)
                HStack(spacing: 150) {
                    Circle().fill(Color(white: 0.12)).frame(width: 64)
                    Circle().fill(Color(white: 0.12)).frame(width: 64)
                }.offset(y: 70)
            }
        case .interior:
            ZStack {
                Color(white: 0.22)
                HStack(spacing: 30) {
                    RoundedRectangle(cornerRadius: 18).fill(Color(white: 0.12)).frame(width: 110, height: 170)
                    RoundedRectangle(cornerRadius: 18).fill(Color(white: 0.12)).frame(width: 110, height: 170)
                }.offset(y: 30)
                Circle().stroke(Color(white: 0.05), lineWidth: 14).frame(width: 110).offset(x: -70, y: -60)
            }
        case .dashboard:
            ZStack {
                Color(white: 0.1)
                HStack(spacing: 40) {
                    VStack(spacing: 6) {
                        Text("ODO km").font(.system(size: 14, weight: .medium)).foregroundStyle(.gray)
                        Text(isReturn ? "48682" : "48210")
                            .font(.system(size: 40, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(red: 0.4, green: 1, blue: 0.6))
                    }
                    VStack(spacing: 6) {
                        Text("FUEL").font(.system(size: 14, weight: .medium)).foregroundStyle(.gray)
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color(white: 0.25)).frame(width: 110, height: 18)
                            Capsule().fill(.orange).frame(width: isReturn ? 55 : 82, height: 18)
                        }
                        Text(isReturn ? "1/2" : "3/4").font(.system(size: 18, weight: .bold)).foregroundStyle(.white)
                    }
                }
            }
        }
    }
}
