import { db } from "@/lib/db";
import { BookingService } from "@/lib/services/booking.service";

export * from "@/lib/services/booking.service";

export const bookingService = new BookingService(db);

export const listResources = bookingService.listResources.bind(bookingService);
export const getDefaultResource =
  bookingService.getDefaultResource.bind(bookingService);
export const checkAvailability =
  bookingService.checkAvailability.bind(bookingService);
export const generateBookingId =
  bookingService.generateBookingId.bind(bookingService);
export const createBooking = bookingService.createBooking.bind(bookingService);
export const listBookings = bookingService.listBookings.bind(bookingService);
export const getBookingById = bookingService.getBookingById.bind(bookingService);
export const getBookingByBookingId =
  bookingService.getBookingByBookingId.bind(bookingService);
export const cancelBooking = bookingService.cancelBooking.bind(bookingService);