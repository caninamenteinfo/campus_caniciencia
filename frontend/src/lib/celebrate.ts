import confetti from "canvas-confetti";
import { playDing, playFanfare } from "./sound";

/** Explosión de confetti + sonido con la paleta de marca — para cada logro. */
export function celebrate(intensity: "step" | "week" = "step") {
  const colors = ["#f8d418", "#ff6b35", "#00d4ff"];
  const count = intensity === "week" ? 5 : 1;

  if (intensity === "week") playFanfare();
  else playDing();

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      confetti({
        particleCount: intensity === "week" ? 140 : 70,
        spread: 80,
        startVelocity: 45,
        origin: { y: 0.6 },
        colors,
        zIndex: 9999,
      });
    }, i * 180);
  }
}
