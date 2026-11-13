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

/// Solid green, black text. The main action on a screen.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Theme.onGreen)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.green.opacity(isEnabled ? 1 : 0.3), in: RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// Green outline. Second actions such as "Use sample photos".
struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Theme.text.opacity(isEnabled ? 1 : 0.4))
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(configuration.isPressed ? Theme.surfaceRaised : Theme.surface, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.line, lineWidth: 1))
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
            .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.line, lineWidth: 1))
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
        .background(Theme.background.ignoresSafeArea())
    }
}

func plural(_ count: Int, _ word: String) -> String {
    "\(count) \(word)\(count == 1 ? "" : "s")"
}
