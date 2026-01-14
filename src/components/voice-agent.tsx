"use client";

import {
  AudioLines,
  LoaderCircle,
  Mic,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VideoCard, type YouTubeVideo } from "@/components/video-card";

type AssistantMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
};

type SearchResponse = {
  query: string;
  items: YouTubeVideo[];
  message?: string;
};

type AgentStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

const suggestions = [
  "Recomende vídeos sobre inteligência artificial",
  "Buscar os trailers mais recentes no YouTube",
  "Quais são os podcasts brasileiros em alta?",
  "Sugira playlists de lo-fi para estudar",
  "Mostre tutoriais de Next.js em português",
];

const statusCopy: Record<AgentStatus, string> = {
  idle: "Pronto para ouvir seu próximo comando.",
  listening: "Ouvindo você em tempo real…",
  thinking: "Buscando no YouTube e preparando as melhores recomendações…",
  speaking: "Narrando os resultados encontrados.",
  error: "Algo não saiu como esperado. Tente novamente.",
};

const statusAccent: Record<AgentStatus, string> = {
  idle: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
  listening: "bg-cyan-500/10 text-cyan-200 border border-cyan-500/40",
  thinking: "bg-blue-500/10 text-blue-200 border border-blue-500/40",
  speaking: "bg-purple-500/10 text-purple-200 border border-purple-500/40",
  error: "bg-red-500/10 text-red-300 border border-red-500/40",
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export function VoiceAgent() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastCommandRef = useRef<string>("");

  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [highlighted, setHighlighted] = useState<YouTubeVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isSynthesisSupported, setIsSynthesisSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const pushMessage = useCallback((role: "user" | "agent", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: createId(), role, content, timestamp: Date.now() },
    ]);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const synth = speechRef.current;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      utterance.volume = 0.95;
      utterance.onstart = () => setStatus("speaking");
      utterance.onend = () => {
        setStatus("idle");
        utteranceRef.current = null;
      };
      utterance.onerror = () => setStatus("idle");
      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [],
  );

  const handleQuery = useCallback(
    async (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      setQuery(cleaned);
      setIsLoading(true);
      setError(null);
      setStatus("thinking");
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: cleaned, max: 6 }),
        });

        if (!response.ok) {
          throw new Error("Falha na comunicação com o agente.");
        }

        const payload = (await response.json()) as SearchResponse;
        const items = payload.items ?? [];

        setResults(items);
        setHighlighted(items[0] ?? null);
        lastCommandRef.current = cleaned;

        const agentResponse =
          items.length === 0
            ? `Não encontrei vídeos recentes sobre "${cleaned}". Quer tentar reformular o pedido?`
            : buildAgentSummary(cleaned, items);

        pushMessage("agent", agentResponse);

        if (isSynthesisSupported && items.length > 0) {
          speak(agentResponse);
        } else {
          setStatus(items.length === 0 ? "idle" : "thinking");
        }
      } catch (err) {
        console.error("[VoiceAgent] query error", err);
        const fail =
          "Tive um problema para falar com o YouTube agora. Tente novamente em alguns instantes.";
        setError(fail);
        pushMessage("agent", fail);
        setStatus("error");
      } finally {
        setIsLoading(false);
      }
    },
    [isSynthesisSupported, pushMessage, speak],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    type RecognitionCtor = new () => SpeechRecognition;
    const scopedWindow = window as typeof window & {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Recognition =
      scopedWindow.SpeechRecognition ?? scopedWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setIsSpeechSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          final = `${final} ${transcript}`.trim();
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }
      setInterimTranscript(interim);
      if (final && final !== lastCommandRef.current) {
        lastCommandRef.current = final;
        pushMessage("user", final);
        void handleQuery(final);
      }
    };

    recognition.onerror = (event) => {
      setError(
        event.error === "no-speech"
          ? "Não consegui ouvir nada. Tente falar mais próximo do microfone."
          : "Falha ao capturar áudio. Permita o acesso ao microfone e tente novamente.",
      );
      setStatus("error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status !== "error") setStatus("idle");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [handleQuery, pushMessage, status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      speechRef.current = window.speechSynthesis;
    } else {
      setIsSynthesisSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!isSpeechSupported) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setStatus("idle");
    } else {
      try {
        recognition.start();
        setIsListening(true);
        setStatus("listening");
        setError(null);
        setInterimTranscript("");
      } catch (err) {
        console.error("[VoiceAgent] start error", err);
        setStatus("error");
        setError("Não consegui iniciar a escuta. Atualize a página e tente de novo.");
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = String(formData.get("query") ?? "").trim();
    if (text) {
      pushMessage("user", text);
      void handleQuery(text);
      event.currentTarget.reset();
    }
  };

  const agentStateCopy = statusCopy[status];
  const statusBadgeClass = `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusAccent[status]}`;

  const renderIcon = useMemo(() => {
    if (status === "thinking") return <LoaderCircle className="h-4 w-4 animate-spin" />;
    if (status === "listening") return <AudioLines className="h-4 w-4 animate-pulse" />;
    if (status === "speaking") return <Volume2 className="h-4 w-4 animate-pulse" />;
    if (status === "error") return <Square className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  }, [status]);

  const handleSuggestion = (value: string) => {
    pushMessage("user", value);
    void handleQuery(value);
  };

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          VoxTube · Agente de voz para YouTube
        </span>
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
            Fale com o YouTube, receba respostas inteligentes em segundos.
          </h1>
          <p className="text-lg leading-relaxed text-white/70">
            Ative o microfone, peça recomendações, playlists ou trailers. O VoxTube
            encontra os melhores vídeos, resume os destaques e responde com voz natural
            para você não perder tempo digitando.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSuggestion(item)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr,minmax(320px,1fr)]">
        <div className="flex flex-col gap-8">
          <div className="glass relative overflow-hidden rounded-3xl border border-white/10 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className={statusBadgeClass}>
                  {renderIcon}
                  {status.toUpperCase()}
                </span>
                <p className="text-sm text-white/60">{agentStateCopy}</p>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className={`group inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 transition ${
                  isListening ? "bg-red-500/90" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {isListening ? (
                  <Square className="h-6 w-6 text-white" />
                ) : (
                  <Mic className="h-6 w-6 text-white group-hover:text-red-300" />
                )}
              </button>
            </div>

            {!isSpeechSupported && (
              <div className="mt-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                Seu navegador não suporta reconhecimento de voz. Use o campo de texto
                para enviar comandos.
              </div>
            )}

            {interimTranscript && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <span className="text-xs uppercase text-white/50">Você está dizendo…</span>
                <p className="mt-1 text-lg font-medium text-white">{interimTranscript}</p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-300">
                {error}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
            >
              <input
                name="query"
                placeholder="Descreva o tipo de vídeo que deseja encontrar…"
                className="w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-black transition hover:bg-white"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Histórico da conversa</h2>
              <span className="text-xs text-white/40">
                {messages.length === 0
                  ? "Aguardando seu primeiro comando"
                  : `${messages.length} interações`}
              </span>
            </div>
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="rounded-2xl border border-white/5 bg-black/20 px-4 py-6 text-sm text-white/60">
                  Assim que você falar ou digitar algo, o VoxTube responde aqui com ideias
                  de vídeos sob medida para o seu pedido.
                </p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "self-end bg-emerald-500/10 text-emerald-100"
                      : "self-start bg-white/10 text-white/80"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-widest text-white/40">
                    {message.role === "user" ? "Você" : "VoxTube"}
                  </span>
                  <p className="whitespace-pre-line text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Resultados para “{query || "—"}”
              </h2>
              {isLoading && (
                <span className="inline-flex items-center gap-2 text-xs text-white/50">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Explorando o YouTube…
                </span>
              )}
            </div>

            {results.length === 0 && !isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/60">
                Faça um pedido por voz ou texto para receber recomendações de vídeos.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {results.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onFocus={setHighlighted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="glass flex h-fit flex-col gap-6 rounded-3xl border border-white/10 p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">
              Destaque em tempo real
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {highlighted?.title ?? "Escolha um vídeo para ver mais detalhes"}
            </h2>
          </div>

          {highlighted ? (
            <div className="flex flex-col gap-4 text-sm text-white/70">
              <p>
                <span className="text-white/40">Canal:</span>{" "}
                <span className="text-white/90">{highlighted.channelTitle}</span>
              </p>
              <p>
                <span className="text-white/40">Publicado em:</span>{" "}
                {highlighted.publishedAt}
              </p>
              <p>
                <span className="text-white/40">Duração:</span> {highlighted.duration}
              </p>
              <p>
                <span className="text-white/40">Visualizações:</span>{" "}
                {highlighted.views}
              </p>
              <p className="text-white/60">
                {highlighted.description || "Descrição não disponível."}
              </p>
              <a
                href={highlighted.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <Volume2 className="h-4 w-4" />
                Abrir no YouTube
              </a>
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
              Quando você selecionar ou passar o mouse em um cartão, os detalhes completos
              aparecem aqui para facilitar sua decisão.
            </p>
          )}

          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-white/50">
            <p className="font-semibold uppercase tracking-widest text-white/60">
              Dicas
            </p>
            <ul className="mt-2 space-y-2 list-disc pl-4">
              <li>Combine estilos e idiomas: “vídeos de ciência em português”.</li>
              <li>
                Pergunte por formatos: “faça um resumo dos shorts sobre viagens”.
              </li>
              <li>
                Peça por tendências: “o que está em alta na música latina esta semana?”.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

const buildAgentSummary = (prompt: string, items: YouTubeVideo[]) => {
  const top = items.slice(0, 3);
  const highlights = top
    .map(
      (item, index) =>
        `${index + 1}. ${item.title} (${item.duration}, ${item.views} views, canal ${item.channelTitle}).`,
    )
    .join(" ");

  return `Aqui está o que encontrei sobre “${prompt}”. ${highlights} Quer ouvir mais resultados? É só pedir!`;
};
