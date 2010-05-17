package com.choiceofgames.choicescript;

import java.util.Map;

public interface INavigator {

	public abstract String getStartupSceneName();

	public abstract String getNextSceneName(String currentSceneName);

	public abstract void resetStats(Map<String, Object> stats);

}