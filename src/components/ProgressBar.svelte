<script lang="ts">
  let { current, total } = $props<{ current: number; total: number }>();
  const pct = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>
<div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Question {current} of {total}">
  <div class="fill" style="width: {pct}%"></div>
  <span class="text mono">{current} / {total}</span>
</div>
<style>
  .bar {
    position: relative;
    background: oklch(var(--b2));
    border: 1px solid oklch(var(--s) / 0.3);
    height: 20px;
    border-radius: 0.2rem;
    overflow: hidden;
    margin: 0 0 1.25rem;
    box-shadow: 1px 1px 0 oklch(var(--s) / 0.3);
  }
  .fill {
    background: repeating-linear-gradient(
      45deg,
      oklch(var(--s)) 0px,
      oklch(var(--s)) 1px,
      oklch(var(--s) / 0.6) 1px,
      oklch(var(--s) / 0.6) 4px
    );
    height: 100%;
    transition: width 0.2s ease;
  }
  .text {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 0.72rem;
    font-weight: 700;
    color: oklch(var(--bc));
    letter-spacing: 0.05em;
  }
</style>
