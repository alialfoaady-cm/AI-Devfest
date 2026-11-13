import SwiftUI

enum AppTab: Hashable { case find, lend, trips }

struct ContentView: View {
    @Environment(AppStore.self) private var store
    @State private var tab: AppTab = .find
    @State private var tripsPath: [String] = [] // booking ids

    var body: some View {
        TabView(selection: $tab) {
            Tab("Find a car", systemImage: "magnifyingglass", value: .find) {
                NavigationStack {
                    FindCarView { bookingId in
                        tripsPath = [bookingId]
                        tab = .trips
                    }
                    .navigationTitle("Find a car")
                    .toolbar { AccountMenu() }
                }
            }
            Tab("Lend", systemImage: "key.fill", value: .lend) {
                NavigationStack {
                    LendView()
                        .navigationTitle("Lend my car")
                        .toolbar { AccountMenu() }
                }
            }
            Tab("Trips", systemImage: "suitcase.rolling.fill", value: .trips) {
                NavigationStack(path: $tripsPath) {
                    TripsView()
                        .navigationTitle("My trips")
                        .toolbar { AccountMenu() }
                        .navigationDestination(for: String.self) { TripDetailView(bookingId: $0) }
                }
            }
        }
        .tint(Theme.green)
        .preferredColorScheme(.dark)
        .onChange(of: store.currentUserId) { tripsPath = [] }
    }
}

/// Credits plus a switcher between the two demo users, so one phone can show both sides.
struct AccountMenu: ToolbarContent {
    @Environment(AppStore.self) private var store
    @State private var confirmReset = false

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Section("Signed in as") {
                    ForEach(store.state.users) { user in
                        Button {
                            store.currentUserId = user.id
                        } label: {
                            if user.id == store.currentUserId {
                                Label("\(user.name) · \(user.credits) cr", systemImage: "checkmark")
                            } else {
                                Text("\(user.name) · \(user.credits) cr")
                            }
                        }
                    }
                }
                Button("Reset sample data", systemImage: "arrow.counterclockwise", role: .destructive) {
                    confirmReset = true
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle.fill")
                    Text(store.currentUser?.name.components(separatedBy: " ").first ?? "?")
                    Text("\(store.currentUser?.credits ?? 0) cr")
                        .foregroundStyle(.black)
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(Theme.green, in: Capsule())
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.green)
            }
            .confirmationDialog("Reset all bookings, cars and photos to the sample data?",
                                isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Reset", role: .destructive) { store.reset() }
            }
        }
    }
}

#Preview {
    ContentView().environment(AppStore())
}
