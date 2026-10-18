
// demonstrating BasicEventHandler usage

class NodeEvent extends BasicEventHandler {
    constructor() {
        super();
		
        this.initEvent();

    }
}

NodeEvent.prototype.initEvent = function() {
    this.off("hello1");
    this.off("hello2");
    this.on("hello1", function() {
        console.log("%ctriggered hello1", "color:pink", arguments);
    });
    this.on("hello2", function() {
        console.log("%ctriggered hello2", "color:pink", arguments);
    });
}

NodeEvent.prototype.do = function() {
	console.log("sending multiple arguments");
	this.trigger("hello1", "lorem", "ipsum");

	console.log("sending object");
	this.trigger("hello2", {obj1: "message"});

    console.log("triggering hello1.asdw with multiple arguments");
	this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("offing hello1.asdw and triggering again... you should not see the following pink message");
    this.off("hello1.asdw");
    this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("offing hello1 and triggering hello1.asdw... you should not see the following pink message");
    this.off("hello1");
    this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("Test done");
}
var nodeEvent = new NodeEvent();


class JQEvent extends BasicEventHandler {
    constructor() {
        super($("<div></div>"));
        this.initEvent();

    }
}


JQEvent.prototype.initEvent = function() {
    this.off("hello1");
    this.off("hello2");
    this.on("hello1", function() {
        console.log("%ctriggered hello1", "color:pink", arguments);
    });
    this.on("hello2", function() {
        console.log("%ctriggered hello2", "color:pink", arguments);
    });
}

JQEvent.prototype.do = function() {
	console.log("sending multiple arguments");
	this.trigger("hello1", "lorem", "ipsum");

	console.log("sending object");
	this.trigger("hello2", {obj1: "message"});

    console.log("triggering hello1.asdw with multiple arguments");
	this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("offing hello1.asdw and triggering again... you should not see the following pink message");
    this.off("hello1.asdw");
    this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("offing hello1 and triggering hello1.asdw... you should not see the following pink message");
    this.off("hello1");
    this.trigger("hello1.asdw", "lorem", "ipsum");

    console.log("Test done");
}
var jqEvent = new JQEvent();