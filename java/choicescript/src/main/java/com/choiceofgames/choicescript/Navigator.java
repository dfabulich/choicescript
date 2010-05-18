package com.choiceofgames.choicescript;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Navigator implements INavigator {
	private Navigator(Map<String, Object> startingStats, String startupSceneName) {
		this.startingStats = new HashMap<String, Object>();
		this.sceneMap = new HashMap<String, String>();
		for (String key : startingStats.keySet()) {
			this.startingStats.put(key, startingStats.get(key));
		}
		this.startupSceneName = startupSceneName;
	};
	
	private final Map<String, Object> startingStats;
	private final Map<String, String> sceneMap;
	private final String startupSceneName;
	
	public static final Navigator fromSceneList(Map<String, Object> stats, List<String> sceneNames) {
		String startupSceneName = sceneNames.get(0);
		Navigator nav = new Navigator(stats, startupSceneName);
		for (int i = 1; i < sceneNames.size(); i++) {
			String scene1 = sceneNames.get(i-1);
			String scene2 = sceneNames.get(i);
			nav.sceneMap.put(scene1, scene2);
		}
		return nav;
	}
	
	public final String getStartupSceneName() {
		return startupSceneName;
	}
	
	public final String getNextSceneName(String currentSceneName) {
		return sceneMap.get(currentSceneName);
	}
	
	public final void resetStats(Map<String, Object> stats) {
		stats.clear();
		for (String key : startingStats.keySet()) {
			stats.put(key, startingStats.get(key));
		} 
	}
}
