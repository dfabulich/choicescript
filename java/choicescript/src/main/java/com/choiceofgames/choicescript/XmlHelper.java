package com.choiceofgames.choicescript;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;


public class XmlHelper {

	public static Document xmlFromResource(String name) throws SAXException, IOException {
		DocumentBuilder builder;
		try {
			builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
		} catch (ParserConfigurationException e) {
			throw new RuntimeException("Bug!", e);
		}
		String xname = "/com/choiceofgames/choicescript/sample.xml";
		//InputStream stream = XmlHelper.class.getResourceAsStream(xname);
		FileInputStream stream = new FileInputStream("/tp/" +name +".txt.xml");
		InputSource is = new InputSource(stream);
		Document document = builder.parse(is);
		return document;
	}
	
	public static String getResumePoint(Element e) {
		Element root = e.getOwnerDocument().getDocumentElement();
		if (root.isSameNode(e)) return "/vignette";
		Element parentElement = (Element) e.getParentNode();
		List<Element> siblings = getChildElementsByName(parentElement, e.getTagName());
		for (int i = 0; i < siblings.size(); i++) {
			Element sibling = siblings.get(i);
			if (e.isSameNode(sibling)) {
				return getResumePoint(parentElement) + "/" + e.getTagName() + "[" + (i+1) + "]";
			}
		}
		throw new RuntimeException("Bug! Couldn't find element in the document");
	}
	
	public static List<Element> getChildElementsByName(Element parent, String name) {
		List<Element> childElements = new ArrayList<Element>();
		for (Node childNode : i(parent.getChildNodes())) {
			if (isElement(childNode)) {
				Element childElement = (Element) childNode;
				if (name == null || name.equals(childElement.getTagName())) {
					childElements.add((Element) childNode);
				}
			}
		}
		return childElements;
	}
	
	public static Element getFirstChildElement(Element parent) {
		for (Node childNode : i(parent.getChildNodes())) {
			if (isElement(childNode)) {
				return (Element) childNode;
			}
		}
		throw new RuntimeException("No elements!");
	}
	
	public static boolean isElement(Node n) {
		return n.getNodeType() == Node.ELEMENT_NODE;
	}
	
	public static Element getNextSiblingElement(Element current) {
		Node sibling = current;
		while ((sibling = sibling.getNextSibling()) != null) {
			if (isElement(sibling)) return (Element) sibling;
		}
		return null;
	}
	
	public static List<Element> getChildElements(Element parent) {
		return getChildElementsByName(parent, null);
	}
	
	public static NodeListIterable i(NodeList list) {
		return new NodeListIterable(list);
	}
	
	private static class NodeListIterable implements Iterable<Node> {
		final NodeList list;
		NodeListIterable(NodeList list) {
			this.list = list;
		}
		@Override
		public Iterator<Node> iterator() {
			return new NodeListIterator(list);
		}
	}
	

	
	private static class NodeListIterator implements Iterator<Node> {
		final NodeList list;
		int index = 0;
		
		NodeListIterator(NodeList list) {
			this.list = list;
		}
		
		@Override
		public boolean hasNext() {
			return index < list.getLength();
		}

		@Override
		public Node next() {
			return list.item(index++);
		}

		@Override
		public void remove() {
			throw new UnsupportedOperationException();		
		}
		
	}

}
