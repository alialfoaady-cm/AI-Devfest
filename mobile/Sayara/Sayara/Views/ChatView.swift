import SwiftUI

/// The chat between a trip's borrower and the car's owner. It opens once the car is booked.
/// Demo only: messages are saved on this phone, and the other person answers with a canned reply.
struct ChatView: View {
    @Environment(AppStore.self) private var store
    let bookingId: String

    @State private var draft = ""
    @State private var typing = false
    @State private var error: String?
    @FocusState private var focused: Bool

    var body: some View {
        let state = store.state
        if let booking = state.booking(bookingId), let car = state.car(booking.carId) {
            let me = store.currentUserId
            let isOwner = car.ownerId == me
            let otherId = isOwner ? booking.userId : car.ownerId
            let other = state.firstName(otherId)
            let messages = state.messages(bookingId)
            let closed = booking.status == .cancelled

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        header(car: car, booking: booking, other: other, isOwner: isOwner)
                            .padding(.bottom, 10)
                        ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                            if index == 0 || !Calendar.current.isDate(message.sentAt, inSameDayAs: messages[index - 1].sentAt) {
                                dayLabel(message.sentAt)
                            }
                            Bubble(message: message, mine: message.senderId == me)
                        }
                        if typing { TypingBubble().id("typing") }
                        Color.clear.frame(height: 1).id("end")
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                }
                .scrollDismissesKeyboard(.interactively)
                .background(GlassBackdrop())
                .onAppear { proxy.scrollTo("end", anchor: .bottom) }
                .onChange(of: messages.count) { withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("end", anchor: .bottom) } }
                .onChange(of: typing) { withAnimation { proxy.scrollTo("end", anchor: .bottom) } }
                .safeAreaInset(edge: .bottom) {
                    composer(closed: closed, isOwner: isOwner, stage: state.stage(bookingId), otherId: otherId)
                }
            }
            .navigationTitle(other)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .tabBar)
        } else {
            Screen { Text("This trip no longer exists.").foregroundStyle(Theme.textSoft) }
        }
    }

    // MARK: Pieces

    private func header(car: Car, booking: Booking, other: String, isOwner: Bool) -> some View {
        VStack(spacing: 10) {
            CarPhotoView(car: car)
                .frame(width: 120, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(spacing: 3) {
                Text("\(car.model) at \(car.airport)").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                Text("\(Day.short(booking.from)) to \(Day.short(booking.to)) · \(isOwner ? "\(other) is borrowing your car" : "lent by \(other)")")
                    .font(.caption).foregroundStyle(Theme.textSoft)
            }
            Label("This chat opened when the car was booked. Only you and \(other) can see it.", systemImage: "lock.fill")
                .font(.caption2)
                .foregroundStyle(Theme.textSoft)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(Theme.surface.opacity(0.8), in: Capsule())
            Text("Demo: \(other) replies automatically.")
                .font(.caption2).foregroundStyle(Theme.textSoft.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }

    private func dayLabel(_ date: Date) -> some View {
        Text(Calendar.current.isDateInToday(date) ? "Today" : date.formatted(.dateTime.weekday(.wide).month().day()))
            .font(.caption2.weight(.semibold))
            .foregroundStyle(Theme.textSoft)
            .padding(.vertical, 8)
    }

    private func composer(closed: Bool, isOwner: Bool, stage: TripStage, otherId: String) -> some View {
        VStack(spacing: 8) {
            if closed {
                Text("This trip was cancelled, so the chat is closed.")
                    .font(.footnote).foregroundStyle(Theme.textSoft)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            } else {
                if let error { ErrorBanner(message: error).padding(.horizontal, 16) }
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(Self.quickReplies(isOwner: isOwner, stage: stage), id: \.self) { reply in
                            Button(reply) { send(reply, otherId: otherId) }
                                .font(.footnote.weight(.medium))
                                .foregroundStyle(Theme.text)
                                .padding(.horizontal, 12).padding(.vertical, 8)
                                .glassEffect(.regular.interactive(), in: Capsule())
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .scrollIndicators(.hidden)

                HStack(alignment: .bottom, spacing: 10) {
                    TextField("", text: $draft, prompt: Text("Message").foregroundStyle(Theme.textSoft), axis: .vertical)
                        .lineLimit(1...5)
                        .focused($focused)
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 16).padding(.vertical, 11)
                        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 22))
                    Button { send(draft, otherId: otherId) } label: {
                        Image(systemName: "arrow.up")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(Theme.onGreen)
                            .frame(width: 44, height: 44)
                    }
                    .glassEffect(.regular.tint(Theme.green.opacity(canSend ? 0.9 : 0.3)).interactive(), in: Circle())
                    .disabled(!canSend)
                    .accessibilityLabel("Send")
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 8)
    }

    private var canSend: Bool { !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    // MARK: Sending

    private func send(_ text: String, otherId: String) {
        do {
            try store.update { try Rules.sendMessage(&$0, bookingId: bookingId, senderId: store.currentUserId, text: text) }
            draft = ""
            error = nil
            fakeReply(to: text, from: otherId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Demo only: a short "typing" pause, then a canned answer from the other person.
    private func fakeReply(to text: String, from otherId: String) {
        guard !typing else { return }
        let reply = Self.cannedReply(to: text, ownerIsReplying: store.state.car(store.state.booking(bookingId)?.carId ?? "")?.ownerId == otherId,
                                     state: store.state, bookingId: bookingId)
        Task {
            try? await Task.sleep(for: .milliseconds(700))
            typing = true
            try? await Task.sleep(for: .milliseconds(1400))
            typing = false
            try? store.update { try Rules.sendMessage(&$0, bookingId: bookingId, senderId: otherId, text: reply) }
        }
    }

    static func quickReplies(isOwner: Bool, stage: TripStage) -> [String] {
        switch (isOwner, stage) {
        case (false, .pickup): ["I've landed", "Where exactly is the car?", "Running 15 minutes late"]
        case (false, .driving): ["All good with the car", "Can I return it a bit earlier?", "The car is back in the spot"]
        case (false, _): ["Thanks again!", "Everything was great"]
        case (true, .pickup): ["The key is in the locker", "Any questions about the car?", "Have a safe flight"]
        case (true, .driving): ["How is the car?", "Please bring it back with some fuel"]
        case (true, _): ["Thanks for taking care of it", "Hope the trip went well"]
        }
    }

    static func cannedReply(to text: String, ownerIsReplying: Bool, state: AppState, bookingId: String) -> String {
        let t = text.lowercased()
        let car = state.booking(bookingId).flatMap { state.car($0.carId) }
        let spot = car?.spot.map { "spot \($0)" } ?? "the spot on the map"
        if ownerIsReplying {
            if t.contains("where") || t.contains("find") || t.contains("spot") { return "It's in \(spot), same as the pin in the app. Look for the \(car?.model ?? "car")." }
            if t.contains("landed") || t.contains("here") { return "Welcome! Take the six photos first and the locker code will show up. Enjoy the car." }
            if t.contains("late") { return "No problem at all, the car isn't going anywhere." }
            if t.contains("earlier") || t.contains("return") { return "Sure, any time before my return date works. Just park it back in \(spot)." }
            if t.contains("back") { return "Great, thank you! I'll check the return report." }
            if t.contains("thank") || t.contains("great") { return "Glad it worked out. Happy travels!" }
            return "Thanks for the message! Let me know if you need anything with the car."
        } else {
            if t.contains("key") || t.contains("locker") { return "Perfect, I'll grab it after I take the pickup photos." }
            if t.contains("question") { return "All clear for now, thanks! Anything I should know about the car?" }
            if t.contains("fuel") { return "Will do, I'll fill it up before I bring it back." }
            if t.contains("how") { return "Running great, thanks. I'll take good care of it." }
            if t.contains("flight") || t.contains("thank") || t.contains("well") { return "Thank you! Have a great trip too." }
            return "Got it, thanks!"
        }
    }

    /// The owner's first message, sent when the car is booked, so the chat never starts empty.
    static func welcome(_ state: AppState, booking: Booking) -> String {
        let car = state.car(booking.carId)
        let borrower = state.firstName(booking.userId)
        let spot = car?.spot.map { " It's parked in spot \($0)." } ?? ""
        return "Hi \(borrower)! Thanks for booking my \(car?.model ?? "car").\(spot) The locker code shows up in the app once you've taken the pickup photos. Message me here if anything comes up."
    }
}

private struct Bubble: View {
    let message: ChatMessage
    let mine: Bool

    var body: some View {
        HStack {
            if mine { Spacer(minLength: 48) }
            VStack(alignment: mine ? .trailing : .leading, spacing: 3) {
                Text(message.text)
                    .foregroundStyle(mine ? Theme.onGreen : Theme.text)
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .background(mine ? Theme.green : Theme.surfaceRaised,
                                in: UnevenRoundedRectangle(topLeadingRadius: 18, bottomLeadingRadius: mine ? 18 : 5,
                                                           bottomTrailingRadius: mine ? 5 : 18, topTrailingRadius: 18))
                Text(message.sentAt.formatted(date: .omitted, time: .shortened))
                    .font(.caption2).foregroundStyle(Theme.textSoft)
                    .padding(.horizontal, 4)
            }
            if !mine { Spacer(minLength: 48) }
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

private struct TypingBubble: View {
    @State private var phase = 0.0

    var body: some View {
        HStack {
            HStack(spacing: 5) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(Theme.textSoft)
                        .frame(width: 7, height: 7)
                        .opacity(0.35 + 0.65 * abs(sin(phase + Double(i) * 0.6)))
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 13)
            .background(Theme.surfaceRaised, in: Capsule())
            Spacer()
        }
        .onAppear { withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) { phase = .pi } }
        .accessibilityLabel("Typing")
    }
}

/// "Message Avery": opens the trip's chat. Only shown once the car is booked.
struct MessageButton: View {
    @Environment(AppStore.self) private var store
    let booking: Booking

    var body: some View {
        let car = store.state.car(booking.carId)
        let otherId = car?.ownerId == store.currentUserId ? booking.userId : (car?.ownerId ?? "")
        NavigationLink {
            ChatView(bookingId: booking.id)
        } label: {
            Label("Message \(store.state.firstName(otherId))", systemImage: "bubble.left.and.bubble.right.fill")
        }
        .buttonStyle(.secondary)
    }
}
