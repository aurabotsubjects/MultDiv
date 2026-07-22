// ============================================================
// Reusable "Player 2, log in" widget used by every 2-player game.
// Player 1 is already signed in (from the game menu). This renders a small
// name + password form into whatever container you give it, using the same
// class roster, and resolves with { uid, name, level } once Player 2 signs
// in successfully (via the worker Firebase app, so Player 1 stays signed in).
// ============================================================
import { getClassRoster, studentLoginSecondPlayer } from "./auth.js";

export function renderPlayer2Login(container, classId, excludeUid) {
  return new Promise((resolve) => {
    getClassRoster(classId).then(roster => {
      const options = roster.filter(s => s.uid !== excludeUid);
      container.innerHTML = `
        <div class="label">Player 2 — your name</div>
        <select id="p2NameSelect">
          <option value="">Select your name</option>
          ${options.map(s => `<option value="${s.email}">${s.name}</option>`).join("")}
        </select>
        <div class="label" style="margin-top:8px;">Your password</div>
        <input type="password" id="p2Password" />
        <div id="p2Error" class="error-text" style="display:none; margin-top:6px;"></div>
        <button class="btn gold" id="p2GoBtn" style="margin-top:10px;">Join match</button>
      `;
      container.querySelector("#p2GoBtn").addEventListener("click", async () => {
        const email = container.querySelector("#p2NameSelect").value;
        const password = container.querySelector("#p2Password").value;
        const errEl = container.querySelector("#p2Error");
        errEl.style.display = "none";
        if (!email || !password) return;
        try {
          const profile = await studentLoginSecondPlayer(email, password);
          resolve(profile);
        } catch (err) {
          errEl.textContent = "That password didn't match — try again.";
          errEl.style.display = "block";
        }
      });
    });
  });
}
