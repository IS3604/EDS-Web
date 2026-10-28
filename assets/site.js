/* EditSimple site scripts (shared by every page) */
(function () {
  "use strict";
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var mobile = window.matchMedia("(max-width:760px)");
  var CALENDLY = "https://calendly.com/contacteditsimple/30min";
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var PAGE = document.body.getAttribute("data-page") || document.title;

  /* ---------- helpers ---------- */
  function val(form, name) { return (form.elements[name] && form.elements[name].value || "").trim(); }
  function toggle(el, cls, btn) {
    var on = el.classList.toggle(cls);
    if (btn) btn.setAttribute("aria-expanded", on);
    return on;
  }
  // Sends a form submission to the email function. Resolves true on success.
  function sendLead(form, subject, fields) {
    var payload = { form: form, subject: subject, website: fields._hp || "", fields: fields };
    delete fields._hp;
    fields["Form Page"] = PAGE;
    fields["Page URL"] = location.href;
    return fetch(window.ES_LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; }, function () { return false; });
  }

  /* ---------- header: mobile menu + solutions dropdown ---------- */
  var burger = $("#burger"), menu = $("#mobile");
  if (burger && menu) {
    burger.addEventListener("click", function () { toggle(menu, "open", burger); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { menu.classList.remove("open"); }); });
  }
  var mdd = $("#mdd"), msub = $("#msub");
  if (mdd && msub) mdd.addEventListener("click", function () { toggle(msub, "open", mdd); });

  /* ---------- mobile: sticky "Book a Free Call" bar ---------- */
  var sticky = $("#mSticky"), foot = $("footer");
  if (sticky) {
    var stickyLink = $("a", sticky);
    var onScroll = function () {
      var footTop = foot ? foot.getBoundingClientRect().top : Infinity;
      var show = mobile.matches && window.scrollY > 520 && footTop > window.innerHeight - 40 && !(menu && menu.classList.contains("open"));
      sticky.classList.toggle("show", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      if (stickyLink) stickyLink.tabIndex = show ? 0 : -1;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (burger) burger.addEventListener("click", function () { setTimeout(onScroll, 0); });
    onScroll();
  }

  /* ---------- footer: accordion on mobile ---------- */
  $$("footer .f-grid > div:not(.f-brand)").forEach(function (col) {
    var h = $("h2", col);
    if (!h) return;
    h.setAttribute("role", "button");
    h.setAttribute("tabindex", "0");
    function tg() { if (mobile.matches) toggle(col, "open", h); }
    h.addEventListener("click", tg);
    h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tg(); } });
  });

  /* ---------- videos (put the MP4 files in /videos to activate) ---------- */
  $$(".video").forEach(function (box) {
    var v = $("video", box), play = $(".play", box), sound = $(".sound", box);
    if (!v) return;
    v.muted = true;
    // No video file uploaded yet: keep the poster image and hide the controls.
    $$("source", v).forEach(function (s) { s.addEventListener("error", function () { box.classList.add("no-video"); }); });
    if (play) play.addEventListener("click", function () {
      v.controls = true;
      v.play().then(function () { play.style.display = "none"; }, function () {});
    });
    if (sound) sound.addEventListener("click", function () {
      v.muted = !v.muted;
      sound.textContent = v.muted ? "🔇 Enable sound" : "🔊 Sound on";
      if (v.paused && play) play.click();
    });
  });

  /* ---------- count-up stats ---------- */
  var counters = $$("[data-count]");
  function suffix(el) { return el.dataset.suffix !== undefined ? el.dataset.suffix : "M+"; }
  function countUp(el) {
    var target = +el.dataset.count, start = null, dur = 1600;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.innerHTML = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix(el).replace("+", '<span class="suf">+</span>');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { io.observe(el); });
    } else {
      counters.forEach(function (el) { el.innerHTML = el.dataset.count + suffix(el).replace("+", '<span class="suf">+</span>'); });
    }
  }

  /* ---------- benefit cards: swipe slider with dots on mobile ---------- */
  $$(".benefits, .hipaa-grid").forEach(function (slider) {
    var cards = $$(".benefit, .hp-card", slider);
    if (cards.length < 2) return;
    var dots = document.createElement("div");
    dots.className = "slider-dots";
    function goTo(card) { slider.scrollTo({ left: card.offsetLeft - slider.offsetLeft - (slider.clientWidth - card.clientWidth) / 2, behavior: "smooth" }); }
    cards.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Slide " + (i + 1));
      b.addEventListener("click", function () { goTo(c); });
      dots.appendChild(b);
    });
    slider.after(dots);
    function current() {
      var mid = slider.scrollLeft + slider.clientWidth / 2, best = 0, bestD = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft - slider.offsetLeft + c.clientWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }
    function paint() { var on = current(); $$("button", dots).forEach(function (b, i) { b.classList.toggle("on", i === on); }); }
    slider.addEventListener("scroll", function () { requestAnimationFrame(paint); }, { passive: true });
    paint();
    var auto = setInterval(function () { if (mobile.matches) goTo(cards[(current() + 1) % cards.length]); }, 4500);
    ["touchstart", "pointerdown"].forEach(function (ev) {
      slider.addEventListener(ev, function () { clearInterval(auto); }, { passive: true });
    });
  });

  /* ---------- comparison: segmented toggle on mobile ---------- */
  $$(".diff").forEach(function (diff) {
    var good = $(".diff-col.good", diff), bad = $(".diff-col.bad", diff);
    if (!good || !bad) return;
    var tabs = document.createElement("div");
    tabs.className = "diff-tabs";
    tabs.setAttribute("role", "tablist");
    [["good", "EditSimple"], ["bad", "Typical agency"]].forEach(function (t, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = t[1];
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.addEventListener("click", function () {
        diff.classList.toggle("show-bad", t[0] === "bad");
        $$("button", tabs).forEach(function (o) { o.setAttribute("aria-selected", o === b ? "true" : "false"); });
      });
      tabs.appendChild(b);
    });
    diff.before(tabs);
  });

  /* ---------- growth-path cards: expand on tap (mobile) ---------- */
  $$(".path-grid").forEach(function (grid) {
    var cards = $$(".path", grid);
    function activate(card) { cards.forEach(function (c) { c.classList.toggle("active", c === card); }); }
    cards.forEach(function (card, i) {
      var img = $("img", card), tag = document.createElement("span");
      tag.className = "path-tag";
      tag.textContent = img ? img.alt : "";
      card.appendChild(tag);
      if (!$(".path-link", card)) {
        var link = document.createElement("span");
        link.className = "path-link";
        link.textContent = "LEARN MORE →";
        card.appendChild(link);
      }
      if (i === 0) card.classList.add("active");
      card.addEventListener("pointerenter", function (e) { if (mobile.matches && e.pointerType === "mouse") activate(card); });
      card.addEventListener("click", function (e) {
        if (mobile.matches && !card.classList.contains("active")) { e.preventDefault(); activate(card); }
      });
    });
  });

  /* ---------- FAQ: one answer open at a time ---------- */
  $$(".faq-list").forEach(function (list) {
    var items = $$("details", list);
    items.forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; }); });
    });
  });

  /* ---------- legal pages: collapsible contents on small screens + active section ---------- */
  var toc = $(".lg-toc details");
  if (toc) {
    if (window.matchMedia("(max-width:1000px)").matches) toc.open = false;
    $(".lg-toc summary").addEventListener("click", function (e) {
      if (!window.matchMedia("(max-width:1000px)").matches) e.preventDefault(); // always open on desktop
    });
    var links = $$(".lg-toc a");
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      $$(".lg-sec").forEach(function (s) { spy.observe(s); });
    }
  }

  /* ---------- lead popup (opens from every Calendly button) ---------- */
  var modal = $("#leadModal"), lead = $("#leadForm");
  if (modal && lead) {
    var leadErr = $("#leadErr"), leadBtn = $("#leadBtn"), other = lead.elements.message;
    var leadTitle = $("#leadTitle"), leadSub = $(".lead-sub", modal);
    var titleHTML = leadTitle.innerHTML, subText = leadSub.textContent, offer = "";
    function openModal(e) {
      e.preventDefault();
      // Free-video buttons get their own heading and are tagged in the lead email.
      offer = e.currentTarget.getAttribute("data-offer") || "";
      var free = offer === "free-video";
      leadTitle.innerHTML = free ? 'Claim your <span class="accent">free video</span>' : titleHTML;
      leadSub.textContent = free ? "Free: 1 long-form video + 5 shorts. Share a few details and pick a time for your call." : subText;
      modal.classList.add("open");
      document.body.classList.add("lm-lock");
      setTimeout(function () { lead.elements.first_name.focus(); }, 50);
    }
    function closeModal() {
      modal.classList.remove("open");
      document.body.classList.remove("lm-lock");
    }
    $$('a[href*="calendly.com"]').forEach(function (a) { a.addEventListener("click", openModal); });
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.hasAttribute("data-lead-close")) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

    lead.elements.product.addEventListener("change", function () {
      var isOther = lead.elements.product.value === "other";
      other.hidden = !isOther;
      other.required = isOther;
      if (isOther) other.focus();
    });

    lead.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = val(lead, "first_name"), last = val(lead, "last_name"), email = val(lead, "email");
      var prof = lead.elements.product.value, isOther = prof === "other", otherText = val(lead, "message");
      if (!first || !last || !EMAIL_RE.test(email) || !prof || (isOther && !otherText)) {
        leadErr.style.display = "block";
        return;
      }
      leadErr.style.display = "none";
      leadBtn.disabled = true;
      leadBtn.textContent = "Submitting...";
      var name = first + " " + last, profession = isOther ? "Other: " + otherText : prof;
      var goToCalendly = function () {
        location.href = CALENDLY + "?name=" + encodeURIComponent(name) + "&email=" + encodeURIComponent(email);
      };
      var done = false, finish = function () { if (!done) { done = true; goToCalendly(); } };
      var tag = offer === "free-video" ? "Free video" : "Call";
      sendLead("popup", "New lead (" + PAGE + ", " + tag + "): " + (isOther ? "Other specialty" : prof) + " - " + name, {
        _hp: val(lead, "website"),
        "First Name": first, "Last Name": last, "Email": email,
        "Phone": val(lead, "phone"), "Specialty": profession, "Interested in": tag
      }).then(finish);
      setTimeout(finish, 4000); // never keep the visitor waiting on the email
    });
  }

  /* ---------- contact page form ---------- */
  var ct = $("#ctForm");
  if (ct) {
    var card = $("#ctCard"), ctErr = $("#ctErr"), ctBtn = $("#ctBtn");
    var errText = ctErr.textContent;
    ct.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val(ct, "name"), email = val(ct, "email"), topic = ct.elements.topic.value, msg = val(ct, "message");
      if (!name || !EMAIL_RE.test(email) || !topic || !msg) {
        ctErr.textContent = errText;
        ctErr.style.display = "block";
        return;
      }
      ctErr.style.display = "none";
      ctBtn.disabled = true;
      ctBtn.textContent = "Sending...";
      sendLead("contact", "Website enquiry (" + PAGE + "): " + topic + " - " + name, {
        _hp: val(ct, "website"),
        "Name": name, "Email": email, "Phone": val(ct, "phone"), "Interested in": topic, "Message": msg
      }).then(function (ok) {
        if (ok) { card.classList.add("sent"); return; }
        ctBtn.disabled = false;
        ctBtn.textContent = "Send Message";
        ctErr.textContent = "Something went wrong. Please email us at contact@editsimple.in";
        ctErr.style.display = "block";
      });
    });
  }
})();

// Blog: show the "New" badge for 7 days after a post's date.
(function () {
  var now = Date.now();
  document.querySelectorAll("[data-new-date]").forEach(function (el) {
    var t = Date.parse(el.getAttribute("data-new-date") + "T00:00:00");
    if (!isNaN(t) && now - t < 7 * 864e5) el.hidden = false;
  });
})();
