package com.choiceofgames.choicescript;

import java.util.List;

public interface IVignette {

	public abstract void inputText(String variable, String text);

	public abstract void execute();

	public abstract boolean isDebugMode();

	public abstract void setDebugMode(boolean debugMode);

	public abstract void resolveChoice(List<Integer> selections);
	
	public abstract void setResumePoint(String resumePoint);

}