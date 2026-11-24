(function () {
function thanksgiving(year) {
    var first = new Date(year, 10, 1);
    var offset = (4 - first.getDay() + 7) % 7;      // first Thursday
    return new Date(year, 10, 1 + offset + 21);      // fourth Thursday, midnight local
  }
  function nextTarget(now) {
    var t = thanksgiving(now.getFullYear());
    var endOfDay = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    return now >= endOfDay ? thanksgiving(now.getFullYear() + 1) : t;
  }
  var clock = document.getElementById("clock");
  var dateEl = document.getElementById("date");
  var units = [["d", "days"], ["h", "hours"], ["m", "minutes"], ["s", "seconds"]];
  clock.innerHTML = units.map(function (u) {
    return '<div class="unit"><span class="num" id="n-' + u[0] + '">0</span><span class="lbl">' + u[1] + '</span></div>';
  }).join("");
  var fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function tick() {
    var now = new Date(), target = nextTarget(now), diff = target - now;
    dateEl.textContent = "Thanksgiving falls on " + fmt.format(target) + ".";
    if (diff <= 0) {
      clock.innerHTML = '<div class="done">Happy Thanksgiving! 🦃</div>';
      clearInterval(timer);
      return;
    }
    var v = {
      d: Math.floor(diff / 86400000),
      h: Math.floor(diff / 3600000) % 24,
      m: Math.floor(diff / 60000) % 60,
      s: Math.floor(diff / 1000) % 60
    };
    for (var k in v) document.getElementById("n-" + k).textContent = String(v[k]).padStart(2, "0");
  }
  var timer = setInterval(tick, 1000);
  tick();

  // LEAVES ANIMATION


  var canvas = document.getElementById("leaves"), ctx = canvas.getContext("2d");
  var leafPath = new Path2D("M0,-1 C0.7,-0.6 0.9,0.1 0,1 C-0.9,0.1 -0.7,-0.6 0,-1 Z");
  var vein = new Path2D("M0,-0.9 L0,1.15");
  var colors = ["#e08a2e", "#b8431f", "#f2c14e", "#8c2f1b", "#c96a1b", "#d9a441"];
  var W, H, leaves = [], running = true, last = 0;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) running = false;

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(34, Math.max(14, W / 38)));
    while (leaves.length < count) leaves.push(make(true));
    leaves.length = count;
  }
  function make(anywhere) {
    var depth = Math.random();                     // 0 far, 1 near
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -40,
      r: 8 + depth * 22,                           // leaf size
      vy: 18 + depth * 40,                         // fall speed px/s
      sway: 20 + Math.random() * 40,               // side-to-side range
      freq: 0.4 + Math.random() * 0.6,
      phase: Math.random() * 6.28,
      rot: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 0.9,
      color: colors[(Math.random() * colors.length) | 0],
      alpha: 0.35 + depth * 0.55,
      t: 0
    };
  }
  function draw(l) {
    ctx.save();
    ctx.translate(l.x + Math.sin(l.t * l.freq + l.phase) * l.sway, l.y);
    ctx.rotate(l.rot + Math.sin(l.t * l.freq + l.phase) * 0.6);
    ctx.scale(l.r * 0.62, l.r);
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = l.color;
    ctx.fill(leafPath);
    ctx.globalAlpha = l.alpha * 0.6;
    ctx.strokeStyle = "rgba(29,20,32,0.7)";
    ctx.lineWidth = 0.06;
    ctx.stroke(vein);
    ctx.restore();
  }
  function frame(ts) {
    var dt = Math.min((ts - last) / 1000 || 0, 0.05);
    last = ts;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      if (running) { l.t += dt; l.y += l.vy * dt; l.rot += l.spin * dt; }
      if (l.y - l.r > H) leaves[i] = l = make(false);
      draw(l);
    }
    if (running) requestAnimationFrame(frame);
  }

  size();
  window.addEventListener("resize", size);
  requestAnimationFrame(frame);

  var btn = document.getElementById("toggle");
  if (btn) {
    if (reduce) { btn.textContent = "Play the leaves"; btn.setAttribute("aria-pressed", "false"); }
    btn.addEventListener("click", function () {
      running = !running;
      btn.textContent = running ? "Pause the leaves" : "Play the leaves";
      btn.setAttribute("aria-pressed", String(running));
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });
  }

var notesEl = document.getElementById("notes"), input = document.getElementById("winput");
  var wbtn = document.getElementById("wbtn"), statusEl = document.getElementById("wstatus");
  var wcolors = ["#e08a2e", "#f2c14e", "#c96a1b", "#d9a441", "#e0714a"];
  var byAuthor = {}, mine = [], db = null, myId = null, lastTs = 0;

  function say(msg) { statusEl.textContent = msg; }
  function renderWall() {
    var all = [];
    Object.keys(byAuthor).forEach(function (k) {
      (byAuthor[k] || []).forEach(function (n) {
        if (n && typeof n.t === "string" && typeof n.ts === "number") all.push(n);
      });
    });
    all.sort(function (a, b) { return b.ts - a.ts; });
    notesEl.textContent = "";
    all.slice(0, 500).forEach(function (n, i) {
      var li = document.createElement("li");
      li.className = "note" + (n.ts === lastTs ? " fresh" : "");
      li.textContent = n.t.slice(0, 140);                       // plain text, never markup
      li.style.setProperty("--c", wcolors[n.ts % wcolors.length]);
      li.style.setProperty("--tilt", (((n.ts % 9) - 4) * 0.6) + "deg");
      li.style.animationDelay = (-(i * 1.7) % 7) + "s";
      notesEl.appendChild(li);
    });
    if (!all.length) say("No notes yet. Be the first to add one.");
  }

  document.getElementById("wform").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    var note = { t: text.slice(0, 140), ts: Date.now() };
    mine = [note].concat(mine).slice(0, 50);            // keep your 50 most recent
    byAuthor[myId || "local"] = mine;
    lastTs = note.ts;
    input.value = "";
    renderWall();
    if (db && myId) {
      wbtn.disabled = true;
      db.doc("gratitude/" + myId).set({ notes: mine }).then(function () {
        say("Added. Thank you for sharing.");
      }).catch(function () {
        say("Your note shows here, but it couldn't be saved for others.");
      }).then(function () { wbtn.disabled = false; });
    } else {
      say("Added. Thank you for sharing.");
    }
  });

  renderWall();
  (async function () {
    try {
      if (!window.claude) return;
      var user = await claude.use("user");
      db = await claude.use("db");
      if (!db || !user) return;
      myId = await user.id();
      var timer = setTimeout(function () { say("The wall can't be reached yet. Notes may be out of date."); }, 10000);
      db.collection("gratitude").onSnapshot(function (snap) {
        clearTimeout(timer);
        byAuthor = {};
        snap.docs.forEach(function (d) {
          var data = d.data();
          if (data && Array.isArray(data.notes)) byAuthor[d.id] = data.notes;
        });
        if (byAuthor[myId]) mine = byAuthor[myId].filter(function (n) { return n && typeof n.t === "string"; });
        statusEl.textContent = "";
        renderWall();
      }, function () { clearTimeout(timer); say("The shared wall isn't available right now."); });
    } catch (err) { /* page works without the shared wall */ }
  })();
})();