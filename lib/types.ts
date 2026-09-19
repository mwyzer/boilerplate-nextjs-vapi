export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type ApiResource = {
  id: number;
  name: string;
  type: string;
  capacity: number;
};

export type ApiBooking = {
  id: number;
  bookingId: string;
  name: string;
  resourceId: number;
  resource?: ApiResource;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: BookingStatus;
  createdAt: string;
};

export type BookingInput = {
  name: string;
  date: string;
  startTime: string;
  duration: number;
  resourceId?: number;
};

export type AvailabilityInput = {
  date: string;
  startTime: string;
  duration: number;
};

export type AvailabilityResult =
  | {
      available: true;
      resourceId: number;
      resourceName: string;
      date: string;
      startTime: string;
      endTime: string;
      duration: number;
    }
  | {
      available: false;
      conflictCount: number;
      alternativeTimes: string[];
    };

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};