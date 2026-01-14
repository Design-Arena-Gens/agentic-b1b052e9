import { VoiceAgent } from "@/components/voice-agent";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(95,152,255,0.25),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(223,61,158,0.2),_transparent_60%)]" />
      </div>
      <VoiceAgent />
    </main>
  );
}
