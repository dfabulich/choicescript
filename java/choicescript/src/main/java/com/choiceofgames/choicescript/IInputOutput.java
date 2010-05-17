package com.choiceofgames.choicescript;

import java.util.List;
import java.util.Map;

public interface IInputOutput {
	/**
	 * Prints the specified message on the console with no trailing line break.
	 * @param message the message to print
	 */
	public void print(String message);
	
	/**
	 * Prints the specified message on the console followed by a line break.
	 * @param message the message to print
	 */
	public void printLine(String message);
	
	/**
	 * Prints a chart of the specified variables.
	 * @param stats
	 */
	public void printStatChart(Map<String, Object> variables, List<StatChartRow> rows);
	
	/**
	 * End the current scene and launch the next scene.
	 * @param promptMessage The message with which to prompt the user, e.g. as button text.
	 */
	public void finish(String promptMessage);
	
	/**
	 * Display an ending message and then restart the game.
	 */
	public void ending();
	
	/**
	 * Wait for user input before continuing the text.
	 * @param promptMessage The message with which to prompt the user, e.g. as button text.
	 */
	public void pageBreak(String promptMessage);
	
	/**
	 * Prompt the user to make a choice between multiple options.
	 * 
	 * Options may be divided up into separate groups; e.g. the user may need to
	 * choose a toy and choose a color simultaneously.
	 * @param options TODO
	 */
	public void choice(List<OptionDisplayGroup> optionDisplayGroups);
	
	/**
	 * Accept user input, possibly using the navigator to select the next scene.
	 * @return the next scene to execute
	 */
	public IVignette handleUserInput();
	
	/**
	 * Record the current state of the game
	 * @param stats the permanent "stat" variables
	 * @param temps the temporary variables, destroyed when each scene finishes
	 * @param resumePoint TODO
	 */
	public void saveState(Map<String, Object> stats, Map<String, Object> temps, String resumePoint);
}
