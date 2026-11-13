import SwiftUI
import PhotosUI
import UIKit

/// The same six photos at pickup and at return. Tap a tile to take or choose its photo.
struct PhotoCaptureGrid: View {
    @Binding var photos: [Slot: String]
    var disabled = false

    @State private var active: Slot?
    @State private var showCamera = false
    @State private var showLibrary = false
    @State private var libraryItem: PhotosPickerItem?
    @State private var error: String?

    private let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(Slot.allCases) { slot in
                    Button { active = slot } label: { tile(slot) }
                        .buttonStyle(.plain)
                        .disabled(disabled)
                        .confirmationDialog("\(slot.label) photo",
                                            isPresented: Binding(get: { active == slot && !showCamera && !showLibrary },
                                                                 set: { if !$0 && !showCamera && !showLibrary { active = nil } }),
                                            titleVisibility: .visible) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                Button("Take photo") { showCamera = true }
                            }
                            Button("Choose from library") { showLibrary = true }
                        }
                }
            }
            if let error { ErrorBanner(message: error) }
        }
        .fullScreenCover(isPresented: $showCamera, onDismiss: { active = nil }) {
            CameraView(slot: active ?? .front) { image in store(image) }
                .ignoresSafeArea()
        }
        .photosPicker(isPresented: $showLibrary, selection: $libraryItem, matching: .images)
        .onChange(of: libraryItem) {
            guard let item = libraryItem else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                    store(image)
                } else {
                    error = "That photo could not be loaded."
                }
                libraryItem = nil
                active = nil
            }
        }
    }

    private func store(_ image: UIImage) {
        guard let slot = active else { return }
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
        return ZStack(alignment: .bottomLeading) {
            if name != nil {
                StoredPhoto(name: name)
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
            HStack(spacing: 4) {
                Image(systemName: name == nil ? "circle" : (dark ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"))
                Text(dark ? "\(slot.label) · too dark" : slot.label)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(name == nil ? Theme.text : (dark ? .black : .black))
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(name == nil ? Color.black.opacity(0.5) : (dark ? Theme.unsure : Theme.green), in: Capsule())
            .padding(8)
        }
        .frame(height: 110)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12)
            .stroke(name == nil ? Theme.line : Theme.green.opacity(0.6),
                    style: StrokeStyle(lineWidth: 1, dash: name == nil ? [5] : [])))
        .contentShape(Rectangle())
    }
}

/// The system camera with an outline on top so every photo is taken from the same angle.
private struct CameraView: UIViewControllerRepresentable {
    let slot: Slot
    let onPhoto: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        let overlay = UIHostingController(rootView: CameraOutline(slot: slot)).view!
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
    let slot: Slot

    var body: some View {
        VStack(spacing: 12) {
            Text("\(slot.label): fit the car inside the frame")
                .font(.headline).foregroundStyle(.black)
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(Theme.green, in: Capsule())
                .padding(.top, 70)
            RoundedRectangle(cornerRadius: 24)
                .stroke(Theme.green, style: StrokeStyle(lineWidth: 3, dash: [12, 8]))
                .frame(height: slot == .dashboard || slot == .interior ? 240 : 300)
                .overlay(Image(systemName: slot.symbol).font(.system(size: 90)).foregroundStyle(Theme.green.opacity(0.35)))
                .padding(.horizontal, 24)
            Spacer()
        }
    }
}
