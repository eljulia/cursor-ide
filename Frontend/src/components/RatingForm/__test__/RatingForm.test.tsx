import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RatingForm } from "../RatingForm";

describe("RatingForm Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renderiza 5 estrellas interactivas inicialmente", () => {
    render(<RatingForm courseSlug="test-course" />);
    const stars = screen.getAllByLabelText(/estrellas/);
    expect(stars).toHaveLength(5);
  });

  it("el botón está deshabilitado sin rating seleccionado", () => {
    render(<RatingForm courseSlug="test-course" />);
    expect(screen.getByRole("button", { name: "Enviar valoración" })).toBeDisabled();
  });

  it("click en una estrella habilita el botón de envío", () => {
    render(<RatingForm courseSlug="test-course" />);
    fireEvent.click(screen.getByLabelText("3 estrellas"));
    expect(screen.getByRole("button", { name: "Enviar valoración" })).not.toBeDisabled();
  });

  it("submit llama a fetch con el endpoint y body correctos", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    render(<RatingForm courseSlug="mi-curso" />);
    fireEvent.click(screen.getByLabelText("4 estrellas"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar valoración" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/courses/mi-curso/ratings",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ rating: 4 }),
        })
      );
    });
  });

  it("muestra mensaje de éxito tras submit exitoso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(<RatingForm courseSlug="test-course" />);
    fireEvent.click(screen.getByLabelText("5 estrellas"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(await screen.findByText("¡Gracias por tu valoración!")).toBeInTheDocument();
  });

  it("muestra mensaje de error si el fetch falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<RatingForm courseSlug="test-course" />);
    fireEvent.click(screen.getByLabelText("2 estrellas"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar valoración" }));

    expect(
      await screen.findByText("No se pudo enviar tu valoración. Intenta de nuevo.")
    ).toBeInTheDocument();
  });

  it("el botón está deshabilitado durante isSubmitting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {}))
    );

    render(<RatingForm courseSlug="test-course" />);
    fireEvent.click(screen.getByLabelText("3 estrellas"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar valoración" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
    });
  });
});
