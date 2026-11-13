import UIKit
import CoreImage

/// Photos live as JPEG files in Documents/photos; the state stores only their file names.
enum PhotoStore {
    private static var folder: URL {
        let url = URL.documentsDirectory.appending(path: "photos", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private static let cache = NSCache<NSString, UIImage>()

    /// Resizes to the long-edge limit and saves. Returns the file name.
    static func save(_ image: UIImage) throws -> String {
        let resized = resize(image, maxEdge: Config.maxImageEdgePx)
        guard let data = resized.jpegData(compressionQuality: 0.82) else {
            throw RuleError("That photo could not be saved. Try another one.")
        }
        let name = "\(UUID().uuidString).jpg"
        try data.write(to: folder.appending(path: name), options: .atomic)
        cache.setObject(resized, forKey: name as NSString)
        return name
    }

    static func load(_ name: String) -> UIImage? {
        if let hit = cache.object(forKey: name as NSString) { return hit }
        guard let image = UIImage(contentsOfFile: folder.appending(path: name).path()) else { return nil }
        cache.setObject(image, forKey: name as NSString)
        return image
    }

    static func deleteAll() {
        cache.removeAllObjects()
        try? FileManager.default.removeItem(at: folder)
    }

    static func resize(_ image: UIImage, maxEdge: CGFloat) -> UIImage {
        let size = image.size
        let longEdge = max(size.width, size.height)
        let scale = longEdge > maxEdge ? maxEdge / longEdge : 1
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }

    /// Average brightness from 0 (black) to 1 (white). Used to warn about photos that are too dark.
    static func brightness(_ image: UIImage) -> Double {
        guard let input = CIImage(image: image),
              let filter = CIFilter(name: "CIAreaAverage",
                                    parameters: [kCIInputImageKey: input,
                                                 kCIInputExtentKey: CIVector(cgRect: input.extent)]),
              let output = filter.outputImage else { return 1 }
        var pixel = [UInt8](repeating: 0, count: 4)
        CIContext(options: [.workingColorSpace: NSNull()])
            .render(output, toBitmap: &pixel, rowBytes: 4,
                    bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBA8, colorSpace: nil)
        return (0.299 * Double(pixel[0]) + 0.587 * Double(pixel[1]) + 0.114 * Double(pixel[2])) / 255
    }

    /// Dashboards are dark by nature, so that slot is never flagged.
    static func isTooDark(_ name: String, slot: Slot) -> Bool {
        guard slot != .dashboard, let image = load(name) else { return false }
        return brightness(image) < Config.darkPhotoThreshold
    }
}

/// Packs a pickup photo (left) and a return photo (right) into one image, at most 1120 px wide.
/// The same layout as lib/inspection/stitch.ts, so the server prompt sees what it expects.
enum Stitcher {
    static func stitch(_ before: UIImage, _ after: UIImage) -> UIImage {
        let height = min(max(before.size.height, after.size.height), Config.maxImageEdgePx)
        func width(_ image: UIImage) -> CGFloat { image.size.width * height / max(image.size.height, 1) }
        var size = CGSize(width: width(before) + width(after), height: height)
        if size.width > Config.maxImageEdgePx {
            let s = Config.maxImageEdgePx / size.width
            size = CGSize(width: size.width * s, height: size.height * s)
        }
        let leftWidth = size.width * width(before) / (width(before) + width(after))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            before.draw(in: CGRect(x: 0, y: 0, width: leftWidth, height: size.height))
            after.draw(in: CGRect(x: leftWidth, y: 0, width: size.width - leftWidth, height: size.height))
        }
    }
}
