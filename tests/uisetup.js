window = this;
event = {srcElement: {nodeName: ""}},
document = {
	getElementById: function(){ return this.createElement(); },
	createElement: function() {
		var x = {
			innerHTML:"",
			appendChild: function() {},
			removeChild: function() {},
			style: {display: ""},
			childNodes: []
		}
		x.nextSibling = x;
		return x;
	}
};
location = {href:"file:///tmp/x"};
navigator = {userAgent: "test"};