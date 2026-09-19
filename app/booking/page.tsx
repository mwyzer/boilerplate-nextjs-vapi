import BookingForm from "@/components/BookingForm";
import VapiBooking from "@/components/VapiBooking";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  if (mode === "manual") {
    return <BookingForm />;
  }
  return <VapiBooking />;
}