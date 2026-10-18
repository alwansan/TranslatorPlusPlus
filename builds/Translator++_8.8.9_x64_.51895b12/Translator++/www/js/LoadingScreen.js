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

const LoadingScreen = function(initialDisplay){
    this.init(initialDisplay);
}
LoadingScreen.prototype.show = function() {
    this.elm.removeClass("hidden");
}
LoadingScreen.prototype.hide = function() {
    this.elm.addClass("hidden");
    this.clearButtons();
}
LoadingScreen.prototype.toggle = function() {
    this.elm.toggleClass("hidden");
}
LoadingScreen.prototype.destroy = function() {
    this.elm.remove();
    this.css.remove();
}
LoadingScreen.prototype.isShown = function() {
    return !this.elm.hasClass("hidden");
}

LoadingScreen.prototype.centerText = function(text) {
    let args = Array.from(arguments);
    if (text) this.elm.find(".loading-text").html(args.join(" ")) 
    return this.elm.find(".loading-text").html();
}
LoadingScreen.prototype.text = function(text) {
    let args = Array.from(arguments);
    if (text) this.elm.find(".loading-bottomtext").html(args.join(" ")) 
    return this.elm.find(".loading-bottomtext").html();
}
LoadingScreen.prototype.createButton = function(obj) {
  obj = obj || {};
  obj.onClick = obj.onClick || function() {};
  var $button = $(`<button>${obj.label}</button>`);
  $button.addClass(obj.classes);
  var that = this;
  $button.on("click", function() {
    obj.onClick.call(that, $(this))
  });
  return $button;
}
LoadingScreen.prototype.addButton = function(obj) {
  this.elm.find(".loading-buttons").append(this.createButton(obj));
}
LoadingScreen.prototype.clearButtons = function(obj) {
  this.elm.find(".loading-buttons").empty();
}
LoadingScreen.prototype.init = function(display) {
    this.elm = $(LoadingScreen.html);
    if (!display) this.elm.addClass("hidden");
    this.css = $("<style class='loaderStyle'></style>");
    this.css.text(LoadingScreen.css);
    $("head").append(this.css);
    $("body").append(this.elm);
}

LoadingScreen.html = `
<div class="pitchBlack" data-role="busy-overlay">
	<div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
	<div class="loading-text" data-tran="">working</div>
  <div class="loading-bottomtext"></div>
  <div class="loading-buttons"></div>
</div>
`;

LoadingScreen.css = `

/*LOADER*/
[data-role="busy-overlay"] {
	background: rgba(0,0,0, .6);
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    z-index: 1010;
}

[data-role="busy-overlay"] .lds-roller {
  display: inline-block;
  position: relative;
  width: 64px;
  height: 64px;
}
[data-role="busy-overlay"] .lds-roller div {
  animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  transform-origin: 32px 32px;
}
[data-role="busy-overlay"] .lds-roller div:after {
  content: " ";
  display: block;
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cef;
  margin: -3px 0 0 -3px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(1) {
  animation-delay: -0.036s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(1):after {
  top: 50px;
  left: 50px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(2) {
  animation-delay: -0.072s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(2):after {
  top: 54px;
  left: 45px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(3) {
  animation-delay: -0.108s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(3):after {
  top: 57px;
  left: 39px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(4) {
  animation-delay: -0.144s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(4):after {
  top: 58px;
  left: 32px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(5) {
  animation-delay: -0.18s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(5):after {
  top: 57px;
  left: 25px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(6) {
  animation-delay: -0.216s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(6):after {
  top: 54px;
  left: 19px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(7) {
  animation-delay: -0.252s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(7):after {
  top: 50px;
  left: 14px;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(8) {
  animation-delay: -0.288s;
}
[data-role="busy-overlay"] .lds-roller div:nth-child(8):after {
  top: 45px;
  left: 10px;
}
@keyframes lds-roller {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
[data-role="busy-overlay"] .lds-roller {
	position:fixed;
	top:calc(50vh - 32px);
	left:calc(50vw - 32px);
}

@keyframes flashing {
	0% { 
		opacity: 0.3;
	}
	50% { 
		opacity: 1; 
	}
	100% { 
		opacity: 0.3; 
	}
}
[data-role="busy-overlay"] .loading-text {
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
	animation-duration: .6s; /* or: Xms */
	animation-iteration-count: infinite;
	/*animation-direction: alternate;  or: normal */
	animation-timing-function: ease-out; /* or: ease, ease-in, ease-in-out, linear, cubic-bezier(x1, y1, x2, y2) */
	animation-fill-mode: forwards; /* or: backwards, both, none */
	/*animation-delay: 2s;  or: Xms */	
	color: #fff;
}

[data-role="busy-overlay"] .loading-bottomtext {
    display: block;
    text-align: center;
    width: 100%;
    position: fixed;
    bottom: calc(50% - 80px);
    color: #fff;
    text-shadow: none;
    animation-name: flashing;
    animation-duration: 3s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-out;
    animation-fill-mode: forwards;
}

[data-role="busy-overlay"] .loading-buttons {
  display: block;
  text-align: center;
  width: 100%;
  position: fixed;
  bottom: 80px;
}

[data-role="busy-overlay"] .loading-buttons button {
  transition: all .2s ease-out;
  color: #ea5507;
  padding: 8px 20px;
  border-radius: 4px;
  border: 1px solid #ea5507;
}
[data-role="busy-overlay"] .loading-buttons button:hover {
  color:#fff;
  border: 1px solid #ea5507;
  background: linear-gradient(to bottom, #feccb1 0%,#f17432 50%,#ea5507 51%,#fb955e 100%);
  transition: all .2s ease-out;
}
[data-role="busy-overlay"] .loading-buttons button:active {
  color:#fff;
  background: -webkit-linear-gradient(top, #6db3f2 0%,#54a3ee 50%,#3690f0 51%,#1e69de 100%);
  border: 1px solid #2372e2;
}
[data-role="busy-overlay"] .loading-buttons button:disabled {
  opacity:.8;
}
[data-role="busy-overlay"].hidden {
	display:none !important;
}
`;

module.exports = LoadingScreen;
