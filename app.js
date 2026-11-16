(function () {
  "use strict";

  var FEATURES = [
    "sqft_living", "bedrooms", "bathrooms", "year_built",
    "lot_size", "condition_score", "distance_to_center_miles"
  ];

  var MODEL = null;
  var mins = null;
  var maxs = null;
  var yMin = 0;
  var yMax = 0;
  var wireLen = 0;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }

  function clamp(v, a, b) {
    return v < a ? a : (v > b ? b : v);
  }

  /* ---------- theme ---------- */
  function initTheme() {
    $("themeBtn").addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- formatting ---------- */
  function formatVal(f, v) {
    if (f === "sqft_living" || f === "lot_size") {
      return Math.round(v).toLocaleString("en-US") + " sqft";
    }
    if (f === "year_built") return String(Math.round(v));
    if (f === "condition_score") return Math.round(v) + " / 5";
    if (f === "distance_to_center_miles") return Number(v).toFixed(1) + " mi";
    return String(Math.round(v));
  }

  function paintTrack(el) {
    var min = parseFloat(el.min);
    var max = parseFloat(el.max);
    var pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
    el.style.setProperty("--fill", pct.toFixed(3) + "%");
  }

  function syncLabels() {
    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i];
      var el = $(f);
      if (!el) continue;
      paintTrack(el);
      var out = $("v-" + f);
      if (out) out.textContent = formatVal(f, parseFloat(el.value));
    }
  }

  /* ---------- inference (mirrors model.py) ---------- */
  function predict() {
    var acc = MODEL.b;
    for (var i = 0; i < FEATURES.length; i++) {
      var x = (parseFloat($(FEATURES[i]).value) - mins[i]) / (maxs[i] - mins[i]);
      acc += x * MODEL.w[i];
    }
    return yMin + acc * (yMax - yMin);
  }

  function showPrice(price) {
    var el = $("price");
    el.classList.remove("is-empty");
    var target = Math.round(price);
    var finalText = "$" + target.toLocaleString("en-US");

    if (reduceMotion) {
      el.textContent = finalText;
      return;
    }

    var settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      el.textContent = finalText;
    }
    // guarantee the number lands even if rAF is throttled (background tab)
    window.setTimeout(settle, 700);

    var t0 = performance.now();
    function frame(t) {
      if (settled) return;
      var p = clamp((t - t0) / 620, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = "$" + Math.round(target * eased).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(frame);
      else settle();
    }
    requestAnimationFrame(frame);
  }

  function updateMeter(price) {
    var fill = $("meterFill"), knob = $("meterKnob");
    if (!fill || !knob) return;
    var span = yMax - yMin || 1;
    var pct = clamp((price - yMin) / span, 0, 1) * 100;
    fill.style.width = pct.toFixed(2) + "%";
    knob.style.left = pct.toFixed(2) + "%";
  }

  function renderBounds() {
    var low = $("lowVal"), high = $("highVal");
    if (!low || !high) return;
    var lo = "$" + Math.round(yMin).toLocaleString("en-US");
    var hi = "$" + Math.round(yMax).toLocaleString("en-US");
    low.textContent = lo;
    high.textContent = hi;
  }

  function runModel() {
    if (!MODEL) {
      loadModel().then(runModel).catch(function () {});
      return;
    }
    var price = predict();
    showPrice(price);
    var slab = $("result");
    slab.classList.remove("flash");
    void slab.offsetWidth;
    slab.classList.add("flash");
    updateMeter(price);
    $("runBtn").classList.add("fired");
    window.setTimeout(function () {
      $("runBtn").classList.remove("fired");
    }, 700);
  }

  /* ---------- scroll choreography ---------- */
  function initScroll() {
    var hero = $("hero");
    var heroInner = $("heroInner");
    var app = $("app");
    var glow = $("wireGlow");

    function onScroll() {
      if (!heroInner) return;
      var vh = window.innerHeight;
      var top = app.getBoundingClientRect().top;
      var p = clamp((vh - top) / (vh * 0.62), 0, 1);
      var e = p * p;

      heroInner.style.opacity = String(1 - e);
      heroInner.style.transform =
        "translateY(" + (-e * 54).toFixed(2) + "px) scale(" + (1 - e * 0.035).toFixed(4) + ")";
      heroInner.style.filter = "blur(" + (e * 6).toFixed(2) + "px)";

      var wireP = clamp((p - 0.35) / 0.65, 0, 1);
      if (glow) glow.style.strokeDashoffset = String((wireLen || 0) * (1 - wireP));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* ---------- RUN IT sits on the Bathrooms line ---------- */
  function placeRun() {
    var slot = document.querySelector(".run-slot");
    var runBtn = $("runBtn");
    var bath = $("bathrooms");
    if (!slot || !runBtn || !bath) return;

    // stacked layout: let the button sit under the input slab
    if (!window.matchMedia("(min-width: 901px)").matches) {
      slot.style.transform = "";
      return;
    }

    // measure the button where the grid put it, then shift it onto the row
    slot.style.transform = "none";
    var b = bath.getBoundingClientRect();
    var r = runBtn.getBoundingClientRect();
    var delta = (b.top + b.height / 2) - (r.top + r.height / 2);
    slot.style.transform = "translateY(" + delta.toFixed(1) + "px)";
  }

  /* ---------- wire: Bathrooms -> RUN IT -> up -> right -> price heading ---------- */
  function drawWire() {
    placeRun();

    var svg = $("wireSvg");
    var line = $("wireLine");
    var glow = $("wireGlow");
    var inputs = $("inputs");
    var result = $("result");
    var runBtn = $("runBtn");
    var bath = $("bathrooms");
    var eyebrow = result ? result.querySelector(".eyebrow") : null;
    var grid = $("appGrid");
    if (!svg || !line || !glow || !inputs || !result || !runBtn || !bath || !grid) return;

    var g = grid.getBoundingClientRect();
    if (g.width < 2 || g.height < 2) return;

    svg.setAttribute("viewBox", "0 0 " + g.width + " " + g.height);
    svg.setAttribute("width", String(g.width));
    svg.setAttribute("height", String(g.height));

    var i = inputs.getBoundingClientRect();
    var r = result.getBoundingClientRect();
    var b = runBtn.getBoundingClientRect();
    var bt = bath.getBoundingClientRect();
    var e = eyebrow ? eyebrow.getBoundingClientRect() : null;

    // feeder leaves the input slab on the Bathrooms line
    var yRun = (bt.top - g.top) + bt.height / 2;
    var xRun = (b.left - g.left) + b.width / 2;
    var yRunTop = (b.top - g.top) - 2;
    var xStart = (i.left - g.left) + i.width + 2;
    var xFeedEnd = (b.left - g.left) - 2;

    // riser climbs to the "Estimated price" heading, then enters horizontally
    var yTarget = e ? (e.top - g.top) + e.height / 2 : (r.top - g.top) + r.height * 0.3;
    var xEnd = (r.left - g.left) + 26;  // tucks under the slab edge
    var RAD = 26;

    var feeder = "M " + xStart + " " + yRun.toFixed(1) +
                 " H " + xFeedEnd.toFixed(1);

    var riser = "M " + xRun.toFixed(1) + " " + yRunTop.toFixed(1) +
                " V " + (yTarget + RAD).toFixed(1) +
                " Q " + xRun.toFixed(1) + " " + yTarget.toFixed(1) + " " +
                        (xRun + RAD).toFixed(1) + " " + yTarget.toFixed(1) +
                " H " + xEnd.toFixed(1);

    var d = feeder + " " + riser;

    line.setAttribute("d", d);
    glow.setAttribute("d", d);

    wireLen = line.getTotalLength();
    glow.style.strokeDasharray = String(wireLen);
    glow.style.strokeDashoffset = String(wireLen);
    glow.style.opacity = "1";
  }

  /* ---------- boot ---------- */
  function loadModel() {
    return fetch("weights.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("weights.json " + res.status);
        return res.json();
      })
      .then(function (m) {
        MODEL = m;
        mins = m.mins;
        maxs = m.maxs;
        yMin = m.y_min;
        yMax = m.y_max;
        FEATURES = m.features.slice();
        renderBounds();
      });
  }

  function init() {
    var defaults = {};
    FEATURES.forEach(function (f) { defaults[f] = $(f).value; });

    initTheme();
    syncLabels();

    FEATURES.forEach(function (f) {
      var el = $(f);
      if (el) el.addEventListener("input", syncLabels);
    });

    initBubbles();

    $("runBtn").addEventListener("click", runModel);
    $("resetBtn").addEventListener("click", function () {
      FEATURES.forEach(function (f) {
        var el = $(f);
        if (el && defaults[f] !== undefined) el.value = defaults[f];
      });
      syncLabels();
      var el = $("price");
      el.textContent = "\u2014";
      el.classList.add("is-empty");
      $("result").classList.remove("flash");
      var f = $("meterFill"), k = $("meterKnob");
      if (f) f.style.width = "0";
      if (k) k.style.left = "0";
    });

    $("tryBtn").addEventListener("click", function () {
      var app = $("app");
      if (app) app.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      window.setTimeout(function () { $("runBtn").focus({ preventScroll: true }); }, 560);
    });

    $("brandBtn").addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    initScroll();
    drawWire();
    // re-measure once fonts / layout have settled
    window.addEventListener("load", drawWire);
    requestAnimationFrame(drawWire);
    requestAnimationFrame(function () { requestAnimationFrame(drawWire); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWire);

    var t = null;
    window.addEventListener("resize", function () {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(drawWire, 90);
    });

    loadModel().catch(function (err) {
      console.error("model failed to load", err);
      $("price").textContent = "no model";
    });
  }

  function moveBubble(el) {
    var bub = document.getElementById("b-" + el.id);
    if (!bub) return;
    var min = parseFloat(el.min), max = parseFloat(el.max), v = parseFloat(el.value);
    var pct = (v - min) / (max - min);
    var w = el.clientWidth - 19;
    bub.style.left = (9.5 + pct * w).toFixed(1) + "px";
    bub.textContent = formatVal(el.id, v);
  }

  function initBubbles() {
    FEATURES.forEach(function (f) {
      var el = $(f);
      if (!el) return;
      var row = el.closest(".row");

      function show() {
        if (!row) return;
        row.classList.add("is-live");
        moveBubble(el);
      }
      function hide() {
        if (row) row.classList.remove("is-live");
      }

      el.addEventListener("pointerdown", show);
      el.addEventListener("input", show);
      window.addEventListener("pointerup", hide);
      el.addEventListener("blur", hide);
      el.addEventListener("keydown", function (ev) {
        if (ev.key.indexOf("Arrow") === 0) show();
      });
      el.addEventListener("keyup", hide);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
