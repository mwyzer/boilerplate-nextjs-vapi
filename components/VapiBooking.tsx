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
  const candidate = value as { error?: unknown; message?: string; msg?: string };
  const nested = candidate?.error;
  if (typeof nested === "string") return nested;
  if (nested && typeof nested === "object") {
    const nestedError = nested as { message?: string; msg?: string };
    return nestedError?.message ?? nestedError?.msg ?? "";
  }
  return candidate?.message ?? candidate?.msg ?? "";
}

function isVapiEjection(value: unknown): boolean {
  if (value && typeof value === "object") {
    const type = (value as { type?: unknown }).type;
    if (type === "ejected") return true;
  }
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
  const name = fn.name ?? toolCallFn.name;
  return typeof name === "string" ? name : "";
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
  const startingRef = useRef(false);
  const [status, setStatus] = useState<VoiceStatus>(
    publicKey ? "idle" : "error",
  );
  const [fullTranscript, setFullTranscript] = useState<
    { id: string; text: string }[]
  >([]);
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [lastBooking, setLastBooking] = useState<ApiBooking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    publicKey ? null : "Vapi belum dikonfigurasi. Hubungi admin atau lakukan booking manual.",
  );

  const applyVapiError = useCallback((event: unknown) => {
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
  }, []);

  type ToolCallResult = {
    toolCallId: string;
    name: string;
    result: string;
  };

  const handleTranscriptMessage = useCallback(
    (message: Record<string, unknown>) => {
      const role = message.role === "user" ? "Anda" : "AI";
      const text =
        typeof message.transcript === "string" ? message.transcript : "";
      if (!text) return;
      if (message.transcriptType === "final") {
        setFullTranscript((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: `${role}: ${text}` },
        ]);
        setLiveTranscript(null);
      } else {
        setLiveTranscript(`${role}: ${text}`);
      }
    },
    [],
  );

  const updateBookingIfCreated = useCallback(
    (name: string, result: string) => {
      if (name !== "create_booking") return;
      const parsed = JSON.parse(result) as { booking?: ApiBooking };
      if (parsed.booking) {
        setLastBooking(parsed.booking);
      }
    },
    [],
  );

  const executeSingleToolCall = useCallback(
    async (
      toolWithToolCall: Record<string, unknown>,
    ): Promise<ToolCallResult> => {
      const name = parseToolCallName(toolWithToolCall);
      const toolCallId = parseToolCallId(toolWithToolCall);
      const args = parseToolCallArgs(toolWithToolCall);
      try {
        const result = await executeBookingTool(name, args);
        updateBookingIfCreated(name, result);
        return { toolCallId, name, result };
      } catch (error) {
        return {
          toolCallId,
          name,
          result: JSON.stringify({
            error: error instanceof Error ? error.message : "Terjadi kesalahan.",
          }),
        };
      }
    },
    [updateBookingIfCreated],
  );

  const sendToolCallMessage = useCallback(
    (vapi: Vapi, toolWithToolCall: Record<string, unknown>) => {
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
                  typeof args === "string" ? args : JSON.stringify(parsedArgs),
              },
            },
          ],
        },
      });
    },
    [],
  );

  const sendToolResultMessage = useCallback(
    (
      vapi: Vapi,
      toolWithToolCall: Record<string, unknown>,
      results: ToolCallResult[],
    ) => {
      const id = parseToolCallId(toolWithToolCall);
      const result = results.find((r) => r.toolCallId === id)?.result ?? "{}";
      vapi.send({
        type: "add-message",
        message: {
          role: "tool",
          tool_call_id: id,
          content: result,
        },
      });
    },
    [],
  );

  const sendToolResults = useCallback(
    (
      vapi: Vapi,
      toolWithToolCallList: Record<string, unknown>[],
      results: ToolCallResult[],
    ) => {
      for (const toolWithToolCall of toolWithToolCallList) {
        sendToolCallMessage(vapi, toolWithToolCall);
        sendToolResultMessage(vapi, toolWithToolCall, results);
      }
    },
    [sendToolCallMessage, sendToolResultMessage],
  );

  const executeToolCalls = useCallback(
    async (toolWithToolCallList: Record<string, unknown>[]) => {
      setStatus("thinking");
      const results: ToolCallResult[] = [];
      for (const toolWithToolCall of toolWithToolCallList) {
        results.push(await executeSingleToolCall(toolWithToolCall));
      }
      const vapi = vapiRef.current;
      if (vapi) {
        sendToolResults(vapi, toolWithToolCallList, results);
      }
      setStatus("listening");
    },
    [executeSingleToolCall, sendToolResults],
  );

  const handleMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (String(message?.type).startsWith("transcript")) {
        handleTranscriptMessage(message);
        return;
      }
      if (message?.type !== "tool-calls") return;

      const toolWithToolCallList = Array.isArray(
        (message as { toolWithToolCallList?: unknown }).toolWithToolCallList,
      )
        ? ((message as { toolWithToolCallList: Record<string, unknown>[] })
            .toolWithToolCallList as Record<string, unknown>[])
        : [];

      void executeToolCalls(toolWithToolCallList);
    },
    [handleTranscriptMessage, executeToolCalls],
  );

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
      setLiveTranscript(null);
    };
    const onMessage = (message: unknown) => {
      handleMessage((message ?? {}) as Record<string, unknown>);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-start-failed", applyVapiError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", applyVapiError);
    vapi.on("message", onMessage);

    return () => {
      vapi.removeListener("call-start", onCallStart);
      vapi.removeListener("call-start-failed", applyVapiError);
      vapi.removeListener("speech-start", onSpeechStart);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("call-end", onCallEnd);
      vapi.removeListener("error", applyVapiError);
      vapi.removeListener("message", onMessage);
      void vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey, handleMessage, applyVapiError]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleEjection = (detail: unknown) => {
      if (!isVapiEjection(detail)) return;
      console.warn("[VapiBooking] intercepted SDK ejection:", getErrorDetail(detail));
      setStatus("error");
      setLiveTranscript(null);
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
    if (!vapi || startingRef.current) return;
    startingRef.current = true;
    setFullTranscript([]);
    setLiveTranscript(null);
    setLastBooking(null);
    setErrorMessage(null);
    setStatus("connecting");
    const startPromise = assistantId
      ? vapi.start(assistantId)
      : vapi.start(buildAssistant());
    void startPromise.catch(applyVapiError).finally(() => {
      startingRef.current = false;
    });
  }, [assistantId, applyVapiError]);

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

      {isCallActive && liveTranscript && (
        <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Live transcript
          </p>
          <p className="animate-pulse">…{liveTranscript}</p>
        </div>
      )}

      {fullTranscript.length > 0 && (
        <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Transcript lengkap
          </p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {fullTranscript.map((line) => (
              <p key={line.id}>{line.text}</p>
            ))}
          </div>
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