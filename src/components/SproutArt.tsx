type SproutArtProps = {
  compact?: boolean;
};

export function SproutArt({ compact = false }: SproutArtProps) {
  return (
    <figure className={compact ? 'sprout-art sprout-art--compact' : 'sprout-art'}>
      <span className="sprout-art__glow" aria-hidden="true" />
      <img src="/assets/sprout-reference-centered.png" alt="Молодой росток — символ нового начала" />
    </figure>
  );
}
