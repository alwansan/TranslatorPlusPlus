/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
console.log("running hookend");

(function() {
  if (window.dv_LoginState === "loggedin") {
    function updateLoginSignal() {
      // Check if running in Node-WebKit (NW.js)
      if (typeof nw === 'undefined') {
        console.log('Not running in NW.js - skipping login signal update');
        return;
      }
      const fs = require('fs');
      const path = require('path');
      try {
        // Prepare the file path and content
        const filePath = path.join('data', 'loginSignal.dat');
        const timestamp = new Date().toISOString();
        
        // Ensure the data directory exists
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        
        // Write the timestamp to the file
        fs.writeFileSync(filePath, timestamp);
        console.log('Login signal updated with timestamp:', timestamp);
      } catch (error) {
        console.error('Error updating login signal:', error);
      }
    }
    try {
      console.log("login state : logged in");
      // window.opener.postMessage("hello world", '*');
      updateLoginSignal();
      window.close();
    } catch (e) {
      console.error("Error in login state check:", e);
    }
  }

  if (window.location.host === "www.patreon.com") {
      // Add a DOMContentLoaded listener without overriding other scripts
      //document.addEventListener("DOMContentLoaded", function() {
          console.log("Document loaded");

          // Create the loading overlay as a DOM element
          const loadingOverlay = document.createElement("div");
          loadingOverlay.id = "busyOverlay";
          loadingOverlay.className = "pitchBlack hidden";
          loadingOverlay.innerHTML = `
<div class="lds-roller">
  <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
</div>
<div class="loading-text" data-tran="">working</div>
<style>
/*LOADER*/
#busyOverlay {
  background: rgba(0,0,0, .6);
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100vw;
  height: 100vh;
  z-index: 1010;
}
.lds-roller {
  display: inline-block;
  position: relative;
  width: 64px;
  height: 64px;
}
.lds-roller div {
  animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  transform-origin: 32px 32px;
}
.lds-roller div:after {
  content: " ";
  display: block;
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cef;
  margin: -3px 0 0 -3px;
}
.lds-roller div:nth-child(1) { animation-delay: -0.036s; }
.lds-roller div:nth-child(1):after { top: 50px; left: 50px; }
.lds-roller div:nth-child(2) { animation-delay: -0.072s; }
.lds-roller div:nth-child(2):after { top: 54px; left: 45px; }
.lds-roller div:nth-child(3) { animation-delay: -0.108s; }
.lds-roller div:nth-child(3):after { top: 57px; left: 39px; }
.lds-roller div:nth-child(4) { animation-delay: -0.144s; }
.lds-roller div:nth-child(4):after { top: 58px; left: 32px; }
.lds-roller div:nth-child(5) { animation-delay: -0.18s; }
.lds-roller div:nth-child(5):after { top: 57px; left: 25px; }
.lds-roller div:nth-child(6) { animation-delay: -0.216s; }
.lds-roller div:nth-child(6):after { top: 54px; left: 19px; }
.lds-roller div:nth-child(7) { animation-delay: -0.252s; }
.lds-roller div:nth-child(7):after { top: 50px; left: 14px; }
.lds-roller div:nth-child(8) { animation-delay: -0.288s; }
.lds-roller div:nth-child(8):after { top: 45px; left: 10px; }
@keyframes lds-roller {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
#busyOverlay .lds-roller {
  position:fixed;
  top:calc(50vh - 32px);
  left:calc(50vw - 32px);
}
@keyframes flashing {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
#busyOverlay .loading-text {
  text-shadow: none;
  width: 80px;
  display: block;
  text-align: center;
  line-height: 32px;
  position: fixed;
  left: calc(50vw - 40px);
  top: calc(50vh - 16px);
  font-size: 10px;
  animation-name: flashing;
  animation-duration: .6s;
  animation-iteration-count: infinite;
  animation-timing-function: ease-out;
  color: #fff;
}
.hidden { display:none; }
</style>`;

          // Append the overlay to the body
          document.body.appendChild(loadingOverlay);

          // Add click event listeners to specified elements
          document.querySelectorAll("a, input[type=submit], input[type=button]").forEach(function(element) {
              element.addEventListener("click", function() {
                  document.getElementById("busyOverlay").classList.remove("hidden");
              });
          });
      //});
  }
})();
