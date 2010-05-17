package com.choiceofgames.choicescript;

import static com.choiceofgames.choicescript.XmlHelper.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

public class Vignette implements IVignette {
	public Vignette(IInputOutput io, Navigator nav, Document vignetteXml,
			Map<String, Object> stats) {
		this.io = io;
		this.nav = nav;
		this.vignetteXml = vignetteXml;
		this.stats = stats;
		this.temps = new HashMap<String, Object>();
		currentElement = getFirstChildElement(vignetteXml.getDocumentElement());
	}
	
	public Vignette(IInputOutput io, Navigator nav, Document vignetteXml,
			Map<String, Object> stats, Map<String, Object> temps) {
		this.io = io;
		this.nav = nav;
		this.vignetteXml = vignetteXml;
		this.stats = stats;
		this.temps = temps;
		currentElement = getFirstChildElement(vignetteXml.getDocumentElement());
	}

	final IInputOutput io;
	final Navigator nav;
	final Map<String, Object> stats;
	final ExpressionEvaluator ee = new ExpressionEvaluator(new VariableMap());
	private static final XPath xpath = XPathFactory.newInstance().newXPath();
	Map<String, Object> temps;
	boolean debugMode;
	boolean finished;
	boolean resuming;
	final Document vignetteXml;
	Element currentElement;

	@Override
	public void execute() {
		while(currentElement != null) {
			//System.out.println("* " + currentElement);
			String tagName = currentElement.getTagName();
			if ("p".equals(tagName)) {
				io.print(currentElement.getTextContent());
				io.print("\n\n");
			} else if ("choice".equals(tagName)) {
				choice();
			} else if ("finish".equals(tagName)) {
				finish();
			} else if ("switch".equals(tagName)) {
				switchTag();
			} else if ("set".equals(tagName)) {
				set();
			} else if ("label".equals(tagName)) {
			} else if ("include".equals(tagName)) {
				String labelId = currentElement.getAttribute("label");
				currentElement = vignetteXml.getElementById(labelId);
			} else {
				throw new RuntimeException("Unknown element name: " + tagName);
			}
			if (finished) break;
			if (resuming) {
				resuming = false;
			} else {
				getNextElement();
			}
		}
	}
	
	private void set() {
		String variableName = currentElement.getAttribute("variable");
		Element expressionElement = getFirstChildElement(currentElement);
		Object value = evaluateExpression(expressionElement);
		if (temps.containsKey(variableName)) {
			temps.put(variableName, value);
		} else if (stats.containsKey(variableName)) {
			stats.put(variableName, value);
		} else {
			throw new RuntimeException("Undeclared variable: " + variableName);
		}
	}

	private void getNextElement() {
		Element oldElement = currentElement;
		currentElement = getNextSiblingElement(currentElement);
		if (currentElement != null) return;
		if (oldElement.getParentNode().isSameNode(vignetteXml.getDocumentElement())) {
			return;
		}
		currentElement = (Element) oldElement.getParentNode();
		getNextElement();
	}

	/*
	 * comment
	 * goto
	 * gotoref
	 * label
	 * create
	 * temp
	 * set
	 * setref
	 * print
	 * if
	 * rand
	 * goto_scene
	 * fake_choice
	 * input_text
	 * ending
	 * stat_chart
	 */

	
	private void switchTag() {
		List<Element> ifTags = getChildElementsByName(currentElement, "if");
		for (Element ifTag : ifTags) {
			List<Element> ifChildren = getChildElements(ifTag);
			Element test = getFirstChildElement(ifChildren.get(0));
			if (evaluateBooleanExpression(test)) {
				currentElement = getFirstChildElement(ifChildren.get(1));
				resuming = true;
				return;
			}
		}
		List<Element> elseTag = getChildElementsByName(currentElement, "else"); 
		if (elseTag.isEmpty()) return;
		currentElement = getFirstChildElement(elseTag.get(0));
		resuming = true;
	}
	
	private boolean evaluateBooleanExpression(Element tag) {
		Object o = evaluateExpression(tag);
		return (Boolean) o;
	}
	
	private Object evaluateExpression(Element tag) {
		return ee.evaluate(tag);
	}
			
	public class VariableMap {	
		public Object get(String name) {
			return getVariable(name);
		}
	}
	
	private Object getVariable(String name) {
		if ("true".equals(name)) return true;
		if ("false".equals(name)) return false;
		Object value = temps.get(name);
		if (value != null) return value;
		value = stats.get(name);
		if (value == null) throw new RuntimeException("Unset variable" + name);
		return value;
	}
	


	private void finish() {
		String promptMessage = currentElement.getAttribute("text");
		if (promptMessage == null || promptMessage.isEmpty()) promptMessage = "Next Chapter";
		io.finish(promptMessage);
		finished = true;
	}

	private void choice() {
		List<OptionDisplayGroup> odg = parseChoice(currentElement);
		io.choice(odg);
		io.saveState(stats, temps, getResumePoint(currentElement));
		finished = true;
	}
	
	private List<OptionDisplayGroup> parseChoice(Element tag) {
		List<OptionDisplayGroup> odgs = new ArrayList<OptionDisplayGroup>();
		// TODO multichoice
		String groupName = "choice";
		List<Element> optionTags = XmlHelper.getChildElementsByName(tag, "option");		
		List<String> optionTitles = new ArrayList<String>();
		for (Element optionTag : optionTags) {
			String name = optionTag.getAttribute("title");
			optionTitles.add(name);
		}
		odgs.add(new OptionDisplayGroup(groupName, optionTitles));
		return odgs;
	}
	
	
	
		
	@Override
	public void inputText(String variable, String text) {
		// TODO Auto-generated method stub

	}

	@Override
	public boolean isDebugMode() {
		return debugMode;
	}

	@Override
	public void resolveChoice(List<Integer> selections) {
		for (int selection : selections) {
			List<Element> options = getChildElementsByName(currentElement, "option");
			currentElement = getFirstChildElement(options.get(selection));
		}
	}

	@Override
	public void setDebugMode(boolean debugMode) {
		this.debugMode = debugMode;
	}

	@Override
	public void setResumePoint(String resumePoint) {
		try {
			currentElement = (Element) xpath.evaluate(resumePoint, vignetteXml, XPathConstants.NODE);
		} catch (XPathExpressionException e) {
			throw new RuntimeException("Bug", e);
		}
	}
	

}
