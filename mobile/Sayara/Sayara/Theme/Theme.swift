import SwiftUI

/// Black background, green accents. Change colours here and nowhere else.
enum Theme {
    static let background = Color.black
    static let surface = Color(white: 0.08)
    static let surfaceRaised = Color(white: 0.13)
    static let line = Color(white: 0.2)
    static let text = Color.white
    static let textSoft = Color(white: 0.62)
    static let green = Color(red: 0.18, green: 0.88, blue: 0.40)
    static let greenTint = green.opacity(0.14)
    static let flag = Color(red: 1.0, green: 0.42, blue: 0.36)
    static let unsure = Color(red: 1.0, green: 0.78, blue: 0.28)
    static let radius: CGFloat = 16
}

/// Solid green, black text. The main action on a screen.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.green.opacity(isEnabled ? 1 : 0.3), in: RoundedRectangle(cornerRadius: 14))
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
            .foregroundStyle(Theme.green.opacity(isEnabled ? 1 : 0.4))
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(Theme.greenTint.opacity(configuration.isPressed ? 2 : 1), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.green.opacity(isEnabled ? 0.7 : 0.25), lineWidth: 1))
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
