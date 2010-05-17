package com.choiceofgames.choicescript;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Navigator implements INavigator {
	private Navigator(Map<String, Object> startingStats) {
		this.startingStats = new HashMap<String, Object>();
		for (String key : startingStats.keySet()) {
			this.startingStats.put(key, startingStats.get(key));
		}
	};
	
	private final Map<String, Object> startingStats;
	
	public static final Navigator fromSceneList(Map<String, Object> stats, List<String> sceneNames) {
		Navigator nav = new Navigator(stats);
		
		return nav;
	}
	
	public final String getStartupSceneName() {
		return "first"; // TODO INCOMPLETE
	}
	
	public final String getNextSceneName(String currentSceneName) {
		return "second"; // TODO INCOMPLETE
	}
	
	public final void resetStats(Map<String, Object> stats) {
		stats.clear();
		for (String key : startingStats.keySet()) {
			stats.put(key, startingStats.get(key));
		} 
	}
}
