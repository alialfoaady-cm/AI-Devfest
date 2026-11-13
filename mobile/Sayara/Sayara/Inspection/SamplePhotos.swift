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

/// Real photos (Wikimedia Commons, credited in CarPhotoCredits.md) to try the damage model on real damage.
/// Pickup is an undamaged car of the same model as the damaged return photo (not the same physical car;
/// free before/after photos of one car don't exist). The interior slot shows the same cracked-mirror photo on
/// both sides: the damage was already there at pickup, so nothing new should be reported. The dashboard keeps
/// the drawn odometer photos so the odometer reading can be tested.
enum RealTestPhotos {
    typealias Set = [Slot: (pickup: String, return: String)]

    /// slot -> (pickup asset, return asset). Each tap of "Use real test photos" at pickup moves to the next set;
    /// the return step then uses the same set as that trip's pickup.
    static let sets: [Set] = [
        [
            .front: ("clean-altima", "damage-altima"),        // Nissan Altima 2007-08, white
            .back: ("clean-starex", "damage-starex"),         // Hyundai Starex van
            .left: ("clean-astra", "damage-astra"),           // Vauxhall Astra estate
            .right: ("clean-xsara", "damage-esbjerg"),        // Citroen Xsara, silver
            .interior: ("damage-bmw-mirror", "damage-bmw-mirror"),
        ],
        [
            .front: ("clean-hhr", "damage-hhr"),              // Chevrolet HHR, silver
            .back: ("clean-roomster", "damage-roomster"),     // Skoda Roomster, blue
            .left: ("clean-slk", "damage-slk"),               // Mercedes SLK, silver
            .right: ("clean-w211", "damage-w211"),            // Mercedes E-Class W211, black
            .interior: ("damage-bmw-mirror", "damage-bmw-mirror"),
        ],
    ]

    private static let lastKey = "realTestSet.last"
    private static func key(_ bookingId: String) -> String { "realTestSet.\(bookingId)" }

    /// Which set this trip uses: a new one at each pickup tap, the trip's own at return.
    static func setIndex(for phase: InspectionPhase, bookingId: String) -> Int {
        let defaults = UserDefaults.standard
        if phase == .pickup {
            let next = defaults.object(forKey: lastKey) == nil ? 0 : (defaults.integer(forKey: lastKey) + 1) % sets.count
            defaults.set(next, forKey: lastKey)
            defaults.set(next, forKey: key(bookingId))
            return next
        }
        return min(defaults.integer(forKey: key(bookingId)), sets.count - 1)
    }

    static func make(_ phase: InspectionPhase, bookingId: String) throws -> [Slot: String] {
        var photos = try SamplePhotos.make(phase)   // dashboard (and a fallback for anything missing)
        for (slot, pair) in sets[setIndex(for: phase, bookingId: bookingId)] {
            let name = phase == .pickup ? pair.pickup : pair.return
            guard let image = UIImage(named: name) else { throw RuleError("Missing test photo \(name).") }
            photos[slot] = try PhotoStore.save(flatten(image))
        }
        return photos
    }

    /// The car cut-outs are transparent PNGs; put them on a grey car-park backdrop like a real photo.
    private static func flatten(_ image: UIImage) -> UIImage {
        let size = CGSize(width: 1024, height: 1024 * image.size.height / max(image.size.width, 1))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { ctx in
            UIColor(white: 0.55, alpha: 1).setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}
