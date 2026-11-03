/* Contact form (contact.html).
   Delivery: if CONTACT.endpoint is set, messages are posted there (FormSubmit: https://formsubmit.co/ajax/<email or alias>)
   and land in the inbox. Until then, "Send" opens a pre-filled GitHub issue on the site's repository.
   "Copy message" always works, for pasting into Discord. */
(function () {
  "use strict";
  // The inbox address is stored scrambled (reversed base64) so address-harvesting bots can't read it.
  // After the first message, FormSubmit sends the owner a random alias: put it in ALIAS and the address
  // no longer appears in this file at all.
  var ALIAS = "";
  var SCRAMBLED = "==QbvNmLslWYtdGQxUzMwkGbhNma";
  function inbox() { try { return ALIAS || atob(SCRAMBLED.split("").reverse().join("")); } catch (e) { return ""; } }
  var CONTACT = {
    endpoint: inbox() ? "https://formsubmit.co/ajax/" + inbox() : "",
    subject: "Xal'Reth Website Submission",
    github: "https://github.com/jcali0351/xal-reth/issues/new",
    discord: "https://discord.gg/wYakHBHPz"
  };

  var form = document.getElementById("ct-form");
  if (!form) return;
  var byId = function (id) { return document.getElementById(id); };
  var sendBtn = byId("ct-send"), copyBtn = byId("ct-copy"), done = byId("ct-done"), consentRow = byId("ct-consent-row");
  var msg = byId("ct-message"), count = byId("ct-count"), MAX = 3000;
  var viaEmail = !!CONTACT.endpoint;

  // the button and the privacy note say where the message goes
  sendBtn.textContent = viaEmail ? "Send message" : "Send via GitHub";
  byId("ct-route").textContent = viaEmail
    ? "Your message goes privately to the author's inbox."
    : "Send opens a pre-filled report on GitHub (a free account is needed). It will be public, so leave out anything private. No GitHub? Use Copy message and paste it in our Discord.";
  if (viaEmail && consentRow) consentRow.hidden = true;

  // topic chips switch the extra fields
  function topic() { var t = form.querySelector('input[name="topic"]:checked'); return t ? t.value : "other"; }
  function syncTopic() { form.setAttribute("data-topic", topic()); }
  form.addEventListener("change", function (e) { if (e.target.name === "topic") syncTopic(); });
  syncTopic();

  // live character counter
  function syncCount() {
    var n = msg.value.length; count.textContent = n + " / " + MAX;
    count.classList.toggle("warn", n > MAX * 0.9);
  }
  msg.addEventListener("input", syncCount); syncCount();

  var LABEL = { bug: "Bug report", help: "Addon help", site: "Website", author: "For the author", other: "Other" };
  function val(id) { var el = byId(id); return el ? el.value.trim() : ""; }
  function visible(el) { return !!(el && el.offsetParent !== null); }

  function setError(id, text) {
    var field = byId(id).closest(".ct-field"), err = field.querySelector(".ct-error");
    if (text) { field.setAttribute("data-invalid", ""); err.textContent = text; byId(id).setAttribute("aria-invalid", "true"); }
    else { field.removeAttribute("data-invalid"); err.textContent = ""; byId(id).removeAttribute("aria-invalid"); }
  }
  function validate(needConsent) {
    var first = null;
    function check(id, ok, text) { setError(id, ok ? "" : text); if (!ok && !first) first = byId(id); }
    var addon = byId("ct-addon");
    if (visible(addon)) check("ct-addon", !!addon.value, "Which addon is it?");
    check("ct-subject", val("ct-subject").length >= 4, "Give it a short title (at least 4 characters).");
    check("ct-message", val("ct-message").length >= 10, "Tell us a little more (at least 10 characters).");
    if (msg.value.length > MAX) check("ct-message", false, "Please keep it under " + MAX + " characters.");
    if (needConsent && !viaEmail) {
      var c = byId("ct-consent"), ok = c.checked;
      byId("ct-consent-err").textContent = ok ? "" : "Please tick this so we know you've read it.";
      if (!ok && !first) first = c;
    }
    if (first) first.focus();
    return !first;
  }

  function compose() {
    var t = topic(), lines = [];
    var add = function (k, v) { if (v) lines.push("**" + k + ":** " + v); };
    add("Topic", LABEL[t]);
    add("From", val("ct-name")); add("Realm", val("ct-realm")); add("Reply to", val("ct-reply"));
    if (t === "bug" || t === "help") { add("Addon", val("ct-addon")); add("Addon version", val("ct-version")); add("Game version", val("ct-game")); }
    lines.push("", "### Message", val("ct-message"));
    if (t === "bug" && val("ct-steps")) lines.push("", "### Steps to reproduce", val("ct-steps"));
    lines.push("", "_Sent from the Contact page of the Cult of Xal'Reth._");
    var title = "[" + LABEL[t] + "] " + (val("ct-addon") && (t === "bug" || t === "help") ? val("ct-addon") + ": " : "") + val("ct-subject");
    return { title: title, body: lines.join("\n") };
  }

  // the fields as they appear in the email (FormSubmit lays them out as a table)
  function fields(m) {
    var t = topic(), reply = val("ct-reply"), f = {
      _subject: CONTACT.subject, _template: "table", _captcha: "false", _honey: val("ct-honey"),
      "Topic": LABEL[t], "Title": val("ct-subject")
    };
    if (t === "bug" || t === "help") { f["Addon"] = val("ct-addon"); f["Addon version"] = val("ct-version") || "-"; f["Game version"] = val("ct-game") || "-"; }
    f["Message"] = val("ct-message");
    if (t === "bug" && val("ct-steps")) f["Steps to reproduce"] = val("ct-steps");
    f["Name or character"] = val("ct-name") || "Anonymous egg"; f["Realm"] = val("ct-realm") || "-"; f["Reply to"] = reply || "-";
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reply)) f["_replyto"] = reply;   // so pressing Reply in the inbox answers them
    f["Sent from"] = location.href;
    return f;
  }

  function showDone(html) { done.innerHTML = html; done.classList.add("show"); done.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate(true)) return;
    var m = compose();
    if (viaEmail) {
      sendBtn.disabled = true; sendBtn.textContent = "Sending…";
      fetch(CONTACT.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(fields(m))
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
        if (data && (data.success === false || data.success === "false")) {
          if (/activat/i.test(data.message || "")) {           // the owner hasn't confirmed the form yet
            showDone("<strong>ALMOST CONSECRATED.</strong> The contact form is waiting for the author to confirm it. Please use <b>Copy message</b> and paste it in our <a href=\"" + CONTACT.discord + "\" target=\"_blank\" rel=\"noopener\">Discord</a> for now.");
            return;
          }
          throw new Error(data.message || "not sent");
        }
        form.reset(); syncTopic(); syncCount();
        showDone("<strong>MESSAGE RECEIVED.</strong> The Inner Scale has your words. A reply will slither your way as soon as someone finishes basking.");
      }).catch(function () {
        showDone("<strong>THE COIL HICCUPPED.</strong> We couldn't send that just now. Use <b>Copy message</b> and paste it in our <a href=\"" + CONTACT.discord + "\" target=\"_blank\" rel=\"noopener\">Discord</a>, or try again in a minute.");
      }).then(function () { sendBtn.disabled = false; sendBtn.textContent = "Send message"; });
    } else {
      var url = CONTACT.github + "?title=" + encodeURIComponent(m.title) + "&body=" + encodeURIComponent(m.body) +
                (topic() === "bug" ? "&labels=bug" : "");
      window.open(url, "_blank", "noopener");
      showDone("<strong>ALMOST THERE.</strong> GitHub opened in a new tab with your report filled in. Press <b>Submit new issue</b> there to send it. Nothing opened? <a href=\"" + url.replace(/"/g, "&quot;") + "\" target=\"_blank\" rel=\"noopener\">Open it here</a>.");
    }
  });

  copyBtn.addEventListener("click", function () {
    if (!validate(false)) return;
    var m = compose(), text = m.title + "\n\n" + m.body.replace(/\*\*/g, "").replace(/^### /gm, "").replace(/^_|_$/gm, "");
    var ok = function () { showDone("<strong>COPIED.</strong> Paste it into our <a href=\"" + CONTACT.discord + "\" target=\"_blank\" rel=\"noopener\">Discord</a> and the faithful will see it."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (err) { showDone("Select and copy this: <pre style=\"white-space:pre-wrap\">" + text.replace(/</g, "&lt;") + "</pre>"); }
      ta.remove();
    }
  });

  // clear an error as soon as the visitor fixes it
  form.addEventListener("input", function (e) { var f = e.target.closest && e.target.closest(".ct-field"); if (f && f.hasAttribute("data-invalid") && e.target.id) setError(e.target.id, ""); });
  byId("ct-consent").addEventListener("change", function () { byId("ct-consent-err").textContent = ""; });
})();
