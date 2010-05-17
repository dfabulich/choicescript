package com.choiceofgames.choicescript;

import static com.choiceofgames.choicescript.XmlHelper.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

public class Vignette implements IVignette {
	public Vignette(IInputOutput io, Navigator nav, Document vignetteXml,
			Map<String, Object> stats) {
		this.io = io;
		this.nav = nav;
		this.vignetteXml = vignetteXml;
		this.stats = stats;
		this.currentElement = vignetteXml.getDocumentElement();
	}
	
	public Vignette(IInputOutput io, Navigator nav, Document vignetteXml,
			Map<String, Object> stats, Map<String, Object> temps) {
		this.io = io;
		this.nav = nav;
		this.vignetteXml = vignetteXml;
		this.stats = stats;
		this.temps = temps;
		this.currentElement = vignetteXml.getDocumentElement();
	}

	final IInputOutput io;
	final Navigator nav;
	final Map<String, Object> stats;
	final ExpressionEvaluator ee = new ExpressionEvaluator();
	private static final XPath xpath = XPathFactory.newInstance().newXPath();
	Map<String, Object> temps;
	boolean debugMode;
	boolean finished;
	final Document vignetteXml;
	Element currentElement;

	@Override
	public void execute() {
		if (currentElement == null) {
			currentElement = vignetteXml.getDocumentElement();
		}
		NodeList childNodes = currentElement.getChildNodes();
		for (Node node : i(childNodes)) {
			if (node.getNodeType() == Node.ELEMENT_NODE) {
				Element child = (Element) node;
				String tagName = child.getTagName();
				if ("p".equals(tagName)) {
					io.print(child.getTextContent());
					io.print("\n\n");
				} else if ("choice".equals(tagName)) {
					choice(child);
				} else if ("finish".equals(tagName)) {
					finish(child);
				} else if ("switch".equals(tagName)) {
					switchTag(child);
				} else {
					throw new RuntimeException("Unknown element name: " + tagName);
				}
			}
			if (finished) break;
		}
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

	
	private void switchTag(Element tag) {
		List<Element> ifTags = getChildElementsByName(tag, "if");
		for (Element ifTag : ifTags) {
			List<Element> ifChildren = getChildElements(ifTag);
			Element test = ifChildren.get(0);
			if (evaluateBooleanExpression(test)) {
				currentElement = ifChildren.get(1);
				return;
			}
		}
		List<Element> elseTag = getChildElementsByName(tag, "else"); 
		if (elseTag.isEmpty()) return;
		currentElement = elseTag.get(0);
	}
	
	private boolean evaluateBooleanExpression(Element tag) {
		Object o = evaluateExpression(tag);
		return (Boolean) o;
	}
	
	private Object evaluateExpression(Element tag) {
		return ee.evaluate(tag);
	}
	
	private class ExpressionEvaluator {
		public Object evaluate(Element tag) {
			Element child = getChildElements(tag).get(0);
			String tagName = child.getTagName();
			if ("literal".equals(tagName)) {
				return child.getAttribute("value");
			} else if ("variable".equals(tagName)) {
				String name = child.getAttribute("name");
				return getVariable(name);
			} else if ("math".equals(tagName)) {
				return math(child);
			} else if ("equals".equals(tagName)) {
				return expressionEquals(child);
			} else if ("not".equals(tagName)) {
				return not(child);
			} else if ("and".equals(tagName)) {
				return and(child);
			} else if ("or".equals(tagName)) {
				return or(child);
			} else if ("gt".equals(tagName)) {
				return inequality(child);
			} else if ("lt".equals(tagName)) {
				return inequality(child);
			} else if ("concatenate".equals(tagName)) {
				return concatenate(child);
			}
			return null;
		}
		
		private String concatenate(Element tag) {
			Pair pair = extract(tag);
			String s1 = String.valueOf(pair.v1);
			String s2 = String.valueOf(pair.v2);
			return s1 + s2;
		}

		private boolean not(Element tag) {
			List<Element> children = getChildElements(tag);
			Boolean object1 = (Boolean) evaluate(children.get(0));
			return !object1;
		}
		
		private boolean and(Element tag) {
			Pair pair = extract(tag);
			Boolean v1 = (Boolean) pair.v1;
			Boolean v2 = (Boolean) pair.v2;
			return v1 && v2;
		}
		
		private boolean or(Element tag) {
			Pair pair = extract(tag);
			Boolean v1 = (Boolean) pair.v1;
			Boolean v2 = (Boolean) pair.v2;
			return v1 || v2;
		}

		private class Pair {
			final Object v1, v2;

			public Pair(Object v1, Object v2) {
				this.v1 = v1;
				this.v2 = v2;
			}
			
		}
		
		private Pair extract(Element tag) {
			List<Element> children = getChildElements(tag);
			Object object1 = evaluate(children.get(0));
			Object object2 = evaluate(children.get(1));
			return new Pair(object1, object2);
		}
		
		private boolean expressionEquals(Element tag) {
			Pair pair = extract(tag);
			String s1 = String.valueOf(pair.v1);
			String s2 = String.valueOf(pair.v2);
			return (s1.equals(s2));			
		}

		private boolean inequality(Element tag) {
			String operator = tag.getTagName();
			Pair pair = extract(tag);
			Number number1 = coerceNumber(pair.v1);
			Number number2 = coerceNumber(pair.v2);
			if (number1 instanceof Integer && number2 instanceof Integer) {
				return integerInequality(operator, (Integer)number1, (Integer)number2);
			} else {
				return doubleInequality(operator, (Double)number1, (Double)number2);
			}
		}
		
		private boolean integerInequality(String operator, int v1, int v2) {
			if ("gt".equals(operator)) {
				return v1 > v2;
			} else if ("lt".equals(operator)) {
				return v1 < v2;
			} else {
				throw new RuntimeException("Bug! invalid inequality operator: " + operator);
			}
		}
		
		private boolean doubleInequality(String operator, double v1, double v2) {
			if ("gt".equals(operator)) {
				return v1 > v2;
			} else if ("lt".equals(operator)) {
				return v1 < v2;
			} else {
				throw new RuntimeException("Bug! invalid inequality operator: " + operator);
			}
		}
		
		private Number math(Element tag) {
			String operator = tag.getAttribute("operator");
			Pair pair = extract(tag);
			Number number1 = coerceNumber(pair.v1);
			Number number2 = coerceNumber(pair.v2);
			if (number1 instanceof Integer && number2 instanceof Integer) {
				return integerMath(operator, (Integer)number1, (Integer)number2);
			} else {
				return doubleMath(operator, (Double)number1, (Double)number2);
			}
		}
		
		private double doubleMath(String operator, double v1, double v2) {
			if ("+".equals(operator)) {
				return v1 + v2;
			} else if ("-".equals(operator)) {
				return v1 - v2;
			} else if ("*".equals(operator)) {
				return v1 * v2;
			} else if ("/".equals(operator)) {
				return v1 / v2;
			} else if ("%+".equals(operator)) {
		        boolean validValue = (v1 > 0 && v1 < 100);
		        if (!validValue) {
		        	throw new RuntimeException("Can't fairAdd to non-percentile value: " + v1);
		        }
		        double multiplier = (100 - v1) / 100;
		        double actualModifier = v2 * multiplier;
		        double value = 1 * v1 + actualModifier;
		        value = Math.floor(value);
		        if (value > 99) value = 99;
		        return value;
			} else if ("%-".equals(operator)) {
				boolean validValue = (v1 > 0 && v1 < 100);
		        if (!validValue) {
		        	throw new RuntimeException("Can't fairAdd to non-percentile value: " + v1);
		        }
		        double multiplier = v1 / 100;
		        double actualModifier = v2 * multiplier;
		        double value = v1 - actualModifier;
		        value = Math.ceil(value);
		        if (value < 1) value = 1;
		        return value;
			} else {
				throw new RuntimeException("Invalid operator: " + operator);
			}
		}
		
		private int integerMath(String operator, int v1, int v2) {
			if ("+".equals(operator)) {
				return v1 + v2;
			} else if ("-".equals(operator)) {
				return v1 - v2;
			} else if ("*".equals(operator)) {
				return v1 * v2;
			} else if ("/".equals(operator)) {
				return v1 / v2;
			} else if ("%+".equals(operator)) {
		        boolean validValue = (v1 > 0 && v1 < 100);
		        if (!validValue) {
		        	throw new RuntimeException("Can't fairAdd to non-percentile value: " + v1);
		        }
		        double multiplier = (100 - v1) / 100;
		        double actualModifier = v2 * multiplier;
		        double doubleValue = 1 * v1 + actualModifier;
		        int value = (int) Math.floor(doubleValue);
		        if (value > 99) value = 99;
		        return value;
			} else if ("%-".equals(operator)) {
				boolean validValue = (v1 > 0 && v1 < 100);
		        if (!validValue) {
		        	throw new RuntimeException("Can't fairAdd to non-percentile value: " + v1);
		        }
		        double multiplier = v1 / 100;
		        double actualModifier = v2 * multiplier;
		        double doubleValue = v1 - actualModifier;
		        int value = (int) Math.ceil(doubleValue);
		        if (value < 1) value = 1;
		        return value;
			} else {
				throw new RuntimeException("Invalid operator: " + operator);
			}
		}
		
		private Number coerceNumber(Object o) {
			if (o instanceof Number) return (Number) o;
			if (o instanceof String) {
				String s = (String) o;
				if (!s.contains(".")) {
					return Integer.parseInt(s);
				} else {
					return Double.parseDouble(s);
				}
				
			}
			throw new RuntimeException("Not a number or a string: " + o);
		}
	}
	
	private Object getVariable(String name) {
		return null;
	}
	


	private void finish(Element tag) {
		String promptMessage = tag.getAttribute("text");
		if (promptMessage == null) promptMessage = "Next Chapter";
		io.finish(promptMessage);
		finished = true;
	}

	private void choice(Element tag) {
		List<OptionDisplayGroup> odg = parseChoice(tag);
		io.choice(odg);
		io.saveState(stats, temps, getResumePoint(tag));
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
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public void resolveChoice(List<Integer> selections) {
		for (int selection : selections) {
			List<Element> options = getChildElementsByName(currentElement, "option");
			currentElement = options.get(selection);
		}
	}

	@Override
	public void setDebugMode(boolean debugMode) {
		// TODO Auto-generated method stub

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
