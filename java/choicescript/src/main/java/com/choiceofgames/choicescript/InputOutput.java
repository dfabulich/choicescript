package com.choiceofgames.choicescript;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.w3c.dom.Document;

public class InputOutput implements IInputOutput {
	final INavigator nav;
	Map<String, Object> stats, temps;
	enum Action { CHOICE, INPUT_TEXT, PAGE_BREAK, FINISH, ENDING };
	String inputTextVariable;
	Action action = null;
	String resumePoint;
	
	public InputOutput(Navigator nav) {
		this.nav = nav;
	}

	@Override
	public void choice(List<OptionDisplayGroup> optionDisplayGroups) {
		if (optionDisplayGroups.size() == 1) {
			printOptions(optionDisplayGroups.get(0).getOptionTitles());
		} else {
			for (OptionDisplayGroup group : optionDisplayGroups) {
				System.out.println("\nChoose a(n)" + group.getGroupName());
				printOptions(group.getOptionTitles());
			}
		}
		System.out.print("> ");
		action = Action.CHOICE;
	}
	
	private void printOptions(List<String> options) {
		for (int i = 0; i < options.size(); i++) {
			System.out.print(""+(i+1));
			System.out.print(": ");
			System.out.println(options.get(i));
		}
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
		
		IVignette vig;
		Document xml;
		
		
		switch (action) {
			case CHOICE:
				vig = reinflateVignette();
				int decision = Integer.parseInt(line);
				vig.resolveChoice(Arrays.asList(decision-1));
				break;
			case INPUT_TEXT:
				vig = reinflateVignette();
				vig.inputText(inputTextVariable, line);
				break;
			case PAGE_BREAK:
				vig = reinflateVignette();
				break;
			case FINISH:
				String nextSceneName = nav.getNextSceneName((String) stats.get("sceneName"));
				xml = loadDocument(nextSceneName);
				vig = new Vignette(nextSceneName, this, nav, xml, stats);
				break;
			case ENDING:
				nav.resetStats(stats);
				String startupSceneName = nav.getStartupSceneName();
				xml = loadDocument(startupSceneName);
				vig = new Vignette(startupSceneName, this, nav, xml, stats);
				break;
			default:
				throw new RuntimeException("Bug! Unrecognized action: " + action);
		}
		
		return vig;
	}
	
	private IVignette reinflateVignette() {
		String sceneName = (String) stats.get("sceneName");
		Document xml = loadDocument(sceneName);
		IVignette vig = new Vignette(sceneName, this, nav, xml, stats, temps);
		vig.setResumePoint(resumePoint);
		return vig;
	}

	public Document loadDocument(String sceneName) {
		Document xml;
		try {
			xml = XmlHelper.xmlFromResource(sceneName);
		} catch (Exception e) {
			throw new RuntimeException("How should we have handled this?", e);
		}
		return xml;
	}
	
	@Override
	public void pageBreak(String promptMessage) {
		System.out.println(">" + promptMessage);
		action = Action.PAGE_BREAK;
	}

	@Override
	public void print(String message) {
		// TODO Auto-generated method stub
		System.out.print(message);
	}

	@Override
	public void printStatChart(List<StatChartRow> rows) {
		for (StatChartRow row : rows) {
			StatChartRow.Label label = row.chartLabel;
			String value = row.value;
			switch (row.type) {
				case OPPOSED_PAIR:
					System.out.print("  ");
					System.out.print(row.value + "% " + label.label);
					System.out.print(" vs. ");
					int intValue = Integer.parseInt(row.value);
					System.out.print(100 - intValue);
					System.out.print("% " + row.opposite.label);
					System.out.println();
					break;
				case PERCENT:
					value += "%";
					// fall through
				case TEXT:
					System.out.println(label.label + ": " + value);
			}
		}		
	}

	@Override
	public void saveState(String sceneName, Map<String, Object> stats,
			Map<String, Object> temps, String resumePoint) {
		this.stats = stats;
		this.stats.remove("scene");
		this.stats.put("sceneName", sceneName);
		this.temps = temps;
		this.resumePoint = resumePoint;
		
	}

	@Override
	public void lineBreak() {
		System.out.println();
		
	}

	@Override
	public void paragraphBreak() {
		System.out.print("\n\n");
		
	}

}
