
test("spell", function() {
    equal("zero", spell(0));
    equal("ten", spell(10));
    equal("thirty", spell(30));
    equal("twenty-five", spell(25));
    equal(100, spell(100));
});

nav = {
  achievements: {},
  achieved: {},
  achievementList: [],
  loadAchievements: function(achievementArray) {
    if (!achievementArray) return;
    for (var i = 0; i < achievementArray.length; i++) {
      var achievement = achievementArray[i];
      var achievementName = achievement[0];
      var visible = achievement[1];
      var points = achievement[2];
      var title = achievement[3];
      var earnedDescription = achievement[4];
      var preEarnedDescription = achievement[5];
      this.achievements[achievementName] = {
        visible: visible,
        points: points,
        title: title,
        earnedDescription: earnedDescription,
        preEarnedDescription: preEarnedDescription,
      };
      this.achievementList.push(achievementName);
    }
  },
  resetAchievements: function() {
    this.achievements = {};
    this.achieved = {};
    this.achievementList = [];
  }
};

test("three visible", function() {
  nav.resetAchievements();
  nav.loadAchievements([
    ["foo", true, 50, "Foo", "Earned Foo", "Pre Earned Foo"],
    ["bar", true, 50, "Bar", "Earned Bar", "Pre Earned Bar"],
    ["baz", true, 50, "Baz", "Earned Baz", "Pre Earned Baz"],
  ]);
  var output = {};
  printAchievements(output);
  equal(output.innerHTML, "You haven't unlocked any achievements yet. There are three possible achievements, worth a total of 150 points.<p>"+
    "<b>Foo:</b> Pre Earned Foo (50 points)<br><b>Bar:</b> Pre Earned Bar (50 points)<br><b>Baz:</b> Pre Earned Baz (50 points)<p>");

  nav.achieved = {foo:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked one out of three possible achievements, earning you a score of 50 out of a possible 150 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<p>There are still two achievements remaining.<p><b>Bar:</b> Pre Earned Bar (50 points)<br><b>Baz:</b> Pre Earned Baz (50 points)<p>");

  nav.achieved = {foo:1, bar: 1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked two out of three possible achievements, earning you a score of 100 out of a possible 150 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<p>There is still one achievement remaining.<p><b>Baz:</b> Pre Earned Baz (50 points)<p>");

  nav.achieved = {foo:1, bar: 1, baz: 1};
  printAchievements(output);
  equal(output.innerHTML, "Congratulations! You have unlocked all three achievements, earning a total of 150 points, a perfect score.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<br><b>Baz:</b> Earned Baz (50 points)<p>");
});

test("two visible", function() {
  nav.resetAchievements();
  nav.loadAchievements([
    ["foo", true, 50, "Foo", "Earned Foo", "Pre Earned Foo"],
    ["bar", true, 50, "Bar", "Earned Bar", "Pre Earned Bar"],
  ]);
  var output = {};
  printAchievements(output);
  equal(output.innerHTML, "You haven't unlocked any achievements yet. There are two possible achievements, worth a total of 100 points.<p>"+
    "<b>Foo:</b> Pre Earned Foo (50 points)<br><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked one out of two possible achievements, earning you a score of 50 out of a possible 100 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<p>There is still one achievement remaining.<p><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1, bar: 1};
  printAchievements(output);
  equal(output.innerHTML, "Congratulations! You have unlocked both achievements, earning a total of 100 points, a perfect score.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<p>");
});

test("three hidden", function() {
  nav.resetAchievements();
  nav.loadAchievements([
    ["foo", false, 50, "Foo", "Earned Foo", null],
    ["bar", false, 50, "Bar", "Earned Bar", null],
    ["baz", false, 50, "Baz", "Earned Baz", null],
  ]);
  var output = {};
  printAchievements(output);
  equal(output.innerHTML, "You haven't unlocked any achievements yet. There are three hidden achievements, worth a total of 150 points.<p>");

  nav.achieved = {foo:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked one out of three possible achievements, earning you a score of 50 out of a possible 150 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<p>There are still two hidden achievements remaining.<p>");

  nav.achieved = {foo:1, bar: 1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked two out of three possible achievements, earning you a score of 100 out of a possible 150 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<p>There is still one hidden achievement remaining.<p>");

  nav.achieved = {foo:1, bar: 1, baz: 1};
  printAchievements(output);
  equal(output.innerHTML, "Congratulations! You have unlocked all three achievements, earning a total of 150 points, a perfect score.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<br><b>Baz:</b> Earned Baz (50 points)<p>");
});

test("two visible, two hidden", function() {
  nav.resetAchievements();
  nav.loadAchievements([
    ["foo", true, 50, "Foo", "Earned Foo", "Pre Earned Foo"],
    ["bar", true, 50, "Bar", "Earned Bar", "Pre Earned Bar"],
    ["baz", false, 50, "Baz", "Earned Baz", null],
    ["quz", false, 50, "Quz", "Earned Quz", null],
  ]);
  var output = {};
  printAchievements(output);
  equal(output.innerHTML, "You haven't unlocked any achievements yet. There are four possible achievements (including two hidden achievements), worth a total of 200 points.<p>"+
    "<b>Foo:</b> Pre Earned Foo (50 points)<br><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked one out of four possible achievements, earning you a score of 50 out of a possible 200 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<p>There are still three achievements remaining, including two hidden achievements.<p><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1, baz:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked two out of four possible achievements, earning you a score of 100 out of a possible 200 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Baz:</b> Earned Baz (50 points)<p>There are still two achievements remaining, including one hidden achievement.<p><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1, bar:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked two out of four possible achievements, earning you a score of 100 out of a possible 200 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<br><b>Bar:</b> Earned Bar (50 points)<p>There are still two hidden achievements remaining.<p>");

  nav.achieved = {baz:1, quz:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked two out of four possible achievements, earning you a score of 100 out of a possible 200 points.<p>"+
    "<b>Baz:</b> Earned Baz (50 points)<br><b>Quz:</b> Earned Quz (50 points)<p>There are still two achievements remaining.<p><b>Foo:</b> Pre Earned Foo (50 points)<br><b>Bar:</b> Pre Earned Bar (50 points)<p>");
});

test("two visible, one hidden", function() {
  nav.resetAchievements();
  nav.loadAchievements([
    ["foo", true, 50, "Foo", "Earned Foo", "Pre Earned Foo"],
    ["bar", true, 50, "Bar", "Earned Bar", "Pre Earned Bar"],
    ["baz", false, 50, "Baz", "Earned Baz", null],
  ]);
  var output = {};
  printAchievements(output);
  equal(output.innerHTML, "You haven't unlocked any achievements yet. There are three possible achievements (including one hidden achievement), worth a total of 150 points.<p>"+
    "<b>Foo:</b> Pre Earned Foo (50 points)<br><b>Bar:</b> Pre Earned Bar (50 points)<p>");

  nav.achieved = {foo:1};
  printAchievements(output);
  equal(output.innerHTML, "You have unlocked one out of three possible achievements, earning you a score of 50 out of a possible 150 points.<p>"+
    "<b>Foo:</b> Earned Foo (50 points)<p>There are still two achievements remaining, including one hidden achievement.<p><b>Bar:</b> Pre Earned Bar (50 points)<p>");
});
