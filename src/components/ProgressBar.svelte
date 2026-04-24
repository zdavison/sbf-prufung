<script lang="ts">
  let { current, total } = $props<{ current: number; total: number }>();
  const pct = $derived(Math.round((current / total) * 100));
</script>
<div class="bar" aria-label="Progress">
  <div class="fill" style="width: {pct}%"></div>
  <span class="text">{current} / {total}</span>
</div>
<style>
  .bar { position: relative; background: #eee; height: 24px; border-radius: 12px; overflow: hidden; margin: 0 0 1rem; }
  .fill { background: var(--accent); height: 100%; transition: width .2s; }
  .text { position: absolute; inset: 0; display: grid; place-items: center; font-size: 0.85rem; color: #222; }
</style>
