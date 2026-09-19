// components/WyzerBookingAgent.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

type CallStatus = "idle" | "connecting" | "active";

export default function WyzerBookingAgent() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState(
    publicKey ? "" : "Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY",
  );

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setStatus("active");
      setError("");
    });

    vapi.on("call-end", () => {
      setStatus("idle");
    });

    vapi.on("error", (event) => {
      console.error("Vapi error:", event);
      setStatus("idle");
      setError("The call could not be started.");
    });

    return () => {
      void vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  async function startCall() {
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (!assistantId || !vapiRef.current) {
      setError("Vapi is not configured.");
      return;
    }

    try {
      setError("");
      setStatus("connecting");
      await vapiRef.current.start(assistantId);
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setError("Unable to start the call.");
    }
  }

  function endCall() {
    vapiRef.current?.stop();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {status === "idle" ? (
        <button
          onClick={startCall}
          className="rounded-lg bg-black px-5 py-3 text-white"
        >
          Book an appointment
        </button>
      ) : (
        <button
          onClick={endCall}
          className="rounded-lg bg-red-600 px-5 py-3 text-white"
        >
          {status === "connecting" ? "Connecting…" : "End call"}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}