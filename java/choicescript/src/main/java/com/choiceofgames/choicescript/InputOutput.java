package com.choiceofgames.choicescript;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.w3c.dom.Document;

public class InputOutput implements IInputOutput {
	final Navigator nav;
	Map<String, Object> stats, temps;
	List<OptionDisplayGroup> optionDisplayGroups;
	enum Action { CHOICE, INPUT_TEXT, PAGE_BREAK, FINISH, ENDING };
	String inputTextVariable;
	Action action = null;
	String resumePoint;
	
	public InputOutput(Navigator nav) {
		this.nav = nav;
	}

	@Override
	public void choice(List<OptionDisplayGroup> optionDisplayGroups) {
		// TODO Auto-generated method stub
		this.optionDisplayGroups = optionDisplayGroups;
		System.out.println(">Choose 1 or 2");
		action = Action.CHOICE;
	}

	@Override
	public void inputText(String variableName) {
		this.inputTextVariable = variableName;
		System.out.println(">Type Something");
		action = Action.INPUT_TEXT;
	}
	
	@Override
	public void ending() {
		// TODO Auto-generated method stub
		System.out.println(">Play again");
		action = Action.ENDING;
	}

	@Override
	public void finish(String promptMessage) {
		System.out.println(">" + promptMessage);
		action = Action.FINISH;
	}

	@Override
	public IVignette handleUserInput() {
		// TODO Auto-generated method stub
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		String line = null;
		try {
			line = br.readLine();
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
		
		String sceneName = (String) stats.get("sceneName");
		Document xml;
		try {
			xml = XmlHelper.xmlFromResource(sceneName);
		} catch (Exception e) {
			throw new RuntimeException("How should we have handled this?", e);
		}
		IVignette vig = new Vignette(this, nav, xml, stats, temps);
		
		
		switch (action) {
			case CHOICE:
				vig.setResumePoint(resumePoint);
				if (line.startsWith("1")) {
					vig.resolveChoice(Arrays.asList(0));
				} else {
					vig.resolveChoice(Arrays.asList(1));
				}
				break;
			case INPUT_TEXT:
				vig.inputText(inputTextVariable, line);
				break;
			case PAGE_BREAK:
				vig.setResumePoint(resumePoint);
				break;
			case FINISH:
				// TODO go on the navigator's next scene
				break;
			case ENDING:
				// TODO restart from navigator's start scene
				break;
			default:
				throw new RuntimeException("Bug! Unrecognized action: " + action);
		}
		
		return vig;
	}
	
	@Override
	public void pageBreak(String promptMessage) {
		// TODO Auto-generated method stub
		action = Action.PAGE_BREAK;
	}

	@Override
	public void print(String message) {
		// TODO Auto-generated method stub
		System.out.print(message);
	}

	@Override
	public void printLine(String message) {
		// TODO Auto-generated method stub
		System.out.println(message);
	}

	@Override
	public void printStatChart(Map<String, Object> variables,
			List<StatChartRow> rows) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void saveState(Map<String, Object> stats, Map<String, Object> temps,
			String resumePoint) {
		this.stats = stats;
		this.temps = temps;
		this.resumePoint = resumePoint;
		
	}

}
