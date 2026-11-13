import SwiftUI

/// A drawn side view of a car for the made-up test listings, so they have a picture without
/// shipping real photos. A car's `photo` of "sample:<style>:<colour>" is drawn here,
/// e.g. "sample:suv:silver". Styles: sedan, hatchback, wagon, suv, minivan, pickup.
struct SampleCarPortrait: View {
    let spec: String

    static func isSample(_ photo: String?) -> Bool { photo?.hasPrefix("sample:") == true }

    var body: some View {
        let parts = spec.split(separator: ":").map(String.init)
        let shape = CarShape.named(parts.count > 1 ? parts[1] : "sedan")
        let paint = Self.paint(parts.count > 2 ? parts[2] : "blue")

        Canvas { context, size in
            // Draw in a 300 x 200 space, centred and scaled to fit.
            let scale = min(size.width / 300, size.height / 200)
            context.translateBy(x: (size.width - 300 * scale) / 2, y: (size.height - 200 * scale) / 2 + 6 * scale)
            context.scaleBy(x: scale, y: scale)

            // Ground shadow
            context.fill(Path(ellipseIn: CGRect(x: 20, y: 160, width: 260, height: 14)), with: .color(.black.opacity(0.45)))

            // Body
            let body = Path(roundedRect: CGRect(x: shape.bodyX.lowerBound, y: shape.bodyTop,
                                                width: shape.bodyX.upperBound - shape.bodyX.lowerBound,
                                                height: 158 - shape.bodyTop), cornerRadius: 16)
            context.fill(body, with: .linearGradient(Gradient(colors: [paint.light, paint.dark]),
                                                     startPoint: CGPoint(x: 150, y: shape.bodyTop),
                                                     endPoint: CGPoint(x: 150, y: 158)))

            // Cabin (roof and pillars), then glass inset inside it
            context.fill(polygon(shape.cabin), with: .color(paint.dark))
            context.fill(polygon(inset(shape.cabin, by: 7)), with: .linearGradient(
                Gradient(colors: [Color(white: 0.55), Color(white: 0.18)]),
                startPoint: CGPoint(x: 150, y: shape.cabin.map(\.y).min() ?? 60),
                endPoint: CGPoint(x: 150, y: shape.bodyTop)))
            // Pillar between the windows
            let mid = (shape.cabin[1].x + shape.cabin[2].x) / 2
            context.fill(Path(CGRect(x: mid - 3, y: shape.cabin[1].y, width: 6, height: shape.bodyTop - shape.cabin[1].y)),
                         with: .color(paint.dark))

            // Pickup bed rail
            if shape.isPickup {
                context.stroke(Path { p in
                    p.move(to: CGPoint(x: 172, y: shape.bodyTop + 4))
                    p.addLine(to: CGPoint(x: shape.bodyX.upperBound - 8, y: shape.bodyTop + 4))
                }, with: .color(paint.dark), lineWidth: 5)
            }

            // Door line and handle
            context.stroke(Path { p in
                p.move(to: CGPoint(x: mid, y: shape.bodyTop + 4))
                p.addLine(to: CGPoint(x: mid, y: 148))
            }, with: .color(paint.dark.opacity(0.7)), lineWidth: 1.5)
            context.fill(Path(roundedRect: CGRect(x: mid + 10, y: shape.bodyTop + 14, width: 16, height: 4), cornerRadius: 2),
                         with: .color(paint.dark))

            // Lights: front on the right, rear on the left
            context.fill(Path(roundedRect: CGRect(x: shape.bodyX.upperBound - 14, y: shape.bodyTop + 10, width: 12, height: 8),
                              cornerRadius: 3), with: .color(Color(red: 1, green: 0.93, blue: 0.7)))
            context.fill(Path(roundedRect: CGRect(x: shape.bodyX.lowerBound + 2, y: shape.bodyTop + 10, width: 9, height: 10),
                              cornerRadius: 3), with: .color(Color(red: 0.85, green: 0.12, blue: 0.12)))

            // Wheels
            for x in shape.wheels {
                context.fill(Path(ellipseIn: CGRect(x: x - 25, y: 133, width: 50, height: 50)), with: .color(Color(white: 0.07)))
                context.fill(Path(ellipseIn: CGRect(x: x - 13, y: 145, width: 26, height: 26)), with: .color(Color(white: 0.62)))
                context.fill(Path(ellipseIn: CGRect(x: x - 4, y: 154, width: 8, height: 8)), with: .color(Color(white: 0.3)))
            }
        }
        .background(
            LinearGradient(colors: [Color(hex: 0x2A3340), Color(hex: 0x141A22)], startPoint: .top, endPoint: .bottom)
        )
        .accessibilityLabel("Drawing of a \(parts.count > 2 ? parts[2] : "") \(parts.count > 1 ? parts[1] : "car")")
    }

    private func polygon(_ points: [CGPoint]) -> Path {
        Path { p in p.addLines(points); p.closeSubpath() }
    }

    /// Shrinks a 4-point cabin towards its centre, for the glass.
    private func inset(_ points: [CGPoint], by amount: CGFloat) -> [CGPoint] {
        let cx = points.map(\.x).reduce(0, +) / CGFloat(points.count)
        return [
            CGPoint(x: points[0].x + amount * 1.6, y: points[0].y),
            CGPoint(x: points[1].x + amount * 0.6, y: points[1].y + amount),
            CGPoint(x: points[2].x - amount * 0.6, y: points[2].y + amount),
            CGPoint(x: points[3].x - amount * 1.6, y: points[3].y),
        ].map { CGPoint(x: $0.x + (cx - $0.x) * 0.02, y: $0.y) }
    }

    private struct Paint { let light: Color; let dark: Color }

    private static func paint(_ name: String) -> Paint {
        switch name {
        case "red": Paint(light: Color(hex: 0xD3352B), dark: Color(hex: 0x7E1A14))
        case "green": Paint(light: Color(hex: 0x2E9E5B), dark: Color(hex: 0x15502D))
        case "silver": Paint(light: Color(hex: 0xC9CED4), dark: Color(hex: 0x6D747C))
        case "white": Paint(light: Color(hex: 0xF4F5F6), dark: Color(hex: 0xA4A9AE))
        case "navy": Paint(light: Color(hex: 0x2F4A7A), dark: Color(hex: 0x15233D))
        default: Paint(light: Color(hex: 0x3B78D8), dark: Color(hex: 0x1C3F7A)) // blue
        }
    }
}

/// Proportions for each body style, in the 300 x 200 drawing space. The car faces right.
private struct CarShape {
    let bodyX: ClosedRange<CGFloat>
    let bodyTop: CGFloat
    /// Rear bottom, rear roof, front roof, front bottom (windscreen base).
    let cabin: [CGPoint]
    let wheels: [CGFloat]
    var isPickup = false

    static func named(_ style: String) -> CarShape {
        switch style {
        case "hatchback":
            CarShape(bodyX: 45...255, bodyTop: 104, cabin: pts((70, 104), (84, 66), (180, 66), (222, 104)), wheels: [92, 210])
        case "wagon":
            CarShape(bodyX: 28...272, bodyTop: 102, cabin: pts((44, 102), (58, 66), (196, 66), (236, 102)), wheels: [82, 222])
        case "suv":
            CarShape(bodyX: 28...272, bodyTop: 94, cabin: pts((44, 94), (56, 54), (200, 54), (236, 94)), wheels: [82, 222])
        case "minivan":
            CarShape(bodyX: 24...276, bodyTop: 92, cabin: pts((38, 92), (48, 46), (214, 46), (250, 92)), wheels: [80, 226])
        case "pickup":
            CarShape(bodyX: 24...276, bodyTop: 104, cabin: pts((112, 104), (122, 62), (200, 62), (234, 104)), wheels: [80, 226],
                     isPickup: true)
        default: // sedan
            CarShape(bodyX: 28...272, bodyTop: 106, cabin: pts((70, 106), (100, 70), (190, 70), (232, 106)), wheels: [82, 222])
        }
    }

    private static func pts(_ p: (CGFloat, CGFloat)...) -> [CGPoint] { p.map { CGPoint(x: $0.0, y: $0.1) } }
}
