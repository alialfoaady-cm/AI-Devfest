import SwiftUI

/// Black background, green accents. Change colours here and nowhere else.
enum Theme {
    // The web app's dark colours (app/globals.css on the team's ui-redesign branch).
    static let background = Color(hex: 0x000000)   // --canvas
    static let surface = Color(hex: 0x161616)      // --surface
    static let surfaceRaised = Color(hex: 0x242424) // --surface-2
    static let line = Color(hex: 0x2C2C2C)         // --line
    static let text = Color.white                  // --ink
    static let textSoft = Color(hex: 0xA8A8A8)     // --ink-soft
    static let green = Color(hex: 0x1FDC6C)        // --green: actions and the map pin
    static let greenText = Color(hex: 0x3FE585)    // --green-ink: green as text
    static let greenTint = Color(hex: 0x0C2A18)    // --green-soft
    static let onGreen = Color(hex: 0x04180C)      // text on green
    static let flag = Color(hex: 0xFF7B6E)         // --red
    static let unsure = Color(hex: 0xF5B84D)       // --amber
    static let radius: CGFloat = 12                // cards and maps
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

extension Theme {
    /// iOS 26 Liquid Glass on every button. Set to false for the flat look (solid green, grey outline).
    static let liquidGlass = true
}

/// The main action on a screen: green. With Liquid Glass it is green-tinted glass.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        let label = configuration.label
            .font(.headline)
            .foregroundStyle(Theme.onGreen)
            .frame(maxWidth: .infinity, minHeight: 52)
        if Theme.liquidGlass {
            label
                .glassEffect(.regular.tint(Theme.green.opacity(isEnabled ? 0.75 : 0.25)).interactive(), in: Capsule())
                .overlay(Capsule().strokeBorder(GlassRim.gradient.opacity(0.7), lineWidth: 0.8))
                .opacity(isEnabled ? 1 : 0.6)
        } else {
            label
                .background(Theme.green.opacity(isEnabled ? 1 : 0.3), in: RoundedRectangle(cornerRadius: 8))
                .scaleEffect(configuration.isPressed ? 0.98 : 1)
                .opacity(configuration.isPressed ? 0.85 : 1)
        }
    }
}

/// Second actions such as "Use sample photos". With Liquid Glass it is clear glass.
struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        let label = configuration.label
            .font(.headline)
            .foregroundStyle(Theme.text.opacity(isEnabled ? 1 : 0.4))
            .frame(maxWidth: .infinity, minHeight: 48)
        if Theme.liquidGlass {
            label
                .glassEffect(.clear.tint(.white.opacity(isEnabled ? 0.03 : 0.01)).interactive(), in: Capsule())
                .overlay(Capsule().strokeBorder(GlassRim.gradient.opacity(0.6), lineWidth: 0.8))
        } else {
            label
                .background(configuration.isPressed ? Theme.surfaceRaised : Theme.surface, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.line, lineWidth: 1))
        }
    }
}

/// The bright edge along the top of a glass button, fading out towards the bottom.
enum GlassRim {
    static let gradient = LinearGradient(colors: [.white.opacity(0.7), .white.opacity(0.1), .white.opacity(0.3)],
                                         startPoint: .top, endPoint: .bottom)
}

/// The glossy finish: a soft white highlight across the top half, like light on lacquer.
/// Drawn over glass buttons and cards; it never takes taps.
struct Gloss<S: Shape>: View {
    var shape: S
    var strength: Double = 1

    var body: some View {
        shape
            .fill(LinearGradient(stops: [.init(color: .white.opacity(0.32 * strength), location: 0),
                                         .init(color: .white.opacity(0.08 * strength), location: 0.45),
                                         .init(color: .clear, location: 0.55)],
                                 startPoint: .top, endPoint: .bottom))
            .blendMode(.plusLighter)
            .allowsHitTesting(false)
    }
}

/// A faint green glow on the black page, so Liquid Glass has something to refract. Only drawn with glass on.
struct GlassBackdrop: View {
    var body: some View {
        ZStack {
            Theme.background
            if Theme.liquidGlass {
                RadialGradient(colors: [Color(hex: 0x1F6BDC).opacity(0.16), .clear], center: .bottomLeading, startRadius: 0, endRadius: 460)
                // A wide, faint diagonal sheen so the page itself looks polished.
                LinearGradient(stops: [.init(color: .white.opacity(0.05), location: 0),
                                       .init(color: .clear, location: 0.35)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
        .ignoresSafeArea()
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { .init() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { .init() }
}

struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radius))
            .overlay(Gloss(shape: RoundedRectangle(cornerRadius: Theme.radius), strength: Theme.liquidGlass ? 0.2 : 0))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius)
                .stroke(Theme.liquidGlass ? AnyShapeStyle(GlassRim.gradient.opacity(0.5)) : AnyShapeStyle(Theme.line), lineWidth: 1))
    }
}

struct SectionTitle: View {
    let text: String
    var detail: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(text).font(.title3.bold()).foregroundStyle(Theme.text)
            if let detail { Text(detail).font(.subheadline).foregroundStyle(Theme.textSoft) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Pill: View {
    let text: String
    var color: Color = Theme.green
    var symbol: String? = nil

    var body: some View {
        HStack(spacing: 4) {
            if let symbol { Image(systemName: symbol) }
            Text(text)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(color)
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(color.opacity(0.15), in: Capsule())
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "exclamationmark.triangle.fill")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.flag)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.flag.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
    }
}

/// Black page with a scrolling column of cards.
struct Screen<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) { content }
                .padding(16)
                .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(GlassBackdrop())
    }
}

func plural(_ count: Int, _ word: String) -> String {
    "\(count) \(word)\(count == 1 ? "" : "s")"
}

/// 367.5 -> "$367.50"
func usd(_ amount: Double) -> String { String(format: "$%.2f", amount) }

/// "245 credits", "$367.50", or "100 credits + $217.50". Same as payText in lib/format.ts.
func payText(_ paid: Payment) -> String {
    [paid.credits > 0 || paid.usd == 0 ? plural(paid.credits, "credit") : "", paid.usd > 0 ? usd(paid.usd) : ""]
        .filter { !$0.isEmpty }.joined(separator: " + ")
}

/// "245 credits or $367.50"
func priceText(_ credits: Int) -> String {
    "\(plural(credits, "credit")) or \(usd(Double(credits) * Config.usdPerCredit))"
}
