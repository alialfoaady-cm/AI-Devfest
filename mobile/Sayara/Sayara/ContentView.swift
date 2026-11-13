import SwiftUI

enum AppTab: Hashable { case find, lend, trips, insurance }

struct ContentView: View {
    @Environment(AppStore.self) private var store
    @State private var tab: AppTab = .find
    @State private var tripsPath: [String] = [] // booking ids
    @State private var lendPath: [LendRoute] = []

    var body: some View {
        TabView(selection: $tab) {
            Tab("Find a car", systemImage: "magnifyingglass", value: .find) {
                NavigationStack {
                    FindCarView(onBooked: { bookingId in
                        tripsPath = [bookingId]
                        tab = .trips
                    }, onLend: {
                        lendPath = [.newCar]
                        tab = .lend
                    })
                    .toolbar { AccountMenu() }
                }
            }
            Tab("Lend", systemImage: "key.fill", value: .lend) {
                NavigationStack(path: $lendPath) {
                    LendView(path: $lendPath)
                        .navigationTitle("Lend my car")
                        .toolbar { AccountMenu() }
                        .navigationDestination(for: LendRoute.self) { route in
                            switch route {
                            case .newCar: ListCarView(path: $lendPath)
                            case .spot(let carId): SpotEditorView(path: $lendPath, carId: carId)
                            case .trip(let bookingId): TripDetailView(bookingId: bookingId)
                            }
                        }
                }
            }
            Tab("Trips", systemImage: "suitcase.rolling.fill", value: .trips) {
                NavigationStack(path: $tripsPath) {
                    TripsView(onFind: { tab = .find })
                        .navigationTitle("Trips")
                        .toolbar { AccountMenu() }
                        .navigationDestination(for: String.self) { TripDetailView(bookingId: $0) }
                }
            }
            Tab("Insure", systemImage: "checkmark.shield.fill", value: .insurance) {
                NavigationStack {
                    InsuranceView(onFind: { tab = .find })
                        .navigationTitle("Insurance")
                        .toolbar { AccountMenu() }
                }
            }
        }
        .tint(Theme.green)
        .preferredColorScheme(.dark)
        .onChange(of: store.currentUserId) { tripsPath = []; lendPath = [] }
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
                        .foregroundStyle(Theme.onGreen)
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
