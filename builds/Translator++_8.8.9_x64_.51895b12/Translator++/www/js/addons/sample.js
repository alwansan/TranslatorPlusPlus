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
/* ==UserScript==
@name          My Script
@namespace     http://www.example.com/gmscripts
@description   Scripting is fun
@include       http://www.example.com/*
@include       http://www.example.org/*
@exclude       http://www.example.org/foo
@require       foo.js
@resource      resourceName1 resource1.png
@resource      resourceName2 http://www.example.com/resource2.png
@version       1.0
@icon          http://www.example.net/icon.png
==/UserScript== */

console.log("environment  : ", this);
var xx = 20;
console.log(xx);

console.log("this identity", this.identity);

function helloWorld() {
	var xx = 100;
	console.log(xx);
	console.log("from hello world", this);
	console.log("this identity", this.identity);
	
}
helloWorld();

void function() {
	var helloWorld = "yoooo";
	console.log(helloWorld);
	console.log("loaded", this);
}();