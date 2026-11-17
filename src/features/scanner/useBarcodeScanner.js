import { useCallback, useEffect, useRef, useState } from "react";

const FORMATS = ["EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128"];

function cameraError(err) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return { kind: "unsupported", message: "La fotocamera richiede una connessione sicura (HTTPS) e Safari aggiornato." };
  }
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        kind: "denied",
        message:
          "Accesso alla fotocamera negato. In Safari tocca «aA» › Impostazioni sito › Fotocamera › Consenti, oppure Impostazioni iPhone › Safari › Fotocamera.",
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return { kind: "nocamera", message: "Nessuna fotocamera disponibile su questo dispositivo." };
    case "NotReadableError":
    case "AbortError":
      return { kind: "busy", message: "La fotocamera è usata da un'altra app. Chiudila e riprova." };
    default:
      return { kind: "unknown", message: "Impossibile avviare la fotocamera. Riprova." };
  }
}

/**
 * Scanner con zxing (Safari non supporta BarcodeDetector). zxing viene caricato solo qui.
 * La fotocamera viene rilasciata alla chiusura e quando l'app va in background.
 */
export function useBarcodeScanner(videoRef, { onDetected, paused }) {
  const [state, setState] = useState("starting"); // starting | running | error
  const [error, setError] = useState(null);
  const [torch, setTorch] = useState({ supported: false, on: false });
  const controls = useRef(null);
  const session = useRef(0);
  const onDetectedRef = useRef(onDetected);
  const pausedRef = useRef(paused);
  onDetectedRef.current = onDetected;
  pausedRef.current = paused;

  const stop = useCallback(() => {
    session.current += 1;
    try {
      controls.current?.stop();
    } catch {
      // già fermo
    }
    controls.current = null;
    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream && typeof stream.getTracks === "function") stream.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    setTorch({ supported: false, on: false });
  }, [videoRef]);

  const start = useCallback(async () => {
    stop();
    const mySession = session.current;
    setState("starting");
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(cameraError());
      setState("error");
      return;
    }
    try {
      const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, FORMATS.map((f) => BarcodeFormat[f])]]);
      // Lettore solo 1D (EAN/UPC/Code128): più leggero del multi-formato, che in zxing 0.23
      // scrive un warning in console a ogni fotogramma senza codice.
      const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 600 });
      const video = videoRef.current;
      if (!video || mySession !== session.current) return;
      const ctrl = await reader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        },
        video,
        (result) => {
          if (result && !pausedRef.current) onDetectedRef.current?.(result.getText());
        },
      );
      // Chiuso o andato in background durante l'avvio: rilascia subito la fotocamera.
      if (mySession !== session.current) {
        ctrl.stop();
        video.srcObject?.getTracks?.().forEach((t) => t.stop());
        return;
      }
      controls.current = ctrl;
      const track = video.srcObject?.getVideoTracks?.()[0];
      const caps = track?.getCapabilities?.() || {};
      setTorch({ supported: Boolean(caps.torch), on: false });
      setState("running");
    } catch (err) {
      if (mySession !== session.current) return;
      stop();
      setError(cameraError(err));
      setState("error");
    }
  }, [stop, videoRef]);

  const toggleTorch = useCallback(async () => {
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
    if (!track) return;
    const next = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorch({ supported: true, on: next });
    } catch {
      setTorch({ supported: false, on: false });
    }
  }, [torch.on, videoRef]);

  useEffect(() => {
    start();
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [start, stop]);

  return { state, error, torch, toggleTorch, retry: start };
}
