var thisAddon 	= this;
var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var ws 			= ws || require('windows-shortcuts');
var ini 		= ini || require('ini')
var stripBom	= require('strip-bom');
var bCopy 		= require('better-copy');
var fse 		= require('fs-extra');

var kstg 		= require("kstg")





$(document).ready(function() {
	ui.onReady(function() {
		//init();
	});
});