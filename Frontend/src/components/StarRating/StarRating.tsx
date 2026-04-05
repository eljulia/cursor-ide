import { FC } from "react";
import styles from "./StarRating.module.scss";

interface StarRatingProps {
  rating: number | null;
  count: number;
  maxStars?: number;
}

export const StarRating: FC<StarRatingProps> = ({ rating, count, maxStars = 5 }) => {
  if (rating == null) {
    return (
      <div className={styles.container}>
        <span className={styles.noRating}>Sin valoraciones</span>
      </div>
    );
  }

  const filledStars = Math.round(rating);

  return (
    <div className={styles.container}>
      <div className={styles.stars}>
        {Array.from({ length: maxStars }, (_, i) => (
          <span key={i} className={i < filledStars ? styles.starFilled : styles.starEmpty}>
            {i < filledStars ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span className={styles.score}>{rating.toFixed(1)}</span>
      <span className={styles.count}>({count})</span>
    </div>
  );
};
