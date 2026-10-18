/**
 * Attachment object.
 * Located at trans.project.attachments
 * @class
 * @param  {Object} obj
 */
const Attachment = function(obj) {
	obj = obj || {};
	Object.assign(this, obj);
}

module.exports = Attachment;
