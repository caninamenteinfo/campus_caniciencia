import confetti from "canvas-confetti";

/** Explosión de confetti con la paleta de marca — para cada paso completado. */
export function celebrate(intensity: "step" | "week" = "step") {
  const colors = ["#f8d418", "#ff6b35", "#00d4ff"];
  const count = intensity === "week" ? 5 : 1;

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
