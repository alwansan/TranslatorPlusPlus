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
const debounce = require("debounce");
const RenderForm = function($wrapper, options={}) {
    this.wrapper = $wrapper || $("#formWrapper");
    this.options = options || {};
    this.schema = this.options.schema || {};
    this.previewElm = $("#preview");
    this.registerSubmission = async ()=> {
        this.previewElm.text(JSON.stringify(this.form.submission, undefined, 2));
    }

    this.init = async ()=> {
        this.schema = await common.localStorage.get("formIOLastSchema");
        this.value = await common.localStorage.get("formIOLastValue");
        this.form = await Formio.createForm(this.wrapper[0], this.schema)
        // populating default
        this.form.submission = this.value || {};

        // adding onchange event
        this.form.on('change', async (changed) => {
            debounce(this.registerSubmission, 200)(changed);
        });
    }
    
    this.init();
}

RenderForm.prototype.submit = async function() {
    var data 
    try {
        data = await this.form.submit();
        console.log("Submitted data", data);
        //common.localStorage.set("formIOLastValue", this.form.submission)
        await common.localStorage.set("formIOLastValue", data);
        window.close();
    } catch (e) {
        console.error("Eror when submitting data", e);
    }
}

var renderForm; 
$(document).ready(function() {
    renderForm = new RenderForm();

    $("#submit").on("click", function() {
        renderForm.submit();
    })
})