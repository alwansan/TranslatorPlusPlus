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
// this keyword is instance of Trans
const projectHook = {}
projectHook.afterExport = async function(options) {
    const hooks = this.getConfig("hooks");
    if (!hooks) return;
    if (typeof hooks?.afterExport !== "string") return;
    let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    const execResult = new AsyncFunction(hooks.afterExport);
    
    return execResult;
}

module.exports = projectHook