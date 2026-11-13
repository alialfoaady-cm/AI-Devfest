import SwiftUI
import PhotosUI
import UIKit

/// What a tile shows while the return photos are being compared.
enum SlotStatus: Equatable {
    case waiting, checking
    case done(Verdict)
}

/// The same six photos at pickup and at return. Tap a tile to take or choose its photo.
struct PhotoCaptureGrid: View {
    @Binding var photos: [Slot: String]
    var status: [Slot: SlotStatus]? = nil

    @State private var active: Slot?
    @State private var error: String?

    private let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(Slot.allCases) { slot in
                    Button { active = slot } label: { tile(slot) }
                        .buttonStyle(.plain)
                        // Not .disabled: that fades the tiles, and the results on them must stay readable.
                        .allowsHitTesting(status == nil)
                        .photoSource(isPresented: Binding(get: { active == slot }, set: { if !$0 { active = nil } }),
                                     title: "\(slot.label) photo", outline: slot.symbol) { image in
                            store(image, slot)
                        }
                }
            }
            if let error { ErrorBanner(message: error) }
        }
    }

    private func store(_ image: UIImage, _ slot: Slot) {
        do {
            photos[slot] = try PhotoStore.save(image)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func tile(_ slot: Slot) -> some View {
        let name = photos[slot]
        let dark = name.map { PhotoStore.isTooDark($0, slot: slot) } ?? false
        let badge = badge(slot, hasPhoto: name != nil, dark: dark)
        return ZStack(alignment: .bottomLeading) {
            if name != nil {
                // In an overlay so a wide photo fills the tile instead of widening it.
                Color.clear.overlay { StoredPhoto(name: name) }.clipped()
            } else {
                ZStack {
                    Theme.surfaceRaised
                    VStack(spacing: 6) {
                        Image(systemName: slot.symbol).font(.title2)
                        Image(systemName: "camera.fill").font(.caption)
                    }
                    .foregroundStyle(Theme.green.opacity(0.8))
                }
            }
            if status?[slot] == .checking {
                Color.black.opacity(0.45)
                ProgressView().tint(.white).frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            HStack(spacing: 4) {
                Image(systemName: badge.symbol)
                Text(badge.text)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(badge.ink)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(badge.fill, in: Capsule())
            .padding(8)
        }
        .frame(height: 110)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12)
            .stroke(badge.border, style: StrokeStyle(lineWidth: badge.border == Theme.flag ? 2 : 1, dash: name == nil ? [5] : [])))
        .contentShape(Rectangle())
        .animation(.easeOut(duration: 0.25), value: status?[slot])
    }

    private struct Badge {
        var symbol: String, text: String, ink: Color, fill: Color, border: Color
    }

    private func badge(_ slot: Slot, hasPhoto: Bool, dark: Bool) -> Badge {
        switch status?[slot] {
        case .checking?:
            return Badge(symbol: "sparkle.magnifyingglass", text: "Comparing", ink: .white, fill: .black.opacity(0.6), border: Theme.line)
        case .done(.clear)?:
            return Badge(symbol: "checkmark", text: "No change", ink: Theme.onGreen, fill: Theme.green, border: Theme.green)
        case .done(.flagged)?:
            return Badge(symbol: "exclamationmark.triangle.fill", text: "Flagged", ink: .black, fill: Theme.flag, border: Theme.flag)
        case .done(.unsure)?:
            return Badge(symbol: "questionmark", text: "Unsure", ink: .black, fill: Theme.unsure, border: Theme.unsure)
        case .waiting?, nil:
            break
        }
        if !hasPhoto {
            return Badge(symbol: "circle", text: slot.label, ink: Theme.text, fill: .black.opacity(0.5), border: Theme.line)
        }
        if dark {
            return Badge(symbol: "exclamationmark.triangle.fill", text: "\(slot.label) · too dark", ink: .black, fill: Theme.unsure, border: Theme.unsure)
        }
        return Badge(symbol: "checkmark.circle.fill", text: slot.label, ink: Theme.onGreen, fill: Theme.green, border: Theme.green.opacity(0.6))
    }
}

// MARK: - Take or choose a photo

extension View {
    /// Asks "Take photo" or "Choose from library", then hands back the picked image.
    func photoSource(isPresented: Binding<Bool>, title: String, outline: String,
                     onImage: @escaping (UIImage) -> Void) -> some View {
        modifier(PhotoSourceModifier(isPresented: isPresented, title: title, outline: outline, onImage: onImage))
    }
}

private struct PhotoSourceModifier: ViewModifier {
    @Binding var isPresented: Bool
    let title: String
    let outline: String
    let onImage: (UIImage) -> Void

    @State private var showCamera = false
    @State private var showLibrary = false
    @State private var item: PhotosPickerItem?

    func body(content: Content) -> some View {
        content
            .confirmationDialog(title, isPresented: $isPresented, titleVisibility: .visible) {
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button("Take photo") { showCamera = true }
                }
                Button("Choose from library") { showLibrary = true }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraView(title: title, outline: outline, onPhoto: onImage).ignoresSafeArea()
            }
            .photosPicker(isPresented: $showLibrary, selection: $item, matching: .images)
            .onChange(of: item) {
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                        onImage(image)
                    }
                    self.item = nil
                }
            }
    }
}

/// The system camera with an outline on top so every photo is taken from the same angle.
private struct CameraView: UIViewControllerRepresentable {
    let title: String
    let outline: String
    let onPhoto: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        let overlay = UIHostingController(rootView: CameraOutline(title: title, symbol: outline)).view!
        overlay.backgroundColor = .clear
        overlay.isUserInteractionEnabled = false
        overlay.frame = picker.view.bounds
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        picker.cameraOverlayView = overlay
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView
        init(_ parent: CameraView) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onPhoto(image) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

private struct CameraOutline: View {
    let title: String
    let symbol: String

    var body: some View {
        VStack(spacing: 12) {
            Text("\(title): fit the car inside the frame")
                .font(.headline).foregroundStyle(Theme.onGreen)
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(Theme.green, in: Capsule())
                .padding(.top, 70)
            RoundedRectangle(cornerRadius: 24)
                .stroke(Theme.green, style: StrokeStyle(lineWidth: 3, dash: [12, 8]))
                .frame(height: 280)
                .overlay(Image(systemName: symbol).font(.system(size: 90)).foregroundStyle(Theme.green.opacity(0.35)))
                .padding(.horizontal, 24)
            Spacer()
        }
    }
}
