import ParticleBackground from "./ParticleBackground";

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 grid-overlay opacity-40" />
      <div className="absolute -left-1/4 -top-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#ff5b1f]/25 blur-[140px]" />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#1fbf9a]/25 blur-[140px]"
        style={{ animationDelay: "2s", animationDuration: "9s" }}
      />
      <div
        className="absolute left-1/2 top-1/3 h-[30%] w-[30%] animate-float-slow rounded-full bg-[#ffb400]/12 blur-[120px]"
      />
      <ParticleBackground />
    </div>
  );
}
