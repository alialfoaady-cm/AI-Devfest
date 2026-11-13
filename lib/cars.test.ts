import { expect, test } from "vitest";
import { listCar, setParking } from "./cars";
import { SAMPLE_STATE } from "./sampleData";

const car = { model: " 2019 Honda Civic ", seats: 5, airport: "DTW", from: "2026-12-20", to: "2026-12-27" };

test("a listed car belongs to its owner and is bookable at its airport", () => {
  const next = listCar(SAMPLE_STATE, "user-b", car);
  const added = next.cars[next.cars.length - 1];
  expect(added).toMatchObject({ ownerId: "user-b", model: "2019 Honda Civic", airport: "DTW" });
  expect(SAMPLE_STATE.cars).toHaveLength(next.cars.length - 1); // the old state is untouched
});

test("a car cannot be listed with no name, a bad window or an unknown airport", () => {
  expect(() => listCar(SAMPLE_STATE, "user-b", { ...car, model: "  " })).toThrow();
  expect(() => listCar(SAMPLE_STATE, "user-b", { ...car, to: car.from })).toThrow();
  expect(() => listCar(SAMPLE_STATE, "user-b", { ...car, airport: "XXX" })).toThrow();
});

test("setting the parking spot changes only that car", () => {
  const next = setParking(SAMPLE_STATE, "car-a", { spot: "C-9" });
  expect(next.cars.find((c) => c.id === "car-a")?.spot).toBe("C-9");
  expect(next.cars.find((c) => c.id === "car-b")).toBe(SAMPLE_STATE.cars.find((c) => c.id === "car-b"));
});
