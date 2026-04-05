"use client";
import { FC, useState } from "react";
import styles from "./RatingForm.module.scss";

interface RatingFormProps {
  courseSlug: string;
  onRatingSubmitted?: () => void;
}

export const RatingForm: FC<RatingFormProps> = ({ courseSlug, onRatingSubmitted }) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (selectedRating === null) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/courses/${courseSlug}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar la valoración");
      }

      setSubmitted(true);
      onRatingSubmitted?.();
    } catch {
      setError("No se pudo enviar tu valoración. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <p className={styles.success}>¡Gracias por tu valoración!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Valora este curso</h3>
      <div className={styles.stars}>
        {[5, 4, 3, 2, 1].map((value) => (
          <span
            key={value}
            className={`${styles.star} ${selectedRating !== null && value <= selectedRating ? styles.starSelected : ""}`}
            onClick={() => setSelectedRating(value)}
            role="button"
            aria-label={`${value} estrellas`}
          >
            ★
          </span>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button
        className={styles.submitButton}
        onClick={handleSubmit}
        disabled={selectedRating === null || isSubmitting}
      >
        {isSubmitting ? "Enviando..." : "Enviar valoración"}
      </button>
    </div>
  );
};
