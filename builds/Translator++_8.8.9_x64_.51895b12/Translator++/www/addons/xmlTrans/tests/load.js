
//var queryString = "string";
/*
var xmlTrans = new XmlTrans('F:\\GDrive\\Other\\Translator++\\notes\\rm2k-2k3\\Map0001.emu',
{
	config: [
		{
			queryString : "events string",
			onBeforeRegisterString : function(text, context, targetElm) {
				var $targetElm = $(targetElm);
				var code = $targetElm.find("code").text();
				console.log("this event code is : ", code);
				if (code !== "20110") return true;
				
				this.appendString("\n"+text, context, targetElm);
				
			}			
		}
	],

	getTextElement : function(elm) {
		var $elm = $(elm);
		return $elm.parent()[0];
	},
	
	translateElement : function(elm, text, config) {
		
		var $elm = $(elm)
		if ($elm.eq(0).find("code").text() !== "10110") return $(elm).text(text)[0];

		var texts = text.split("\n");
		for (var i=0 ; i<texts.length; i++) {
			var $thisElm = $(elm[0]).clone(true, true);
			if (i%4 !== 0)  {
				$thisElm.find('code').text("20110");
			} 
			$thisElm.find('string').text(texts[i]);
			$thisElm.insertBefore($elm.eq(0))
		}
		
		for (var i=0; i<elm.length; i++) {
			$(elm[i]).remove();
		}
		
	},
	
	translationPair : {
		"Testing" : "test",
		"Message group2\nMessage group2-line2" : "Translation\nTranslation\nTranslation"
	}

})
*/


//var xmlTrans = new XmlTrans('F:\\GDrive\\Other\\Translator++\\notes\\rm2k-2k3\\Map0001.emu',
var xmlTrans = new addonLoader.addons.xmlTrans.XmlTrans('D:\\Test\\rm2k3\\TestProject\\extract\\Map0001.emu',
{
	config: [
		{
			queryString : "event_commands string",
			onBeforeRegisterString : function(text, context, targetElm, configuration, options) {
				var $targetElm = $(targetElm);
				var code = parseInt($targetElm.find("code").text());
				//console.log("this event code is : ", code);
				const codeStr = RM2k.codeToString(code);
				context.push("code", codeStr);

				// adding default tags
				if ([10130, 11110, 10220, 10630, 10640, 10650, 10660, 10670, 10680, 10710, 
					11510,11550, 11560, 11720].includes(code)) {
					options.tags = ["red"]
				} else if ([10140].includes(code)) {
					options.tags = ["blue"]
				}

				// skips notes as it will not affect gameplay in 2k & 2k3 
				if ([12410, 22410].includes(code)) return undefined; 
				if (code == 20110) {
					// process 20110 further
					this.appendString("\n"+text, undefined, targetElm);
					return undefined;
				}
				return text;
			},
			getTextElement : function(elm) {
				var $elm = $(elm);
				return $elm.parent()[0]; // return parent instead of self element
			},
			translateElement : function(elm, text, config) {
				console.log("translating element", elm, text);
				var $elm = $(elm)
				var code = $elm.eq(0).find("code").text()
				if (code !== "10110" && code !== "20110") {
					$(elm).find("string").text(text);
					return $(elm)[0];
				}
				
				// split message by line and then generates interpreter object
				var texts = text.split("\n");
				for (let i=0 ; i<texts.length; i++) {
					var $thisElm = $(elm[0]).clone(true, true);
					if (i%4 !== 0)  {
						$thisElm.find('code').text("20110");
					} 
					$thisElm.find('string').text(texts[i]);
					$thisElm.insertBefore($elm.eq(0))
				}
				
				for (let i=0; i<elm.length; i++) {
					$(elm[i]).remove();
				}
				
			}
			
		},
		{
			queryString : "name, description, terms>Terms>*, states message_actor, states message_enemy, states message_already, states message_affected, states message_recovery, skills using_message1,  skills using_message2, actors title",
		}
	],
	
	translationPair : {
		"Hello world\nline 2\nline 3" : "Translated1\nTranslated2\nTranslated3",
		"Message group2\nMessage group2-line2" : "Translation\nTranslation\nTranslation",
		"Message on common events" : "Translation on ce",
		"EV0001" : "nama event"
		
	}
});
await xmlTrans.parse();
