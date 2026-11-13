// What an owner does with their own car: list it, and say where it is parked.
// Pure state changes, like lib/rules.ts: each returns a new state or throws a message a user can read.
import { AIRPORTS } from "./config";
import { tripDays } from "./rules";
import type { Pin, State } from "./types";

export type NewCar = { model: string; seats: number; airport: string; from: string; to: string; photo?: string };

export function listCar(state: State, ownerId: string, car: NewCar): State {
  const model = car.model.trim();
  if (!model) throw new Error("Name the car, for example 2019 Honda Civic.");
  if (!Number.isInteger(car.seats) || car.seats < 1 || car.seats > 9) throw new Error("Seats must be a number from 1 to 9.");
  if (!(car.airport in AIRPORTS)) throw new Error("Pick one of the airports in the list.");
  if (!(tripDays(car.from, car.to) >= 1)) throw new Error("The day you land must be after the day you fly out.");
  return {
    ...state,
    cars: [...state.cars, { ...car, model, id: `car-${state.cars.length + 1}-${Date.now().toString(36)}`, ownerId }],
  };
}

export function setParking(state: State, carId: string, parking: { pin?: Pin; spot?: string }): State {
  return { ...state, cars: state.cars.map((car) => (car.id === carId ? { ...car, ...parking } : car)) };
}
