"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { buildAssistant } from "@/lib/vapi/assistant";
import { executeBookingTool } from "@/lib/vapi/tools-client";
import type { ApiBooking } from "@/lib/types";

type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "ended"
  | "error";

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Siap memulai",
  connecting: "Menghubungkan...",
  listening: "Listening...",
  thinking: "AI sedang memproses...",
  ended: "Call selesai",
  error: "Koneksi gagal",
};

function getErrorDetail(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  const candidate = value as { error?: { message?: string }; message?: string };
  return candidate?.error?.message ?? candidate?.message ?? "";
}

function isVapiEjection(value: unknown): boolean {
  return /meeting ended due to ejection|meeting has ended|ejected/i.test(
    getErrorDetail(value),
  );
}

function parseToolCallId(toolWithToolCall: Record<string, unknown>): string {
  const toolCall = (toolWithToolCall.toolCall ?? {}) as Record<string, unknown>;
  return typeof toolCall.id === "string" ? toolCall.id : String(toolCall.id);
}

function parseToolCallName(
  toolWithToolCall: Record<string, unknown>,
): string {
  const fn = (toolWithToolCall.function ?? {}) as Record<string, unknown>;
  const toolCall = (toolWithToolCall.toolCall ?? {}) as Record<string, unknown>;
  const toolCallFn = (toolCall.function ?? {}) as Record<string, unknown>;
  return String(fn.name ?? toolCallFn.name ?? "");
}

function parseToolCallArgs(
  toolWithToolCall: Record<string, unknown>,
): unknown {
  const toolCall = (toolWithToolCall.toolCall ?? {}) as Record<string, unknown>;
  const toolCallFn = (toolCall.function ?? {}) as Record<string, unknown>;
  const raw = toolCallFn.arguments ?? toolWithToolCall.arguments;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

export default function VapiBooking() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY as
    | string
    | undefined;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID as
    | string
    | undefined;

  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<VoiceStatus>(
    publicKey ? "idle" : "error",
  );
  const [transcript, setTranscript] = useState<string[]>([]);
  const [lastBooking, setLastBooking] = useState<ApiBooking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    publicKey ? null : "Vapi belum dikonfigurasi. Hubungi admin atau lakukan booking manual.",
  );

  const handleMessage = useCallback(async (message: Record<string, unknown>) => {
    if (message?.type === "transcript") {
      const role = message.role === "user" ? "Anda" : "AI";
      const text = typeof message.transcript === "string" ? message.transcript : "";
      if (text) {
        setTranscript((prev) => [...prev.slice(-19), `${role}: ${text}`]);
      }
      return;
    }

    if (message?.type !== "tool-calls") return;

    setStatus("thinking");
    const toolWithToolCallList = Array.isArray(
      (message as { toolWithToolCallList?: unknown }).toolWithToolCallList,
    )
      ? ((message as { toolWithToolCallList: Record<string, unknown>[] })
          .toolWithToolCallList as Record<string, unknown>[])
      : [];

    const results: {
      toolCallId: string;
      name: string;
      result: string;
    }[] = [];

    for (const toolWithToolCall of toolWithToolCallList) {
      const name = parseToolCallName(toolWithToolCall);
      const toolCallId = parseToolCallId(toolWithToolCall);
      const args = parseToolCallArgs(toolWithToolCall);
      try {
        const result = await executeBookingTool(name, args);
        results.push({ toolCallId, name, result });
        if (name === "create_booking") {
          const parsed = JSON.parse(result) as { booking?: ApiBooking };
          if (parsed.booking) {
            setLastBooking(parsed.booking);
          }
        }
      } catch (error) {
        results.push({
          toolCallId,
          name,
          result: JSON.stringify({
            error: error instanceof Error ? error.message : "Terjadi kesalahan.",
          }),
        });
      }
    }

    const vapi = vapiRef.current;
    if (vapi) {
      for (const toolWithToolCall of toolWithToolCallList) {
        const id = parseToolCallId(toolWithToolCall);
        const name = parseToolCallName(toolWithToolCall);
        const args = parseToolCallArgs(toolWithToolCall);
        const parsedArgs =
          typeof args === "object" && args !== null ? args : {};
        vapi.send({
          type: "add-message",
          message: {
            role: "assistant",
            tool_calls: [
              {
                id,
                type: "function",
                function: {
                  name,
                  arguments:
                    typeof args === "string"
                      ? args
                      : JSON.stringify(parsedArgs),
                },
              },
            ],
          },
        });
        const result =
          results.find((r) => r.toolCallId === id)?.result ?? "{}";
        vapi.send({
          type: "add-message",
          message: {
            role: "tool",
            tool_call_id: id,
            content: result,
          },
        });
      }
    }

    setStatus("listening");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const onCallStart = () => setStatus("listening");
    const onSpeechStart = () => setStatus("listening");
    const onSpeechEnd = () => setStatus("thinking");
    const onCallEnd = () => {
      setStatus("ended");
      setTranscript([]);
    };
    const onError = (event: unknown) => {
      const detail = getErrorDetail(event);
      setStatus("error");
      if (isVapiEjection(event)) {
        console.warn("[VapiBooking] call ejected by system:", detail);
        setErrorMessage(
          "Panggilan diakhiri oleh sistem (voice AI tidak tersedia). Silakan lakukan booking manual.",
        );
      } else if (detail) {
        console.warn("[VapiBooking] vapi error:", detail);
        setErrorMessage("Terjadi kesalahan pada koneksi voice AI.");
      } else {
        setErrorMessage("Terjadi kesalahan pada koneksi voice AI.");
      }
    };
    const onMessage = (message: unknown) => {
      void handleMessage((message ?? {}) as Record<string, unknown>);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-start-failed", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);
    vapi.on("message", onMessage);

    return () => {
      vapi.removeListener("call-start", onCallStart);
      vapi.removeListener("call-start-failed", onError);
      vapi.removeListener("speech-start", onSpeechStart);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("call-end", onCallEnd);
      vapi.removeListener("error", onError);
      vapi.removeListener("message", onMessage);
      void vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey, handleMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleEjection = (detail: unknown) => {
      if (!isVapiEjection(detail)) return;
      console.warn("[VapiBooking] intercepted SDK ejection:", getErrorDetail(detail));
      setStatus("error");
      setTranscript([]);
      setErrorMessage(
        "Panggilan diakhiri oleh sistem (voice AI tidak tersedia). Silakan lakukan booking manual.",
      );
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isVapiEjection(event.reason)) {
        event.preventDefault();
        handleEjection(event.reason);
      }
    };
    const onWindowError = (event: ErrorEvent) => {
      if (isVapiEjection(event.error ?? event.message)) {
        event.preventDefault();
        handleEjection(event.error ?? event.message);
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  const startCall = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    setTranscript([]);
    setLastBooking(null);
    setErrorMessage(null);
    setStatus("connecting");
    if (assistantId) {
      void vapi.start(assistantId);
    } else {
      void vapi.start(buildAssistant());
    }
  }, [assistantId]);

  const endCall = useCallback(() => {
    const vapi = vapiRef.current;
    if (vapi) {
      vapi.end();
    }
    setStatus("ended");
  }, []);

  const isCallActive =
    status === "connecting" ||
    status === "listening" ||
    status === "thinking";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">AI Booking Agent</h2>

      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors ${
          isCallActive ? "animate-pulse bg-emerald-100 text-emerald-600" : ""
        }`}
        aria-hidden="true"
      >
        <svg
          className="h-10 w-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-lg font-medium text-zinc-900">
          {STATUS_LABEL[status]}
        </p>
        {status === "idle" && (
          <p className="mt-1 text-sm text-zinc-500">
            &quot;Halo! Bagaimana saya bisa membantu memesan ruang meeting?&quot;
          </p>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="w-full max-h-40 space-y-1 overflow-y-auto rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
          {transcript.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {lastBooking && (
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-medium text-emerald-800">
            Booking berhasil dibuat!
          </p>
          <p className="mt-1 text-emerald-700">
            {lastBooking.bookingId} · {lastBooking.date} ·{" "}
            {lastBooking.startTime}
          </p>
          <Link
            href={`/bookings/${lastBooking.bookingId}`}
            className="mt-2 inline-block font-medium text-emerald-800 underline"
          >
            Lihat detail booking
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isCallActive && status !== "idle" && (
          <button
            type="button"
            onClick={startCall}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Panggil lagi
          </button>
        )}
        {status === "idle" && (
          <button
            type="button"
            onClick={startCall}
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Mulai Panggilan
          </button>
        )}
        {isCallActive && (
          <button
            type="button"
            onClick={endCall}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            End Call
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Voice AI tidak berfungsi?{" "}
        <Link href="/booking?mode=manual" className="text-zinc-600 underline">
          Booking manual
        </Link>
      </p>
    </div>
  );
}