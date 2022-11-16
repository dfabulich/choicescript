
test("emptyString", function() {
    var map = parseQueryString("");
    equal(map, null);
})
test("singleOption", function() {
    var map = parseQueryString("?foo=bar");
    deepEqual(map, {foo:"bar"}, "?foo=bar");
})
test("multiOption", function() {
    var str = "?foo=bar&baz=quz";
    var map = parseQueryString(str);
    deepEqual(map, {foo:"bar",baz:"quz"}, str);
})
