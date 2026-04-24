<script lang="ts">
  let { current, total } = $props<{ current: number; total: number }>();
  const pct = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>
<div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Question {current} of {total}">
  <div class="fill" style="width: {pct}%"></div>
  <span class="text">{current} / {total}</span>
</div>
<style>
  .bar { position: relative; background: #eee; height: 24px; border-radius: 12px; overflow: hidden; margin: 0 0 1rem; }
  .fill { background: var(--accent); height: 100%; transition: width .2s; }
  .text { position: absolute; inset: 0; display: grid; place-items: center; font-size: 0.85rem; color: #222; }
</style>
