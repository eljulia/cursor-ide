import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StarRating } from "../StarRating";

describe("StarRating Component", () => {
  it('muestra "Sin valoraciones" cuando rating es null', () => {
    render(<StarRating rating={null} count={0} />);
    expect(screen.getByText("Sin valoraciones")).toBeInTheDocument();
  });

  it("muestra el número correcto de estrellas llenas para un rating dado", () => {
    const { container } = render(<StarRating rating={3} count={10} />);
    const filledStars = container.querySelectorAll("[class*='starFilled']");
    expect(filledStars).toHaveLength(3);
  });

  it("muestra el valor con 1 decimal", () => {
    render(<StarRating rating={4.3} count={5} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("muestra el conteo entre paréntesis", () => {
    render(<StarRating rating={3.5} count={42} />);
    expect(screen.getByText("(42)")).toBeInTheDocument();
  });

  it("respeta el valor de maxStars si se provee", () => {
    const { container } = render(<StarRating rating={3} count={5} maxStars={3} />);
    const allStars = container.querySelectorAll("[class*='starFilled'], [class*='starEmpty']");
    expect(allStars).toHaveLength(3);
  });
});
