/**
 * 
 */
package com.choiceofgames.choicescript;

import static com.choiceofgames.choicescript.XmlHelper.*;

import java.util.List;

import org.w3c.dom.Element;

import com.choiceofgames.choicescript.Vignette.VariableMap;

class ExpressionEvaluator {
	final VariableMap map;
	public ExpressionEvaluator(VariableMap map) {
		this.map = map;
	}
	public Object evaluate(Element tag) {
		String tagName = tag.getTagName();
		if ("literal".equals(tagName)) {
			return tag.getAttribute("value");
		} else if ("variable".equals(tagName)) {
			String name = tag.getAttribute("name");
			return map.get(name);
		} else if ("math".equals(tagName)) {
			return math(tag);
		} else if ("reference".equals(tagName)) {
			return reference(tag);
		} else if ("equals".equals(tagName)) {
			return expressionEquals(tag);
		} else if ("not".equals(tagName)) {
			return not(tag);
		} else if ("and".equals(tagName)) {
			return and(tag);
		} else if ("or".equals(tagName)) {
			return or(tag);
		} else if ("gt".equals(tagName)) {
			return inequality(tag);
		} else if ("lt".equals(tagName)) {
			return inequality(tag);
		} else if ("concatenate".equals(tagName)) {
			return concatenate(tag);
		}
		return null;
	}
	
	private Object reference(Element tag) {
		Element child = getFirstChildElement(tag);
		Object value = evaluate(child);
		return map.get(value.toString());
	}
	private String concatenate(Element tag) {
		Pair pair = extract(tag);
		String s1 = String.valueOf(pair.v1);
		String s2 = String.valueOf(pair.v2);
		return s1 + s2;
	}

	private boolean not(Element tag) {
		Element test = getFirstChildElement(tag);
		Boolean object1 = (Boolean) evaluate(test);
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