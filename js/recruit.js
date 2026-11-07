/* Recruitment page (recruit.html): the Request to Join form and the officer application.
   Each <form data-apply> is sent through FormSubmit to the author's inbox, with the subject in data-subject.
   Every field marked data-label becomes one row of the email (a fieldset of chips sends what is ticked).
   "Copy for Discord" always works. Uses the same scrambled inbox address as js/contact.js (update ALIAS in both). */
(function () {
  "use strict";
  // The inbox address is stored scrambled (reversed base64) so address-harvesting bots can't read it.
  // Once FormSubmit has sent the owner a random alias, put it in ALIAS and the address leaves this file entirely.
  var ALIAS = "";
  var SCRAMBLED = "==QbvNmLslWYtdGQxUzMwkGbhNma";
  function inbox() { try { return ALIAS || atob(SCRAMBLED.split("").reverse().join("")); } catch (e) { return ""; } }
  var ENDPOINT = inbox() ? "https://formsubmit.co/ajax/" + inbox() : "";
  var DISCORD = "https://discord.gg/wYakHBHPz";

  Array.prototype.forEach.call(document.querySelectorAll("form[data-apply]"), setup);

  function setup(form) {
    var kind = form.getAttribute("data-apply"), subject = form.getAttribute("data-subject");
    var send = form.querySelector("[data-send]"), copyBtn = form.querySelector("[data-copy]"), done = form.querySelector(".ct-done");
    var sendLabel = send.textContent;

    // live counters under the long text boxes
    Array.prototype.forEach.call(form.querySelectorAll("textarea[data-max]"), function (ta) {
      var c = ta.parentNode.querySelector(".ct-count"), max = +ta.getAttribute("data-max");
      function sync() { if (!c) return; c.textContent = ta.value.length + " / " + max; c.classList.toggle("warn", ta.value.length > max * .9); }
      ta.addEventListener("input", sync); sync();
    });

    function valueOf(el) {
      if (el.tagName === "FIELDSET") {
        return Array.prototype.map.call(el.querySelectorAll("input:checked"), function (i) { return i.value; }).join(", ");
      }
      return (el.value || "").trim();
    }
    function rows() {
      return Array.prototype.map.call(form.querySelectorAll("[data-label]"), function (el) { return [el.getAttribute("data-label"), valueOf(el), el]; });
    }
    function setError(el, text) {
      var field = el.closest(".ct-field"), err = field && field.querySelector(".ct-error");
      if (!field || !err) return;
      if (text) { field.setAttribute("data-invalid", ""); err.textContent = text; el.setAttribute("aria-invalid", "true"); }
      else { field.removeAttribute("data-invalid"); err.textContent = ""; el.removeAttribute("aria-invalid"); }
    }
    function validate() {
      var first = null;
      rows().forEach(function (r) {
        var el = r[2], v = r[1], msg = "";
        var need = el.hasAttribute("required") || el.hasAttribute("data-required");
        var min = +(el.getAttribute("data-min") || 0), max = +(el.getAttribute("data-max") || 0);
        if (need && !v) msg = el.getAttribute("data-need") || "Please fill this in.";
        else if (min && v.length < min) msg = "Tell us a little more (at least " + min + " characters).";
        else if (max && v.length > max) msg = "Please keep it under " + max + " characters.";
        setError(el, msg);
        if (msg && !first) first = el;
      });
      if (first) { var f = first.tagName === "FIELDSET" ? first.querySelector("input") : first; if (f) f.focus(); }
      return !first;
    }
    function text() {
      var lines = ["**" + subject + "**"];
      rows().forEach(function (r) { if (r[1]) lines.push((r[2].tagName === "TEXTAREA" ? "\n" : "") + r[0] + ": " + r[1]); });
      return lines.join("\n");
    }
    function payload() {
      var f = { _subject: subject, _template: "table", _captcha: "false", _honey: (form.querySelector(".rc-honey") || {}).value || "" };
      rows().forEach(function (r) { f[r[0]] = r[1] || "-"; });
      var reply = (form.querySelector("[data-reply]") || {}).value || "";
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reply.trim())) f._replyto = reply.trim();   // pressing Reply in the inbox answers them
      f["Sent from"] = location.href;
      return f;
    }
    function show(html) { done.innerHTML = html; done.classList.add("show"); done.focus(); }
    var discordLink = '<a href="' + DISCORD + '" target="_blank" rel="noopener">Discord</a>';

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      if (!ENDPOINT) { show("<strong>ONE MORE STEP.</strong> Use <b>Copy for Discord</b> and paste it in our " + discordLink + "."); return; }
      send.disabled = true; send.textContent = "Sending…";
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload()) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) {
          if (data && (data.success === false || data.success === "false")) {
            if (/activat/i.test(data.message || "")) {   // the owner hasn't confirmed the form yet
              show("<strong>ALMOST CONSECRATED.</strong> The form is waiting for the guild to switch it on. Please use <b>Copy for Discord</b> and paste it in our " + discordLink + " for now.");
              return;
            }
            throw new Error(data.message || "not sent");
          }
          form.reset();
          try { document.dispatchEvent(new CustomEvent("xr:sent", { detail: { form: kind === "officer" ? "officer-application" : "join-request" } })); } catch (e) {}   // counted as a goal (js/counter.js)
          Array.prototype.forEach.call(form.querySelectorAll("textarea[data-max]"), function (ta) { ta.dispatchEvent(new Event("input")); });
          show(kind === "officer"
            ? "<strong>APPLICATION RECEIVED.</strong> The Inner Scale will read it slowly and with great seriousness, then reply. Officers are chosen, not hurried."
            : "<strong>REQUEST RECEIVED.</strong> An officer will reach you in game or on Discord within a few days. Until then, practise standing very still. Glory to Xal'Reth.");
        })
        .catch(function () {
          show("<strong>THE COIL HICCUPPED.</strong> That didn't send. Use <b>Copy for Discord</b> and paste it in our " + discordLink + ", or try again in a minute.");
        })
        .then(function () { send.disabled = false; send.textContent = sendLabel; });
    });

    copyBtn.addEventListener("click", function () {
      if (!validate()) return;
      var t = text().replace(/\*\*/g, "");
      var ok = function () { show("<strong>COPIED.</strong> Paste it into our " + discordLink + " and an officer will see it."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
      function fallback() {
        var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); } catch (err) { show("Select and copy this: <pre style=\"white-space:pre-wrap\">" + t.replace(/</g, "&lt;") + "</pre>"); }
        ta.remove();
      }
    });

    // clear an error as soon as it is fixed
    form.addEventListener("input", function (e) { var el = e.target.closest("[data-label]"); if (el) setError(el, ""); });
    form.addEventListener("change", function (e) { var el = e.target.closest("[data-label]"); if (el) setError(el, ""); });
  }
})();
