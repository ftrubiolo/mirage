{
  "id": "omarchy",
  "name": "Omarchy",
  "description": "Generated from ~/.config/omarchy/themed/mirage.json.tpl",
  "preferredMode": "{{ mode }}",
  "palette": {
    "canvas": "{{ background }}",
    "canvasSubtle": "{{ dark_background }}",
    "canvasStone": "{{ mix background foreground 0.06 }}",
    "surfaceLow": "{{ mix background foreground 0.05 }}",
    "surfaceContainer": "{{ lighter_background }}",
    "surfaceHigh": "{{ mix background foreground 0.14 }}",
    "surfaceHighest": "{{ mix background foreground 0.19 }}",
    "inkPrimary": "{{ foreground }}",
    "inkSecondary": "{{ dark_foreground }}",
    "inkTertiary": "{{ muted }}",
    "hairline": "rgba({{ foreground_rgb }}, 0.10)",
    "hairlineStrong": "rgba({{ foreground_rgb }}, 0.22)",
    "action": "{{ accent }}",
    "actionHover": "{{ mix accent foreground 0.14 }}",
    "actionActive": "{{ mix accent background 0.18 }}",
    "actionSubtle": "rgba({{ accent_rgb }}, 0.15)",
    "actionInk": "{{ mix accent foreground 0.45 }}",
    "scrollbarTrack": "{{ dark_background }}",
    "scrollbarThumb": "{{ lighter_background }}",
    "scrollbarThumbHover": "{{ mix background foreground 0.22 }}",
    "viewport": {
      "background": "{{ background }}",
      "gridPrimary": "{{ mix background foreground 0.16 }}",
      "gridSecondary": "{{ mix background foreground 0.07 }}",
      "hemisphereSky": "{{ mix background foreground 0.10 }}",
      "hemisphereGround": "{{ dark_background }}",
      "dimensionLine": "{{ accent }}"
    }
  }
}
