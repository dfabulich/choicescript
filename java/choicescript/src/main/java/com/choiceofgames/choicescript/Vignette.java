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
					io.finish("Next Chapter"); // TODO promptMessage
					finished = true;
				} else {
					throw new RuntimeException("Unknown element name: " + tagName);
				}
			}
			if (finished) break;
		}

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
