package com.choiceofgames.choicescript;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.w3c.dom.Document;


public class App {
	public static void main(String[] args) throws Exception {
		Map<String, Object> startingStats = new HashMap<String, Object>();
		startingStats.put("leadership", 50);
		startingStats.put("strength", 50);
		Navigator nav = Navigator.fromSceneList(startingStats, Arrays.asList("first", "second", "third"));
		Map<String, Object> stats = new HashMap<String, Object>();
		nav.resetStats(stats);
		String startupSceneName = nav.getStartupSceneName();
		InputOutput io = new InputOutput(nav);
		Document xml = XmlHelper.xmlFromResource(startupSceneName);
		IVignette scene = new Vignette(io, nav, xml, stats);
		while (true) {
			scene.execute();
			scene = io.handleUserInput();
		}
	}
}
