import { FindCar } from "@/components/booking/FindCar";
import { MyCars } from "@/components/booking/MyCars";
import { MyTrips } from "@/components/booking/MyTrips";

export default function Home() {
  return (
    <div className="space-y-10">
      <FindCar />
      <MyTrips />
      <MyCars />
    </div>
  );
}
